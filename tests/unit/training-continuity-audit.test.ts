// Audit characterizations: these passing tests expose current limitations,
// not the desired behavior. No production data or external services.
import { describe, expect, it } from 'vitest'
import { computeProgression } from '@/lib/training/compute-progression'
import { buildPreviousPerformanceMap } from '@/lib/training/set-logging'
import { deriveProgressionDecision } from '@/lib/athena/progression-model'
import { phaseKeyAt, programWeekAt, resolveProgramExercise } from '@/lib/training/resolve-program'
import { adjustTrainingSets } from '@/lib/weekly-diagnostic/adjustments'

describe('training continuity audit — current behavior', () => {
  it('UI adapter rejects stale history like the canonical model', () => {
    const rows = ['2026-01-05','2026-01-12'].flatMap((date, i) => Array.from({length:3},(_,j)=>({
      exercise_name:'Squat',session_id:`s${i}`,set_number:j+1,completed:true,
      weight:40,reps:12,rir:3,created_at:`${date}T12:00:00Z`,
    })))
    const mapped = buildPreviousPerformanceMap([{key:'squat',name:'Squat',exerciseId:null}],rows)
    expect(computeProgression(mapped.squat.sessions,'8-12', { setsTarget:3,now:new Date('2026-09-21T12:00:00Z') })).toBeNull()
    const canonical = deriveProgressionDecision({currentWeight:40,currentReps:12,setsCompleted:3,setsTarget:3,
      currentRirs:[3,3,3],targetReps:'8-12',now:new Date('2026-09-21T12:00:00Z'),
      history:rows.map(row=>({sessionId:row.session_id,sessionCompleted:true,completed:true,weight:40,reps:12,rir:3,createdAt:row.created_at}))})
    expect(canonical.action).toBe('hold')
  })
  it('keeps final phase long after the program ends', () => {
    const program={start_date:'2026-01-05',total_weeks:12,phases:[{weeks:[1,4]},{weeks:[5,8]},{weeks:[9,12]}]}
    expect(programWeekAt(program,new Date('2026-09-21T12:00:00Z'))).toBeGreaterThan(12)
    expect(phaseKeyAt(program,new Date('2026-09-21T12:00:00Z'))).toBe('p3')
  })
  it('advances a calendar phase even when no workout was recorded during the interval', () => {
    const program={start_date:'2026-09-07',total_weeks:12,phases:[{weeks:[1,4]},{weeks:[5,8]},{weeks:[9,12]}]}
    expect(phaseKeyAt(program,new Date('2026-10-05T12:00:00Z'))).toBe('p2')
  })
  it('preserves phased repetition ranges', () => {
    const result=resolveProgramExercise({reps:12,phases:{p1:{reps:'8-12',sets:3}}},
      {start_date:'2026-09-21',total_weeks:12},new Date('2026-09-21T12:00:00Z'))
    expect(result.reps).toBe('8-12')
  })
  it('four accepted maximum increases can double baseline volume despite per-week guard', () => {
    let days: unknown=[{exercises:Array.from({length:10},()=>({name:'Exercise',sets:3}))}]
    let total=30
    for(let week=0;week<4;week++) { const result=adjustTrainingSets(days,20); days=result.days; total=result.after }
    expect(total).toBe(61)
  })
  it('does not advance a program without start_date', () => {
    expect(programWeekAt({current_week:1},new Date('2026-12-21T12:00:00Z'))).toBe(1)
  })
})
