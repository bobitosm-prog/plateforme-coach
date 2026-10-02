'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkoutDraftExercise } from '@/lib/training/active-workout-draft'
import { loadLastExerciseSession, type HistoricalSet } from '@/lib/training/last-exercise-session'
import { isLoadMode } from '@/lib/training/load-volume'
import styles from './WorkoutLedger.module.css'

interface Props {
  db: SupabaseClient; userId: string; exercise: WorkoutDraftExercise; selected: boolean; blocked: boolean
  onSelect: () => void
  onChange: (id: string, field: 'weight' | 'reps' | 'durationSeconds', value: string) => void
  onWeightFocus: (id: string) => void; onWeightBlur: (id: string) => void
  onValidate: (id: string) => void
}

/** Historical values stay evidence-only; editing and validation use the existing draft engine. */
export default function WorkoutLedgerTable({db,userId,exercise,selected,blocked,onSelect,onChange,onWeightFocus,onWeightBlur,onValidate}: Props) {
  const t=useTranslations('workoutLedger'), v=useTranslations('training_tab.v2'), h=useTranslations('previousWorkout'), load=useTranslations('trainingLoad')
  const [history,setHistory]=useState<HistoricalSet[]|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0)
  useEffect(()=>{
    const controller=new AbortController();setHistory(null);setError(false)
    loadLastExerciseSession(db,userId,exercise.exerciseId??null,exercise.name,controller.signal)
      .then(rows=>{if(!controller.signal.aborted)setHistory(rows)})
      .catch(()=>{if(!controller.signal.aborted)setError(true)})
    return ()=>controller.abort()
  },[db,userId,exercise.exerciseId,exercise.name,retry])
  const first=exercise.sets.findIndex(s=>!s.done),timed=Boolean(exercise.targetDurationSeconds)
  return <div className={styles.table} role="group" aria-label={exercise.name}>
    <div className={styles.columns} aria-hidden="true"><span>{t('set')}</span><span>{v('previous')}</span><span>{timed?'—':'kg'}</span><span>{timed?'s':t('reps')}</span><span>✓</span></div>
    {exercise.sets.map((set,index)=>{
      const current=index===first, active=current&&selected
      const previous=history?.find(row=>row.set_number===set.num && (row.parent_set_number??null)===(set.parentSetNumber??null) && (!set.parentSetNumber || row.technique===exercise.technique))
      const stage=exercise.sets.slice(0,index+1).filter(s=>s.parentSetNumber).length
      const label=set.parentSetNumber?`${exercise.technique==='restpause'?'M':'D'}${stage}`:String(set.num)
      const aria=(name:string)=>active?name:`${exercise.name} · ${t('set')} ${label} · ${name}`
      return <div className={styles.row} data-done={set.done} data-current={active} key={set.id}>
        <span className={styles.number}>{label}</span>
        <span className={styles.previous}>{previous ? previous.duration_seconds ? `${previous.duration_seconds} s` : `${previous.weight??'—'} × ${previous.reps??'—'}` : history===null&&!error?'…':'—'}
        </span>
        {timed?<span>—</span>:<input aria-label={aria(v('weight'))} inputMode="decimal" value={set.weightRaw??''} readOnly={set.done} onFocus={()=>{onSelect();if(!set.done)onWeightFocus(set.id)}} onChange={e=>onChange(set.id,'weight',e.target.value)} onBlur={()=>onWeightBlur(set.id)} />}
        <input aria-label={aria(v(timed?'durationSeconds':'repetitions'))} inputMode="numeric" value={timed?set.durationSeconds??'':set.reps} readOnly={set.done} onFocus={onSelect} onChange={e=>onChange(set.id,timed?'durationSeconds':'reps',e.target.value.replace(/\D/g,''))} />
        <button type="button" className={styles.check} aria-label={set.done?aria(t('done')):aria(v('validateSet'))} aria-pressed={set.done} disabled={set.done||!current||blocked} onClick={()=>onValidate(set.id)}>{set.done?'✓':current?'✓':'·'}</button>
      </div>
    })}
    {!!history?.length && <p className={styles.historyStatus}>{v('previous')} · {Array.from(new Set(history.filter(row=>!row.duration_seconds).map(row=>load(isLoadMode(row.load_mode)?row.load_mode:'legacy')))).join(' / ')}</p>}
    {error?<div className={styles.historyStatus} role="status">{h('error')} <button type="button" onClick={()=>setRetry(n=>n+1)}>{h('retry')}</button></div>:history?.length===0?<p className={styles.historyStatus}>{h('empty')}</p>:null}
    {first>=0 && <p className={styles.sequence}>{t('sequence')}</p>}
  </div>
}
