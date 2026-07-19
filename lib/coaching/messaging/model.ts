import { messageSchema } from './schema'
import type { Message } from './types'

export function parseMessage(value: unknown): Message | null {
  const parsed = messageSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function belongsToPair(message: Message, firstId: string, secondId: string): boolean {
  return (message.sender_id === firstId && message.receiver_id === secondId)
    || (message.sender_id === secondId && message.receiver_id === firstId)
}

export function sortMessages(messages: readonly Message[]): Message[] {
  return [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
}

export function mergeMessages(current: readonly Message[], incoming: readonly Message[], removeOptimistic = false): Message[] {
  const byId = new Map<string, Message>()
  for (const message of current) if (!removeOptimistic || !message.id.startsWith('opt-')) byId.set(message.id, message)
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message })
  return sortMessages([...byId.values()])
}
