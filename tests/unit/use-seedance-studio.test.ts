import { describe, it, expect, vi } from 'vitest'

// Le module du hook importe adminFetch -> client supabase browser (init au load).
// On le neutralise : pollForVideo n'en dépend pas.
vi.mock('@/lib/admin/api-client', () => ({ adminFetch: vi.fn() }))

import { pollForVideo } from '@/app/admin/exercises-videos/_hooks/useSeedanceStudio'

const opts = { pollMs: 0, maxPolls: 5 }

describe('pollForVideo', () => {
  it('polls through "generating" then resolves completed with the video url', async () => {
    const fetchStatus = vi.fn()
      .mockResolvedValueOnce({ status: 'generating', videoUrl: null })
      .mockResolvedValueOnce({ status: 'completed', videoUrl: 'https://v/a.mp4' })

    const res = await pollForVideo('t1', fetchStatus, opts)
    expect(res).toEqual({ kind: 'completed', videoUrl: 'https://v/a.mp4' })
    expect(fetchStatus).toHaveBeenCalledTimes(2)
  })

  it('resolves failed as soon as the task fails', async () => {
    const fetchStatus = vi.fn().mockResolvedValueOnce({ status: 'failed', videoUrl: null })
    const res = await pollForVideo('t1', fetchStatus, opts)
    expect(res).toEqual({ kind: 'failed' })
    expect(fetchStatus).toHaveBeenCalledTimes(1)
  })

  it('returns timeout after maxPolls without a terminal state', async () => {
    const fetchStatus = vi.fn().mockResolvedValue({ status: 'generating', videoUrl: null })
    const res = await pollForVideo('t1', fetchStatus, { pollMs: 0, maxPolls: 3 })
    expect(res).toEqual({ kind: 'timeout' })
    expect(fetchStatus).toHaveBeenCalledTimes(3)
  })
})
