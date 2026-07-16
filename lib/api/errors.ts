export const API_ERROR_CODES = [
  'VALIDATION_ERROR', 'AUTH_REQUIRED', 'TOKEN_INVALID', 'ROLE_FORBIDDEN',
  'RELATION_FORBIDDEN', 'RESOURCE_NOT_FOUND', 'RESOURCE_GONE', 'CONFLICT',
  'INVALID_STATE', 'RATE_LIMITED', 'QUOTA_EXCEEDED', 'UPSTREAM_REJECTED',
  'UPSTREAM_UNAVAILABLE', 'PERSISTENCE_FAILED', 'INTERNAL_ERROR',
  'INVITATION_INVALID', 'INVITATION_TERMINAL', 'INVITATION_DELIVERY_FAILED',
  'STRIPE_IDENTITY_INVALID', 'STRIPE_METADATA_INVALID', 'STRIPE_SIGNATURE_INVALID',
  'WEBHOOK_ALREADY_PROCESSED', 'WEBHOOK_ALREADY_PROCESSING', 'WEBHOOK_PROCESSING_FAILED',
  'PUSH_DELIVERY_FAILED', 'ADMIN_REQUIRED', 'SERVER_MISCONFIGURED',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]
export type ApiErrorCategory =
  | 'validation' | 'authentication' | 'authorization' | 'not_found' | 'conflict'
  | 'limit' | 'upstream' | 'unavailable' | 'persistence' | 'internal'
export type ApiErrorRetry = 'never' | 'client' | 'server'
export type ApiErrorLogLevel = 'none' | 'info' | 'warning' | 'error'
export type ApiErrorAntiEnumeration = 'none' | 'return_not_found'
export type ApiErrorDomain = 'common' | 'invitation' | 'stripe' | 'push' | 'admin' | 'ai'

export interface ApiErrorDescriptor {
  category: ApiErrorCategory
  status: number
  message: string
  retry: ApiErrorRetry
  logLevel: ApiErrorLogLevel
  details: 'forbidden' | 'public_validation_only'
  antiEnumeration: ApiErrorAntiEnumeration
  domains: readonly ApiErrorDomain[]
}

const descriptor = (
  category: ApiErrorCategory,
  status: number,
  message: string,
  options: Partial<Omit<ApiErrorDescriptor, 'category' | 'status' | 'message'>> = {},
): ApiErrorDescriptor => ({
  category, status, message, retry: 'never', logLevel: 'info', details: 'forbidden',
  antiEnumeration: 'none', domains: ['common'], ...options,
})

