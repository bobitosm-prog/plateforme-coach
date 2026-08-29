import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { getTimelineExerciseState } from '../../app/components/training-v2/SessionTimeline'

const trainingTab = readFileSync('app/components/tabs/TrainingTab.tsx', 'utf8')
const workoutSession = readFileSync('app/components/WorkoutSession.tsx', 'utf8')
const noActiveSession = readFileSync('app/components/training-v2/NoActiveSession.tsx', 'utf8')
const sessionHero = readFileSync('app/components/training-v2/TrainingSessionHero.tsx', 'utf8')
const timeline = readFileSync('app/components/training-v2/SessionTimeline.tsx', 'utf8')
const focus = readFileSync('app/components/training-v2/ActiveExerciseFocus.tsx', 'utf8')
const v2Sources = [noActiveSession, sessionHero, timeline, focus].join('\n')

describe('Training V2 shell and focus mode', () => {
  it('renders distinct no-session and active-session heroes from existing inputs', () => {
    expect(trainingTab).toContain('<NoActiveSession')
    expect(noActiveSession).toContain('mode="planned"')
    expect(workoutSession).toContain('mode="active"')
    expect(sessionHero).toContain("mode: 'planned' | 'active'")
    expect(sessionHero).toContain('completedExercises')
    expect(sessionHero).toContain('completedSets')
  })

  it('computes compact timeline states in program order', () => {
    const rows = [
      { completedSets: 4, totalSets: 4 },
      { completedSets: 1, totalSets: 3 },
      { completedSets: 0, totalSets: 3 },
    ]
    expect(rows.map((row, index) => getTimelineExerciseState(row, index, 1)))
      .toEqual(['done', 'active', 'upcoming'])
    expect(timeline).toContain("aria-current={active ? 'step' : undefined}")
    expect(timeline).toContain('onClick={() => onSelect(index)}')
  })

  it('shows only the selected exercise through the single reliable logger path', () => {
    expect(workoutSession).toContain('if (idx !== activeExerciseIndex) return null')
    expect(workoutSession).toContain('<ActiveExerciseFocus')
    expect(focus).toContain('data-training-v2-logger="primary"')
    expect(trainingTab).toContain('legacyLoggerHidden')
    expect(trainingTab).not.toContain("from('workout_sessions').insert")
  })

  it('keeps the active program source explicit and coach-safe', () => {
    expect(noActiveSession).toContain("programSource === 'coach'")
    expect(noActiveSession).toContain("programSource === 'personal'")
    expect(workoutSession).toContain("draft.programSource === 'coach'")
    expect(trainingTab).toContain('activeTrainingProgram.source')
  })

  it('keeps save errors retryable and previous-performance errors distinct from no history', () => {
    expect(workoutSession).toContain("draft.status === 'save_error'")
    expect(workoutSession).toContain('onClick={() => void finish()}')
    expect(workoutSession).toContain('previousError={previousState === null}')
    expect(focus).toContain("previousError ? t('previousError') : previous || t('noPrevious')")
  })

  it('keeps generation secondary and out of visual V2 components', () => {
    expect(trainingTab.indexOf('<NoActiveSession')).toBeLessThan(trainingTab.indexOf('<ProgramBuilder'))
    expect(v2Sources).not.toMatch(/ProgramBuilder|generate-program|generate-custom-program|anthropic|openai/i)
  })

  it('does not introduce direct Supabase reads or a second data authority in V2 components', () => {
    expect(v2Sources).not.toMatch(/supabase|createBrowserClient|\.from\(|\.rpc\(/i)
    expect(v2Sources).not.toMatch(/localStorage|sessionStorage|fetch\(/i)
    expect(workoutSession).toContain('persistDraft({ currentExerciseIndex: index, currentSetIndex })')
  })
})
