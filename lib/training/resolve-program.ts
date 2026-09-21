import { diagnosticWeek } from '../weekly-diagnostic/week'

type RecordValue = Record<string, unknown>
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
export function trainingMonday(date = new Date()) {
  const today = diagnosticWeek(date).today
  const d = new Date(`${today}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7))
  return d.toISOString().slice(0,10)
}
export function programWeekAt(program: unknown, date = new Date()) {
  const p = record(program)
  if (typeof p.start_date !== 'string') return Number(p.current_week) || 1
  const elapsed = (Date.parse(`${diagnosticWeek(date).today}T12:00:00Z`)-Date.parse(`${p.start_date}T12:00:00Z`))/86400000
  return Math.max(1,Math.floor(elapsed/7)+1)
}
export function phaseKeyAt(program: unknown, date = new Date()) {
  const p = record(program); const week = Math.min(programWeekAt(p,date), Number(p.total_weeks)>0 ? Number(p.total_weeks) : Infinity)
  const phases = Array.isArray(p.phases) ? p.phases : []
  if (phases.length) {
    const index = phases.findIndex(value => {
      const weeks = record(value).weeks
      return Array.isArray(weeks) && week>=Number(weeks[0]) && week<=Number(weeks[1])
    })
    return index>=0 ? `p${index+1}` : null
  }
  return week<=4 ? 'p1' : week<=8 ? 'p2' : 'p3'
}
/** Same prescription for Home, Training and the actual workout draft. */
export function resolveProgramExercise(exercise: unknown, program: unknown, date = new Date()): RecordValue {
  const ex = record(exercise); const phases = record(ex.phases)
  const key = phaseKeyAt(program,date)
  const phase = record((key && phases[key]) || phases.p1)
  const resolved = { ...ex }
  for (const field of ['sets','reps','tempo','technique','technique_details','rest_seconds']) {
    if (phase[field] != null) resolved[field]=phase[field]
  }
  // Keep ranges (8-12) intact; the set editor separately chooses its initial value.
  const override = record(ex._weekly_sets)[trainingMonday(date)]
  if (typeof override === 'number' && Number.isInteger(override) && override>=1 && override<=10) resolved.sets=override
  return resolved
}
export function resolveProgramDays(program: unknown, date = new Date()): RecordValue[] {
  const p = record(program)
  if (!Array.isArray(p.days)) return []
  return p.days.map(value => {
    const day = record(value)
    return { ...day, is_rest: Boolean(day.is_rest || day.repos), exercises: Array.isArray(day.exercises) ? day.exercises.map(ex => resolveProgramExercise(ex,p,date)) : [] }
  })
}
