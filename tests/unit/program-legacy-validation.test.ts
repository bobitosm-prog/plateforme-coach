import {describe,it,expect} from 'vitest'
import {validateProgramEdit,programTechniqueIssues,editorDays} from '@/lib/training/program-editor'
const baseline=()=>editorDays([
  {name:'Pull',exercises:[{name:'Face Pulls',sets:3,reps:15,technique:'dropset',technique_details:''},{name:'Curl',sets:3,reps:10,rest_seconds:90}]},
  {name:'Upper',exercises:[{name:'Raise',sets:3,reps:12,technique:'superset',technique_details:'Missing'}]}
])
describe('incremental legacy repair',()=>{
 it('allows unrelated edits in the same or another day while preserving old anomalies',()=>{
  const original=baseline(),candidate=structuredClone(original)
  candidate[0].exercises[1].rest_seconds=60
  expect(validateProgramEdit(candidate,original)).toBe(true)
  expect(programTechniqueIssues(candidate,original).every(i=>i.inherited)).toBe(true)
 })
 it('saves a repaired day with an unresolved other day',()=>{
  const original=baseline(),candidate=structuredClone(original)
  candidate[0].exercises[0].technique_details='2'
  expect(validateProgramEdit(candidate,original)).toBe(true)
  expect(programTechniqueIssues(candidate,original)).toMatchObject([{day:1,exercise:0,name:'Raise',inherited:true}])
 })
 it('rejects newly introduced, modified and copied invalid techniques and invalid ordinary prescriptions',()=>{
  const original=baseline()
  expect(validateProgramEdit(original)).toBe(false)
  for(const modify of [
    (c:any)=>{c[0].exercises[0].sets=4},
    (c:any)=>{c[0].exercises[1].technique='dropset'},
    (c:any)=>{c[1].exercises.push({...c[1].exercises[0]})},
    (c:any)=>{c[0].exercises[1].reps='bad'},
    (c:any)=>{c[0].exercises[1].rest_seconds=-1},
  ]) {const candidate=structuredClone(original);modify(candidate);expect(validateProgramEdit(candidate,original)).toBe(false)}
 })
 it('does not inherit a newly broken partner relationship',()=>{
  const original=baseline(); original[1].exercises.push({name:'Missing',sets:3,reps:10})
  const candidate=structuredClone(original);candidate[1].exercises[1].name='Renamed'
  expect(validateProgramEdit(candidate,original)).toBe(false)
 })
 it('treats serialized key order identically, checks all phases and never mutates the baseline',()=>{
  const original=baseline();original[0].exercises[0].phases={p1:{technique_details:'1'},p2:{technique_details:''}}
  const snapshot=JSON.stringify(original),candidate=structuredClone(original)
  candidate[0].exercises[0]=Object.fromEntries(Object.entries(candidate[0].exercises[0]).reverse())
  expect(validateProgramEdit(candidate,original)).toBe(true)
  candidate[0].exercises[0].phases.p1.technique_details='invalid'
  expect(validateProgramEdit(candidate,original)).toBe(false)
  expect(JSON.stringify(original)).toBe(snapshot)
 })
 it('allows repairing one phase without requiring other unchanged phases to be repaired',()=>{
  const original=baseline();original[0].exercises[0].phases={p1:{technique_details:''},p2:{technique_details:''}}
  const candidate=structuredClone(original);candidate[0].exercises[0].phases.p1.technique_details='2'
  expect(validateProgramEdit(candidate,original)).toBe(true)
  expect(programTechniqueIssues(candidate,original).every(issue=>issue.inherited)).toBe(true)
 })
})
