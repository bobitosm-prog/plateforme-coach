import 'server-only'

import { assertSeedanceProviderReferenceUrl } from '@/lib/seedance/reference-storage'

export type SeedanceModel = 'seedance-2-0' | 'seedance-2-0-fast' | 'seedance-2-0-mini'
export type SeedanceGenerationType = 'text-to-video' | 'image-to-video'
export type SeedanceStatus = 'queued' | 'generating' | 'completed' | 'failed'

export interface SeedanceInput {
  prompt: string
  generation_type: SeedanceGenerationType
  image_urls?: string[]
  duration: number
  aspect_ratio: string
  resolution: string
  seed?: number
}

export interface CreateTaskResult {
  taskId: string
  credits: number
}

export interface TaskResult {
  status: SeedanceStatus
  videoUrl: string | null
  expiresAt: string | null
  failedReason: string | null
}

export interface SeedanceProviderFailure {
  status: number | null
  providerErrorType: string
  providerErrorCode?: string
}

export class SeedanceProviderError extends Error {
  readonly status: number | null
  readonly providerErrorType: string
  readonly providerErrorCode?: string

  constructor(operation: 'createTask' | 'getTask', failure: SeedanceProviderFailure) {
    super(`Seedance ${operation} failed${failure.status === null ? '' : ` (${failure.status})`}`)
    this.name = 'SeedanceProviderError'
    this.status = failure.status
    this.providerErrorType = failure.providerErrorType
    this.providerErrorCode = failure.providerErrorCode
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function safeIdentifier(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.:-]{1,80}$/.test(value)) return undefined
  return value
}

async function providerFailure(response: Response): Promise<SeedanceProviderFailure> {
  const raw = await response.text().catch(() => '')
  let parsed: unknown = null
  try {
    parsed = raw ? JSON.parse(raw) : null
  } catch {
    // A non-JSON provider body is intentionally discarded.
  }

  const root = record(parsed)
  const nested = record(root?.error)
  return {
    status: response.status,
    providerErrorType: safeIdentifier(nested?.type)
      ?? safeIdentifier(root?.type)
      ?? (typeof root?.error === 'string' ? 'provider_error' : 'unknown_error'),
    providerErrorCode: safeIdentifier(nested?.code) ?? safeIdentifier(root?.code),
  }
}

export function getSeedanceProviderFailure(error: unknown): SeedanceProviderFailure {
  if (error instanceof SeedanceProviderError) {
    return {
      status: error.status,
      providerErrorType: error.providerErrorType,
      providerErrorCode: error.providerErrorCode,
    }
  }
  return { status: null, providerErrorType: 'unknown_error' }
}

function config() {
  const apiKey = process.env.SEEDANCE_API_KEY?.trim()
  if (!apiKey) throw new Error('SEEDANCE_API_KEY is not configured')
  const baseUrl = (process.env.SEEDANCE_BASE_URL?.trim() || 'https://api.seedance2.ai').replace(/\/$/, '')
  return { apiKey, baseUrl }
}

export async function createTask(model: SeedanceModel, input: SeedanceInput): Promise<CreateTaskResult> {
  const { apiKey, baseUrl } = config()
  for (const imageUrl of input.image_urls ?? []) assertSeedanceProviderReferenceUrl(imageUrl)
  let res: Response
  try {
    res = await fetch(`${baseUrl}/v1/videos/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input }),
    })
  } catch {
    throw new SeedanceProviderError('createTask', {
      status: null,
      providerErrorType: 'network_error',
      providerErrorCode: 'request_failed',
    })
  }
  if (!res.ok) {
    throw new SeedanceProviderError('createTask', await providerFailure(res))
  }
  const data = await res.json()
  return { taskId: data.taskId, credits: data.credits ?? 0 }
}

export async function getTask(taskId: string): Promise<TaskResult> {
  const { apiKey, baseUrl } = config()
  const res = await fetch(`${baseUrl}/v1/tasks/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Seedance getTask failed (${res.status}): ${body?.error || res.statusText}`)
  }
  const data = await res.json()
  return {
    status: data.status,
    videoUrl: data.data?.results?.[0] ?? null,
    expiresAt: data.data?.video_expires_at ?? null,
    failedReason: data.failed_reason ?? null,
  }
}
