import { expect, it } from 'vitest'
import { normalizeWorkoutDraftExercises as normalize, findNextWorkoutPosition } from '@/lib/training/active-workout-draft'
import { transitionRest } from '@/lib/training/guided-techniques'
import { addWorkoutSet, addDropStage, configureFst7 } from '@/lib/training/technique-execution'
import { setTonnage } from '@/lib/training/load-volume'
const exercise = (extra = {}) => normalize([{ name: 'Kick Back Fessiers Poulie', muscle: 'Fessiers', sets: 3, reps: 10, rest: 90, ...extra }])[0]
it.each(['Fentes', 'Fentes arrière', 'Fentes Bulgares', 'Fentes Marchées', 'Kickbacks Câble', 'Kickbacks machine', 'Kickbacks poulie'])('expands %s into three alternating rounds', name => {
 const e = exercise({name}); expect(e.targetSets).toBe(3)
 expect(e.sets.map(s => [s.roundNumber, s.side])).toEqual([[1,'left'],[1,'right'],[2,'left'],[2,'right'],[3,'left'],[3,'right']])
 expect(new Set(e.sets.map(s=>s.id)).size).toBe(6)
 e.sets[0].done=true
 expect(transitionRest([e],0,{currentExerciseIndex:0,currentSetIndex:1})).toBe(45)
 expect(normalize([e])[0].sets).toEqual(e.sets)
})
it('preserves legacy drafts and excludes triceps and bilateral exercises', () => {
 for (const name of ['Kickback haltère triceps','Squat Barre']) expect(exercise({name}).sets).toHaveLength(3)
 const legacy=exercise({name:'Squat'});legacy.name='Fentes';legacy.sets[0].done=true
 expect(normalize([legacy])[0].sets).toEqual(legacy.sets)
})
it('adds a pair while preserving completed rows and per-leg advanced chains', () => {
 let e=exercise({technique:'dropset',technique_details:'2'})
 expect(e.sets).toHaveLength(10)
 e.sets[0].done=true
 e=addWorkoutSet([e],0)![0]
 expect(e.targetSets).toBe(4);expect(e.sets).toHaveLength(12);expect(e.sets[0].done).toBe(true)
 for(const s of e.sets.filter(s=>s.parentSetNumber)) {
  const parent=e.sets.find(p=>p.num===s.parentSetNumber)!
  expect(parent.side).toBe(s.side);expect(parent.roundNumber).toBe(4)
 }
 expect(normalize([e])[0].sets).toEqual(e.sets)
 e=addDropStage(e);expect(e.sets).toHaveLength(14)
 for(const s of e.sets.filter(s=>s.parentSetNumber)) expect(e.sets.find(p=>p.num===s.parentSetNumber)?.side).toBe(s.side)
})
it('keeps rest-pause pauses, zero drop rest and final completion rest', () => {
 const e=exercise({technique:'restpause',technique_details:'2,15'})
 const mini=e.sets.findIndex(s=>!!s.parentSetNumber)
 expect(transitionRest([e],0,{currentExerciseIndex:0,currentSetIndex:mini})).toBe(15)
 e.technique='dropset';expect(transitionRest([e],0,{currentExerciseIndex:0,currentSetIndex:mini})).toBe(0)
 e.sets.forEach(s=>s.done=true);expect(transitionRest([e],0,{currentExerciseIndex:0,currentSetIndex:0})).toBe(0)
})
it('supports seven rounds and avoids multiplying per-side volume twice', () => {
 expect(configureFst7(exercise()).sets).toHaveLength(14)
 expect(setTonnage({weight:10,reps:10,side:'left',loadMode:'unilateral_both'})).toBe(100)
 expect(setTonnage({weight:10,reps:10,loadMode:'unilateral_both'})).toBe(200)
 expect(setTonnage({weight:10,reps:10,side:'left',loadMode:'two_dumbbells'})).toBe(200)
})
it('completes both legs in each biset round before advancing its partner', () => {
 const ex=normalize([{name:'Fentes',sets:2,technique:'superset',technique_details:'Curl'},{name:'Curl',sets:2}])
 ex[0].sets[0].done=true
 expect(findNextWorkoutPosition(ex,0,0).currentExerciseIndex).toBe(0)
 ex[0].sets[1].done=true
 expect(findNextWorkoutPosition(ex,0,1).currentExerciseIndex).toBe(1)
})
