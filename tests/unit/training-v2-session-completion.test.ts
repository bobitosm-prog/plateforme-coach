import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import { createActiveWorkoutDraft, type ActiveWorkoutDraft } from '@/lib/training/active-workout-draft'
import {
  persistCriticalWorkout,
  type CompletedWorkoutData,
  type CriticalWorkoutPersistencePort,
} from '@/lib/training/session-persistence'

const workoutSession = readFileSync('app/components/WorkoutSession.tsx', 'utf8')
const completion = readFileSync('app/components/training-v2/SessionCompletion.tsx', 'utf8')
const completionStyles = readFileSync('app/components/training-v2/TrainingV2.module.css', 'utf8')
const history = readFileSync('app/components/training/RecentSessionsList.tsx', 'utf8')
const dashboard = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')
const application = readFileSync('app/(application)/page.tsx', 'utf8')
const translations = ['fr', 'en', 'de'].map(locale => readFileSync(`messages/${locale}.json`, 'utf8'))

const workout: CompletedWorkoutData = {
  duration: 48 * 60 * 1000,
  completedSets: 18,
  totalSets: 18,
  totalVolume: 7200,
  exercises: [{
    name: 'Développé couché',
    muscle: 'chest',
    setsTarget: 1,
    sets: [{ weight: 90, reps: 8, rir: 2 }],
  }],
}

function draft(): ActiveWorkoutDraft {
  return createActiveWorkoutDraft({
    userId: 'user-1',
    programSource: 'personal',
    programId: 'program-1',
    sessionKey: 'program-1:push-a',
    sessionName: 'Push A',
    exercises: [{ name: 'Développé couché', sets: 1 }],
    draftId: 'draft-1',
  })
}

