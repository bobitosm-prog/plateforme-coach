import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const workout = read('app/components/WorkoutSession.tsx')
const timer = read('app/components/tabs/training/useTrainingWorkoutTimer.ts')
const controller = read('app/components/tabs/TrainingTabController.tsx')
const actions = read('lib/client-dashboard/use-client-dashboard-actions.ts')

describe('workout transition wiring characterization', () => {
  it('keeps draft creation, resume, abandonment and completion wired to the shared storage boundary', () => {
    expect(workout).toContain('writeWorkoutDraft(localStorage, draft)')
    expect(workout).toContain('readWorkoutDraft<Exo>(localStorage, name)')
    expect(workout).toContain('const resumeDraft = () =>')
    expect(workout).toContain('const discardDraft = () => { cleanupDraft(); setDraftPrompt(null) }')
    expect(workout).toContain('cleanupDraft(); onClose()')
    expect(actions).toContain('clearActiveWorkout(localStorage)')
  })

  it('characterizes set mutation and rest start, finish and cancellation', () => {
    expect(timer).toContain("next[setIndex] = !next[setIndex]")
    expect(timer).toContain('setRestTimer(restSeconds)')
    expect(timer).toContain('setRestRunning(true)')
    expect(timer).toContain('setRestRunning(false)')
    expect(timer).toContain('setRestTimer(0)')
    expect(timer).toContain('setCompletedSets(previous =>')
    expect(timer).toContain('setSetInputs(previous =>')
  })

  it('keeps the quick TrainingTab flow without workout_sets', () => {
    const quickFlow = controller.slice(controller.indexOf('async function finishTrainingWorkout()'), controller.indexOf('function handleExerciseInfo'))
    expect(quickFlow).toContain("from('workout_sessions').insert")
    expect(quickFlow).not.toContain("from('workout_sets')")
    expect(quickFlow).toContain("localStorage.removeItem(`moovx-sets-")
    expect(quickFlow).toContain("localStorage.removeItem(`moovx-inputs-")
  })

  it('keeps detailed history and program completion as unlinked writes', () => {
    expect(actions).toContain("from('workout_sessions').insert")
    expect(actions).toContain("from('completed_sessions').insert")
    const completionInsert = actions.slice(actions.indexOf("from('completed_sessions').insert"), actions.indexOf("toast.success('Séance terminée"))
    expect(completionInsert).not.toContain('session_id')
    expect(completionInsert).not.toContain('workout_session_id')
  })

  it('does not introduce network, database or UI dependencies into the storage boundary', () => {
    const storage = read('lib/training/workout-session-storage.ts')
    expect(storage).not.toMatch(/React|next\/|supabase|fetch\(|window|document/)
  })
})
