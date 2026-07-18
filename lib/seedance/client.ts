import 'server-only'

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

function config() {
  const apiKey = process.env.SEEDANCE_API_KEY?.trim()
  if (!apiKey) throw new Error('SEEDANCE_API_KEY is not configured')
  const baseUrl = (process.env.SEEDANCE_BASE_URL?.trim() || 'https://api.seedance2.ai').replace(/\/$/, '')
  return { apiKey, baseUrl }
}

export async function createTask(model: SeedanceModel, input: SeedanceInput): Promise<CreateTaskResult> {
  const { apiKey, baseUrl } = config()
  const res = await fetch(`${baseUrl}/v1/videos/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Seedance createTask failed (${res.status}): ${body?.error || res.statusText}`)
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
