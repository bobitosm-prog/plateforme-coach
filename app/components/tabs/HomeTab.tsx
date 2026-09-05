'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getTodaySession } from '../../../lib/get-today-session'
import { toast } from 'sonner'
import SessionDoneModal from '../training/SessionDoneModal'
import { colors } from '../../../lib/design-tokens'
import { calculateMuscleStatus } from '../ui/MuscleHeatMap'
import { addXP } from '../../../lib/gamification'
import HomeV2 from '../home-v2/HomeV2'
import HomeV2LowerSections, { type HomeV2LowerSectionsHandle } from '../home-v2/HomeV2LowerSections'
import type { HomeViewModel } from '../../../lib/home/home-dashboard-model'
import type { NextBestAction } from '../../../lib/home/next-best-action'
import RecoveryModal from '../home/modals/RecoveryModal'

interface HomeTabProps {
  homeModel: HomeViewModel
  supabase: any
  session: any
  profile: any
  avatarRef: React.RefObject<HTMLInputElement | null>
  photoRef: React.RefObject<HTMLInputElement | null>
  uploadAvatar: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  uploadProgressPhoto: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  calorieGoal: number
  completedSessions: number
  streak: number
  coachProgram: any
  coachMealPlan: any
  todayKey: string
  todayCoachDay: any
  todaySessionDone: boolean
  setActiveTab: (tab: any) => void
  setModal: (modal: string) => void
  startProgramWorkout: (day: any, exercises: any[], weekdayKey?: string) => void
  completedThisWeek?: Map<number, string>
  aiAllowed?: boolean
  nextSession?: { sessionIndex: number; weekday: string; day: any; reason: string } | null
  latestDiagnostic?: any
  setLatestDiagnostic?: (d: any) => void
  activeTab: string
}

