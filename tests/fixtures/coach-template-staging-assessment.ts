import type { CoachProgramRow } from '../../lib/repositories/training/program'
import type { Json } from '../../lib/supabase/types'

export const COACH_TEMPLATE_STAGING_FIXTURE_COUNT = 17 as const
export const COACH_TEMPLATE_STAGING_FIXTURE_NAMESPACE = 'coach-template-assessment-v1' as const
export const COACH_TEMPLATE_STAGING_FIXTURE_NAME_PREFIX = '[fixture:coach-template-assessment-v1]' as const

const STAGING_PROJECT_REF = 'cycbnnojcymjnaqomlyj'
const PRODUCTION_PROJECT_REF = 'njlzossopgknanhkzcbk'
const SYNTHETIC_COACH_ID = '76100000-0000-4000-8000-000000000002'
const CREATED_AT = '2026-08-14T00:00:00.000Z'

export type CoachTemplateStagingFixtureTarget = {
  readonly applicationEnvironment: string
  readonly deploymentEnvironment: string
  readonly branch: string
  readonly projectRef: string
}

export type CoachTemplateStagingFixtureContract = {
  readonly namespace: typeof COACH_TEMPLATE_STAGING_FIXTURE_NAMESPACE
  readonly owner: {
    readonly kind: 'existing-synthetic-coach'
    readonly alias: 'phase6-v2-coach'
    readonly manifestAuthority: 'moovx-phase6-staging-auth-v2'
    readonly manifestPersonaRole: 'coach'
    readonly id: string
  }
  readonly rows: readonly CoachProgramRow[]
  readonly proof: {
    readonly expectedBeforeCreateCount: 0
    readonly expectedAfterCreateCount: typeof COACH_TEMPLATE_STAGING_FIXTURE_COUNT
    readonly expectedAfterCleanupCount: 0
  }
  readonly cleanup: {
    readonly table: 'training_programs'
    readonly strategy: 'exact-owner-and-id-set'
    readonly ownerId: string
    readonly fixtureIds: readonly string[]
    readonly namePrefix: typeof COACH_TEMPLATE_STAGING_FIXTURE_NAME_PREFIX
    readonly idempotent: true
  }
}

export type CoachTemplateStagingFixtureResolution =
  | { readonly ok: true; readonly contract: CoachTemplateStagingFixtureContract }
  | { readonly ok: false; readonly reason: 'STAGING_TARGET_REJECTED' }

export type CoachTemplateFixtureCreationStatus =
  | 'CREATION_COMPLETE'
  | 'CREATION_ROLLED_BACK'
  | 'CREATION_PARTIAL_CLEANUP_REQUIRED'
  | 'REFUSE_CREATE_DIRTY_NAMESPACE'
  | 'COUNT_OUT_OF_CONTRACT'

export type CoachTemplateFixtureCleanupStatus =
  | 'CLEANUP_COMPLETE'
  | 'CLEANUP_PARTIAL_RETRY_REQUIRED'
  | 'COUNT_OUT_OF_CONTRACT'

const fixtureId = (index: number): string => (
  `76200000-0000-4000-8000-${String(index).padStart(12, '0')}`
)

const exercise = (
  suffix: string,
  name: string,
  sets: number,
  reps: string | number,
  rest: string | number,
) => ({
  exercise_id: `fixture-${suffix}`,
  name,
  sets,
  reps,
  rest,
})

const safePrograms: Json[] = [
  {
    days: [{
      name: 'Séance synthétique A',
      exercises: [exercise('squat', 'Squat synthétique', 3, '8-12', 90)],
    }],
  },
  {
    days: [{
      name: 'Séance synthétique B',
      exercises: [exercise('row', 'Tirage synthétique', 4, 10, 75)],
    }],
  },
  {
    days: [{
      name: 'Séance synthétique C',
      exercises: [exercise('pushup', 'Pompes synthétiques', 2, 'AMRAP', 60)],
    }],
  },
  {
    days: [
      {
        name: 'Séance synthétique D',
        exercises: [
          exercise('press', 'Poussée synthétique', 3, '6-8', '60-90s'),
          exercise('pull', 'Traction synthétique', 3, 8, 120),
        ],
      },
      { name: 'Repos synthétique', is_rest: true, exercises: [] },
    ],
  },
]

