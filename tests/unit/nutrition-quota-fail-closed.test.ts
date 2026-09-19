import { describe, expect, it } from 'vitest'
import { checkAiQuota, checkAiRateLimit } from '@/lib/rate-limit'
function client(count: number | null, error: unknown) {
  const chain = { select: () => chain, eq: () => chain, in: () => chain, gte: async () => ({ count, error }) }
  return { from: () => chain } as never
}
describe('nutrition quota unavailable protection', () => {
  it.each([{ message: 'offline' }, null])('refuses generation when counting fails or is unavailable', async error => {
    const db = client(null, error)
    expect(await checkAiRateLimit(db, 'synthetic', 'generate-meal-plan', true)).toMatchObject({ allowed: false, unavailable: true })
    expect(await checkAiQuota(db, 'synthetic', true)).toMatchObject({ allowed: false, unavailable: true })
  })
  it('allows a verified unused quota', async () => {
    expect(await checkAiQuota(client(0, null), 'synthetic', true)).toMatchObject({ allowed: true })
  })
})
