import { describe, expect, it } from 'vitest'
import { canonicalExerciseName } from '@/lib/training/exercise-identity'
import { normalizeExerciseName, findExerciseMatch } from '@/lib/exercise-matching'
import { defaultLoadMode, setTonnage } from '@/lib/training/load-volume'
import { normalizeWorkoutDraftExercises } from '@/lib/training/active-workout-draft'
import { addDropStage, configureFst7 } from '@/lib/training/technique-execution'
import { buildPreviousPerformanceMap } from '@/lib/training/set-logging'

describe('Reviewed identity and explicit load convention', () => {
  it('consolidates reviewed barbell aliases but never dumbbells or angles', () => {
    expect(canonicalExerciseName('Développé couché')).toBe('Développé Couché Barre')
    expect(canonicalExerciseName('Développé couché à la barre')).toBe('Développé Couché Barre')
    expect(normalizeExerciseName('Développé couché (haltères)')).not.toBe(normalizeExerciseName('Développé couché (barre)'))
    expect(canonicalExerciseName('Développé incliné barre')).toBe('Développé incliné barre')
  })
  it.each([
    ['two_dumbbells',400], ['barbell_total',200], ['total',200],
    ['one_dumbbell',200], ['unilateral_both',400], ['external_only',200],
    ['legacy',200], [null,200], ['band',0],
  ])('%s: counts only its explicit multiplier', (load_mode, expected) => {
    expect(setTonnage({weight:20,reps:10,completed:true,load_mode})).toBe(expected)
  })
  it('rejects unvalidated, timed and invalid performance', () => {
    for(const extra of [{done:false},{completed:false},{duration_seconds:30},{weight:-1},{weight:Infinity},{reps:NaN}])
      expect(setTonnage({weight:20,reps:10,...extra})).toBe(0)
  })
  it('distinguishes two dumbbells, a single dumbbell, and both sides', () => {
    expect(defaultLoadMode({name:'Développé couché haltères'})).toBe('two_dumbbells')
    expect(defaultLoadMode({name:'Pull-over haltère'})).toBe('one_dumbbell')
    expect(defaultLoadMode({name:'Rowing haltère un bras'})).toBe('unilateral_both')
    expect(defaultLoadMode({name:'Développé couché'})).toBe('barbell_total')
  })
  it('preserves old logged weights and does not silently double a resumed session', () => {
    const [old] = normalizeWorkoutDraftExercises([{name:'Développé couché haltères',sets:[{num:1,weight:40,reps:10,done:true}]}])
    expect(old.loadMode).toBe('legacy')
    expect(setTonnage(old.sets[0])).toBe(400)
  })
  it('propagates the convention into every advanced-technique stage', () => {
    const [exercise] = normalizeWorkoutDraftExercises([{name:'Développé couché haltères',sets:3}])
    expect(addDropStage(exercise).sets.every(set=>set.loadMode==='two_dumbbells')).toBe(true)
    expect(configureFst7(exercise).sets.every(set=>set.loadMode==='two_dumbbells')).toBe(true)
    const [restpause]=normalizeWorkoutDraftExercises([{name:exercise.name,sets:3,technique:'restpause',techniqueDetails:'2,15'}])
    expect(restpause.sets.every(set=>set.loadMode==='two_dumbbells')).toBe(true)
  })
  it('never prefills per-dumbbell loads from unknown or total-load history', () => {
    const ref={key:'bench',exerciseId:'id',name:'Développé couché haltères',loadMode:'two_dumbbells'}
    const row={exercise_id:'id',weight:40,reps:10,session_id:'old',completed:true}
    expect(buildPreviousPerformanceMap([ref],[row]).bench.state).toBe('no_history')
    expect(buildPreviousPerformanceMap([ref],[{...row,load_mode:'total'}]).bench.state).toBe('no_history')
    expect(buildPreviousPerformanceMap([ref],[{...row,load_mode:'two_dumbbells',weight:20}]).bench.lastWeight).toBe(20)
  })
})
