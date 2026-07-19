import type { DatabaseClient } from '@/lib/supabase/types'
import { parseMessage, sortMessages } from './model'
import type { LastMessage, Message, MessagingResult } from './types'

export const MESSAGE_PROJECTION = 'id,sender_id,receiver_id,content,image_url,read,created_at' as const
const fail = (contextCode: string): MessagingResult<never> => ({ ok: false, error: { kind: 'unavailable', contextCode } })
const bounded = (limit: number, max = 200) => Math.max(1, Math.min(max, Math.trunc(limit)))

export function createMessagingRepository(client: DatabaseClient) {
  async function currentUserId(): Promise<MessagingResult<string>> {
    const { data, error } = await client.auth.getUser()
    return error || !data.user ? { ok: false, error: { kind: 'unauthorized', contextCode: 'AUTH_REQUIRED' } } : { ok: true, data: data.user.id }
  }
  return {
    currentUserId,
    async listConversation(otherUserId: string, limit = 100): Promise<MessagingResult<Message[]>> {
      const actor = await currentUserId(); if (!actor.ok) return actor
      const { data, error } = await client.from('messages').select(MESSAGE_PROJECTION)
        .or(`and(sender_id.eq.${actor.data},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${actor.data})`)
        .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(bounded(limit, 100))
      if (error) return fail('MESSAGES_READ_FAILED')
      return { ok: true, data: sortMessages((data ?? []).map(parseMessage).filter((row): row is Message => row !== null)) }
    },
    async listSince(otherUserId: string, since: string, limit = 50): Promise<MessagingResult<Message[]>> {
      const actor = await currentUserId(); if (!actor.ok) return actor
      const { data, error } = await client.from('messages').select(MESSAGE_PROJECTION)
        .or(`and(sender_id.eq.${actor.data},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${actor.data})`)
        .gt('created_at', since).order('created_at', { ascending: true }).order('id', { ascending: true }).limit(bounded(limit, 50))
      if (error) return fail('MESSAGES_POLL_FAILED')
      return { ok: true, data: (data ?? []).map(parseMessage).filter((row): row is Message => row !== null) }
    },
    async send(receiverId: string, content: string, imageUrl: string | null): Promise<MessagingResult<Message | null>> {
      const actor = await currentUserId(); if (!actor.ok) return actor
      const relation = await client.rpc('is_active_messaging_pair', { p_sender_id: actor.data, p_receiver_id: receiverId })
      if (relation.error) return fail('RELATION_CHECK_FAILED')
      if (relation.data !== true) return { ok: false, error: { kind: 'forbidden', contextCode: 'RELATION_FORBIDDEN' } }
      const { data, error } = await client.from('messages').insert({ sender_id: actor.data, receiver_id: receiverId, content, image_url: imageUrl }).select(MESSAGE_PROJECTION).maybeSingle()
      if (error) return fail('MESSAGE_SEND_FAILED')
      return { ok: true, data: data ? parseMessage(data) : null }
    },
    async markRead(senderId: string): Promise<MessagingResult<void>> {
      const actor = await currentUserId(); if (!actor.ok) return actor
      const { error } = await client.from('messages').update({ read: true }).eq('receiver_id', actor.data).eq('sender_id', senderId).eq('read', false)
      return error ? fail('MARK_READ_FAILED') : { ok: true, data: undefined }
    },
    async listUnread(senderIds: string[], limit = 100): Promise<MessagingResult<Record<string, number>>> {
      const actor = await currentUserId(); if (!actor.ok) return actor
      if (!senderIds.length) return { ok: true, data: {} }
      const { data, error } = await client.from('messages').select('sender_id').eq('receiver_id', actor.data).eq('read', false).in('sender_id', senderIds.slice(0, 100)).limit(bounded(limit, 100))
      if (error) return fail('UNREAD_READ_FAILED')
      const counts: Record<string, number> = {}; for (const row of data ?? []) counts[row.sender_id] = (counts[row.sender_id] ?? 0) + 1
      return { ok: true, data: counts }
    },
    async listLastByContact(limit = 200): Promise<MessagingResult<Map<string, LastMessage>>> {
      const actor = await currentUserId(); if (!actor.ok) return actor
      const { data, error } = await client.from('messages').select(MESSAGE_PROJECTION).or(`sender_id.eq.${actor.data},receiver_id.eq.${actor.data}`).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(bounded(limit))
      if (error) return fail('LAST_MESSAGES_READ_FAILED')
      const result = new Map<string, LastMessage>()
      for (const row of data ?? []) { const other = row.sender_id === actor.data ? row.receiver_id : row.sender_id; if (!result.has(other)) result.set(other, { content: row.content, image_url: row.image_url, created_at: row.created_at }) }
      return { ok: true, data: result }
    },
  }
}
export type MessagingRepository = ReturnType<typeof createMessagingRepository>
