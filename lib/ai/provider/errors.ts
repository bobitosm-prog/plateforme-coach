import type { AiErrorCode, AiResult, AiSafeError } from './types'
import { normalizeCorrelationId, normalizeModelId } from './validation'

export interface AiProviderFailureInput {
  kind?: 'refusal' | 'quota' | 'timeout' | 'network' | 'invalid_output' | 'cancelled'
  status?: number
}

export function normalizeAiProviderError(input: AiProviderFailureInput): AiSafeError {
  if (input.kind === 'cancelled') return { code: 'cancelled', retryable: false }
  if (input.kind === 'timeout') return { code: 'timeout', retryable: true }
  if (input.kind === 'network') return { code: 'network_error', retryable: true }
  if (input.kind === 'invalid_output') return { code: 'invalid_output', retryable: false }
  if (input.kind === 'quota' || input.status === 429) return { code: 'quota_exceeded', retryable: true }
  if (input.kind === 'refusal' || input.status === 400 || input.status === 401 || input.status === 403) return { code: 'provider_refused', retryable: false }
  if (input.status !== undefined && input.status >= 500) return { code: 'network_error', retryable: true }
  return { code: 'unexpected_error', retryable: false }
}

export function sanitizeAiSafeError(input: AiSafeError): AiSafeError {
  const codes: AiErrorCode[] = ['provider_refused', 'quota_exceeded', 'timeout', 'network_error', 'invalid_output', 'unexpected_error', 'cancelled']
  return codes.includes(input.code)
    ? { code: input.code, retryable: input.retryable === true }
    : { code: 'unexpected_error', retryable: false }
}

export function aiFailure<T>(options: {
  code: AiErrorCode
  retryable: boolean
  correlationId: string
  requestedModel: string
}): AiResult<T> & { ok: false } {
  return {
    ok: false,
    error: { code: options.code, retryable: options.retryable },
    metadata: { correlationId: normalizeCorrelationId(options.correlationId), requestedModel: normalizeModelId(options.requestedModel) },
  }
}
