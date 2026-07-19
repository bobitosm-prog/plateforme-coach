import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
import { createSupabaseMessagingRealtime } from '../../lib/coaching/messaging'

const actor = '71000000-0000-4000-8000-000000000001'
const other = '71000000-0000-4000-8000-000000000002'
const message = { id: '75000000-0000-4000-8000-000000000001', sender_id: other, receiver_id: actor, content: 'Hello', image_url: null, read: false, created_at: '2026-07-19T10:00:00.000Z' }

function realtimeClient() {
  const handlers: Array<(payload: { new: unknown }) => void> = []
  const channel = { on: vi.fn((_type, _filter, handler) => { handlers.push(handler); return channel }), subscribe: vi.fn(() => channel) }
  const removeChannel = vi.fn(async () => 'ok')
  return { client: { channel: vi.fn(() => channel), removeChannel } as unknown as DatabaseClient, channel, handlers, removeChannel }
}

describe('Supabase messaging realtime adapter', () => {
  it('validates incoming payloads and removes its channel idempotently', () => {
    const mock = realtimeClient(); const listener = vi.fn()
    const stop = createSupabaseMessagingRealtime(mock.client).subscribeIncoming(actor, `messages-${actor}`, listener)
    mock.handlers[0]({ new: message })
    mock.handlers[0]({ new: { ...message, receiver_id: other } })
    mock.handlers[0]({ new: { malformed: true } })
    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(message, 'INSERT')
    stop(); stop(); expect(mock.removeChannel).toHaveBeenCalledOnce()
  })

  it('filters outgoing updates by the authenticated actor', () => {
    const mock = realtimeClient(); const listener = vi.fn()
    const stop = createSupabaseMessagingRealtime(mock.client).subscribeOutgoingUpdates(actor, `out-${actor}`, listener)
    mock.handlers[0]({ new: { ...message, sender_id: actor, receiver_id: other, read: true } })
    mock.handlers[0]({ new: message })
    expect(listener).toHaveBeenCalledOnce()
    stop()
  })
})
