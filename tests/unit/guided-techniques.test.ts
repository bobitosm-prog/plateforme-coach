import { describe, it, expect } from 'vitest'
import { normalizeWorkoutDraftExercises as normalize, findNextWorkoutPosition as next, createActiveWorkoutDraft, readActiveWorkoutDraft, writeActiveWorkoutDraft } from '@/lib/training/active-workout-draft'
import { bisetPairs, relinkWorkoutBiset, startWorkoutBiset, techniqueIssue, transitionRest, workoutBisetAsSolo, workoutBisetPartnerOptions, workoutBisetSetupOptions } from '@/lib/training/guided-techniques'
import { editExercise, validateEditorDays, validateProgramEdit } from '@/lib/training/program-editor'
import { resolveProgramExercise } from '@/lib/training/resolve-program'

const pair = () => normalize([{name:'A',sets:3,reps:10,rest:90,technique:'superset',technique_details:'B'},{name:'B',sets:3,reps:12,rest:60},{name:'C',sets:1,reps:10}])
describe('prescription to guided workout', () => {
  it('prepares rest-pause once after the final main set and validates historical prescriptions safely',()=>{
    const exercise={name:'Curl',sets:3,reps:10,rest:90,technique:'restpause',technique_details:'3,20'}
    const ex=normalize([exercise])
    expect(ex[0].sets.map(s=>s.parentSetNumber)).toEqual([undefined,undefined,undefined,3,4,5])
    expect(normalize(ex)).toEqual(ex)
    ex[0].sets.slice(0,3).forEach(s=>s.done=true)
    expect(transitionRest(ex,0,next(ex,0,2))).toBe(20)
    const days=[{exercises:[{...exercise,technique_details:''}]}]
    expect(validateEditorDays(days)).toBe(false)
    expect(validateProgramEdit(days,days)).toBe(true)
    expect(validateProgramEdit(days,[])).toBe(false)
    expect(techniqueIssue(normalize(days[0].exercises),0)).toBe('invalidRestPause')
  })
  it('prepares final drop stages once, keeps blank loads and survives partial resume', () => {
    const ex = normalize([{name:'Row',sets:3,technique:'dropset',technique_details:'2'}])[0]
    expect(ex.sets.map(s=>s.parentSetNumber)).toEqual([undefined,undefined,undefined,3,4])
    expect(ex.sets[3].weight).toBe('')
    ex.sets[0].done=true; ex.sets[0].weight=40; ex.sets[0].weightRaw='40'
    expect(normalize([ex])).toEqual([ex])
    ex.sets[2].done=true
    expect(transitionRest([ex],0,next([ex],0,2))).toBe(0)
  })
  it('does not invent incomplete drop or biset prescriptions', () => {
    const ex=normalize([{name:'Face Pull',sets:3,technique:'dropset',technique_details:''},{name:'Raise',sets:3,technique:'superset',technique_details:'Absent'}])
    expect(ex[0].sets).toHaveLength(3)
    expect(techniqueIssue(ex,0)).toBe('missingDrops')
    expect(techniqueIssue(ex,1)).toBe('invalidBiset')
  })
  it('repairs a historical missing partner only after an explicit workout choice', () => {
    const exercises = normalize([
      {name:'Élévations frontales poulie',sets:3,technique:'superset',technique_details:'Oiseau / Reverse Fly'},
      {name:'Reverse pec deck',sets:3},
      {name:'Arnold press',sets:4},
    ])
    expect(techniqueIssue(exercises,0)).toBe('invalidBiset')
    expect(workoutBisetPartnerOptions(exercises,0)).toEqual([1])
    const repaired = relinkWorkoutBiset(exercises,0,1)!
    expect(repaired[0].techniqueDetails).toBe('Reverse pec deck')
    expect(repaired[1].techniqueDetails).toBe('Élévations frontales poulie')
    expect(bisetPairs(repaired)).toEqual([{a:0,b:1}])
    expect(techniqueIssue(repaired,0)).toBeNull()
    expect(exercises[0].techniqueDetails).toBe('Oiseau / Reverse Fly')
    const solo = workoutBisetAsSolo(exercises,0)
    expect(solo[0].technique).toBeUndefined()
    expect(solo[0].techniqueDetails).toBeUndefined()
  })
  it('creates a biset from two unstarted workout exercises without changing the program', () => {
    const exercises = normalize([{name:'Raise',sets:3},{name:'Press',sets:3}])
    expect(workoutBisetSetupOptions(exercises, 0)).toEqual([1])
    const paired = startWorkoutBiset(exercises, 0, 1)!
    expect(bisetPairs(paired)).toEqual([{a:0,b:1}])
    expect(paired.map(exercise => exercise.techniqueDetails)).toEqual(['Press','Raise'])
    expect(exercises.every(exercise => !exercise.technique)).toBe(true)
    paired[0].sets[0].done = true
    expect(startWorkoutBiset(paired, 0, 1)).toBeNull()
    expect(workoutBisetSetupOptions(paired, 0)).toEqual([])
  })
  it('refuses a new biset after logging or with incompatible partners', () => {
    const logged = normalize([{name:'A',sets:2},{name:'B',sets:2}])
    logged[1].sets[0].done = true
    expect(startWorkoutBiset(logged,0,1)).toBeNull()
    const mismatch = normalize([{name:'A',sets:2},{name:'B',sets:3}])
    expect(workoutBisetSetupOptions(mismatch,0)).toEqual([])
    const duplicate = normalize([{name:'A',sets:2},{name:'B',sets:2},{name:'B',sets:2}])
    expect(workoutBisetSetupOptions(duplicate,0)).toEqual([])
  })
  it('alternates A1 B1 A2 B2 A3 B3 with rest only after B', () => {
    const ex=pair(); let position={currentExerciseIndex:0,currentSetIndex:0}
    const visits:number[][]=[], rests:number[]=[]
    for(let n=0;n<6;n++) {
      const {currentExerciseIndex:i,currentSetIndex:s}=position
      visits.push([i,s]);ex[i].sets[s].done=true
      position=next(ex,i,s);rests.push(transitionRest(ex,i,position))
    }
    expect(visits).toEqual([[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]])
    expect(rests).toEqual([0,60,0,60,0,60])
    expect(position.currentExerciseIndex).toBe(2)
  })
  it('resumes between A and B with unchanged set identifiers and navigation',()=>{
    const draft=createActiveWorkoutDraft({userId:'synthetic',programSource:'personal',programId:null,sessionKey:'pull',sessionName:'Test',exercises:pair()})
    draft.exercises[0].sets[0].done=true
    Object.assign(draft,next(draft.exercises,0,0))
    const rows=new Map<string,string>(),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v)},removeItem:(k:string)=>{rows.delete(k)}}
    writeActiveWorkoutDraft(storage,draft)
    expect(readActiveWorkoutDraft(storage,'synthetic')).toEqual(draft)
    expect(draft.currentExerciseIndex).toBe(1)
  })
  it('rejects absent, duplicate, overlapping, timed and mismatched partners',()=>{
    for (const alter of [
      (ex:ReturnType<typeof pair>)=>{ex[1].name='missing'},
      (ex:ReturnType<typeof pair>)=>{ex[2].name='B'},
      (ex:ReturnType<typeof pair>)=>{ex[1].targetSets=4},
      (ex:ReturnType<typeof pair>)=>{ex[1].technique='dropset'},
      (ex:ReturnType<typeof pair>)=>{ex[1].targetDurationSeconds=30},
      (ex:ReturnType<typeof pair>)=>{ex[2].targetSets=3;ex[2].technique='superset';ex[2].techniqueDetails='B'},
    ]) {const ex=pair();alter(ex);expect(bisetPairs(ex)).toEqual([])}
  })
  it('does not skip intervening exercises when a nonadjacent pair finishes',()=>{
    const ex=pair();[ex[1],ex[2]]=[ex[2],ex[1]]
    ex[0].sets.forEach(s=>s.done=true);ex[2].sets.forEach(s=>s.done=true)
    expect(next(ex,2,2)).toEqual({currentExerciseIndex:1,currentSetIndex:0})
  })
  it('persists displayed defaults, validates pairs and resolves phase-specific drops',()=>{
    const ex={name:'Row',sets:3,reps:10,rest:90,phases:{p1:{sets:3},p2:{sets:4}}}
    const edited=editExercise(ex,'technique','dropset',{current_week:1},'phase')
    const resolved=resolveProgramExercise(edited,{current_week:1})
    expect(normalize([resolved])[0].sets).toHaveLength(5)
    expect(edited.phases.p2).toEqual({sets:4})
    expect(validateEditorDays([{exercises:[{name:'A',sets:3,reps:10,technique:'dropset',technique_details:''}]}])).toBe(false)
    expect(validateEditorDays([{exercises:[{name:'A',sets:3,reps:10,technique:'superset',technique_details:'B'},{name:'B',sets:3,reps:10}]}])).toBe(true)
  })
})
