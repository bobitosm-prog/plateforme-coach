'use client'
import { AI_ACCOUNT_HEADER, AI_CONSENT_VERSION, AiConsentDeclinedError, type AiConsentStatus } from './consent-policy'
import { aiConsentCopy, aiLocale } from './consent-copy'
import { showAiConsentDialog } from './consent-dialog'

const pending = new Map<string, Promise<void>>()
export { AiConsentDeclinedError } from './consent-policy'
const copy = () => aiConsentCopy[aiLocale()]

async function statusResponse(response: Response): Promise<AiConsentStatus> {
  if (!response.ok) throw new Error(response.status === 409 ? copy().account : copy().error)
  const status = await response.json()
  if (typeof status.userId !== 'string' || status.version !== AI_CONSENT_VERSION || typeof status.granted !== 'boolean' || typeof status.decided !== 'boolean') throw new Error(copy().error)
  return status
}
export async function getAiConsent(): Promise<AiConsentStatus> {
  return statusResponse(await fetch('/api/ai-consent', { cache: 'no-store' }))
}
export async function setAiConsent(userId: string, granted: boolean): Promise<AiConsentStatus> {
  const status = await statusResponse(await fetch('/api/ai-consent', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, granted, version: AI_CONSENT_VERSION }),
  }))
  if (status.userId !== userId || status.granted !== granted) throw new Error(copy().account)
  window.dispatchEvent(new Event('moovx-ai-consent-changed'))
  return status
}

export async function ensureAiConsent(expectedUserId?: string, askAfterDecline = true): Promise<string> {
  const status = await getAiConsent()
  if (expectedUserId && expectedUserId !== status.userId) throw new Error(copy().account)
  if (!status.granted) {
    if (status.decided && !askAfterDecline) throw new AiConsentDeclinedError(copy().declined)
    let decision = pending.get(status.userId)
    if (!decision) {
      // Defer execution one microtask so parallel training/nutrition calls share the same dialog.
      decision = Promise.resolve().then(async () => {
        const accepted = await showAiConsentDialog()
        await setAiConsent(status.userId, accepted)
        if (!accepted) throw new AiConsentDeclinedError(copy().declined)
      })
      pending.set(status.userId, decision)
    }
    try { await decision } finally { if (pending.get(status.userId) === decision) pending.delete(status.userId) }
  }
  return status.userId
}

/** Only AI actions use this transport; manual APIs stay usable without permission. */
export async function aiFetch(input: string, init: RequestInit = {}, expectedUserId?: string, askAfterDecline = true): Promise<Response> {
  const userId = await ensureAiConsent(expectedUserId, askAfterDecline)
  if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const headers = new Headers(init.headers)
  headers.set(AI_ACCOUNT_HEADER, userId)
  return fetch(input, { ...init, headers })
}

/** A coach cannot provide a client's personal consent on their behalf. */
export async function clientSubjectAiFetch(input: string, init: RequestInit, subjectId: string): Promise<Response> {
  const status = await getAiConsent()
  if (subjectId !== status.userId) throw new Error(copy().subject)
  return aiFetch(input, init, subjectId)
}
