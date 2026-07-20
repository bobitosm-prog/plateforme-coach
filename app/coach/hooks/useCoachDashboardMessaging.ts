'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DatabaseClient } from '@/lib/supabase/types'
import { belongsToPair, createMessagingRepository, createMessagingService, createSupabaseMessagingRealtime, mergeMessages, type Message } from '@/lib/coaching/messaging'
import type { ClientRow } from './coach-dashboard-contract'
import { createDeferredDomainLoader, type DeferredDomainState } from '@/lib/coaching/dashboard/deferred-domain'

export function useCoachDashboardMessaging(client: DatabaseClient, actorId: string | undefined, clients: readonly ClientRow[]) {
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  type LastMessageMap = Map<string, { content: string; image_url: string | null; created_at: string }>
  const [lastMessagesState, setLastMessagesState] = useState<{ actorId: string | undefined; data: LastMessageMap }>({ actorId, data: new Map() })
  const lastMessages = lastMessagesState.actorId === actorId ? lastMessagesState.data : new Map<string, { content: string; image_url: string | null; created_at: string }>()
  const [messageListState, setMessageListState] = useState<DeferredDomainState<Map<string, { content: string; image_url: string | null; created_at: string }>>>({ status: 'idle', data: null })
  const msgEndRef = useRef<HTMLDivElement>(null)
  const selectedClientRef = useRef<ClientRow | null>(null)
  const clientsRef = useRef<readonly ClientRow[]>(clients)
  const lastChatTimestampRef = useRef<string | null>(null)
  const loadGenerationRef = useRef(0)
  const seenRef = useRef(new Set<string>())
  const initialScrollRef = useRef(true)
  const repository = useMemo(() => createMessagingRepository(client), [client])
  const realtime = useMemo(() => createSupabaseMessagingRealtime(client), [client])
  const service = useMemo(() => createMessagingService(repository, async input => {
    await fetch('/api/send-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  }), [repository])
  const messageListLoader = useMemo(() => createDeferredDomainLoader({
    isEmpty: (data: Map<string, unknown>) => data.size === 0,
    onState: setMessageListState,
  }), [])

  const refreshCounters = useCallback(async (clientIds: string[]) => {
    if (clientIds.length) { const result = await repository.listUnread(clientIds, 100); if (result.ok) setUnreadCounts(result.data) }
  }, [repository])
  const loadLastMessages = useCallback(async () => {
    const result = await repository.listLastByContact(200)
    if (result.ok) setLastMessagesState({ actorId, data: result.data })
    return result
  }, [actorId, repository])
  const ensureLastMessages = useCallback(async () => {
    if (!actorId) return
    await messageListLoader.ensure(actorId, loadLastMessages)
  }, [actorId, loadLastMessages, messageListLoader])
  const retryLastMessages = useCallback(async () => {
    if (!actorId) return
    await messageListLoader.retry(actorId, loadLastMessages)
  }, [actorId, loadLastMessages, messageListLoader])
  async function loadChat(clientId: string) {
    const generation = ++loadGenerationRef.current
    const result = await repository.listConversation(clientId, 100)
    if (generation === loadGenerationRef.current && selectedClientRef.current?.client_id === clientId) setChatMessages(result.ok ? result.data : [])
  }
  async function openChat(next: ClientRow) {
    selectedClientRef.current = next; setSelectedClient(next); await loadChat(next.client_id)
    await repository.markRead(next.client_id); setUnreadCounts(previous => ({ ...previous, [next.client_id]: 0 }))
  }
  async function sendMessage(imageUrl?: string | null) {
    if ((!msgInput.trim() && !imageUrl) || !selectedClient || !actorId) return
    const content = msgInput.trim(); setMsgInput('')
    setChatMessages(previous => [...previous, { id: `opt-${Date.now()}`, sender_id: actorId, receiver_id: selectedClient.client_id, content, image_url: imageUrl || null, read: false, created_at: new Date().toISOString() }])
    await service.send({ receiverId: selectedClient.client_id, content, imageUrl: imageUrl || null, title: 'Nouveau message', url: '/' })
    void loadChat(selectedClient.client_id)
  }

  useEffect(() => { selectedClientRef.current = selectedClient; initialScrollRef.current = true }, [selectedClient])
  useEffect(() => {
    messageListLoader.activate()
    messageListLoader.invalidate()
    return () => messageListLoader.dispose()
  }, [actorId, messageListLoader])
  useEffect(() => { clientsRef.current = clients }, [clients])
  useEffect(() => { const real = chatMessages.filter(message => !message.id.startsWith('opt-')); if (real.length) lastChatTimestampRef.current = real.at(-1)?.created_at ?? null }, [chatMessages])
  useEffect(() => {
    if (!actorId || !selectedClient) return
    const peerId = selectedClient.client_id
    const listener = (message: Message, event: 'INSERT' | 'UPDATE') => { if (belongsToPair(message, actorId, peerId)) setChatMessages(previous => mergeMessages(previous, [message], event === 'INSERT')) }
    const stopIncoming = realtime.subscribeIncoming(actorId, `coach-chat-in-${actorId}-${peerId}`, listener)
    const stopOutgoing = realtime.subscribeOutgoingUpdates(actorId, `coach-chat-out-${actorId}-${peerId}`, message => listener(message, 'UPDATE'))
    return () => { loadGenerationRef.current += 1; stopIncoming(); stopOutgoing() }
  }, [actorId, realtime, selectedClient])
  useEffect(() => {
    if (!actorId) return
    const seen = seenRef.current; seen.clear()
    const stop = realtime.subscribeIncoming(actorId, `coach-global-${actorId}`, (message, event) => {
      if (event === 'INSERT') {
        setLastMessagesState(previous => ({ actorId, data: new Map(previous.actorId === actorId ? previous.data : []).set(message.sender_id, { content: message.content, image_url: message.image_url, created_at: message.created_at }) }))
        if (selectedClientRef.current?.client_id !== message.sender_id && !seen.has(message.id)) { seen.add(message.id); setUnreadCounts(previous => ({ ...previous, [message.sender_id]: (previous[message.sender_id] || 0) + 1 })) }
      } else if (message.read) setUnreadCounts(previous => ({ ...previous, [message.sender_id]: Math.max(0, (previous[message.sender_id] || 0) - 1) }))
    })
    return () => { seen.clear(); stop() }
  }, [actorId, realtime])
  useEffect(() => {
    if (!actorId) return
    const timer = setInterval(() => { const ids = clientsRef.current.map(row => row.client_id); if (ids.length) void refreshCounters(ids) }, 120000)
    return () => clearInterval(timer)
  }, [actorId, refreshCounters])
  useEffect(() => {
    if (!chatMessages.length) return
    const behavior: ScrollBehavior = initialScrollRef.current ? 'instant' : 'smooth'
    requestAnimationFrame(() => requestAnimationFrame(() => { msgEndRef.current?.scrollIntoView({ behavior, block: 'end' }); initialScrollRef.current = false }))
    const images = msgEndRef.current?.parentElement?.querySelectorAll('img') ?? []; const cleanups: Array<() => void> = []
    images.forEach(image => { if (image.complete) return; const scroll = () => msgEndRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' }); image.addEventListener('load', scroll, { once: true }); image.addEventListener('error', scroll, { once: true }); cleanups.push(() => { image.removeEventListener('load', scroll); image.removeEventListener('error', scroll) }) })
    return () => cleanups.forEach(cleanup => cleanup())
  }, [chatMessages.length, selectedClient?.client_id])

  return { selectedClient, setSelectedClient, chatMessages, msgInput, setMsgInput, unreadCounts, lastMessages, messageListState, ensureLastMessages, retryLastMessages, totalUnread: Object.values(unreadCounts).reduce((sum, count) => sum + count, 0), msgEndRef, openChat, sendMessage, refreshCounters }
}
