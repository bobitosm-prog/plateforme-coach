'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { hasWatchWorkoutBridge, watchWorkout, type WatchWorkoutStatus } from '@/lib/training/watch-workout'
import { colors } from '@/lib/design-tokens'

export default function WatchWorkoutControls({draftId}: {draftId:string}) {
  const t=useTranslations('watch_workout')
  const [available,setAvailable]=useState(false)
  const [state,setState]=useState<WatchWorkoutStatus>({enabled:false,status:'idle'})
  const [busy,setBusy]=useState(false)
  // Older native builds also return busy for an unanswered reconciliation request.
  // Confirm a live conflict before telling the user to end a workout.
  async function checkedState(result: WatchWorkoutStatus) {
    if (result.status !== 'busy') return result
    const readiness = await watchWorkout('readiness')
    return readiness.status === 'busy' ? result : {...result, status:'unavailable'}
  }
  useEffect(()=>{
    if(!hasWatchWorkoutBridge())return
    setAvailable(true)
    let alive=true, polling=false
    const sync = async () => {
      if(polling)return
      polling=true
      try{const result=await checkedState(await watchWorkout('sync',draftId));if(alive)setState(result)}finally{polling=false}
    }
    void sync()
    const timer=setInterval(async()=>{
      if(document.visibilityState!=='visible'||polling)return
      await sync()
    },4000)
    return ()=>{alive=false;clearInterval(timer)} // Hiding the sheet must not end a workout.
  },[draftId])
  if(!available)return null
  const known=['running','saved','discarded','saving','pending','permission','phonePermission','install','busy','expired','error','unavailable','idle']
  const status=known.includes(state.status)?state.status:'unavailable'
  return <section aria-label="Apple Watch" style={{margin:'12px 0',padding:12,borderRadius:12,background:colors.surface2,border:`1px solid ${colors.goldBorder}`}}>
    <strong style={{color:colors.gold}}>Apple Watch</strong>
    <p role="status" style={{fontSize:13}}>{state.enabled?t(status):t('off')}</p>
    {state.diagnostic && ['unavailable','error','pending','expired','permission','phonePermission'].includes(status) && <details style={{fontSize:12,marginBottom:8,overflowWrap:'anywhere'}}>
      <summary style={{minHeight:44,cursor:'pointer'}}>{t('diagnostic')}</summary>
      <p>{t('diagnosticVersions',{phone:state.phoneBuild||'?',watch:state.watchBuild||'?'})}</p>
      <code>{state.diagnostic}</code>
    </details>}
    <button type="button" disabled={busy} onClick={async()=>{
      setBusy(true);try{setState(await checkedState(await watchWorkout('enable',draftId)))}finally{setBusy(false)}
    }} style={{minHeight:44,color:colors.gold}}>{t(state.enabled?'retry':'enable')}</button>
    {state.enabled&&<button type="button" disabled={busy} onClick={async()=>{
      setBusy(true);try{setState(await watchWorkout('disable',draftId))}finally{setBusy(false)}
    }} style={{minHeight:44,marginLeft:16}}>{t('disable')}</button>}
  </section>
}