export default function HomeTab({
  homeModel,
  supabase, session, profile,
  avatarRef, uploadAvatar,
  coachProgram, todayKey, todayCoachDay,
  setActiveTab, startProgramWorkout,
  completedThisWeek, nextSession,
  latestDiagnostic, setLatestDiagnostic,
}: HomeTabProps) {
  const ht = useTranslations('home')
  const router = useRouter()
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const lowerSectionsRef = useRef<HomeV2LowerSectionsHandle>(null)
  const [todaySession, setTodaySession] = useState<{ id: string; created_at: string } | null>(null)
  const [waterToday, setWaterToday] = useState(0)

  const [muscleStatus, setMuscleStatus] = useState<Record<string, number>>({})
  const [generatingDiag, setGeneratingDiag] = useState(false)
  const [diagnosticGenerationError, setDiagnosticGenerationError] = useState(false)

  async function handleGenerateDiagnostic() {
    setDiagnosticGenerationError(false)
    setGeneratingDiag(true)
    try {
      const res = await fetch('/api/weekly-diagnostic', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.diagnostic) throw new Error('Diagnostic generation failed')
      if (data.diagnostic && setLatestDiagnostic) {
        setLatestDiagnostic(data.diagnostic)
      }
    } catch (e) {
      console.error('Generate diagnostic failed:', e)
      setDiagnosticGenerationError(true)
    } finally {
      setGeneratingDiag(false)
    }
  }
  const [customProgramExercises, setCustomProgramExercises] = useState<any[] | null>(null)
  const [customDayName, setCustomDayName] = useState<string | null>(null)
  const [customIsRest, setCustomIsRest] = useState(false)
  const [todayScheduledSession, setTodayScheduledSession] = useState<any>(null)

  // Fetch water
  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('water_intake').select('amount_ml').eq('user_id', session.user.id).eq('date', homeModel.today.localDateKey).limit(50)
      .then(({ data }: any) => {
        setWaterToday((data || []).reduce((s: number, r: any) => s + (r.amount_ml || 0), 0))
      })
  }, [homeModel.today.localDateKey, session?.user?.id, supabase])

  async function addWater(ml: number): Promise<boolean> {
    if (!session?.user?.id) return false
    setWaterToday(previous => previous + ml)
    try {
      const { error } = await supabase.from('water_intake').insert({
        user_id: session.user.id,
        amount_ml: ml,
        date: homeModel.today.localDateKey,
      })
      if (!error) return true
    } catch {
      // The optimistic value is reverted below for both transport and DB errors.
    }
    setWaterToday(previous => Math.max(0, previous - ml))
    return false
  }

  // Today session check
  useEffect(() => {
    if (!session?.user?.id) return
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    supabase
      .from('workout_sessions')
      .select('id,created_at')
      .eq('user_id', session.user.id)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .limit(1)
      .then(({ data }: { data: any[] | null }) => {
        setTodaySession(data?.[0] ?? null)
      })
  }, [session?.user?.id])

  // Fetch mini analytics
  useEffect(() => {
    if (!session?.user?.id) return
    const userId = session.user.id
    // Fetch active custom program exercises for today — using shared utility
    supabase.from('custom_programs').select('days').eq('user_id', userId).eq('is_active', true).maybeSingle()
      .then(({ data }: any) => {
        if (data?.days) {
          const session = getTodaySession(data.days)
          if (session.type === 'rest') {
            setCustomDayName(ht('rest'))
            setCustomIsRest(true)
            setCustomProgramExercises([]) // empty array, not null — prevents coach fallthrough
          } else {
            setCustomProgramExercises(session.exercises)
            setCustomDayName(session.name)
            setCustomIsRest(false)
          }
        }
      })

    // Fetch today's scheduled session (same source as Training page calendar)
    const localNow = new Date()
    const todayDateStr = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`
    supabase.from('scheduled_sessions').select('id, title, session_type, completed')
      .eq('user_id', userId).eq('scheduled_date', todayDateStr)
      .neq('session_type', 'rest').limit(1).maybeSingle()
      .then(({ data }: any) => { if (data) setTodayScheduledSession(data) })

    // Fetch muscle status from recent workout sets + sessions
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    Promise.all([
      supabase.from('workout_sets').select('exercise_name, created_at').eq('user_id', userId).gte('created_at', threeDaysAgo).limit(200),
      supabase.from('workout_sessions').select('muscles_worked, created_at').eq('user_id', userId).eq('completed', true).gte('created_at', threeDaysAgo),
    ]).then(([setsRes, sessRes]: any) => {
      const sets = setsRes.data || []
      // Supplement: for sessions with muscles_worked, add synthetic entries so the body map picks them up via MUSCLE_GROUP_MAP
      const sessData = sessRes.data || []
      sessData.forEach((s: any) => {
        if (s.muscles_worked?.length) {
          s.muscles_worked.forEach((mg: string) => {
            sets.push({ exercise_name: '', muscle_group: mg, created_at: s.created_at })
          })
        }
      })
      setMuscleStatus(calculateMuscleStatus(sets))
    })

  }, [ht, session?.user?.id, supabase])

  const saveCheckin = async (
    draft: { mood: string | null; note: string; sleep: string },
    wasCompleted: boolean,
  ): Promise<boolean> => {
    if (!session?.user?.id || !draft.mood) return false
    const payload = {
      user_id: session.user.id,
      date: homeModel.today.localDateKey,
      mood: draft.mood,
      note: draft.note || null,
      sleep_hours: draft.sleep ? parseFloat(draft.sleep) : null,
    }
    try {
      const { error } = await supabase.from('daily_checkins').upsert(payload, { onConflict: 'user_id,date' })
      if (error) throw error
    } catch (error) {
      console.error('[CheckIn] Save error:', error)
      toast.error(ht('v2.lower.checkIn.error'))
      return false
    }
    if (!wasCompleted) { try { await addXP(session.user.id, 10, supabase) } catch {} }
    return true
  }

  // Custom program is authoritative: if it says rest, it's rest — don't fall through to coach
  const todayExercises = customIsRest ? [] : (customProgramExercises?.length ? customProgramExercises : todayCoachDay?.exercises || [])
  // Session title: custom program > scheduled session > coach program
  const rawSessionTitle = customIsRest ? ht('rest') : (customDayName || todayScheduledSession?.title || todayCoachDay?.nom || todayCoachDay?.name || (todayExercises.length > 0 ? `${todayExercises[0]?.muscle_group || ht('trainingOfDay')}` : ht('workoutOfDay')))
  const sessionTitle = rawSessionTitle

  const handleNextBestAction = (recommendation: NextBestAction) => {
    switch (recommendation.type) {
      case 'start_training': {
        const current = homeModel.training.session
        if (current) startProgramWorkout(
          { day_name: current.title, name: current.title },
          Array.from(current.exercises),
        )
        return
      }
      case 'complete_check_in':
        lowerSectionsRef.current?.openCheckIn()
        return
      case 'open_nutrition':
        setActiveTab('nutrition')
        return
      case 'open_diagnostic':
        if (latestDiagnostic) router.push(`/weekly-diagnostic/${latestDiagnostic.id}`)
        else handleGenerateDiagnostic()
        return
      case 'open_recovery':
        setShowRecoveryModal(true)
        return
      case 'open_program':
        setActiveTab('training')
        return
      case 'view_progress':
        setActiveTab('progress')
    }
  }

  return (
    <div style={{ background: colors.background, minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />

      <HomeV2
        model={homeModel}
        actions={{
          onStartSession: sessionModel => startProgramWorkout(
            { day_name: sessionModel.title, name: sessionModel.title },
            Array.from(sessionModel.exercises),
          ),
          onOpenSession: () => setShowSessionModal(true),
          onOpenProgram: () => setActiveTab('training'),
          onStartFreeSession: () => startProgramWorkout({ day_name: ht('v2.hero.freeSession') }, []),
          onNextBestAction: handleNextBestAction,
          onOpenProgression: () => setActiveTab('progress'),
          onOpenAthena: () => setActiveTab('coachIA'),
          onOpenMessages: () => setActiveTab('messages'),
        }}
      >
        <HomeV2LowerSections
          ref={lowerSectionsRef}
          model={homeModel}
          waterToday={waterToday}
          waterTarget={homeModel.hydration.targetMl ?? profile?.water_goal ?? 3000}
          diagnostic={latestDiagnostic}
          generatingDiagnostic={generatingDiag}
          diagnosticGenerationError={diagnosticGenerationError}
          coachProgram={coachProgram}
          nextSession={nextSession ?? null}
          completedThisWeek={completedThisWeek}
          todayKey={todayKey}
          onSaveCheckIn={saveCheckin}
          onAddWater={addWater}
          onGenerateDiagnostic={handleGenerateDiagnostic}
          onViewDiagnostic={() => latestDiagnostic && router.push(`/weekly-diagnostic/${latestDiagnostic.id}`)}
          onOpenTraining={() => setActiveTab('training')}
        />
      </HomeV2>

      {/* ═══ RECOVERY MODAL ═══ */}
      {showRecoveryModal && (
        <RecoveryModal
          muscleStatus={muscleStatus}
          onClose={() => setShowRecoveryModal(false)}
        />
      )}

      <SessionDoneModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        supabase={supabase}
        userId={session?.user?.id ?? ''}
        sessionId={todaySession?.id ?? null}
        sessionTitle={sessionTitle}
        todayKey={todayKey}
        coachProgram={coachProgram}
      />
    </div>
  )
}
