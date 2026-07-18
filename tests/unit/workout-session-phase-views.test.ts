import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { WorkoutActiveSessionFinishView, WorkoutActiveSessionHeaderView } from '../../app/components/training/workout-session/WorkoutActiveSessionViews'
import { WorkoutCompletionView } from '../../app/components/training/workout-session/WorkoutCompletionView'
import { WorkoutDraftResumeView } from '../../app/components/training/workout-session/WorkoutDraftResumeView'
import { WorkoutAbandonConfirmationView, WorkoutEndConfirmationView, WorkoutRepetitionsWarningView, WorkoutTemplateSaveView } from '../../app/components/training/workout-session/WorkoutFinalizationViews'
import { WorkoutActiveRestView, WorkoutRestCompleteView } from '../../app/components/training/workout-session/WorkoutRestViews'
import type { WorkoutPresentationExercise } from '../../app/components/training/workout-session/types'

const translate = (key: string, values?: Record<string, string | number>) => values ? `${key}:${JSON.stringify(values)}` : key
const noop = vi.fn()

function phaseCount(html: string) {
  return (html.match(/data-workout-phase=/g) ?? []).length
}

describe('WorkoutSession phase presentation views', () => {
  it('renders the active-session header and finish control from typed data', () => {
    const header = renderToStaticMarkup(h(WorkoutActiveSessionHeaderView, { sessionName: 'Haut du corps', elapsed: '4min 2s', completedSets: 2, totalSets: 6, progressPercent: 33, t: translate, onClose: noop }))
    const finish = renderToStaticMarkup(h(WorkoutActiveSessionFinishView, { elapsed: '4min 2s', t: translate, onFinish: noop }))
    expect(header).toContain('data-workout-view="active-session-header"')
    expect(header).toContain('Haut du corps')
    expect(header).toContain('2/6 sets')
    expect(header).toContain('width:33%')
    expect(finish).toContain('data-workout-view="active-session-finish"')
    expect(finish).toContain('4min 2s')
  })

  it('renders the preparation phase with its current session context', () => {
    const html = renderToStaticMarkup(h(WorkoutDraftResumeView, { sessionName: 'Force A', t: translate, onDiscard: noop, onResume: noop }))
    expect(html).toContain('data-workout-phase="preparation"')
    expect(html).toContain('draft.description')
    expect(html).toContain('Force A')
    expect(phaseCount(html)).toBe(1)
  })

  it('renders active and completed rest as separate phases', () => {
    const active = renderToStaticMarkup(h(WorkoutActiveRestView, { seconds: 9, maximumSeconds: 90, currentRir: 2, rirTrackingEnabled: true, rirScaleAdvanced: true, t: translate, onSetRir: noop, onAddThirtySeconds: noop, onSkip: noop }))
    const completed = renderToStaticMarkup(h(WorkoutRestCompleteView, { message: 'Développé couché', t: translate, onAddThirtySeconds: noop, onContinue: noop }))
    expect(active).toContain('data-workout-phase="resting"')
    expect(active).toContain('9s')
    expect(active).toContain('>2<')
    expect(completed).toContain('data-workout-phase="rest-complete"')
    expect(completed).toContain('Développé couché')
    expect(phaseCount(active)).toBe(1)
    expect(phaseCount(completed)).toBe(1)
  })

  it('renders finalization, abandon and set validation independently', () => {
    const finalizing = renderToStaticMarkup(h(WorkoutEndConfirmationView, { elapsed: '12min 4s', completedSets: 3, totalSets: 5, volume: 420, t: translate, onSave: noop, onDelete: noop, onContinue: noop }))
    const abandon = renderToStaticMarkup(h(WorkoutAbandonConfirmationView, { completedSets: 2, t: translate, onCancel: noop, onConfirm: noop }))
    const warning = renderToStaticMarkup(h(WorkoutRepetitionsWarningView, { repetitions: 31, t: translate, onEdit: noop, onConfirm: noop }))
    expect(finalizing).toContain('data-workout-phase="finalizing"')
    expect(finalizing).toContain('12min 4s')
    expect(finalizing).toContain('420 kg')
    expect(abandon).toContain('data-workout-phase="abandon-confirmation"')
    expect(abandon).toContain('deleteModal.withSets')
    expect(warning).toContain('data-workout-phase="set-validation"')
    expect(warning).toContain('31')
  })

  it('renders the optional template-save phase with deterministic choices', () => {
    const html = renderToStaticMarkup(h(WorkoutTemplateSaveView, { templateName: '', t: translate, onSelectName: noop, onSave: noop, onSkip: noop }))
    expect(html).toContain('data-workout-phase="template-save"')
    expect(html).toContain('saveTemplate.title')
    expect(phaseCount(html)).toBe(1)
  })

  it('renders a minimal completion without optional legacy history', () => {
    const html = renderToStaticMarkup(h(WorkoutCompletionView, { sessionName: 'Séance libre', elapsedMs: 61_000, completedSets: 0, totalSets: 0, totalVolume: 0, exercises: [], summary: null, summaryLoading: false, autoRedirectCountdown: 8, now: new Date('2026-07-18T10:30:00Z'), locale: 'fr', t: translate, tMuscle: translate, formatDuration: () => '1min 1s', onClose: noop }))
    expect(html).toContain('data-workout-phase="completed"')
    expect(html).toContain('Séance libre')
    expect(html).toContain('1min 1s')
    expect(phaseCount(html)).toBe(1)
  })

  it('renders completed sets, progression and legacy optional fields without mutating input', () => {
    const exercises: WorkoutPresentationExercise[] = [{ name: 'Presse', muscle: 'Quadriceps', sets: [{ id: 'set-1', done: true, weight: 120, rir: null }, { id: 'set-2', done: false, weight: '', rir: null }] }]
    const snapshot = structuredClone(exercises)
    const html = renderToStaticMarkup(h(WorkoutCompletionView, { sessionName: 'Jambes', elapsedMs: 120_000, completedSets: 1, totalSets: 2, totalVolume: 1200, exercises, summary: { currentWeekVolume: 2400, lastWeekVolume: 2000, previousSessions: [{ id: 'old', name: 'Jambes', date: '2026-07-10T10:00:00Z', volume: 900 }] }, summaryLoading: false, autoRedirectCountdown: 3, now: new Date('2026-07-18T10:30:00Z'), locale: 'fr', t: translate, tMuscle: translate, formatDuration: () => '2min', onClose: noop }))
    expect(html).toContain('Presse')
    expect(html).toContain('120 kg')
    expect(html).toContain('+20.0%')
    expect(exercises).toEqual(snapshot)
  })
})
