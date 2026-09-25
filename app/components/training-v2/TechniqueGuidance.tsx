import { useTranslations } from 'next-intl'
import type { WorkoutDraftExercise } from '@/lib/training/active-workout-draft'
import { bisetFor, techniqueIssue, restPausePrescription } from '@/lib/training/guided-techniques'

export default function TechniqueGuidance({ exercises, index, setIndex }: { exercises: WorkoutDraftExercise[]; index: number; setIndex: number }) {
  const t = useTranslations('trainingTechnique')
  const c = useTranslations('techniqueGuide')
  const ex = exercises[index], set = ex.sets[setIndex]
  const pair = bisetFor(exercises, index)
  const issue = techniqueIssue(exercises, index)
  if (issue) return <p role="alert">{issue === 'invalidRestPause' ? c('invalid') : t(issue)}</p>
  if (!ex.technique) return null
  const count = ex.sets.filter(s => s.parentSetNumber).length
  const stage = ex.sets.slice(0, setIndex + 1).filter(s => s.parentSetNumber).length
  const title = pair ? c('biset') : ex.technique === 'restpause' ? c('restPause') : ex.technique === 'fst7' ? 'FST-7' : ex.technique === 'mechanical' ? c('mechanical') : 'DROP SET'
  const rows = pair ? exercises[pair.a].sets.flatMap((_, si) => [pair.a, pair.b].map(ei => ({ei, si}))) : ex.sets.map((_, si) => ({ei:index, si}))
  const endsSession = !exercises.some((other, i) => i !== index && i !== pair?.a && i !== pair?.b && other.sets.some(s => !s.done))
  return <section aria-label={title} style={{border:'1px solid #C9A84C',borderRadius:12,padding:12,marginBottom:12,fontSize:14}}>
    <strong>{title}</strong>
    {pair ? <p>{t('bisetInstructions', {a:exercises[pair.a].name,b:exercises[pair.b].name,rest:exercises[pair.b].rest})}</p>
      : ex.technique === 'dropset' ? <p>{set?.parentSetNumber ? t('dropNow',{stage,count}) : t(count===1?'dropPreparedOne':'dropPrepared',{count,sets:ex.sets.length-count})}</p>
      : ex.technique === 'restpause' ? <p>{c('restPauseHelp')}</p>
      : ex.technique === 'fst7' ? <p>{t('fstInstructions',{reps:ex.targetReps,rest:ex.rest})}</p>
      : <p>{c('mechanicalHelp')} {ex.techniqueDetails || t('prescription')}</p>}
    {pair && <div style={{display:'grid',gap:6,marginBottom:10}}>
      {[pair.a,pair.b].map((exerciseIndex, side) => {
        const member=exercises[exerciseIndex]
        return <div key={member.id} style={{padding:'8px 10px',border:'1px solid #514728',borderRadius:8,background:exerciseIndex===index?'rgba(201,168,76,.16)':undefined}}>
          <strong>{side===0?'A':'B'} · {member.name}</strong>
          <span style={{float:'right'}}>{member.sets.filter(row=>row.done).length}/{member.sets.length}</span>
        </div>
      })}
    </div>}
    <details><summary style={{cursor:'pointer',minHeight:44,paddingTop:10}}>{c('table')}</summary>
      <div style={{overflowX:'auto'}} tabIndex={0} role="region" aria-label={c('table')}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><caption>{title}</caption>
          <thead><tr>{[c('step'),c('exercise'),c('reps'),c('load'),c('rest')].map(h=><th key={h} scope="col" style={{padding:8,textAlign:'left'}}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(({ei,si},ri)=>{
            const e=exercises[ei], s=e.sets[si], child=!!s.parentSetNumber
            const childNumber=e.sets.slice(0,si+1).filter(s=>s.parentSetNumber).length
            const label=child ? `${e.technique==='restpause'?c('mini'):c('drop')} ${childNumber}/${count}` : `${e.technique==='fst7'?'FST-7':c('main')} ${si+1}/${e.sets.filter(s=>!s.parentSetNumber).length}`
            const next=e.sets[si+1]
            const rest=pair ? ei===pair.a?0:e.rest : next?.parentSetNumber ? e.technique==='restpause'?restPausePrescription(e.techniqueDetails)?.rest??0:0 : e.rest
            const isCurrent=ei===index&&si===setIndex&&!s.done
            return <tr key={`${ei}-${si}`} aria-current={isCurrent?'step':undefined} style={{background:isCurrent?'rgba(201,168,76,.16)':undefined,borderTop:'1px solid #514728'}}>
              <th scope="row" style={{padding:8,textAlign:'left'}}>{label}<br/>{s.done?c('done'):isCurrent?c('now'):c('next')}</th>
              <td style={{padding:8}}>{pair?`${ei===pair.a?'A':'B'} → `:''}{e.name}</td>
              <td style={{padding:8}}>{s.done?s.reps:child?c('logReps'):e.targetReps}</td>
              <td style={{padding:8}}>{s.weight!==''?`${s.weight} kg`:child?e.technique==='restpause'?c('same'):c('reduced'):e.prescribedWeight?`${e.prescribedWeight} kg`:c('enter')}</td>
              <td style={{padding:8}}>{ri===rows.length-1&&endsSession?'—':`${rest} s`}</td>
            </tr>
          })}</tbody>
        </table>
      </div>
    </details>
  </section>
}
