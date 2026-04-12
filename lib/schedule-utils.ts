// ═══════════════════════════════════════
// Schedule utilities — PPL mapping, week generation, badge colors
// ═══════════════════════════════════════

export type SessionType = 'pectoraux' | 'dos' | 'epaules' | 'jambes' | 'full_body' | 'haut' | 'bas' | 'cardio' | 'repos' | 'custom' | 'libre' |
  'push_a' | 'push_b' | 'pull_a' | 'pull_b' | 'legs_a' | 'legs_b' | 'hiit' | 'liss' | 'rest' // legacy compat

export interface ScheduledSession {
  id: string
  user_id: string
  title: string
  session_type: SessionType
  scheduled_date: string
  scheduled_time: string
  duration_min: number
  completed: boolean
  completed_at: string | null
  reminder_enabled: boolean
  reminder_minutes_before: number
  notes: string | null
  created_at: string
}

// Fixed PPL mapping: Monday=1 ... Sunday=0
// JS getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
export const PPL_SCHEDULE: { jsDay: number; title: string; type: SessionType }[] = [
  { jsDay: 1, title: 'Pectoraux', type: 'pectoraux' },
  { jsDay: 2, title: 'Dos', type: 'dos' },
  { jsDay: 3, title: 'Jambes', type: 'jambes' },
  { jsDay: 4, title: 'Pectoraux', type: 'pectoraux' },
  { jsDay: 5, title: 'Dos', type: 'dos' },
  { jsDay: 6, title: 'Jambes', type: 'jambes' },
  { jsDay: 0, title: 'Repos', type: 'repos' },
]

// Badge colors by session type
export const SESSION_COLORS: Record<string, string> = {
  // Standard types
  pectoraux: '#F97316', dos: '#3B82F6', epaules: '#A855F7',
  jambes: '#22C55E', full_body: '#FBBF24', haut: '#F97316', bas: '#22C55E',
  cardio: '#EF4444', repos: '#6B7280', custom: '#D4A843', libre: '#D4A843',
  // Legacy types (backward compat)
  push_a: '#F97316', push_b: '#F97316', pull_a: '#3B82F6', pull_b: '#3B82F6',
  legs_a: '#22C55E', legs_b: '#22C55E', hiit: '#EF4444', liss: '#7DD3FC', rest: '#6B7280',
}

// Short label for calendar badge
export const SESSION_LABELS: Record<string, string> = {
  push_a: 'Push A',
  push_b: 'Push B',
  pull_a: 'Pull A',
  pull_b: 'Pull B',
  legs_a: 'Legs A',
  legs_b: 'Legs B',
  hiit:   'HIIT',
  liss:   'LISS',
  rest:   'Repos',
  custom: 'Custom',
}

// Category labels for badge grouping
export const SESSION_CATEGORY: Record<string, string> = {
  push_a: 'Push',
  push_b: 'Push',
  pull_a: 'Pull',
  pull_b: 'Pull',
  legs_a: 'Legs',
  legs_b: 'Legs',
  hiit:   'Cardio',
  liss:   'Cardio',
  rest:   'Repos',
  custom: 'Custom',
}

// Day labels in French
export const DAY_LABELS_SHORT = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']

// Get Monday of the week containing `date`
export function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Get array of 7 dates for the week starting Monday
export function getWeekDates(referenceDate: Date): Date[] {
  const monday = getMonday(referenceDate)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

// Format date to YYYY-MM-DD
export function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

// Check if two dates are the same calendar day
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Determine which cardio days to add based on frequency
// Spreads cardio across the week, avoiding Sunday (rest day)
function pickCardioDays(frequency: number): number[] {
  // jsDay values for cardio slots: Tue(2), Thu(4), Mon(1), Fri(5), Wed(3), Sat(6)
  const candidates = [2, 4, 1, 5, 3, 6]
  return candidates.slice(0, Math.min(frequency, candidates.length))
}

// Generate a week of sessions for a user
export function buildWeekSessions(
  userId: string,
  weekStart: Date, // Monday
  profile: { preferred_training_time?: string; reminder_enabled?: boolean; reminder_minutes_before?: number; cardio_enabled?: boolean; cardio_frequency?: number; cardio_preference?: string }
): Omit<ScheduledSession, 'id' | 'created_at'>[] {
  const time = profile.preferred_training_time || '08:00'
  const reminderEnabled = profile.reminder_enabled !== false
  const reminderMin = profile.reminder_minutes_before ?? 30

  const sessions: Omit<ScheduledSession, 'id' | 'created_at'>[] = []

  // Add PPL sessions for each day of the week
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const jsDay = d.getDay()
    const ppl = PPL_SCHEDULE.find(s => s.jsDay === jsDay)!

    sessions.push({
      user_id: userId,
      title: ppl.title,
      session_type: ppl.type,
      scheduled_date: toDateStr(d),
      scheduled_time: time,
      duration_min: ppl.type === 'rest' ? 0 : 60,
      completed: false,
      completed_at: null,
      reminder_enabled: ppl.type === 'rest' ? false : reminderEnabled,
      reminder_minutes_before: reminderMin,
      notes: null,
    })
  }

  // Add cardio sessions if enabled
  if (profile.cardio_enabled && profile.cardio_frequency && profile.cardio_frequency > 0) {
    const cardioDays = pickCardioDays(profile.cardio_frequency)
    const cardioType: SessionType = profile.cardio_preference === 'liss' ? 'liss' : 'hiit'
    const cardioDuration = cardioType === 'hiit' ? 20 : 40

    for (const jsDay of cardioDays) {
      const dayOffset = jsDay === 0 ? 6 : jsDay - 1 // Monday=0 offset
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + dayOffset)

      sessions.push({
        user_id: userId,
        title: cardioType === 'hiit' ? 'Cardio HIIT' : 'Cardio LISS',
        session_type: cardioType,
        scheduled_date: toDateStr(d),
        scheduled_time: time,
        duration_min: cardioDuration,
        completed: false,
        completed_at: null,
        reminder_enabled: reminderEnabled,
        reminder_minutes_before: reminderMin,
        notes: null,
      })
    }
  }

  return sessions
}

// Schedule a local notification reminder
export function scheduleLocalReminder(session: ScheduledSession): ReturnType<typeof setTimeout> | null {
  if (!session.reminder_enabled || session.completed) return null
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  if (Notification.permission !== 'granted') return null

  const sessionTime = new Date(`${session.scheduled_date}T${session.scheduled_time}`)
  const reminderTime = new Date(sessionTime.getTime() - session.reminder_minutes_before * 60 * 1000)
  const delay = reminderTime.getTime() - Date.now()

  if (delay <= 0) return null

  return setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification('MoovX — C\'est l\'heure ! 💪', {
        body: `${session.title} dans ${session.reminder_minutes_before} minutes`,
        icon: '/icon-192.png',
        tag: `session-${session.id}`,
      })
    }
  }, delay)
}

// Get all sessions for a specific date from an array
export function getSessionsForDate(sessions: ScheduledSession[], date: Date): ScheduledSession[] {
  const dateStr = toDateStr(date)
  return sessions.filter(s => s.scheduled_date === dateStr)
}

// Get the first month and last month dates needed for month view
export function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Fill from first Monday before/on the 1st
  const start = new Date(firstDay)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)

  // Fill 42 days (6 weeks)
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d)
  }

  return dates
}
