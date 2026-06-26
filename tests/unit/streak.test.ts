import { describe, it, expect } from 'vitest'
import { computeStreak } from '../../lib/streak'

// Fixed today: 2026-06-26 (Friday)
// Mon=22, Tue=23, Wed=24, Thu=25, Fri=26
// Previous week: Mon=15, Tue=16, Wed=17, Thu=18, Fri=19, Sat=20, Sun=21

describe('computeStreak', () => {
  const TODAY = '2026-06-26'

  it('1. rest day in the middle extends streak', () => {
    // Tue(23)✅ Wed(24)✅ Thu(25)🛌 Fri(26)✅ → streak=4
    const completed = ['2026-06-23', '2026-06-24', '2026-06-26']
    const rest = ['2026-06-25']
    const result = computeStreak(completed, TODAY, rest)
    expect(result.current).toBe(4)
    expect(result.endsToday).toBe(true)
    expect(result.atRisk).toBe(false)
  })

  it('2. weekend rest (2 days) does not break streak', () => {
    // Thu(18)✅ Fri(19)✅ Sat(20)🛌 Sun(21)🛌 Mon(22)✅ ... Fri(26)✅(today)
    const completed = ['2026-06-18', '2026-06-19', '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26']
    const rest = ['2026-06-20', '2026-06-21']
    const result = computeStreak(completed, TODAY, rest)
    // Thu(18)✅+Fri(19)✅+Sat(20)🛌+Sun(21)🛌+Mon(22)✅+Tue(23)✅+Wed(24)✅+Thu(25)✅+Fri(26)✅ = 9
    expect(result.current).toBe(9)
    expect(result.endsToday).toBe(true)
  })

  it('3. missed training day (not rest) breaks streak', () => {
    // Tue(23)✅ Wed(24)❌(not rest, not completed) Thu(25)✅(today=Thu)
    const completed = ['2026-06-23', '2026-06-25']
    const rest: string[] = []
    const result = computeStreak(completed, '2026-06-25', rest)
    expect(result.current).toBe(1) // only Thu counts, Wed breaks
  })

  it('4. deload week (all rest) does not break streak', () => {
    // Mon(15)✅ then Tue(16)..Sun(21) all rest, today=Sun(21)
    const completed = ['2026-06-15']
    const rest = ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21']
    const result = computeStreak(completed, '2026-06-21', rest)
    // Mon(15)+Tue(16)+Wed(17)+Thu(18)+Fri(19)+Sat(20)+Sun(21) = 7
    expect(result.current).toBe(7)
    expect(result.endsToday).toBe(true)
  })

  it('5. no activity and no rest → streak=0', () => {
    const result = computeStreak([], TODAY, [])
    expect(result.current).toBe(0)
    expect(result.endsToday).toBe(false)
    expect(result.atRisk).toBe(false)
  })

  it('6. non-regression: 2-arg call (no rest) behaves like original', () => {
    // Wed(24)✅ Thu(25)✅ Fri(26)✅(today)
    const completed = ['2026-06-24', '2026-06-25', '2026-06-26']
    const result = computeStreak(completed, TODAY)
    expect(result.current).toBe(3)
    expect(result.endsToday).toBe(true)
    expect(result.atRisk).toBe(false)
  })

  it('7. rest AND session on same day — no double counting', () => {
    // Fri(26) has both completed and rest → still counts as 1 day
    const completed = ['2026-06-26']
    const rest = ['2026-06-26']
    const result = computeStreak(completed, TODAY, rest)
    expect(result.current).toBe(1)
    expect(result.endsToday).toBe(true)
  })

  it('8. rest TODAY without session → endsToday=true, streak extends', () => {
    // Wed(24)✅ Thu(25)✅ Fri(26)🛌(today)
    const completed = ['2026-06-24', '2026-06-25']
    const rest = ['2026-06-26']
    const result = computeStreak(completed, TODAY, rest)
    expect(result.current).toBe(3)
    expect(result.endsToday).toBe(true)
    expect(result.atRisk).toBe(false)
  })

  it('non-regression: atRisk when trained yesterday but not today', () => {
    const completed = ['2026-06-24', '2026-06-25']
    const result = computeStreak(completed, TODAY)
    expect(result.current).toBe(2)
    expect(result.endsToday).toBe(false)
    expect(result.atRisk).toBe(true)
  })
})
