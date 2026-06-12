/**
 * Standalone test for computeStreak — runs in plain Node.
 * Usage: node scripts/test-streak.mjs
 */

// Re-implement logic inline (TS source is the truth, this mirrors it)
function computeStreak(completedLocalDates, todayLocal) {
  const unique = [...new Set(completedLocalDates)].sort().reverse()
  if (unique.length === 0) return { current: 0, endsToday: false, atRisk: false }

  const prevDay = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const trainedToday = unique[0] === todayLocal
  const yesterday = prevDay(todayLocal)
  const trainedYesterday = unique[0] === yesterday || (unique.length > 1 && unique[0] === todayLocal && unique[1] === yesterday)

  let anchor
  if (trainedToday) {
    anchor = todayLocal
  } else if (unique[0] === yesterday) {
    anchor = yesterday
  } else {
    return { current: 0, endsToday: false, atRisk: false }
  }

  const dateSet = new Set(unique)
  let count = 0
  let cursor = anchor
  while (dateSet.has(cursor)) {
    count++
    cursor = prevDay(cursor)
  }

  return { current: count, endsToday: trainedToday, atRisk: !trainedToday }
}

const TODAY = '2026-06-12'

const cases = [
  {
    name: 'empty dates -> 0',
    input: [[], TODAY],
    expect: r => r.current === 0 && !r.endsToday && !r.atRisk,
  },
  {
    name: 'session today only -> 1, endsToday',
    input: [[TODAY], TODAY],
    expect: r => r.current === 1 && r.endsToday && !r.atRisk,
  },
  {
    name: '3 consecutive ending today -> 3',
    input: [['2026-06-10', '2026-06-11', '2026-06-12'], TODAY],
    expect: r => r.current === 3 && r.endsToday && !r.atRisk,
  },
  {
    name: '3 consecutive ending yesterday -> 3 atRisk',
    input: [['2026-06-09', '2026-06-10', '2026-06-11'], TODAY],
    expect: r => r.current === 3 && !r.endsToday && r.atRisk,
  },
  {
    name: 'gap before yesterday -> 0',
    input: [['2026-06-08', '2026-06-10'], TODAY],
    expect: r => r.current === 0 && !r.endsToday && !r.atRisk,
  },
  {
    name: 'duplicates same day -> 1',
    input: [[TODAY, TODAY, TODAY], TODAY],
    expect: r => r.current === 1 && r.endsToday,
  },
  {
    name: 'unsorted dates -> correct count',
    input: [['2026-06-12', '2026-06-10', '2026-06-11'], TODAY],
    expect: r => r.current === 3 && r.endsToday,
  },
]

let passed = 0
let failed = 0

for (const { name, input, expect: check } of cases) {
  const result = computeStreak(...input)
  const ok = check(result)
  if (ok) {
    console.log(`  PASS  ${name}`)
    passed++
  } else {
    console.log(`  FAIL  ${name}`)
    console.log(`        got: ${JSON.stringify(result)}`)
    failed++
  }
}

console.log(`\n${passed}/${cases.length} passed${failed ? ` — ${failed} FAILED` : ''}`)
process.exit(failed > 0 ? 1 : 0)
