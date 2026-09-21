// @vitest-environment jsdom
import * as React from 'react'
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
vi.mock('next-intl',()=>({useTranslations:()=> (key:string)=>key,useLocale:()=> 'fr'}))
vi.mock('@/app/hooks/useFocusTrap',()=>({useFocusTrap:()=>{}}))
import ProgramBuilder from '@/app/components/training/ProgramBuilder'
import {editorDraftKey} from '@/lib/training/program-editor'
const program={id:'10000000-0000-4000-8000-000000000003',name:'Synthetic program',is_active:true,days:[{name:'Dos',exercises:[{name:'Row',sets:3,reps:'8-12',rest_seconds:120}]}]}
const chain:any={select:()=>chain,eq:()=>chain,order:()=>chain,limit:()=>chain,single:()=>chain,then:(resolve:any)=>Promise.resolve({data:[],error:null}).then(resolve)}
const props={supabase:{from:()=>chain},session:{user:{id:'synthetic-owner'}},editProgram:program,canMutate:true,onSave:vi.fn(),onClose:vi.fn()}
beforeEach(()=>{vi.stubGlobal('React',React);localStorage.clear();vi.clearAllMocks();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({program}),{status:200})));vi.spyOn(window,'confirm').mockReturnValue(true)})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
describe('actual editor interactions',()=>{
 it('stores the displayed drop default and selects a real biset partner',async()=>{
  const paired={...program,days:[{exercises:[{name:'A',sets:3,reps:10},{name:'B',sets:3,reps:10}]}]}
  render(React.createElement(ProgramBuilder,{...props,editProgram:paired}))
  fireEvent.change(await screen.findByLabelText('day.techniqueLabel — A'),{target:{value:'dropset'}})
  let stored=JSON.parse(localStorage.getItem(editorDraftKey('synthetic-owner',program.id))!)
  expect(stored.days[0].exercises[0].technique_details).toBe('2')
  fireEvent.change(screen.getByLabelText('day.techniqueLabel — A'),{target:{value:'superset'}})
  const partner=screen.getByLabelText('day.partnerExercise — A') as HTMLSelectElement
  expect([...partner.options].map(option=>option.value)).toEqual(['','B'])
  fireEvent.change(partner,{target:{value:'B'}})
  stored=JSON.parse(localStorage.getItem(editorDraftKey('synthetic-owner',program.id))!)
  expect(stored.days[0].exercises[0].technique_details).toBe('B')
  expect(fetch).not.toHaveBeenCalled()
 })
 it('keeps controls compact, edits canonical rest, previews then saves only after confirmation',async()=>{
  render(React.createElement(ProgramBuilder,props))
  const rest=await screen.findByLabelText('day.restLabel — Row')
  expect((rest as HTMLSelectElement).value).toBe('120')
  expect((screen.getByText('Row',{selector:'summary strong'}).closest('details') as HTMLDetailsElement).open).toBe(false)
  fireEvent.change(rest,{target:{value:'60'}})
  fireEvent.click(screen.getByRole('button',{name:'review'}))
  expect(fetch).not.toHaveBeenCalled()
  expect(screen.getByText(/before.*120 s/)).toBeTruthy();expect(screen.getByText(/after.*60 s/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'apply'}))
  await waitFor(()=>expect(props.onSave).toHaveBeenCalledOnce())
  const body=JSON.parse((fetch as any).mock.calls[0][1].body)
  expect(body.candidate.days[0].exercises[0].rest_seconds).toBe(60)
  expect(body.candidate.days[0].exercises[0].reps).toBe('8-12')
  expect(props.onClose).toHaveBeenCalledOnce()
 })
 it('parks exercises, warns on close and resumes the local draft without saving it remotely',async()=>{
  const view=render(React.createElement(ProgramBuilder,props))
  fireEvent.click(await screen.findByRole('button',{name:'day.trainingToggle'}))
  expect(screen.getByText('parked')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'close'}))
  expect(window.confirm).toHaveBeenCalled()
  const draft=JSON.parse(localStorage.getItem(editorDraftKey('synthetic-owner',program.id))!)
  expect(draft.days[0].exercises[0].name).toBe('Row')
  view.unmount();render(React.createElement(ProgramBuilder,props))
  fireEvent.click(await screen.findByRole('button',{name:'resume'}))
  fireEvent.click(screen.getByRole('button',{name:'day.restToggleOn'}))
  expect(screen.getByLabelText('day.restLabel — Row')).toBeTruthy()
  expect(fetch).not.toHaveBeenCalled()
 })
 it('does not close or clear a draft when the server rejects a stale revision',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:409})))
  render(React.createElement(ProgramBuilder,props))
  fireEvent.change(await screen.findByLabelText('day.restLabel — Row'),{target:{value:'60'}})
  fireEvent.click(screen.getByRole('button',{name:'review'}));fireEvent.click(screen.getByRole('button',{name:'apply'}))
  await waitFor(()=>expect(fetch).toHaveBeenCalledOnce())
  expect(props.onClose).not.toHaveBeenCalled();expect(props.onSave).not.toHaveBeenCalled()
  expect(localStorage.getItem(editorDraftKey('synthetic-owner',program.id))).toBeTruthy()
 })
})
