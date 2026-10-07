// @vitest-environment jsdom
import * as React from 'react'
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import messages from '@/messages/fr.json'
const history=vi.hoisted(()=>vi.fn())
vi.mock('@/lib/training/last-exercise-session',()=>({loadLastExerciseSession:history}))
vi.mock('next-intl',()=>({useTranslations:(ns:string)=>(key:string)=>String(ns.split('.').reduce((o:any,k)=>o?.[k],messages)?.[key]??key)}))
import WorkoutLedgerTable from '@/app/components/training-v2/WorkoutLedgerTable'
import {normalizeWorkoutDraftExercises} from '@/lib/training/active-workout-draft'
const row=(num:number,weight:number,parent:number|null=null,technique:string|null=null)=>({id:String(num),set_number:num,weight,reps:10,parent_set_number:parent,technique,load_mode:'two_dumbbells'})
const db={} as any
const props=()=>({db,userId:'user-a',exercise:normalizeWorkoutDraftExercises([{name:'Curl',sets:1,reps:10,technique:'dropset',technique_details:'2'}])[0],selected:true,blocked:false,onSelect:vi.fn(),onChange:vi.fn(),onWeightFocus:vi.fn(),onWeightBlur:vi.fn(),onValidate:vi.fn()})
beforeEach(()=>{vi.stubGlobal('React',React);history.mockReset()})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('matches historical main and drop rows and keeps the recorded load convention',async()=>{
 history.mockResolvedValue([row(1,20),row(2,15,1,'dropset'),row(3,10,1,'restpause')])
 render(React.createElement(WorkoutLedgerTable,props()))
 expect(await screen.findByText('20 × 10')).toBeTruthy()
 expect(screen.getByText('15 × 10')).toBeTruthy()
 expect(screen.queryByText('10 × 10')).toBeNull()
 expect(screen.getByText(new RegExp(messages.trainingLoad.two_dumbbells))).toBeTruthy()
 expect((screen.getByLabelText('Charge') as HTMLInputElement).value).toBe('')
})
it('cancels history on account change and ignores a late result',async()=>{
 let resolveA:(v:unknown)=>void=()=>{}
 history.mockImplementationOnce(()=>new Promise(resolve=>{resolveA=resolve})).mockResolvedValueOnce([row(1,42)])
 const p=props(),view=render(React.createElement(WorkoutLedgerTable,p))
 const signal=history.mock.calls[0][4] as AbortSignal
 view.rerender(React.createElement(WorkoutLedgerTable,{...p,userId:'user-b'}))
 expect(signal.aborted).toBe(true)
 expect(await screen.findByText('42 × 10')).toBeTruthy()
 resolveA([row(1,99)])
 await waitFor(()=>expect(screen.queryByText('99 × 10')).toBeNull())
})
it('shows an explicit read failure and retries without inventing a previous load',async()=>{
 history.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([row(1,18)])
 render(React.createElement(WorkoutLedgerTable,props()))
 fireEvent.click(await screen.findByRole('button',{name:messages.previousWorkout.retry}))
 expect(await screen.findByText('18 × 10')).toBeTruthy()
 expect(history).toHaveBeenCalledTimes(2)
})
it('matches each leg by prescribed round and never guesses the side of legacy history',async()=>{
 const p={...props(),exercise:normalizeWorkoutDraftExercises([{name:'Fentes',sets:1,reps:10}])[0]}
 history.mockResolvedValue([{...row(8,24),side:'right',round_number:1},{...row(7,20),side:'left',round_number:1},row(1,99)])
 render(React.createElement(WorkoutLedgerTable,p))
 expect(await screen.findByText('20 × 10')).toBeTruthy();expect(screen.getByText('24 × 10')).toBeTruthy()
 expect(screen.queryByText('99 × 10')).toBeNull()
})
