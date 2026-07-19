import type { DatabaseClient } from '@/lib/supabase/types'
import { parseMessage } from './model'
import type { MessagingRealtimePort } from './realtime-port'

export function createSupabaseMessagingRealtime(client: DatabaseClient): MessagingRealtimePort {
  return {
    subscribeIncoming(actorId, key, listener) {
      const channel = client.channel(key)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${actorId}` }, payload => { const message = parseMessage(payload.new); if (message && message.receiver_id === actorId) listener(message, 'INSERT') })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${actorId}` }, payload => { const message = parseMessage(payload.new); if (message && message.receiver_id === actorId) listener(message, 'UPDATE') })
        .subscribe()
      let stopped = false; return () => { if (!stopped) { stopped = true; void client.removeChannel(channel) } }
    },
    subscribeOutgoingUpdates(actorId, key, listener) {
      const channel = client.channel(key).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${actorId}` }, payload => { const message = parseMessage(payload.new); if (message && message.sender_id === actorId) listener(message, 'UPDATE') }).subscribe()
      let stopped = false; return () => { if (!stopped) { stopped = true; void client.removeChannel(channel) } }
    },
  }
}
