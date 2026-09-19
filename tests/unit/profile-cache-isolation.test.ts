import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProfile, getCachedProfile, invalidateProfileCache } from '@/lib/profile-service'

function client(data: unknown, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data, error })
  const eq = vi.fn(() => ({ single }))
  return { from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })) }
}

afterEach(() => { invalidateProfileCache(); vi.useRealTimers() })

describe('profile cache account isolation', () => {
  it.each([{ message: 'offline' }, null])('never falls back to another account on failed/empty reads', async error => {
    await getProfile('account-a', client({ id: 'account-a', calorie_goal: 2100 }))
    expect(await getProfile('account-b', client(null, error))).toBeNull()
  })

  it('preserves the same-account offline fallback', async () => {
    const profile = { id: 'account-a', calorie_goal: 2100 }
    await getProfile('account-a', client(profile))
    expect(await getProfile('account-a', client(null, { message: 'offline' }), true)).toEqual(profile)
  })

  it('requires the requested identity for direct cache reads', async () => {
    await getProfile('account-a', client({ id: 'account-a' }))
    expect(getCachedProfile('account-b')).toBeNull()
    expect(getCachedProfile('account-a')).toEqual({ id: 'account-a' })
  })

  it('does not expose expired entries through the direct reader', async () => {
    vi.useFakeTimers()
    await getProfile('account-a', client({ id: 'account-a' }))
    vi.advanceTimersByTime(60_001)
    expect(getCachedProfile('account-a')).toBeNull()
  })

  it('clears the offline fallback on invalidation', async () => {
    await getProfile('account-a', client({ id: 'account-a' }))
    invalidateProfileCache()
    expect(await getProfile('account-a', client(null, { message: 'offline' }))).toBeNull()
  })
})
