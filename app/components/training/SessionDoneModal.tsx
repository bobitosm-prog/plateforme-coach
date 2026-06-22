'use client'

import { useState, useEffect } from 'react'
import SessionDetailModal from './SessionDetailModal'
import TrainingSessionDone from '../tabs/training/TrainingSessionDone'
import { toDateStr } from '../../../lib/schedule-utils'

interface SessionDoneModalProps {
  isOpen: boolean
  onClose: () => void
  supabase: any
  userId: string
  sessionId: string | null
  sessionTitle: string
  todayKey: string
  coachProgram: any
}

// PR calés sur les records du jour (achieved_at=today) — usage prévu = séance du jour uniquement.
export default function SessionDoneModal({
  isOpen, onClose, supabase, userId, sessionId, sessionTitle, todayKey, coachProgram,
}: SessionDoneModalProps) {
  const [detail, setDetail] = useState<{ name: string; sets: any[] }[] | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [prs, setPrs] = useState<{ exercise_name: string; value: number; previous_value: number | null; unit: string }[] | null>(null)
  const [prsLoading, setPrsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !sessionId) {
      setDetail(null)
      setPrs(null)
      return
    }
    let cancelled = false
    const todayStr = toDateStr(new Date())

    // Fetch workout detail (same pattern as TrainingTab openWorkoutDetail)
    setDetailLoading(true)
    supabase
      .from('workout_sets')
      .select('exercise_name, set_number, weight, reps, completed')
      .eq('session_id', sessionId)
      .order('exercise_name').order('set_number', { ascending: true })
      .then(({ data }: any) => {
        if (cancelled) return
        const grouped: Record<string, any[]> = {}
        for (const row of (data || [])) {
          if (!grouped[row.exercise_name]) grouped[row.exercise_name] = []
          grouped[row.exercise_name].push(row)
        }
        setDetail(Object.entries(grouped).map(([name, sets]) => ({ name, sets })))
        setDetailLoading(false)
      })

    // Fetch today PRs (1rm only — max_weight has no previous_value)
    setPrsLoading(true)
    supabase
      .from('personal_records')
      .select('exercise_name, value, previous_value, unit')
      .eq('user_id', userId)
      .eq('record_type', '1rm')
      .eq('achieved_at', todayStr)
      .order('value', { ascending: false })
      .then(({ data }: any) => {
        if (cancelled) return
        setPrs(data || [])
        setPrsLoading(false)
      })

    return () => { cancelled = true }
  }, [isOpen, sessionId, userId])

  return (
    <SessionDetailModal isOpen={isOpen} onClose={onClose} sessionTitle={sessionTitle} dayStatus="done">
      <TrainingSessionDone
        todayKey={todayKey}
        coachProgram={coachProgram}
        detail={detail}
        detailLoading={detailLoading}
        prs={prs}
        prsLoading={prsLoading}
      />
    </SessionDetailModal>
  )
}
