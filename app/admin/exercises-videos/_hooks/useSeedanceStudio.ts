'use client'
import { useCallback, useRef, useState } from 'react'
import { adminFetch } from '@/lib/admin/api-client'

export type StudioPhase = 'idle' | 'generating' | 'preview' | 'publishing' | 'published' | 'error'

export interface StudioState { phase: StudioPhase; videoUrl: string | null; error: string | null }

export interface GenerateInput {
  exerciseId?: string
  exerciseName: string
  prompt: string
  model: string
  generationType: 'text-to-video' | 'image-to-video'
  referenceImageUrl?: string
  params: { duration: number; aspectRatio: string; resolution: string; seed?: number }
}

export interface StudioOptions {
  /** Intervalle de polling en ms (défaut 10000). Injectable pour les tests. */
  pollMs?: number
  /** Nombre max de polls avant timeout (défaut 30 ≈ 5 min à 10s). */
  maxPolls?: number
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

export type PollResult =
  | { kind: 'completed'; videoUrl: string }
  | { kind: 'failed' }
  | { kind: 'timeout' }

/**
 * Boucle de polling pure (sans React) : interroge `fetchStatus` jusqu'à un
 * état terminal ou le timeout. Extraite du hook pour être testable en node.
 */
export async function pollForVideo(
  taskId: string,
  fetchStatus: (taskId: string) => Promise<{ status: string; videoUrl: string | null }>,
  opts: { pollMs: number; maxPolls: number },
): Promise<PollResult> {
  for (let i = 0; i < opts.maxPolls; i++) {
    const s = await fetchStatus(taskId)
    if (s.status === 'completed' && s.videoUrl) return { kind: 'completed', videoUrl: s.videoUrl }
    if (s.status === 'failed') return { kind: 'failed' }
    await sleep(opts.pollMs)
  }
  return { kind: 'timeout' }
}

export function useSeedanceStudio(opts: StudioOptions = {}) {
  const pollMs = opts.pollMs ?? 10_000
  const maxPolls = opts.maxPolls ?? 30
  const [state, setState] = useState<StudioState>({ phase: 'idle', videoUrl: null, error: null })
  const jobIdRef = useRef<string | null>(null)

  const generate = useCallback(async (input: GenerateInput) => {
    setState({ phase: 'generating', videoUrl: null, error: null })
    try {
      const { jobId, taskId } = await adminFetch<{ jobId: string; taskId: string }>(
        '/api/admin/seedance/generate',
        { method: 'POST', body: JSON.stringify(input) },
      )
      jobIdRef.current = jobId

      const result = await pollForVideo(
        taskId,
        (id) => adminFetch<{ status: string; videoUrl: string | null }>(
          `/api/admin/seedance/status?taskId=${encodeURIComponent(id)}`,
        ),
        { pollMs, maxPolls },
      )

      if (result.kind === 'completed') {
        setState({ phase: 'preview', videoUrl: result.videoUrl, error: null })
      } else if (result.kind === 'failed') {
        setState({ phase: 'error', videoUrl: null, error: 'La génération a échoué' })
      } else {
        setState({ phase: 'error', videoUrl: null, error: 'Timeout : génération trop longue' })
      }
    } catch (e: any) {
      setState({ phase: 'error', videoUrl: null, error: e.message || 'Erreur de génération' })
    }
  }, [pollMs, maxPolls])

  const publish = useCallback(async () => {
    if (!jobIdRef.current) return
    setState((s) => ({ ...s, phase: 'publishing', error: null }))
    try {
      await adminFetch('/api/admin/seedance/publish', {
        method: 'POST', body: JSON.stringify({ jobId: jobIdRef.current }),
      })
      setState((s) => ({ ...s, phase: 'published' }))
    } catch (e: any) {
      setState((s) => ({ ...s, phase: 'error', error: e.message || 'Publication échouée' }))
    }
  }, [])

  const reset = useCallback(() => {
    jobIdRef.current = null
    setState({ phase: 'idle', videoUrl: null, error: null })
  }, [])

  return { state, generate, publish, reset }
}
