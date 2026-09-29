import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '@apple/app-store-server-library'
vi.mock('server-only', () => ({}))
const request = vi.hoisted(() => vi.fn())
vi.mock('node-fetch', async importOriginal => {
  const original = await importOriginal<typeof import('node-fetch')>()
  return { ...original, default: request }
})
import { BoundedAppleAPIClient } from '@/lib/apple/bounded-api-client'
import { URLSearchParams } from 'node:url'
class Probe extends BoundedAppleAPIClient {
  run() { return this.makeFetchRequest('/test', new URLSearchParams(), 'GET', undefined, {}) }
}
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })
describe('Apple HTTP transport bounds', () => {
  it('aborts a stalled request rather than leaving network work running', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    request.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      signal = options.signal
      signal!.addEventListener('abort', () => reject(new Error('aborted')))
    }))
    const client = new Probe('unused', 'unused', 'unused', 'ch.moovx.app', Environment.SANDBOX)
    const result = expect(client.run()).rejects.toThrow('aborted')
    await vi.advanceTimersByTimeAsync(12000)
    await result
    expect(signal?.aborted).toBe(true)
    expect(request.mock.calls[0][1]).toMatchObject({ redirect: 'error', size: 1048576 })
  })
})
