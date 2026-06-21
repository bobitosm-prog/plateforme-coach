/**
 * Formate un timestamp en heure locale Europe/Zurich (HH:mm 24h).
 * Gere les strings DB `timestamp without time zone` (UTC non marque)
 * ET les ISO deja marques (toISOString avec Z). Force l'UTC si absent.
 */
export function formatZurichTime(ts: string | null | undefined, locale = 'fr-CH'): string {
  if (!ts) return ''
  const hasZone = /[Zz]|[+-]\d\d:?\d\d$/.test(ts)
  const normalized = hasZone ? ts : ts.replace(' ', 'T') + 'Z'
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(locale, {
    timeZone: 'Europe/Zurich',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

/**
 * Formate un timestamp en date locale Europe/Zurich (YYYY-MM-DD).
 * Meme logique de normalisation que formatZurichTime.
 */
export function formatZurichDate(ts: string | null | undefined): string {
  if (!ts) return ''
  const hasZone = /[Zz]|[+-]\d\d:?\d\d$/.test(ts)
  const normalized = hasZone ? ts : ts.replace(' ', 'T') + 'Z'
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Zurich' })
}
