import { describe, expect, it } from 'vitest'
import { weeklyFixture } from '../fixtures/weekly-adjustment'
import { prepareWeeklyAdjustment, countPlannedSessions } from '@/lib/weekly-diagnostic/adjustments'
import { resolveProgramDays, programWeekAt, trainingMonday } from '@/lib/training/resolve-program'
import { getSessionForDay } from '@/lib/get-today-session'
import { createActiveWorkoutDraft } from '@/lib/training/active-workout-draft'

function phasedFixture() {
  const f = weeklyFixture()
  return { ...f, program: { ...f.program, start_date: '2026-08-24', total_weeks: 12, current_week: 1,
    phases: [{ weeks: [1,4] },{ weeks: [5,8] },{ weeks: [9,12] }],
    days: f.program.days.slice(0,3).map(day => ({ ...day, exercises: day.exercises.map(ex => ({ ...ex,
      phases: { p1: { sets: 2, reps: 12 },p2: { sets: 4, reps: 8 },p3: { sets: 3, reps: 6 } } })) })) } }
}
describe('historical and phased weekly adaptation', () => {
  it.each([3,4])('preserves a %s-day program without filling or moving weekdays', length => {
    const f = weeklyFixture(); f.program.days=f.program.days.slice(0,length)
    const result=prepareWeeklyAdjustment(f.profile,f.program,f.mealPlan,{ training_volume_delta_pct: 10 })
    expect(result.days).toHaveLength(length); expect(countPlannedSessions(result.days)).toBe(3)
    expect(result.days!.map(d=>d.name)).toEqual(f.program.days.map(d=>d.name))
  })
  it('uses next Monday phase volume at a phase boundary, not Sunday base sets', () => {
    const f=phasedFixture(); const before=structuredClone(f.program)
    const result=prepareWeeklyAdjustment(f.profile,f.program,f.mealPlan,{training_volume_delta_pct: 10},'2026-09-21')
    expect(result.changes).toMatchObject({setsBefore:24,setsAfter:26,effectiveWeekStart:'2026-09-21'})
    expect(f.program).toEqual(before)
    const program={...f.program,days:result.days}
    const total=(date:string) => resolveProgramDays(program,new Date(date)).reduce((sum,day)=>sum+(day.exercises as {sets:number}[]).reduce((s,e)=>s+e.sets,0),0)
    expect(total('2026-09-20T12:00:00Z')).toBe(12)
    expect(total('2026-09-21T12:00:00Z')).toBe(26)
    expect(total('2026-09-28T12:00:00Z')).toBe(24)
    expect(total('2026-10-19T12:00:00Z')).toBe(18)
    result.days!.forEach((day,i)=>(day.exercises ?? []).forEach((ex,j)=>expect(ex.phases).toEqual(before.days[i].exercises[j].phases)))
  })
  it('resolves the same prescribed sets into the actual session', () => {
    const f=phasedFixture(); const result=prepareWeeklyAdjustment(f.profile,f.program,f.mealPlan,{training_volume_delta_pct:10},'2026-09-21')
    const session=getSessionForDay(resolveProgramDays({...f.program,days:result.days},new Date('2026-09-21T12:00:00Z')),0)
    expect(session.exercises[0].sets).toBe(5)
    expect(session.exercises[1].duration_seconds).toBe(35)
    expect(session.exercises[0].reps).toBe(8)
    const draft=createActiveWorkoutDraft({userId:'audit',programSource:'personal',programId:'p',sessionKey:'p:monday',sessionName:session.name,exercises:session.exercises})
    expect(draft.exercises[0].sets).toHaveLength(5)
    expect(draft.exercises[1].targetDurationSeconds).toBe(35)
  })
  it('refuses unscheduled, finished or ambiguous phases', () => {
    const f=phasedFixture()
    for (const program of [{...f.program,start_date:null},{...f.program,total_weeks:4},{...f.program,phases:[{weeks:[1,6]},{weeks:[4,12]}]}]) {
      expect(()=>prepareWeeklyAdjustment(f.profile,program,f.mealPlan,{training_volume_delta_pct:10},'2026-09-21')).toThrow()
    }
    expect(()=>prepareWeeklyAdjustment(f.profile,f.program,f.mealPlan,{training_volume_delta_pct:10},'2026-11-30')).toThrow()
    expect(()=>prepareWeeklyAdjustment(f.profile,{...f.program,start_date:'2026-08-26'},f.mealPlan,{training_volume_delta_pct:10},'2026-09-21')).toThrow()
  })
  it('keeps Zurich week boundaries across midnight and daylight saving changes', () => {
    expect(trainingMonday(new Date('2026-09-20T22:30:00Z'))).toBe('2026-09-21')
    expect(trainingMonday(new Date('2026-10-25T23:30:00Z'))).toBe('2026-10-26')
    expect(programWeekAt({start_date:'2026-10-19'},new Date('2026-10-25T23:30:00Z'))).toBe(2)
  })
  it('preserves non-phased repetition ranges and the final phase after program end', () => {
    const f=phasedFixture()
    expect(resolveProgramDays({days:[{exercises:[{sets:3,reps:'8-12'}]}]})[0].exercises).toEqual([{sets:3,reps:'8-12'}])
    expect((resolveProgramDays(f.program,new Date('2026-12-01T12:00:00Z'))[0].exercises as {sets:number}[])[0].sets).toBe(3)
  })
})
