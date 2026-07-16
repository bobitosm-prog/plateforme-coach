import { z } from 'zod'

import { getApiErrorDescriptor } from '@/lib/api/errors'
import { apiFailureResponse, type ApiFailure } from '@/lib/api/response'

const MAX_ISSUES = 8
const MAX_PATH_SEGMENTS = 12
const MAX_PATH_LENGTH = 120
const DEFAULT_MAX_BODY_BYTES = 1_000_000
const SENSITIVE_PATH = /(authorization|cookie|email|key|password|payload|secret|session|signature|token)/i

export interface ValidationIssue {
  path: string
  code: string
  message: string
}

export interface ValidationDetails {
  issues: ValidationIssue[]
  truncated: boolean
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response }

type PublicIssueCode =
  | 'required' | 'invalid_type' | 'unknown_key' | 'too_small' | 'too_big'
  | 'invalid_format' | 'invalid_value' | 'custom'
  | 'body_required' | 'malformed_json' | 'unsupported_content_type' | 'body_too_large'

function safePath(path: PropertyKey[]): string {
  const sliced = path.slice(0, MAX_PATH_SEGMENTS)
  const joined = sliced.map((segment) => {
    if (typeof segment === 'number') return `[${segment}]`
    const value = String(segment)
    if (SENSITIVE_PATH.test(value)) return '[redacted]'
    return /^[A-Za-z0-9_-]{1,32}$/.test(value) ? value : 'field'
  }).reduce((output, segment) => segment.startsWith('[') ? `${output}${segment}` : output ? `${output}.${segment}` : segment, '')
  const bounded = joined.slice(0, MAX_PATH_LENGTH)
  return path.length > MAX_PATH_SEGMENTS || joined.length > MAX_PATH_LENGTH ? `${bounded}…` : bounded || 'value'
}

function publicIssue(issue: z.core.$ZodIssue): ValidationIssue {
  const code = issue.code === 'invalid_type'
    ? ('invalid_type' as const)
    : issue.code === 'unrecognized_keys'
      ? ('unknown_key' as const)
      : issue.code === 'too_small' || issue.code === 'too_big' || issue.code === 'invalid_format' || issue.code === 'invalid_value'
        ? issue.code
        : ('custom' as const)
  const messages: Record<PublicIssueCode, string> = {
    required: 'Required value missing', invalid_type: 'Invalid value type', unknown_key: 'Unknown field',
    too_small: 'Value is below the allowed minimum', too_big: 'Value exceeds the allowed maximum',
    invalid_format: 'Invalid value format', invalid_value: 'Invalid value', custom: 'Invalid value',
    body_required: 'Request body is required', malformed_json: 'Request body must be valid JSON',
    unsupported_content_type: 'Content-Type must be application/json', body_too_large: 'Request body is too large',
  }
  return { path: safePath(issue.path), code, message: messages[code] }
}

function failure(request: Request, issues: ValidationIssue[], truncated = false): ValidationResult<never> {
  const descriptor = getApiErrorDescriptor('VALIDATION_ERROR')
  return {
    ok: false,
    response: apiFailureResponse<ValidationDetails>(request, {
      status: descriptor.status,
      code: 'VALIDATION_ERROR',
      message: descriptor.message,
      details: { issues, truncated },
    }),
  }
}

function singleIssue(request: Request, code: PublicIssueCode, message: string): ValidationResult<never> {
  return failure(request, [{ path: 'body', code, message }])
}

export function validateValue<S extends z.ZodType>(request: Request, schema: S, input: unknown): ValidationResult<z.output<S>> {
  const parsed = schema.safeParse(input)
  if (parsed.success) return { ok: true, data: parsed.data }
  const issues = parsed.error.issues.map(publicIssue)
    .sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code))
  return failure(request, issues.slice(0, MAX_ISSUES), issues.length > MAX_ISSUES)
}

export async function validateJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
  options: { maxBytes?: number; requireJsonContentType?: boolean } = {},
): Promise<ValidationResult<z.output<S>>> {
  const requireType = options.requireJsonContentType ?? true
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  if (requireType && contentType !== 'application/json' && !contentType?.endsWith('+json')) {
    return singleIssue(request, 'unsupported_content_type', 'Content-Type must be application/json')
  }
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return singleIssue(request, 'body_too_large', 'Request body is too large')
  }
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > maxBytes) return singleIssue(request, 'body_too_large', 'Request body is too large')
  if (!text.trim()) return singleIssue(request, 'body_required', 'Request body is required')
  let input: unknown
  try { input = JSON.parse(text) }
  catch { return singleIssue(request, 'malformed_json', 'Request body must be valid JSON') }
  return validateValue(request, schema, input)
}

export function validateQuery<S extends z.ZodType>(request: Request, schema: S): ValidationResult<z.output<S>> {
  const values: Record<string, string | string[]> = {}
  const params = new URL(request.url).searchParams
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key)
    values[key] = all.length === 1 ? all[0] : all
  }
  return validateValue(request, schema, values)
}

export async function validateRouteParams<S extends z.ZodType>(
  request: Request,
  params: unknown | Promise<unknown>,
  schema: S,
): Promise<ValidationResult<z.output<S>>> {
  return validateValue(request, schema, await params)
}

export type ValidationFailure = ApiFailure<ValidationDetails>