export const API_ERROR_REGISTRY = {
  VALIDATION_ERROR: descriptor('validation', 400, 'Invalid request', { details: 'public_validation_only', logLevel: 'none' }),
  AUTH_REQUIRED: descriptor('authentication', 401, 'Authentication required', { logLevel: 'warning' }),
  TOKEN_INVALID: descriptor('authentication', 401, 'Invalid or expired credentials', { logLevel: 'warning' }),
  ROLE_FORBIDDEN: descriptor('authorization', 403, 'Operation forbidden', { logLevel: 'warning' }),
  RELATION_FORBIDDEN: descriptor('authorization', 403, 'Operation forbidden', { logLevel: 'warning' }),
  RESOURCE_NOT_FOUND: descriptor('not_found', 404, 'Resource not found', { logLevel: 'none' }),
  RESOURCE_GONE: descriptor('not_found', 410, 'Resource is no longer available', { logLevel: 'none' }),
  CONFLICT: descriptor('conflict', 409, 'Operation conflicts with the current state'),
  INVALID_STATE: descriptor('conflict', 409, 'Operation is not valid in the current state'),
  RATE_LIMITED: descriptor('limit', 429, 'Too many requests', { retry: 'client' }),
  QUOTA_EXCEEDED: descriptor('limit', 429, 'Usage quota exceeded', { retry: 'client', domains: ['common', 'ai'] }),
  UPSTREAM_REJECTED: descriptor('upstream', 502, 'External service rejected the request', { logLevel: 'error' }),
  UPSTREAM_UNAVAILABLE: descriptor('unavailable', 503, 'External service temporarily unavailable', { retry: 'client', logLevel: 'error' }),
  PERSISTENCE_FAILED: descriptor('persistence', 500, 'Unable to persist the operation', { retry: 'server', logLevel: 'error' }),
  INTERNAL_ERROR: descriptor('internal', 500, 'Internal server error', { logLevel: 'error' }),
  INVITATION_INVALID: descriptor('not_found', 404, 'Invitation unavailable', { antiEnumeration: 'return_not_found', domains: ['invitation'], logLevel: 'warning' }),
  INVITATION_TERMINAL: descriptor('not_found', 410, 'Invitation is no longer available', { antiEnumeration: 'return_not_found', domains: ['invitation'] }),
  INVITATION_DELIVERY_FAILED: descriptor('upstream', 502, 'Invitation could not be delivered', { retry: 'server', domains: ['invitation'], logLevel: 'error' }),
  STRIPE_IDENTITY_INVALID: descriptor('authorization', 403, 'Payment identity is not authorized', { domains: ['stripe'], logLevel: 'warning' }),
  STRIPE_METADATA_INVALID: descriptor('validation', 400, 'Invalid payment metadata', { domains: ['stripe'], logLevel: 'warning' }),
  STRIPE_SIGNATURE_INVALID: descriptor('authentication', 400, 'Invalid webhook signature', { domains: ['stripe'], logLevel: 'warning' }),
  WEBHOOK_ALREADY_PROCESSED: descriptor('conflict', 200, 'Webhook already processed', { domains: ['stripe'], logLevel: 'info' }),
  WEBHOOK_ALREADY_PROCESSING: descriptor('conflict', 409, 'Webhook processing already in progress', { retry: 'server', domains: ['stripe'], logLevel: 'warning' }),
  WEBHOOK_PROCESSING_FAILED: descriptor('persistence', 503, 'Webhook processing failed', { retry: 'server', domains: ['stripe'], logLevel: 'error' }),
  PUSH_DELIVERY_FAILED: descriptor('upstream', 502, 'Notification could not be delivered', { retry: 'server', domains: ['push'], logLevel: 'error' }),
  ADMIN_REQUIRED: descriptor('authorization', 403, 'Administrator access required', { antiEnumeration: 'return_not_found', domains: ['admin'], logLevel: 'warning' }),
  SERVER_MISCONFIGURED: descriptor('internal', 500, 'Service is not configured', { domains: ['common', 'stripe', 'push', 'ai'], logLevel: 'error' }),
} satisfies Record<ApiErrorCode, ApiErrorDescriptor>

export type LegacyApiErrorCode = keyof typeof LEGACY_API_ERROR_CODES

export const LEGACY_API_ERROR_CODES = {
  IDENTITY_MISMATCH: 'STRIPE_IDENTITY_INVALID', PROFILE_UNAVAILABLE: 'RESOURCE_NOT_FOUND',
  SIGNATURE_REQUIRED: 'STRIPE_SIGNATURE_INVALID', SIGNATURE_INVALID: 'STRIPE_SIGNATURE_INVALID',
  PRICE_NOT_CONFIGURED: 'SERVER_MISCONFIGURED', CHECKOUT_FAILED: 'UPSTREAM_REJECTED',
  INVITATION_CONSUMPTION_FAILED: 'PERSISTENCE_FAILED', WEBHOOK_FINALIZATION_FAILED: 'WEBHOOK_PROCESSING_FAILED',
} as const satisfies Record<string, ApiErrorCode>

export function getApiErrorDescriptor(code: ApiErrorCode): ApiErrorDescriptor {
  return API_ERROR_REGISTRY[code]
}

export function mapLegacyApiErrorCode(code: LegacyApiErrorCode): ApiErrorCode {
  return LEGACY_API_ERROR_CODES[code]
}
