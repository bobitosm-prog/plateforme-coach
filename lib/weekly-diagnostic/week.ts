/** Date columns are calendar dates, not UTC instants. Never offset their midnight. */
export function diagnosticWeek(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (name: string) => parts.find(p => p.type === name)!.value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const sunday = new Date(`${today}T12:00:00Z`)
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay())
  const date = (delta: number) => {
    const d = new Date(sunday)
    d.setUTCDate(d.getUTCDate() + delta)
    return d.toISOString().slice(0, 10)
  }
  return { today, weekStart: date(-6), sunday: date(0), endExclusive: date(1) }
}
