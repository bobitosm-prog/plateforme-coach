import type { Message, MessageEventType, StopSubscription } from './types'
export interface MessagingRealtimePort {
  subscribeIncoming(actorId: string, key: string, listener: (message: Message, event: MessageEventType) => void): StopSubscription
  subscribeOutgoingUpdates(actorId: string, key: string, listener: (message: Message, event: 'UPDATE') => void): StopSubscription
}