export function buildCoachTemplateStagingFixtureRows(): readonly CoachProgramRow[] {
  return Array.from({ length: COACH_TEMPLATE_STAGING_FIXTURE_COUNT }, (_, offset) => {
    const index = offset + 1
    return {
      id: fixtureId(index),
      coach_id: SYNTHETIC_COACH_ID,
      name: `${COACH_TEMPLATE_STAGING_FIXTURE_NAME_PREFIX} ${String(index).padStart(2, '0')}`,
      description: null,
      is_template: true,
      tags: ['fixture-assessment'],
      program: structuredClone(safePrograms[offset % safePrograms.length]),
      created_at: CREATED_AT,
    }
  })
}

export function resolveCoachTemplateStagingFixture(
  target: CoachTemplateStagingFixtureTarget,
): CoachTemplateStagingFixtureResolution {
  if (
    target.applicationEnvironment !== 'staging'
    || target.deploymentEnvironment !== 'preview'
    || target.branch !== 'phase-6-staging'
    || target.projectRef === PRODUCTION_PROJECT_REF
    || target.projectRef !== STAGING_PROJECT_REF
  ) {
    return { ok: false, reason: 'STAGING_TARGET_REJECTED' }
  }
  const rows = buildCoachTemplateStagingFixtureRows()
  return {
    ok: true,
    contract: {
      namespace: COACH_TEMPLATE_STAGING_FIXTURE_NAMESPACE,
      owner: {
        kind: 'existing-synthetic-coach',
        alias: 'phase6-v2-coach',
        manifestAuthority: 'moovx-phase6-staging-auth-v2',
        manifestPersonaRole: 'coach',
        id: SYNTHETIC_COACH_ID,
      },
      rows,
      proof: {
        expectedBeforeCreateCount: 0,
        expectedAfterCreateCount: COACH_TEMPLATE_STAGING_FIXTURE_COUNT,
        expectedAfterCleanupCount: 0,
      },
      cleanup: {
        table: 'training_programs',
        strategy: 'exact-owner-and-id-set',
        ownerId: SYNTHETIC_COACH_ID,
        fixtureIds: rows.map(row => row.id),
        namePrefix: COACH_TEMPLATE_STAGING_FIXTURE_NAME_PREFIX,
        idempotent: true,
      },
    },
  }
}

export function evaluateCoachTemplateFixtureCreationCounts(
  beforeCreate: number,
  afterCreate: number,
): CoachTemplateFixtureCreationStatus {
  if (!Number.isInteger(beforeCreate) || !Number.isInteger(afterCreate)
    || beforeCreate < 0 || afterCreate < 0
    || beforeCreate > COACH_TEMPLATE_STAGING_FIXTURE_COUNT
    || afterCreate > COACH_TEMPLATE_STAGING_FIXTURE_COUNT) return 'COUNT_OUT_OF_CONTRACT'
  if (beforeCreate !== 0) return 'REFUSE_CREATE_DIRTY_NAMESPACE'
  if (afterCreate === COACH_TEMPLATE_STAGING_FIXTURE_COUNT) return 'CREATION_COMPLETE'
  if (afterCreate === 0) return 'CREATION_ROLLED_BACK'
  return 'CREATION_PARTIAL_CLEANUP_REQUIRED'
}

export function evaluateCoachTemplateFixtureCleanupCount(
  remainingAfterCleanup: number,
): CoachTemplateFixtureCleanupStatus {
  if (!Number.isInteger(remainingAfterCleanup) || remainingAfterCleanup < 0
    || remainingAfterCleanup > COACH_TEMPLATE_STAGING_FIXTURE_COUNT) return 'COUNT_OUT_OF_CONTRACT'
  return remainingAfterCleanup === 0 ? 'CLEANUP_COMPLETE' : 'CLEANUP_PARTIAL_RETRY_REQUIRED'
}
