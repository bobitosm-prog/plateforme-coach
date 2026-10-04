/** Bump this version whenever the provider, purposes or categories change. */
export const AI_CONSENT_VERSION = 'anthropic-2026-10-04-v1'
export const AI_ACCOUNT_HEADER = 'x-moovx-ai-user-id'
export type AiConsentStatus = { userId: string; version: string; granted: boolean; decided: boolean }
export class AiConsentDeclinedError extends Error {}
