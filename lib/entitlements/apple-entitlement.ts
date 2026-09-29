/** Public snapshot contains no transaction identifiers, account tokens or signed payloads. */
export interface AppleEntitlement {
  type: 'paid' | 'lifetime'
  plan: 'monthly' | 'yearly' | 'lifetime'
  accessUntil: number | null
  validUntil: number
}
export function isActiveAppleEntitlement(value: AppleEntitlement | null | undefined, now = Date.now()): boolean {
  if (!value || !Number.isSafeInteger(value.validUntil) || value.validUntil <= now) return false
  if (value.type === 'lifetime') return value.plan === 'lifetime' && value.accessUntil === null
  return value.type === 'paid' && (value.plan === 'monthly' || value.plan === 'yearly') &&
    Number.isSafeInteger(value.accessUntil) && value.accessUntil! > now && value.validUntil <= value.accessUntil!
}
