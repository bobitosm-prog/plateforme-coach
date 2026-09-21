import {describe,it,expect} from 'vitest'
import {editorDays,setDayRest,resizeTrainingDays,editExercise,validateEditorDays,programSessionCount,programSource,readEditorDraft,editorDraftKey} from '@/lib/training/program-editor'
import {resolveProgramExercise} from '@/lib/training/resolve-program'
import {getRestSeconds} from '@/lib/utils/exercise'
const now=new Date('2026-09-21T12:00:00Z')
const ex={name:'Row',sets:3,reps:'8-12',rest_seconds:120}
describe('program editor preservation',()=>{
 it('pads without mutating and parks exercises across rest/frequency changes',()=>{
  const input=[{exercises:[ex]}];const copy=JSON.stringify(input);const days=editorDays(input)
  expect(days).toHaveLength(7);expect(JSON.stringify(input)).toBe(copy)
  expect(setDayRest(days,0,true)[0].exercises).toEqual([ex])
  expect(setDayRest(setDayRest(days,0,true),0,false)[0].exercises).toEqual([ex])
  expect(resizeTrainingDays(resizeTrainingDays(days,0),1)[0].exercises).toEqual([ex])
  expect(programSessionCount(setDayRest(days,0,true))).toBe(0)
 })
 it('writes canonical rest values used during the actual workout',()=>{
  const edited=editExercise(ex,'rest_seconds',60,null,'program',now)
  expect(edited.rest).toBe(60);expect(getRestSeconds(resolveProgramExercise(edited,null,now))).toBe(60)
 })
 it('changes only the selected phase and current weekly override',()=>{
  const phased={...ex,phases:{p1:{sets:4,rest_seconds:120},p2:{sets:5,rest_seconds:180}},_weekly_sets:{'2026-09-21':2,'2026-09-28':6}}
  const program={current_week:6,total_weeks:8}
  const changed=editExercise(phased,'rest_seconds',45,program,'phase',now)
  expect(changed.phases.p1).toEqual(phased.phases.p1);expect(changed.rest_seconds).toBe(120)
  expect(getRestSeconds(resolveProgramExercise(changed,program,now))).toBe(45)
  const sets=editExercise(phased,'sets',3,program,'phase',now)
  expect(sets._weekly_sets).toEqual({'2026-09-28':6});expect(resolveProgramExercise(sets,program,now).sets).toBe(3)
  expect(phased._weekly_sets['2026-09-21']).toBe(2)
 })
 it('applies all-phase changes and can clear a phase technique',()=>{
  const phased={...ex,technique:'fst7',phases:{p1:{sets:7},p2:{sets:7}}}
  const changed=editExercise(phased,'rest_seconds',45,null,'program',now)
  expect(changed.phases.p1.rest_seconds).toBe(45);expect(changed.phases.p2.rest_seconds).toBe(45)
  expect(resolveProgramExercise(editExercise(phased,'technique',null,null,'phase',now),null,now).technique).toBeNull()
 })
 it('validates ranges, timed prescriptions and FST-7; rejects malformed values',()=>{
  const valid=(exercise:any)=>validateEditorDays([{exercises:[exercise]}])
  expect(valid(ex)).toBe(true);expect(valid({...ex,reps:'12-8'})).toBe(false)
  expect(valid({...ex,rest_seconds:-1})).toBe(false)
  expect(valid({...ex,name:'Planche',reps:0,duration_seconds:45})).toBe(true)
  expect(valid({...ex,name:'Planche',duration_seconds:0})).toBe(false)
  expect(valid(editExercise(ex,'technique','fst7',null,'program',now))).toBe(true)
  expect(valid({...ex,technique:'fst7'})).toBe(false)
  expect(validateEditorDays([null as any])).toBe(false)
 })
 it('uses owner-scoped, revision-bound expiring drafts and preserves AI origin',()=>{
  const value={baseline:'old',savedAt:now.getTime(),name:'Draft',days:[{exercises:[ex]}],aiResult:{description:'AI'}}
  expect(editorDraftKey('a','p')).not.toBe(editorDraftKey('b','p'))
  expect(readEditorDraft(JSON.stringify(value),'old',now.getTime())?.aiResult?.description).toBe('AI')
  expect(readEditorDraft(JSON.stringify(value),'new',now.getTime())).toBeNull()
  expect(readEditorDraft(JSON.stringify({...value,savedAt:undefined}),'old',now.getTime())).toBeNull()
  expect(readEditorDraft(JSON.stringify(value),'old',now.getTime()+8*86400000)).toBeNull()
  expect(programSource('athena_monthly')).toBe('sourceAi')
 })
})
