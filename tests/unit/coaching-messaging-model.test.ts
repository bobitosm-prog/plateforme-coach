import { describe, expect, it, vi } from 'vitest'
import { belongsToPair, createMessagingService, createSubscriptionController, mergeMessages, parseMessage, sortMessages } from '../../lib/coaching/messaging'

const a = '71000000-0000-4000-8000-000000000001'
const b = '71000000-0000-4000-8000-000000000002'
const message = { id: '75000000-0000-4000-8000-000000000001', sender_id: a, receiver_id: b, content: 'Bonjour', image_url: null, read: false, created_at: '2026-07-19T10:00:00.000Z' }

describe('coaching messaging model', () => {
  it('validates messages and fails closed for malformed or foreign payloads', () => {
    expect(parseMessage(message)).toEqual(message)
    expect(parseMessage({ ...message, sender_id: 'foreign' })).toBeNull()
    expect(parseMessage({ ...message, secret: 'unexpected' })).toBeNull()
    expect(belongsToPair(message, a, b)).toBe(true)
    expect(belongsToPair(message, a, '71000000-0000-4000-8000-000000000003')).toBe(false)
  })

  it('deduplicates, updates and orders deterministically without mutating inputs', () => {
    const later = { ...message, id: '75000000-0000-4000-8000-000000000002', created_at: '2026-07-19T11:00:00.000Z' }
    const optimistic = { ...message, id: 'opt-1' }
    const input = [later, optimistic]
    expect(mergeMessages(input, [message, { ...message, read: true }], true)).toEqual([{ ...message, read: true }, later])
    expect(sortMessages([later, message])).toEqual([message, later])
    expect(input).toEqual([later, optimistic])
  })

  it('notifies only after a successful insert and preserves success on notification failure', async () => {
    const order: string[] = []
    const repository = { send: vi.fn(async () => { order.push('insert'); return { ok: true, data: message } }) }
    const service = createMessagingService(repository as never, async () => { order.push('notify'); throw new Error('private transport') })
    expect(await service.send({ receiverId: b, content: ' Bonjour ', imageUrl: null, title: 'Nouveau message', url: '/' })).toEqual({ ok: true, data: undefined })
    expect(order).toEqual(['insert', 'notify'])
    expect(await service.send({ receiverId: b, content: '', imageUrl: null, title: 'Nouveau message', url: '/' })).toMatchObject({ ok: false, error: { kind: 'invalid' } })
  })

  it('starts and stops subscriptions idempotently for Strict Mode cleanup', () => {
    const stop = vi.fn(); const start = vi.fn(() => stop); const controller = createSubscriptionController(start)
    controller.start(); controller.start(); controller.stop(); controller.stop(); controller.start(); controller.stop()
    expect(start).toHaveBeenCalledTimes(2); expect(stop).toHaveBeenCalledTimes(2)
  })
})
