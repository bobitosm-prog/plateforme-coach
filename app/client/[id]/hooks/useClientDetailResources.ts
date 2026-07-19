'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { createMessagingRepository, createMessagingService, createSupabaseMessagingRealtime, mergeMessages, type Message } from '@/lib/coaching/messaging'
import type { DatabaseClient } from '@/lib/supabase/types'
import type { WeekProgram } from './client-detail-contract'

export type ExerciseCatalogRow = { id?: string; name: string; reps?: number | null; rest?: number | null; muscle_group?: string | null; equipment?: string | null }

type Input = {
  client: DatabaseClient
  id: string
  coachId: string | null
  activeTab: string
  setProgram: Dispatch<SetStateAction<WeekProgram>>
}

export function useClientDetailResources({ client, id, coachId, activeTab, setProgram }: Input) {
  const [coachMessages, setCoachMessages] = useState<Message[]>([])
  const [coachMsgInput, setCoachMsgInput] = useState('')
  const [showExDbModal, setShowExDbModal] = useState(false)
  const [exDbTargetDay, setExDbTargetDay] = useState<string | null>(null)
  const [exDbSearch, setExDbSearch] = useState('')
  const [exDbResults, setExDbResults] = useState<ExerciseCatalogRow[]>([])
  const [exDbAll, setExDbAll] = useState<ExerciseCatalogRow[]>([])
  const [exDbFilter, setExDbFilter] = useState('Tous')
  const messageGeneration = useRef(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messaging = useMemo(() => createMessagingRepository(client), [client])
  const realtime = useMemo(() => createSupabaseMessagingRealtime(client), [client])
  const service = useMemo(() => createMessagingService(messaging, async notification => {
    await fetch('/api/send-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notification) })
  }), [messaging])

  const loadMessages = useCallback(async () => {
    if (!coachId || !id) return
    const generation = ++messageGeneration.current
    const result = await messaging.listConversation(id, 100)
    if (generation === messageGeneration.current) setCoachMessages(result.ok ? result.data : [])
  }, [coachId, id, messaging])

  useEffect(() => {
    if (activeTab === 'messages') void Promise.resolve().then(async () => { await loadMessages(); await messaging.markRead(id) })
  }, [activeTab, id, loadMessages, messaging])

  useEffect(() => {
    if (!coachId || !id) return
    const stop = realtime.subscribeIncoming(coachId, `coach-msg-${id}`, (message, event) => {
      if (message.sender_id === id) setCoachMessages(previous => mergeMessages(previous, [message], event === 'INSERT'))
    })
    return () => { messageGeneration.current += 1; stop() }
  }, [coachId, id, realtime])

  useEffect(() => {
    if (!showExDbModal || exDbAll.length) return
    void client.from('exercises_db').select('id, name, muscle_group, equipment').order('name').limit(200).then(({ data }) => setExDbAll(data ?? []))
  }, [client, exDbAll.length, showExDbModal])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (exDbSearch.length < 2) {
      searchTimer.current = setTimeout(() => setExDbResults([]), 0)
      return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
    }
    searchTimer.current = setTimeout(async () => {
      const { data } = await client.from('exercises_db').select('id, name, muscle_group, equipment').ilike('name', `%${exDbSearch}%`).limit(30)
      setExDbResults(data ?? [])
    }, 280)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [client, exDbSearch])

  async function sendCoachMessage(imageUrl?: string | null) {
    if ((!coachMsgInput.trim() && !imageUrl) || !coachId || !id) return
    const content = coachMsgInput.trim(); setCoachMsgInput('')
    setCoachMessages(previous => [...previous, { id: `opt-${Date.now()}`, sender_id: coachId, receiver_id: id, content, image_url: imageUrl || null, read: false, created_at: new Date().toISOString() }])
    await service.send({ receiverId: id, content, imageUrl: imageUrl || null, title: 'Nouveau message', url: '/' })
    await loadMessages()
  }

  const openExDbModal = (day: string) => { setExDbTargetDay(day); setExDbSearch(''); setExDbResults([]); setExDbFilter('Tous'); setShowExDbModal(true) }
  const selectExercise = (exercise: ExerciseCatalogRow) => {
    if (!exDbTargetDay) return
    setProgram(previous => ({ ...previous, [exDbTargetDay]: { ...previous[exDbTargetDay], exercises: [...(previous[exDbTargetDay]?.exercises || []), { name: exercise.name, sets: 3, reps: exercise.reps ?? 10, rest: exercise.rest ? `${exercise.rest}s` : '60s', notes: '' }] } }))
    setShowExDbModal(false); setExDbSearch(''); setExDbResults([]); setExDbFilter('Tous')
  }

  return { coachMessages, coachMsgInput, setCoachMsgInput, sendCoachMessage, showExDbModal, setShowExDbModal, exDbTargetDay, exDbSearch, setExDbSearch, exDbResults, exDbAll, exDbFilter, setExDbFilter, openExDbModal, selectExercise }
}
