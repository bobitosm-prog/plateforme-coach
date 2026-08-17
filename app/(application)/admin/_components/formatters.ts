/**
 * Formate un montant en CENTIMES (convention Stripe SDK).
 * Ex: 1000 → "CHF 10"
 */
export function formatCurrencyFromCents(
  amountCents: number,
  currency = 'CHF',
  locale = 'fr-CH'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100)
}

/**
 * Formate un montant en UNITE MAJEURE (francs, euros).
 * Ex: 10.00 → "CHF 10"
 * Pour la table `payments` qui stocke en francs.
 */
export function formatCurrencyFromMajor(
  amountMajor: number,
  currency = 'CHF',
  locale = 'fr-CH'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMajor)
}

/** @deprecated Utiliser formatCurrencyFromCents ou formatCurrencyFromMajor */
export const formatCurrency = formatCurrencyFromCents

export function formatDate(iso: string | null, locale = 'fr-CH'): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(iso: string | null, locale = 'fr-CH'): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days} j`
  return formatDate(iso)
}
