import { describe, expect, it } from 'vitest'
import { buildHomeWeekCalendar, homeWeekKeys } from '../../lib/home/home-week-calendar'

const base = { todayKey: '2026-10-06', foodDates: ['2026-10-05'], nutritionState: 'ready' as const,
  training: { state: 'ready' as const, scheduledSessions: [], workoutSessions: [] } }
describe('Home week calendar facts', () => {
  it('uses Monday to Sunday, including year and DST boundaries', () => {
    expect(homeWeekKeys('2027-01-01')).toEqual(['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03'])
    expect(homeWeekKeys('2026-10-25')).toHaveLength(7)
  })
  it('checks nutrition only for logged days and never turns absence into rest', () => {
    const days = buildHomeWeekCalendar(base)
    expect(days[0]).toMatchObject({ nutrition:'done', sport:'empty' })
    expect(days[1]).toMatchObject({ nutrition:'empty', sport:'empty' })
    expect(days[2]).toMatchObject({ nutrition:'future', sport:'future' })
  })
  it('requires completed workouts and groups by Zurich day rather than UTC date', () => {
    const days = buildHomeWeekCalendar({...base, training: {...base.training, workoutSessions:[
      {created_at:'2026-10-05T22:30:00Z',completed:true},
      {created_at:'2026-10-05T09:00:00Z',completed:false},
    ]}})
    expect(days[0].sport).toBe('empty')
    expect(days[1].sport).toBe('done')
  })
  it('recognises explicit rest, planned sessions and completed schedule entries', () => {
    const days = buildHomeWeekCalendar({...base,training:{...base.training,scheduledSessions:[
      {id:'a',scheduled_date:'2026-10-05',completed:true},
      {id:'b',scheduled_date:'2026-10-07',session_type:'rest'},
      {id:'c',scheduled_date:'2026-10-08',session_type:'training'},
    ]}})
    expect(days[0].sport).toBe('done')
    expect(days[2].sport).toBe('rest')
    expect(days[3].sport).toBe('planned')
  })
  it('does not convert failed reads or truncated missing dates into empty days', () => {
    expect(buildHomeWeekCalendar({...base,nutritionState:'error',training:{...base.training,state:'error'}})[0])
      .toMatchObject({nutrition:'unknown',sport:'unknown'})
    const days = buildHomeWeekCalendar({...base,foodDatesComplete:false})
    expect(days[0].nutrition).toBe('done')
    expect(days[1].nutrition).toBe('unknown')
  })
})
