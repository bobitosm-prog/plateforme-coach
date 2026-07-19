import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
import { createMessagingRepository, MESSAGE_PROJECTION } from '../../lib/coaching/messaging'

const actor = '71000000-0000-4000-8000-000000000001'
const other = '71000000-0000-4000-8000-000000000002'
const row = { id: '75000000-0000-4000-8000-000000000001', sender_id: actor, receiver_id: other, content: 'Hello', image_url: 'messages/image.jpg', read: false, created_at: '2026-07-19T10:00:00.000Z' }

function mockClient(result: { data: unknown; error: unknown }, rpcResult = { data: true, error: null }) {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const chain: Record<string, unknown> = {}
  for (const method of ['select','or','order','limit','gt','insert','update','eq','in']) chain[method] = vi.fn((...args: unknown[]) => { calls.push({ method, args }); return chain })
  chain.maybeSingle = vi.fn(async () => result)
  chain.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve)
  const from = vi.fn(() => chain)
  const auth = { getUser: vi.fn(async () => ({ data: { user: { id: actor } }, error: null })) }
  const rpc = vi.fn(async () => rpcResult)
  return { client: { from, auth, rpc } as unknown as DatabaseClient, chain, calls, from, rpc }
}

describe('messaging repository', () => {
  it('lists a bounded pair with an explicit projection and stable order', async () => {
    const mock = mockClient({ data: [row], error: null })
    expect(await createMessagingRepository(mock.client).listConversation(other, 999)).toEqual({ ok: true, data: [row] })
    expect(mock.from).toHaveBeenCalledWith('messages')
    expect(mock.chain.select).toHaveBeenCalledWith(MESSAGE_PROJECTION)
    expect(mock.calls).toContainEqual({ method: 'limit', args: [100] })
  })

  it('derives sender from auth, checks the active pair and keeps image_url', async () => {
    const mock = mockClient({ data: row, error: null })
    expect(await createMessagingRepository(mock.client).send(other, 'Hello', row.image_url)).toEqual({ ok: true, data: row })
    expect(mock.rpc).toHaveBeenCalledWith('is_active_messaging_pair', { p_sender_id: actor, p_receiver_id: other })
    expect(mock.chain.insert).toHaveBeenCalledWith({ sender_id: actor, receiver_id: other, content: 'Hello', image_url: row.image_url })
  })

  it('fails closed for inactive pairs, missing auth and raw persistence errors', async () => {
    const inactive = mockClient({ data: null, error: null }, { data: false, error: null })
    expect(await createMessagingRepository(inactive.client).send(other, 'x', null)).toMatchObject({ ok: false, error: { kind: 'forbidden' } })
    const failed = mockClient({ data: null, error: { message: 'private SQL' } })
    const result = await createMessagingRepository(failed.client).listConversation(other)
    expect(result).toMatchObject({ ok: false, error: { contextCode: 'MESSAGES_READ_FAILED' } })
    expect(JSON.stringify(result)).not.toContain('private SQL')
  })

  it('marks read only from the authenticated recipient scope', async () => {
    const mock = mockClient({ data: null, error: null })
    expect(await createMessagingRepository(mock.client).markRead(other)).toEqual({ ok: true, data: undefined })
    expect(mock.calls.filter(call => call.method === 'eq').map(call => call.args)).toEqual([['receiver_id', actor], ['sender_id', other], ['read', false]])
  })
})
