import type { Tables } from '@/lib/supabase/types'

export type Message = Tables<'messages'>
export type MessageEventType = 'INSERT' | 'UPDATE'
export type MessagingError = { kind: 'unauthorized' | 'forbidden' | 'invalid' | 'unavailable'; contextCode: string }
export type MessagingResult<T> = { ok: true; data: T } | { ok: false; error: MessagingError }
export type LastMessage = Pick<Message, 'content' | 'image_url' | 'created_at'>
export type NotificationInput = { userId: string; title: string; body: string; url: '/' | '/coach' }
export type NotificationPort = (input: NotificationInput) => Promise<void>
export type StopSubscription = () => void
export type RealtimeSubscriptionStatus = 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT'
export type RealtimeStatusListener = (status: RealtimeSubscriptionStatus) => void
