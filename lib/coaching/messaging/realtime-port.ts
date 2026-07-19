import type { Message, MessageEventType, RealtimeStatusListener, StopSubscription } from './types'
export interface MessagingRealtimePort {
  subscribeIncoming(actorId: string, key: string, listener: (message: Message, event: MessageEventType) => void, onStatus?: RealtimeStatusListener): StopSubscription
  subscribeOutgoingUpdates(actorId: string, key: string, listener: (message: Message, event: 'UPDATE') => void, onStatus?: RealtimeStatusListener): StopSubscription
}
