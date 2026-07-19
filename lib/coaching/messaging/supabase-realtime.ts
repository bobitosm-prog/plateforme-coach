import type { DatabaseClient } from '@/lib/supabase/types'
import { parseMessage } from './model'
import type { MessagingRealtimePort } from './realtime-port'

export function createSupabaseMessagingRealtime(client: DatabaseClient): MessagingRealtimePort {
  return {
    subscribeIncoming(actorId, key, listener, onStatus) {
      let active = true
      const channel = client.channel(key)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${actorId}` }, payload => { const message = parseMessage(payload.new); if (active && message?.receiver_id === actorId) listener(message, 'INSERT') })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${actorId}` }, payload => { const message = parseMessage(payload.new); if (active && message?.receiver_id === actorId) listener(message, 'UPDATE') })
        .subscribe(status => { if (active && (status === 'SUBSCRIBED' || status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) onStatus?.(status) })
      return () => { if (active) { active = false; void client.removeChannel(channel) } }
    },
    subscribeOutgoingUpdates(actorId, key, listener, onStatus) {
      let active = true
      const channel = client.channel(key).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${actorId}` }, payload => { const message = parseMessage(payload.new); if (active && message?.sender_id === actorId) listener(message, 'UPDATE') }).subscribe(status => { if (active && (status === 'SUBSCRIBED' || status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) onStatus?.(status) })
      return () => { if (active) { active = false; void client.removeChannel(channel) } }
    },
  }
}
