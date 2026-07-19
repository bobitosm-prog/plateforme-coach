import { describe, expect, it, vi } from 'vitest'
import { belongsToPair, createSubscriptionController, mergeMessages, parseMessage } from '../../lib/coaching/messaging'

const actorA = '71000000-0000-4000-8000-000000000001'
const actorB = '71000000-0000-4000-8000-000000000002'
const actorC = '71000000-0000-4000-8000-000000000003'
const base = { id: '75000000-0000-4000-8000-000000000001', sender_id: actorA, receiver_id: actorB, content: 'Hello', image_url: 'messages/example.jpg', read: false, created_at: '2026-07-19T10:00:00.000Z' }

describe('messaging subscription lifecycle', () => {
  it('supports stop-before-start, idempotent start/stop and repeated Strict Mode cycles', () => {
    const stops: ReturnType<typeof vi.fn>[] = []
    const start = vi.fn(() => { const stop = vi.fn(); stops.push(stop); return stop })
    const controller = createSubscriptionController(start)

    controller.stop(); controller.start(); controller.start()
    expect(start).toHaveBeenCalledOnce(); expect(controller.isActive()).toBe(true)
    const firstGeneration = controller.generation()
    expect(controller.isCurrent(firstGeneration)).toBe(true)
    controller.stop(); controller.stop()
    expect(stops[0]).toHaveBeenCalledOnce(); expect(controller.isCurrent(firstGeneration)).toBe(false)

    controller.start(); controller.stop(); controller.start(); controller.stop()
    expect(start).toHaveBeenCalledTimes(3)
    expect(stops.every(stop => stop.mock.calls.length === 1)).toBe(true)
    expect(controller.isActive()).toBe(false)
  })

  it('invalidates generations across rapid identity and relation changes', () => {
    const controller = createSubscriptionController(() => vi.fn())
    controller.start(); const identityA = controller.generation()
    controller.stop(); controller.start(); const identityB = controller.generation()
    controller.stop(); controller.start(); const identityAAgain = controller.generation()
    expect(controller.isCurrent(identityA)).toBe(false)
    expect(controller.isCurrent(identityB)).toBe(false)
    expect(controller.isCurrent(identityAAgain)).toBe(true)
  })
})

describe('messaging hostile payload and pair isolation', () => {
  it.each([
    null, {}, { ...base, id: undefined }, { ...base, created_at: 'not-a-date' },
    { ...base, sender_id: actorC }, { ...base, image_url: 42 },
  ])('rejects malformed payload %# without throwing', payload => {
    expect(() => parseMessage(payload)).not.toThrow()
    const parsed = parseMessage(payload)
    if (parsed) expect(belongsToPair(parsed, actorA, actorB)).toBe(false)
  })

  it('refuses foreign relations and preserves valid legacy image paths', () => {
    const parsed = parseMessage(base)
    expect(parsed?.image_url).toBe('messages/example.jpg')
    expect(parsed && belongsToPair(parsed, actorA, actorB)).toBe(true)
    expect(parsed && belongsToPair(parsed, actorA, actorC)).toBe(false)
  })
})

describe('messaging load, polling and realtime deduplication', () => {
  it('deduplicates identical load/poll/realtime events without mutating inputs', () => {
    const initial = [{ ...base }]
    const snapshot = structuredClone(initial)
    const merged = mergeMessages(initial, [base, base])
    expect(merged).toHaveLength(1)
    expect(initial).toEqual(snapshot)
    expect(merged[0].image_url).toBe(base.image_url)
  })

  it('keeps distinct IDs with equal timestamps in deterministic ID order', () => {
    const second = { ...base, id: '75000000-0000-4000-8000-000000000002' }
    expect(mergeMessages([second], [base]).map(message => message.id)).toEqual([base.id, second.id])
  })

  it('replaces an insert with its update without duplicating it', () => {
    const updated = { ...base, read: true }
    expect(mergeMessages([base], [updated])).toEqual([updated])
  })

  it('removes optimistic entries only when the historic contract requests it', () => {
    const optimistic = { ...base, id: 'opt-1' }
    expect(mergeMessages([optimistic], [base], false)).toHaveLength(2)
    expect(mergeMessages([optimistic], [base], true)).toEqual([base])
  })
})
