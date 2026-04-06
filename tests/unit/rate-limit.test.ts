import { describe, it, expect } from 'vitest'
import { checkRateLimit } from '../../lib/rate-limit'

describe('Rate Limiting', () => {
  it('allows requests under the limit', () => {
    const r = checkRateLimit('test-allow-' + Date.now(), 5, 60000)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(4)
  })

  it('blocks requests over the limit', () => {
    const id = 'test-block-' + Date.now()
    for (let i = 0; i < 5; i++) checkRateLimit(id, 5, 60000)
    const r = checkRateLimit(id, 5, 60000)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
    expect(r.retryAfter).toBeGreaterThan(0)
  })

  it('resets after window expires', async () => {
    const id = 'test-reset-' + Date.now()
    for (let i = 0; i < 3; i++) checkRateLimit(id, 3, 100)
    expect(checkRateLimit(id, 3, 100).allowed).toBe(false)
    await new Promise(r => setTimeout(r, 150))
    expect(checkRateLimit(id, 3, 100).allowed).toBe(true)
  })

  it('tracks remaining correctly', () => {
    const id = 'test-remaining-' + Date.now()
    expect(checkRateLimit(id, 3, 60000).remaining).toBe(2)
    expect(checkRateLimit(id, 3, 60000).remaining).toBe(1)
    expect(checkRateLimit(id, 3, 60000).remaining).toBe(0)
  })
})
