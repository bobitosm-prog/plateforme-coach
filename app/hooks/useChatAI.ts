'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export function useChatAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data, error: fetchErr } = await supabase
        .from('chat_ai_messages')
        .select('id, role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100)

      if (fetchErr) throw fetchErr
      setMessages((data as ChatMessage[]) ?? [])
    } catch (e: any) {
      console.error('[useChatAI] load error:', e)
      setError('Impossible de charger l\'historique')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || sending) return

    setSending(true)
    setError(null)

    // Optimistic: add user message immediately
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: ChatMessage = {
      id: tempId,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])

    try {
      const res = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erreur ${res.status}`)
      }

      const { message: aiText } = await res.json()

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiText,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e: any) {
      console.error('[useChatAI] send error:', e)
      setError(e.message || 'Erreur d\'envoi')
      // Rollback optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setSending(false)
    }
  }, [sending])

  const clearHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: delErr } = await supabase
        .from('chat_ai_messages')
        .delete()
        .eq('user_id', user.id)

      if (delErr) throw delErr
      setMessages([])
    } catch (e: any) {
      console.error('[useChatAI] clear error:', e)
      setError('Impossible de supprimer l\'historique')
    }
  }, [])

  return { messages, loading, sending, error, sendMessage, clearHistory, refresh: loadHistory }
}