function persistencePort(overrides: Partial<CriticalWorkoutPersistencePort> = {}): CriticalWorkoutPersistencePort {
  return {
    createSession: vi.fn().mockResolvedValue('session-1'),
    countSessionSets: vi.fn().mockResolvedValue(0),
    insertSessionSets: vi.fn().mockResolvedValue(undefined),
    completeSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('Training V2 session completion', () => {
  it('unlocks success only after every critical write', async () => {
    const events: string[] = []
    const port = persistencePort({
      createSession: vi.fn(async () => { events.push('session'); return 'session-1' }),
      insertSessionSets: vi.fn(async () => { events.push('sets') }),
      completeSession: vi.fn(async () => { events.push('finalized') }),
    })

    const result = await persistCriticalWorkout({ draft: draft(), data: workout, port, persistDraft: () => undefined })

    expect(events).toEqual(['session', 'sets', 'finalized'])
    expect(result.draft.status).toBe('completed')
    expect(workoutSession.indexOf('const result = await onFinish')).toBeLessThan(workoutSession.indexOf('setDone(true)'))
  })

  it('never marks a critical save error as completed and preserves the draft', async () => {
    const persisted: ActiveWorkoutDraft[] = []
    await expect(persistCriticalWorkout({
      draft: draft(),
      data: workout,
      port: persistencePort({ completeSession: vi.fn().mockRejectedValue(new Error('provider detail')) }),
      persistDraft: value => persisted.push(value),
    })).rejects.toMatchObject({ code: 'WORKOUT_SESSION_FINALIZE_FAILED' })

    expect(persisted.at(-1)?.status).toBe('save_error')
    expect(persisted.some(value => value.status === 'completed')).toBe(false)
    expect(workoutSession).toContain("saving ? t('done.saving') : t('done.saveErrorTitle')")
  })

  it('renders only the reliable local summary metrics', () => {
    expect(workoutSession).toContain('duration={dur(elapsed)}')
    expect(completion).toContain('<dt>{t(\'duration\')}</dt>')
    expect(completion).toContain('<dt>{t(\'sets\')}</dt>')
    expect(completion).toContain('<dt>{t(\'exercises\')}</dt>')
    expect(completion).not.toMatch(/weekly|trend|graph|30 days|90 days/i)
  })

  it('shows existing PR results compactly without rebuilding PR history', () => {
    expect(completion).toContain("t('newRecord')")
    expect(completion).toContain('records.map(record =>')
    expect(completion).toContain('<strong>{record.value} kg</strong>')
    expect(completion).not.toContain('personal_records')
  })

  it('does not let secondary failures hide durable critical success', () => {
    const criticalIndex = dashboard.indexOf('removeActiveWorkoutDraft(localStorage, critical.draft.draftId)')
    const secondaryIndex = dashboard.indexOf('const secondary = (async () =>')
    const returnIndex = dashboard.indexOf('return { newPRs: [], newBadges: [], secondary }')
    expect(criticalIndex).toBeGreaterThan(-1)
    expect(secondaryIndex).toBeGreaterThan(criticalIndex)
    expect(returnIndex).toBeGreaterThan(secondaryIndex)
    expect(dashboard).toContain("console.error('[workout-secondary] unexpected failure'")
    expect(workoutSession.indexOf('setDone(true)')).toBeLessThan(workoutSession.indexOf('result.secondary?.then'))
  })

  it('keeps the summary visible until explicit user navigation', () => {
    expect(workoutSession).not.toContain('AUTO_REDIRECT_SECONDS')
    expect(workoutSession).not.toContain('autoRedirectCountdown')
    expect(completion.indexOf('completionPrimaryAction')).toBeLessThan(completion.indexOf('completionSecondaryAction'))
    expect(completion).toContain('onClick={onGoHome}')
    expect(completion).toContain('onClick={onGoProgress}')
    expect(completion).toContain("t('backHome')")
    expect(completion).toContain("t('viewProgress')")
    expect(application).toContain("onNavigateHome={() => { h.setWorkoutSession(null); h.setActiveTab('home') }}")
    expect(application).toContain("onNavigateProgress={() => { h.setWorkoutSession(null); h.setActiveTab('progress') }}")
  })

  it('keeps both completion actions visibly styled outside the Training V2 shell', () => {
    const completionCss = completionStyles.slice(completionStyles.indexOf('.completionShell'))
    expect(completionCss).toContain('--training-accent: #e6c364')
    expect(completionCss).toContain('--training-border: rgba(230, 195, 100, 0.18)')
    expect(completionCss).toContain('.completionPrimaryAction')
    expect(completionCss).toContain('.completionSecondaryAction')
  })

  it('keeps training changes session-only and opens completion without an intermediate program modal', () => {
    const finishFlow = workoutSession.slice(workoutSession.indexOf('async function finish()'), workoutSession.indexOf('async function loadVariantsForSession'))
    expect(workoutSession).not.toContain('showSavePopup')
    expect(workoutSession).not.toContain("t('savePopup.")
    expect(workoutSession).not.toMatch(/SAVE PROGRAM|SAUVEGARDER LE PROGRAMME|PROGRAM MODIFIED|PROGRAMME MODIFIÉ/)
    translations.forEach(messages => expect(messages).not.toContain('"savePopup"'))
    expect(workoutSession).toContain("t('endModal.sessionOnly')")
    translations.forEach(messages => expect(messages).toContain('"sessionOnly"'))
    expect(workoutSession).toContain('setSessionModified(true)')
    expect(workoutSession).toContain('setShowEndModal(false); void finish()')
    expect(finishFlow).not.toMatch(/programSource|custom_programs|coach_programs|program_templates/)
  })

  it('preserves continue and destructive delete behavior in the end-session sheet', () => {
    expect(workoutSession).toContain("onClick={() => setShowEndModal(false)}")
    expect(workoutSession).toContain("onClick={() => setShowDeleteConfirm(true)}")
    expect(workoutSession).toContain('cleanupDraft()')
    expect(workoutSession).toContain('onClose()')
  })

  it('limits the primary recent history to three rows and keeps expanded history secondary', () => {
    expect(history).toContain('workoutHistory.slice(0, 3)')
    expect(history).toContain('filtered.slice(0, 20)')
    expect(history).toContain('<TrainingSheet')
    expect(history).toContain('data-training-history-filters="advanced"')
  })

  it('distinguishes loading, error and empty history states', () => {
    expect(history.indexOf("state === 'loading'")).toBeLessThan(history.indexOf("state === 'error'"))
    expect(history).toContain("state === 'error'")
    expect(history).toContain('recent.length === 0')
    expect(history).toContain("t('loadError')")
    expect(history).toContain("t('noSessions')")
  })

  it('adds no completion summary read or long analytics', () => {
    const completedBranch = workoutSession.slice(workoutSession.indexOf('if (done) {'), workoutSession.indexOf('return (\n    <TrainingV2 session>'))
    expect(completedBranch).not.toContain('supabase')
    expect(completedBranch).not.toContain('get_workout_session_summary')
    expect(completedBranch).not.toMatch(/previousSessions|currentWeekVolume|lastWeekVolume|volumePercent/)
  })

  it('replaces the global close refresh with targeted local dashboard updates', () => {
    expect(application).toContain('onClose={() => h.setWorkoutSession(null)}')
    expect(application).not.toContain('onClose={() => { h.setWorkoutSession(null); void h.fetchAll(true) }}')
    expect(dashboard).toContain('setWSessions(previous => [completedSession')
    expect(dashboard).toContain("setWorkoutHistoryState('ready')")
    expect(dashboard).toContain('scheduledHook.markDateCompletedLocally(todayStr, completedAt)')
  })
})
