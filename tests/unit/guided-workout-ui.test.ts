// @vitest-environment jsdom
import * as React from 'react'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import messages from '@/messages/fr.json'
const followupEnabled = vi.hoisted(() => ({ value: false }))
const catalogRows = vi.hoisted(() => ({ value: [] as Array<Record<string, unknown>> }))
vi.mock('next-intl',()=>({useLocale:()=> 'fr',useTranslations:(namespace:string)=> (key:string,values:Record<string,unknown>={})=>{
  const obj=namespace.split('.').reduce((o:any,k)=>o?.[k],messages)
  return String(obj?.[key]??key).replace(/\{(\w+)\}/g,(_,k)=>String(values[k]??k))
}}))
vi.mock('@supabase/ssr',()=>({createBrowserClient:()=>({
  auth:{getUser:async()=>({data:{user:null}})},
  from:()=>{
    const query:any={}
    query.select=()=>query
    query.ilike=()=>query
    query.eq=()=>query
    query.limit=()=>query
    query.order=()=>query
    query.then=(resolve:any)=>Promise.resolve({data:catalogRows.value}).then(resolve)
    return query
  },
})}))
vi.mock('@/app/hooks/useTrainingFollowup',()=>({useTrainingFollowup:()=>({preferences:{enabled:followupEnabled.value,advanced_techniques:followupEnabled.value}})}))
vi.mock('@/lib/timer-audio',()=>({initAudio:()=>{},playBeep:()=>{},playWarningTick:()=>{},vibrateDevice:()=>{},scheduleRestPeriodSounds:()=>[],cancelScheduledSounds:()=>{}}))
import WorkoutSession from '@/app/components/WorkoutSession'
import { createActiveWorkoutDraft, type ActiveWorkoutDraft } from '@/lib/training/active-workout-draft'
beforeEach(()=>{followupEnabled.value=false;catalogRows.value=[];vi.stubGlobal('React',React);localStorage.clear();vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{})})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
const start=(exercises:unknown[],existing?:ActiveWorkoutDraft)=>{
  const draft=existing??createActiveWorkoutDraft({userId:'synthetic',programSource:'personal',programId:null,sessionName:'Test',sessionKey:'test',exercises})
  let saved=draft
  const finish=vi.fn().mockResolvedValue({})
  const view=render(React.createElement(WorkoutSession,{draft,onDraftChange:(v:ActiveWorkoutDraft)=>{saved=v},onFinish:finish,onClose:()=>{},onNavigateHome:()=>{},onNavigateProgress:()=>{}}))
  return {...view,saved:()=>saved,finish}
}
const log=(weight:string)=>{
  fireEvent.change(screen.getByLabelText('Charge'),{target:{value:weight}})
  fireEvent.blur(screen.getByLabelText('Charge'))
  fireEvent.change(screen.getByLabelText('Répétitions'),{target:{value:'10'}})
  fireEvent.click(screen.getByRole('button',{name:'Valider la série'}))
}
describe('real WorkoutSession runtime',()=>{
  it('keeps the native screen awake only while the workout is open',()=>{
    const postMessage=vi.fn()
    vi.stubGlobal('webkit',{messageHandlers:{moovxWorkoutActive:{postMessage}}})
    const view=start([{name:'Squat',sets:1,reps:10}])
    expect(postMessage).toHaveBeenCalledWith(true)
    view.unmount()
    expect(postMessage).toHaveBeenLastCalledWith(false)
  })
  it('executes rest-pause only after the final main set, resumes and saves separate mini-sets',async()=>{
    const view=start([{name:'Curl',sets:3,reps:10,rest:90,technique:'restpause',technique_details:'2,15'}])
    await screen.findByRole('region',{name:'REST-PAUSE — après la dernière série uniquement'})
    expect(screen.queryByText('2,15')).toBeNull()
    expect(view.saved().exercises[0].sets).toHaveLength(5)
    log('25')
    expect(Date.parse(view.saved().restTimerEndAt!)-Date.now()).toBeGreaterThan(88000)
    log('25');log('25')
    expect(screen.getAllByText('Mini-série 1/2').length).toBeGreaterThan(0)
    expect(Date.parse(view.saved().restTimerEndAt!)-Date.now()).toBeGreaterThan(13000)
    expect(Date.parse(view.saved().restTimerEndAt!)-Date.now()).toBeLessThanOrEqual(15000)
    log('20');expect(view.saved().exercises[0].sets[3].done).toBe(false)
    log('25')
    const saved=view.saved();view.unmount()
    const resumed=start([],saved)
    expect(resumed.saved().exercises[0].sets).toHaveLength(5)
    expect(screen.getAllByText('Mini-série 2/2').length).toBeGreaterThan(0)
    log('25')
    expect(resumed.saved().restTimerEndAt).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:messages.training_tab.ws.finish}))
    fireEvent.click(screen.getByRole('button',{name:'endModal.save'}))
    await waitFor(()=>expect(resumed.finish).toHaveBeenCalledOnce())
    expect(resumed.finish.mock.calls[0][0].exercises[0].sets.map((s:any)=>s.parentSetNumber)).toEqual([undefined,undefined,undefined,3,4])
  })
  it('renders seven explicit FST-7 table rows and no incompatible controls',async()=>{
    start([{name:'Raise',sets:7,reps:'8-12',rest:45,technique:'fst7'}])
    fireEvent.click(await screen.findByText('Voir le déroulé précis'))
    expect(screen.getAllByRole('row')).toHaveLength(8)
    expect(screen.getByRole('rowheader',{name:/FST-7 7\/7/})).toBeTruthy()
    expect(screen.queryByRole('button',{name:messages.trainingTechnique.addDrop})).toBeNull()
  })
  it('shows prepared drops, transitions immediately, refuses a non-reduced load and resumes the stage',async()=>{
    const view=start([{name:'Row',sets:1,reps:10,technique:'dropset',technique_details:'2'}])
    await screen.findByText(/2 paliers dégressifs préparés/)
    log('40')
    expect(screen.getByText(/Maintenant : palier dégressif 1\/2/)).toBeTruthy()
    expect(view.saved().restTimerEndAt).toBeNull()
    log('40');expect(view.saved().exercises[0].sets[1].done).toBe(false)
    log('30');expect(screen.getByText(/Maintenant : palier dégressif 2\/2/)).toBeTruthy()
    const saved=view.saved();view.unmount()
    const resumed=start([],saved)
    expect(screen.getByText(/Maintenant : palier dégressif 2\/2/)).toBeTruthy()
    log('20')
    expect(resumed.saved().exercises[0].sets.map(s=>s.weight)).toEqual([40,30,20])
    expect(resumed.saved().exercises[0].sets.every(s=>s.done)).toBe(true)
    expect(resumed.saved().restTimerEndAt).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:messages.training_tab.ws.finish}))
    fireEvent.click(screen.getByRole('button',{name:'endModal.save'}))
    await waitFor(()=>expect(resumed.finish).toHaveBeenCalledOnce())
    const payload=resumed.finish.mock.calls[0][0]
    expect(payload.exercises[0].technique).toBe('dropset')
    expect(payload.exercises[0].sets.map((s:any)=>s.parentSetNumber)).toEqual([undefined,1,2])
    expect(payload.totalVolume).toBe(900)
  })
  it('shows both biset members and alternates the actual focus with rest after B',async()=>{
    const view=start([{name:'A',sets:2,reps:10,technique:'superset',technique_details:'B'},{name:'B',sets:2,reps:10,rest:60}])
    await screen.findByText(/Alterner A \(A\) puis B \(B\)/)
    log('20')
    expect(view.saved().currentExerciseIndex).toBe(1)
    expect(view.saved().restTimerEndAt).toBeNull()
    log('15')
    expect(view.saved().currentExerciseIndex).toBe(0)
    expect(Date.parse(view.saved().restTimerEndAt!)-Date.now()).toBeGreaterThan(58000)
    expect(view.saved().exercises[1].technique).toBe('superset')
  })
  it('starts a biset during the workout and persists its A/B flow',async()=>{
    followupEnabled.value=true
    const view=start([{name:'Raise',sets:1,reps:10},{name:'Press',sets:1,reps:10}])
    fireEvent.click(screen.getByText('Modifier la technique'))
    fireEvent.change(screen.getByLabelText('Créer un biset pour cette séance'),{target:{value:'1'}})
    expect(screen.getByText('A · Raise')).toBeTruthy()
    expect(screen.getByText('B · Press')).toBeTruthy()
    const saved=view.saved();view.unmount()
    const resumed=start([],saved)
    expect(resumed.saved().exercises.map(exercise=>exercise.technique)).toEqual(['superset','superset'])
    log('20')
    expect(resumed.saved().currentExerciseIndex).toBe(1)
    expect(resumed.saved().restTimerEndAt).toBeNull()
  })
  it('explains why a single exercise cannot form a biset yet',()=>{
    followupEnabled.value=true
    start([{name:'Raise',sets:3,reps:10}])
    fireEvent.click(screen.getByText('Modifier la technique'))
    expect((screen.getByLabelText(/Créer un biset pour cette séance/) as HTMLSelectElement).disabled).toBe(true)
    expect(screen.getByText(/Aucun partenaire compatible dans cette séance/)).toBeTruthy()
    expect(screen.getByRole('button',{name:'+ Ajouter un exercice au biset'})).toBeTruthy()
  })
  it('completes the one-exercise to catalogue partner to biset journey',async()=>{
    followupEnabled.value=true
    catalogRows.value=[
      {id:'source',name:'Développé couché barre',muscle_group:'Pectoraux'},
      {id:'partner',name:'Écarté poulie',muscle_group:'Pectoraux'},
    ]
    const view=start([{name:'Développé couché barre',sets:3,reps:10}])
    fireEvent.click(screen.getByText('Modifier la technique'))
    fireEvent.click(screen.getByRole('button',{name:'+ Ajouter un exercice au biset'}))
    expect(await screen.findByText(/Avec Développé Couché Barre · 3 séries chacun/)).toBeTruthy()
    expect((screen.getByRole('button',{name:/Développé couché barre/i}) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button',{name:/Écarté poulie/i}))
    fireEvent.click(screen.getByRole('button',{name:'builder.next'}))
    expect((screen.getByDisplayValue('3') as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getAllByRole('button',{name:'Créer le biset'})[0])
    expect(view.saved().exercises.map(exercise=>exercise.technique)).toEqual(['superset','superset'])
    expect(screen.getByText(/A · Développé Couché Barre/)).toBeTruthy()
    expect(screen.getByText(/B · Écarté/i)).toBeTruthy()
    expect(view.saved().exercises).toHaveLength(2)
    expect(view.saved().exercises.map(exercise=>exercise.targetSets)).toEqual([3,3])
    const saved=view.saved();view.unmount()
    const resumed=start([],saved)
    expect(screen.getByText(/B · Écarté/i)).toBeTruthy()
    log('60')
    expect(resumed.saved().currentExerciseIndex).toBe(1)
  })
  it('does not change the workout when the partner picker is cancelled',()=>{
    followupEnabled.value=true
    const view=start([{name:'Raise',sets:3,reps:10}])
    fireEvent.click(screen.getByText('Modifier la technique'))
    fireEvent.click(screen.getByRole('button',{name:'+ Ajouter un exercice au biset'}))
    fireEvent.click(screen.getByRole('button',{name:'Retour'}))
    expect(view.saved().exercises).toHaveLength(1)
    expect(view.saved().exercises[0].technique).toBeUndefined()
  })
  it('adds an extra set mid-session and keeps it after reopening the draft',async()=>{
    const view=start([{name:'Raise',sets:1,reps:10}])
    log('10')
    fireEvent.click(screen.getByRole('button',{name:'+ Ajouter une série'}))
    expect(view.saved().exercises[0].sets).toHaveLength(2)
    expect(view.saved().currentSetIndex).toBe(1)
    const saved=view.saved();view.unmount()
    const resumed=start([],saved)
    expect(screen.getAllByText('Série 2 sur 2').length).toBeGreaterThan(0)
    log('12')
    expect(resumed.saved().exercises[0].sets.every(set=>set.done)).toBe(true)
  })
  it('adds an extra round to both members of a running biset',async()=>{
    const view=start([{name:'A',sets:1,reps:10,technique:'superset',technique_details:'B'},{name:'B',sets:1,reps:10}])
    fireEvent.click(screen.getByRole('button',{name:'+ Ajouter une série aux deux exercices'}))
    expect(view.saved().exercises.map(exercise=>exercise.sets.length)).toEqual([2,2])
    expect(view.saved().exercises.map(exercise=>exercise.targetSets)).toEqual([2,2])
  })
  it('shows the selected partner explicitly and repairs an orphaned biset without changing the program',async()=>{
    const view=start([{name:'Élévations frontales poulie',sets:1,reps:10,technique:'superset',technique_details:'Oiseau / Reverse Fly'},{name:'Reverse pec deck',sets:1,reps:10}])
    expect(screen.getByText(/Oiseau \/ Reverse Fly.*n’est pas disponible/)).toBeTruthy()
    expect((screen.getByRole('button',{name:'Valider la série'}) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Choisir un exercice présent'),{target:{value:'1'}})
    expect(screen.getByText('B · Reverse pec deck')).toBeTruthy()
    log('10')
    expect(view.saved().currentExerciseIndex).toBe(1)
    expect(view.saved().exercises[1].technique).toBe('superset')
  })
  it('lets a blocked historical biset continue only after an explicit solo choice',async()=>{
    const view=start([{name:'Raise',sets:1,reps:10,technique:'superset',technique_details:'Missing'}])
    fireEvent.click(screen.getByRole('button',{name:'Continuer cet exercice seul'}))
    expect(screen.queryByRole('alert')).toBeNull()
    log('10')
    expect(view.saved().exercises[0].sets[0].done).toBe(true)
    expect(view.saved().exercises[0].technique).toBeUndefined()
  })
  it('blocks a missing biset partner instead of silently logging ordinary sets',async()=>{
    start([{name:'Raise',sets:3,reps:10,technique:'superset',technique_details:'Missing'}])
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Biset incomplet'))
    expect((screen.getByRole('button',{name:'Valider la série'}) as HTMLButtonElement).disabled).toBe(true)
  })
})
