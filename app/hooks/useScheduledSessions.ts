'use client'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ScheduledSession, buildWeekSessions, getMonday, toDateStr, scheduleLocalReminder,
} from '../../lib/schedule-utils'
import { updateProfile } from '../../lib/profile-service'

interface UseScheduledSessionsParams {
  supabase: SupabaseClient
}

export default function useScheduledSessions({ supabase }: UseScheduledSessionsParams) {
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([])
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date>(() => new Date())
  const reminderTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  async function fetchScheduledSessions(uid: string, profileData: any, hasProgram: boolean) {
    const monday = getMonday(new Date())
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const { data: existing } = await supabase
      .from('scheduled_sessions')
      .select('*')
      .eq('user_id', uid)
      .gte('scheduled_date', toDateStr(monday))
      .lte('scheduled_date', toDateStr(sunday))
      .order('scheduled_date', { ascending: true })
      .limit(500)

    let sessions = existing || []

    // Auto-generate if no sessions exist this week and user has a program
    if (sessions.length === 0 && hasProgram) {
      const newSessions = buildWeekSessions(uid, monday, {
        preferred_training_time: profileData.preferred_training_time || '08:00',
        reminder_enabled: profileData.reminder_enabled !== false,
        reminder_minutes_before: profileData.reminder_minutes_before ?? 30,
        cardio_enabled: profileData.cardio_enabled,
        cardio_frequency: profileData.cardio_frequency,
        cardio_preference: profileData.cardio_preference,
      })
      const { data: inserted } = await supabase
        .from('scheduled_sessions')
        .insert(newSessions)
        .select()
      sessions = inserted || []
    }

    setScheduledSessions(sessions)
    scheduleReminders(sessions)
  }

  function scheduleReminders(sessions: ScheduledSession[]) {
    // Clear existing timers
    reminderTimers.current.forEach(t => clearTimeout(t))
    reminderTimers.current = []

    const todayStr = toDateStr(new Date())
    const todaySessions = sessions.filter(s => s.scheduled_date === todayStr && !s.completed)

    for (const session of todaySessions) {
      const timer = scheduleLocalReminder(session)
      if (timer) reminderTimers.current.push(timer)
    }

    // Immediate notification if session is within 30 minutes
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const now = Date.now()
      for (const session of todaySessions) {
        if (session.session_type === 'rest') continue
        const sessionTime = new Date(`${session.scheduled_date}T${session.scheduled_time}`).getTime()
        const diff = sessionTime - now
        if (diff > 0 && diff < 30 * 60 * 1000) {
          const minsLeft = Math.round(diff / 60000)
          new Notification('MoovX — Bientôt ta séance ! 💪', {
            body: `${session.title} dans ${minsLeft} min`,
            icon: '/icon-192.png',
            tag: `session-soon-${session.id}`,
          })
        }
      }
    }
  }

  async function markSessionCompleted(sessionId: string) {
    const { error } = await supabase
      .from('scheduled_sessions')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (!error) {
      setScheduledSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, completed: true, completed_at: new Date().toISOString() } : s)
      )
    }
  }

  async function regenerateWeekSchedule(uid: string, profile: any) {
    if (!uid || !profile) return
    const monday = getMonday(new Date())
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    await supabase
      .from('scheduled_sessions')
      .delete()
      .eq('user_id', uid)
      .gte('scheduled_date', toDateStr(monday))
      .lte('scheduled_date', toDateStr(sunday))

    const newSessions = buildWeekSessions(uid, monday, {
      preferred_training_time: profile.preferred_training_time || '08:00',
      reminder_enabled: profile.reminder_enabled !== false,
      reminder_minutes_before: profile.reminder_minutes_before ?? 30,
      cardio_enabled: profile.cardio_enabled,
      cardio_frequency: profile.cardio_frequency,
      cardio_preference: profile.cardio_preference,
    })
    const { data: inserted } = await supabase
      .from('scheduled_sessions')
      .insert(newSessions)
      .select()
    setScheduledSessions(inserted || [])
    scheduleReminders(inserted || [])
    toast.success('Planning régénéré !')
  }

  async function updateReminderSettings(supabaseClient: SupabaseClient, uid: string, settings: { preferred_training_time?: string; reminder_enabled?: boolean; reminder_minutes_before?: number }, setProfile: (fn: (prev: any) => any) => void) {
    if (!uid) return
    await updateProfile(uid, settings, supabaseClient)
    setProfile((prev: any) => ({ ...prev, ...settings }))
    toast.success('Préférences mises à jour')
  }

  return {
    scheduledSessions, calendarSelectedDate, setCalendarSelectedDate,
    fetchScheduledSessions, markSessionCompleted, regenerateWeekSchedule, updateReminderSettings,
  }
}
