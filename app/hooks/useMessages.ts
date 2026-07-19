'use client'
import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DatabaseClient } from '@/lib/supabase/types'
import { createMessagingRepository, createMessagingService, createSupabaseMessagingRealtime, mergeMessages, type Message } from '@/lib/coaching/messaging'

interface UseMessagesParams {
  supabase: SupabaseClient
  userId: string | undefined
  coachId: string | null
  activeTab: string
}

export default function useMessages({ supabase, userId, coachId, activeTab }: UseMessagesParams) {
  const [messages, setMessages] = useState<Message[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const lastMsgTimestampRef = useRef<string | null>(null)
  const loadGenerationRef = useRef(0)
  const realtimeMessageIdsRef = useRef(new Set<string>())
  const identityScopeRef = useRef('')
  const identityScope = `${userId ?? ''}:${coachId ?? ''}`
  useEffect(() => { identityScopeRef.current = identityScope }, [identityScope])
  const messaging = useMemo(() => createMessagingRepository(supabase as DatabaseClient), [supabase])
  const realtime = useMemo(() => createSupabaseMessagingRealtime(supabase as DatabaseClient), [supabase])
  const service = useMemo(() => createMessagingService(messaging, async input => {
    await fetch('/api/send-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  }), [messaging])
  const activeTabRef = useRef(activeTab)
  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])
  const loadMessages = useCallback(async (cId: string) => {
    if (!userId || !cId) return
    const scope = identityScopeRef.current
    const generation = ++loadGenerationRef.current
    const result = await messaging.listConversation(cId, 50)
    if (generation !== loadGenerationRef.current || scope !== identityScopeRef.current) return
    const data = result.ok ? result.data : []
    setMessages(data)
    setUnreadCount(data.filter(m => m.sender_id === cId && !m.read).length)
  }, [messaging, userId])
  const markMessagesRead = useCallback(async () => {
    if (!userId || !coachId) return
    await messaging.markRead(coachId)
    setUnreadCount(0)
  }, [coachId, messaging, userId])

  // Track latest real message timestamp
  useEffect(() => {
    const real = messages.filter(m => !String(m.id).startsWith('opt-'))
    if (real.length > 0) lastMsgTimestampRef.current = real[real.length - 1].created_at
  }, [messages])

  // Realtime + polling
  useEffect(() => {
    if (!userId || !coachId) return
    const realtimeMessageIds = realtimeMessageIdsRef.current
    realtimeMessageIds.clear()
    void Promise.resolve().then(() => loadMessages(coachId))

    const stop = realtime.subscribeIncoming(userId, `messages-${userId}`, (message, event) => {
      if (message.sender_id !== coachId) return
      setMessages(prev => mergeMessages(prev, [message], event === 'INSERT'))
      if (event === 'INSERT' && activeTabRef.current !== 'messages' && !realtimeMessageIds.has(message.id)) {
        realtimeMessageIds.add(message.id)
        setUnreadCount(prev => prev + 1)
      }
    })

    const pollId = setInterval(async () => {
      const since = lastMsgTimestampRef.current
      if (!since) return
      const result = await messaging.listSince(coachId, since, 50)
      if (result.ok && result.data.length) setMessages(prev => mergeMessages(prev, result.data, true))
    }, 30000)

    return () => { loadGenerationRef.current += 1; realtimeMessageIds.clear(); stop(); clearInterval(pollId) }
  }, [userId, coachId, loadMessages, messaging, realtime])

  // Auto-scroll when messages change or tab switches to messages
  useEffect(() => {
    if (activeTab === 'messages') setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages, activeTab])

  // Mark messages read when viewing messages tab
  useEffect(() => {
    if (activeTab === 'messages' && coachId) void Promise.resolve().then(markMessagesRead)
  }, [activeTab, coachId, markMessagesRead])

  async function sendMessage(imageUrl?: string | null) {
    if ((!msgInput.trim() && !imageUrl) || !coachId || !userId) return
    const content = msgInput.trim(); setMsgInput('')
    const optimistic = { id: `opt-${Date.now()}`, sender_id: userId, receiver_id: coachId, content, image_url: imageUrl || null, read: false, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    await service.send({ receiverId: coachId, content, imageUrl: imageUrl || null, title: 'Nouveau message client', url: '/coach' })
    loadMessages(coachId)
  }

  return {
    messages, msgInput, setMsgInput, unreadCount, msgEndRef, sendMessage,
  }
}
