import { boundedPageSize, type PageRequest } from '@/lib/repositories/pagination'
import type { TrainingProgramRepository } from '@/lib/repositories/training/program'
import {
  createCoachTemplateAssessmentControl,
  type CoachTemplateAssessmentControl,
  type CoachTemplateAssessmentPageObserver,
  type CoachTemplateAssessmentPageTelemetry,
  type CoachTemplateServingDependencies,
} from '@/lib/training/coexistence/coach-template-serving-contract'

const MAX_ASSESSMENT_PAGES = 1_000

export type CoachTemplateStagingAssessmentAuthority = {
  readonly applicationEnvironment: string
  readonly deploymentEnvironment: string
  readonly branch: string
  readonly requestedMode: string
}

export type CoachTemplateStagingAssessmentReport = {
  readonly assessment_run_id: string
  readonly page_count: number
  readonly total_line_count: number
  readonly canonical_eligible: number
  readonly warning: number
  readonly critical_mismatch: number
  readonly unsupported: number
  readonly presentation_mismatch: number
  readonly adaptation_error: number
  readonly observer_error: number
  readonly warning_rate: number
  readonly terminal_page_reached: boolean
}

export type CoachTemplateStagingAssessmentFailureReason =
  | 'STAGING_AUTHORITY_REJECTED'
  | 'READER_CREATION_FAILED'
  | 'PAGE_READ_FAILED'
  | 'ASSESSMENT_EVENT_MISSING'
  | 'ASSESSMENT_EVENT_INVALID'
  | 'PAGINATION_INVALID'
  | 'PAGINATION_CYCLE_DETECTED'
  | 'PAGE_LIMIT_EXCEEDED'

export type CoachTemplateStagingAssessmentResult =
  | { readonly ok: true; readonly report: CoachTemplateStagingAssessmentReport }
  | { readonly ok: false; readonly reason: CoachTemplateStagingAssessmentFailureReason }

type CoachTemplateAssessmentReader = Pick<TrainingProgramRepository, 'listCoachProgramPage'>

export type CoachTemplateAssessmentReaderFactory = (
  control: CoachTemplateAssessmentControl,
) => CoachTemplateAssessmentReader

export type RunCoachTemplateStagingAssessmentOptions = {
  readonly authority: CoachTemplateStagingAssessmentAuthority
  readonly coachUserId: string
  readonly createReader: CoachTemplateAssessmentReaderFactory
  readonly pageSize?: number
  readonly dependencies?: CoachTemplateServingDependencies
  readonly pageTelemetryObserver?: CoachTemplateAssessmentPageObserver
}

const hasStagingAssessmentAuthority = (authority: CoachTemplateStagingAssessmentAuthority): boolean => (
  authority.applicationEnvironment === 'staging'
  && authority.deploymentEnvironment === 'preview'
  && authority.branch === 'phase-6-staging'
  && authority.requestedMode === 'assessment-only'
)

const categoriesTotal = (event: CoachTemplateAssessmentPageTelemetry): number => (
  event.canonical_eligible
  + event.warning
  + event.critical_mismatch
  + event.unsupported
  + event.presentation_mismatch
  + event.adaptation_error
)

const isExpectedAssessmentEvent = (
  event: CoachTemplateAssessmentPageTelemetry,
  runId: string,
  pageSequence: number,
  itemCount: number,
  terminalPage: boolean,
): boolean => (
  event.assessment_run_id === runId
  && event.page_sequence === pageSequence
  && event.item_count === itemCount
  && event.terminal_page === terminalPage
  && categoriesTotal(event) === itemCount
)

export async function runCoachTemplateStagingAssessment(
  options: RunCoachTemplateStagingAssessmentOptions,
): Promise<CoachTemplateStagingAssessmentResult> {
  if (!hasStagingAssessmentAuthority(options.authority)) {
    return { ok: false, reason: 'STAGING_AUTHORITY_REJECTED' }
  }

  const eventBox: { current: CoachTemplateAssessmentPageTelemetry | null } = { current: null }
  const recordEvent: CoachTemplateAssessmentPageObserver = event => {
    eventBox.current = event
    options.pageTelemetryObserver?.(event)
  }
  const control = createCoachTemplateAssessmentControl({
    ...options.dependencies,
    observer: recordEvent,
    fallbackObserver: event => {
      eventBox.current = event
    },
  })

  let reader: CoachTemplateAssessmentReader
  try {
    reader = options.createReader(control)
  } catch {
    return { ok: false, reason: 'READER_CREATION_FAILED' }
  }

  const counters = {
    canonical_eligible: 0,
    warning: 0,
    critical_mismatch: 0,
    unsupported: 0,
    presentation_mismatch: 0,
    adaptation_error: 0,
    observer_error: 0,
  }
  const seenCursors = new Set<string>()
  const pageSize = boundedPageSize(options.pageSize)
  let cursor: string | undefined
  let pageCount = 0
  let totalLineCount = 0

  while (pageCount < MAX_ASSESSMENT_PAGES) {
    eventBox.current = null
    const request: PageRequest = cursor === undefined ? { limit: pageSize } : { cursor, limit: pageSize }
    let pageResult: Awaited<ReturnType<CoachTemplateAssessmentReader['listCoachProgramPage']>>
    try {
      pageResult = await reader.listCoachProgramPage(options.coachUserId, request)
    } catch {
      return { ok: false, reason: 'PAGE_READ_FAILED' }
    }
    if (!pageResult.ok) return { ok: false, reason: 'PAGE_READ_FAILED' }

    pageCount += 1
    const terminalPage = !pageResult.data.hasMore
    const event = eventBox.current as CoachTemplateAssessmentPageTelemetry | null
    if (event === null) return { ok: false, reason: 'ASSESSMENT_EVENT_MISSING' }
    if (!isExpectedAssessmentEvent(
      event,
      control.assessmentRunId,
      pageCount,
      pageResult.data.items.length,
      terminalPage,
    )) {
      return { ok: false, reason: 'ASSESSMENT_EVENT_INVALID' }
    }

    totalLineCount += event.item_count
    counters.canonical_eligible += event.canonical_eligible
    counters.warning += event.warning
    counters.critical_mismatch += event.critical_mismatch
    counters.unsupported += event.unsupported
    counters.presentation_mismatch += event.presentation_mismatch
    counters.adaptation_error += event.adaptation_error
    counters.observer_error += event.observer_error

    if (terminalPage) {
      if (pageResult.data.nextCursor !== null) return { ok: false, reason: 'PAGINATION_INVALID' }
      return {
        ok: true,
        report: {
          assessment_run_id: control.assessmentRunId,
          page_count: pageCount,
          total_line_count: totalLineCount,
          ...counters,
          warning_rate: totalLineCount === 0 ? 0 : counters.warning / totalLineCount,
          terminal_page_reached: true,
        },
      }
    }

    const nextCursor = pageResult.data.nextCursor
    if (nextCursor === null) return { ok: false, reason: 'PAGINATION_INVALID' }
    if (seenCursors.has(nextCursor)) return { ok: false, reason: 'PAGINATION_CYCLE_DETECTED' }
    seenCursors.add(nextCursor)
    cursor = nextCursor
  }

  return { ok: false, reason: 'PAGE_LIMIT_EXCEEDED' }
}
