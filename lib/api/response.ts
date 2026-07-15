import { isValidCorrelationId, resolveCorrelationId } from '@/lib/security/audit-log'

export interface ApiMeta {
  requestId?: string
}

export interface ApiSuccess<T, M extends ApiMeta = ApiMeta> {
  ok: true
  data: T
  meta?: M
}

export interface ApiFailure<D = unknown> {
  ok: false
  error: {
    code: string
    message: string
    details?: D
  }
  meta: {
    requestId: string
  }
}

export type ApiResponse<T, D = unknown, M extends ApiMeta = ApiMeta> =
  | ApiSuccess<T, M>
  | ApiFailure<D>

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/
const SENSITIVE_KEY_PATTERN = /(^|_)(authorization|cookie|email|key|password|payload|secret|session|signature|token)($|_)/i
const SENSITIVE_TEXT_PATTERN = /(bearer\s+\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:api[_-]?key|password|secret|token)\s*[:=])/i
const STACK_PATTERN = /\n\s*at\s+|\b(?:Error|TypeError|RangeError):/i

function assertJsonValue(value: unknown, path: string, seen: Set<object>): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} must contain only finite numbers`)
    return
  }
  if (typeof value !== 'object') throw new TypeError(`${path} is not JSON-serializable`)
  if (value instanceof Date) throw new TypeError(`${path} contains a Date; serialize it explicitly as a string`)
  if (seen.has(value)) throw new TypeError(`${path} contains a circular reference`)
  const prototype = Object.getPrototypeOf(value)
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must contain only plain objects and arrays`)
  }
  seen.add(value)
  if (Array.isArray(value)) value.forEach((item, index) => assertJsonValue(item, `${path}[${index}]`, seen))
  else Object.entries(value).forEach(([key, item]) => assertJsonValue(item, `${path}.${key}`, seen))
  seen.delete(value)
}

function assertPublicDetails(value: unknown): void {
  assertJsonValue(value, 'error.details', new Set())
  const inspect = (current: unknown): void => {
    if (typeof current === 'string' && (SENSITIVE_TEXT_PATTERN.test(current) || STACK_PATTERN.test(current))) {
      throw new TypeError('error.details contains sensitive or internal text')
    }
    if (Array.isArray(current)) current.forEach(inspect)
    else if (current && typeof current === 'object') {
      for (const [key, item] of Object.entries(current)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) throw new TypeError(`error.details contains forbidden key: ${key}`)
        inspect(item)
      }
    }
  }
  inspect(value)
}

export function createApiSuccess<T, M extends ApiMeta = ApiMeta>(data: T, meta?: M): ApiSuccess<T, M> {
  assertJsonValue(data, 'data', new Set())
  if (meta !== undefined) assertJsonValue(meta, 'meta', new Set())
  return meta === undefined ? { ok: true, data } : { ok: true, data, meta }
}

export function createApiFailure<D = unknown>(
  requestId: string,
  error: { code: string; message: string; details?: D },
): ApiFailure<D> {
  if (!isValidCorrelationId(requestId)) throw new TypeError('requestId does not match the correlation ID contract')
  if (!ERROR_CODE_PATTERN.test(error.code)) throw new TypeError('error.code must be a stable uppercase machine code')
  if (!error.message.trim() || SENSITIVE_TEXT_PATTERN.test(error.message) || STACK_PATTERN.test(error.message)) {
    throw new TypeError('error.message must be controlled and contain no sensitive or internal text')
  }
  if (error.details !== undefined) assertPublicDetails(error.details)
  return {
    ok: false,
    error: error.details === undefined
      ? { code: error.code, message: error.message }
      : { code: error.code, message: error.message, details: error.details },
    meta: { requestId },
  }
}

function jsonHeaders(requestId: string, headers?: HeadersInit): Headers {
  const output = new Headers(headers)
  output.set('content-type', 'application/json; charset=utf-8')
  output.set('x-request-id', requestId)
  return output
}

export function apiSuccessResponse<T, M extends ApiMeta = ApiMeta>(
  request: Request,
  data: T,
  init: Omit<ResponseInit, 'status'> & { status?: number; meta?: M } = {},
): Response {
  const requestId = resolveCorrelationId(request)
  const { meta: inputMeta, ...responseInit } = init
  const meta = { ...inputMeta, requestId } as M
  const body = createApiSuccess(data, meta)
  return new Response(JSON.stringify(body), {
    ...responseInit,
    status: init.status ?? 200,
    headers: jsonHeaders(requestId, init.headers),
  })
}

export function apiFailureResponse<D = unknown>(
  request: Request,
  input: { status: number; code: string; message: string; details?: D; headers?: HeadersInit },
): Response {
  const requestId = resolveCorrelationId(request)
  const body = createApiFailure(requestId, input)
  return new Response(JSON.stringify(body), { status: input.status, headers: jsonHeaders(requestId, input.headers) })
}

export function apiNoContentResponse(request: Request, init: Omit<ResponseInit, 'status'> = {}): Response {
  const requestId = resolveCorrelationId(request)
  const headers = new Headers(init.headers)
  headers.set('x-request-id', requestId)
  headers.delete('content-type')
  return new Response(null, { ...init, status: 204, headers })
}
