'use client'
import { useEffect, useState, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface UseMessagesParams {
  supabase: SupabaseClient
  userId: string | undefined
  coachId: string | null
  activeTab: string
}

export default function useMessages({ supabase, userId, coachId, activeTab }: UseMessagesParams) {
  const [messages, setMessages] = useState<any[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const lastMsgTimestampRef = useRef<string | null>(null)

  // Track latest real message timestamp
  useEffect(() => {
    const real = messages.filter(m => !String(m.id).startsWith('opt-'))
    if (real.length > 0) lastMsgTimestampRef.current = real[real.length - 1].created_at
  }, [messages])

  // Realtime + polling
  useEffect(() => {
    if (!userId || !coachId) return
    loadMessages(coachId)

    const channel = supabase
      .channel(`messages-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, (payload: any) => {
        setMessages(prev => [...prev.filter(m => !String(m.id).startsWith('opt-')), payload.new])
        if (activeTab !== 'messages') setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    const pollId = setInterval(async () => {
      const since = lastMsgTimestampRef.current
      if (!since) return
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${coachId}),and(sender_id.eq.${coachId},receiver_id.eq.${userId})`)
        .gt('created_at', since).order('created_at', { ascending: true }).limit(50)
      if (data?.length) setMessages(prev => [...prev.filter(m => !String(m.id).startsWith('opt-')), ...data])
    }, 30000)

    return () => { supabase.removeChannel(channel); clearInterval(pollId) }
  }, [userId, coachId])

  // Auto-scroll when messages change or tab switches to messages
  useEffect(() => {
    if (activeTab === 'messages') setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages, activeTab])

  // Mark messages read when viewing messages tab
  useEffect(() => {
    if (activeTab === 'messages' && coachId) markMessagesRead()
  }, [activeTab, coachId])

  async function loadMessages(cId: string) {
    if (!userId || !cId) return
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${cId}),and(sender_id.eq.${cId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true }).limit(50)
    setMessages(data || [])
    setUnreadCount((data || []).filter((m: any) => m.sender_id === cId && !m.read).length)
  }

  async function sendMessage(imageUrl?: string | null) {
    if ((!msgInput.trim() && !imageUrl) || !coachId || !userId) return
    const content = msgInput.trim(); setMsgInput('')
    const optimistic = { id: `opt-${Date.now()}`, sender_id: userId, receiver_id: coachId, content, image_url: imageUrl || null, read: false, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    const row: Record<string, unknown> = { sender_id: userId, receiver_id: coachId, content }
    if (imageUrl) row.image_url = imageUrl
    await supabase.from('messages').insert(row)
    fetch('/api/send-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: coachId, title: 'Nouveau message client', body: imageUrl ? '📷 Photo' : content.slice(0, 80), url: '/coach' }) }).catch(() => {})
    loadMessages(coachId)
  }

  async function markMessagesRead() {
    if (!userId || !coachId) return
    await supabase.from('messages').update({ read: true }).eq('receiver_id', userId).eq('sender_id', coachId).eq('read', false)
    setUnreadCount(0)
  }

  return {
    messages, msgInput, setMsgInput, unreadCount, msgEndRef, sendMessage,
  }
}
