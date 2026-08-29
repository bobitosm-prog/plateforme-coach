'use client'
import { createBrowserClient } from '@supabase/ssr'
import { toDateStr } from '../../lib/schedule-utils'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getRole } from '../../lib/getRole'
import { toast } from 'sonner'
import { JS_DAYS_FR } from '../../lib/design-tokens'
import { cache } from '../../lib/cache'
import useMessages from './useMessages'
import useAnalytics from './useAnalytics'
import useProgressionViewModel from './useProgressionViewModel'
import type { ProgressionPeriod } from '../../lib/progression/progression-dashboard-model'
import useScheduledSessions from './useScheduledSessions'
import useFoodLog from './useFoodLog'
import { getProfile, updateProfile, invalidateProfileCache } from '../../lib/profile-service'
import { normalizeCoachProgram } from '../../lib/normalizeCoachProgram'
import { suggestNextSession, SuggestedSession } from '../../lib/suggestNextSession'
import { computeStreak } from '../../lib/streak'
import { projectRestDates } from '../../lib/project-rest-days'
import { checkAndUnlockBadges, type Badge } from '../../lib/check-badges'
import { addXP, updateStreak } from '../../lib/gamification'
import {
  findActiveCoachForClient,
  toActiveCoachResolutionState,
  type ActiveCoachResolutionState,
} from '../../lib/coach-relations/repository'
import {
  DENIED_ENTITLEMENT_SNAPSHOT,
  fetchEffectiveEntitlementSnapshot,
  type EffectiveEntitlementSnapshot,
} from '../../lib/entitlements/client-snapshot'
import {
  emptyActiveTrainingProgram,
  resolveActiveTrainingProgram,
  type ActiveTrainingProgramContext,
  type CoachTrainingProgramRow,
  type PersonalTrainingProgram,
} from '../../lib/training/active-program'
import {
  createActiveWorkoutDraft,
  readActiveWorkoutDraft,
  removeActiveWorkoutDraft,
  writeActiveWorkoutDraft,
  type ActiveWorkoutDraft,
} from '../../lib/training/active-workout-draft'
import {
  persistCriticalWorkout,
  type CompletedWorkoutData,
} from '../../lib/training/session-persistence'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export type Tab = 'home' | 'training' | 'nutrition' | 'progress' | 'compte' | 'profil' | 'messages' | 'coachIA' | 'feedback' | 'preferences' | 'account_section' | 'goals' | 'nutrition_program'

// Convertit un coach program normalisé (objet {lundi,...}) en forme .days[]
function coachToDays(normalized: unknown): { days: unknown[] } | null {
  if (typeof normalized !== 'object' || normalized === null || Array.isArray(normalized)) return null
  const program = normalized as Record<string, unknown>
  const WD = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
  return { days: WD.map(d => program[d] || { is_rest: true, name: '', exercises: [] }) }
}

function personalToDays(program: unknown): { days: unknown[] } | null {
  if (typeof program !== 'object' || program === null || Array.isArray(program)) return null
  const days = (program as { days?: unknown }).days
  return Array.isArray(days) ? { days } : null
}

export default function useClientDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  const [progressPhotos, setProgressPhotos] = useState<any[]>([])
  const [wSessions, setWSessions] = useState<any[]>([])
  const [workoutHistoryState, setWorkoutHistoryState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [hasTrainedBefore, setHasTrainedBefore] = useState(false)
  const [sessionDates, setSessionDates] = useState<{ created_at: string }[]>([])
  const [coachProgram, setCoachProgram] = useState<any>(null)
  const [activeTrainingProgram, setActiveTrainingProgram] = useState<ActiveTrainingProgramContext>(() => (
    emptyActiveTrainingProgram()
  ))
  const [planningDays, setPlanningDays] = useState<any[] | null>(null)
  const [coachMealPlan, setCoachMealPlan] = useState<any>(null)
  const [lastCompletedByIndex, setLastCompletedByIndex] = useState<Map<number, string>>(new Map())
  const [weightHistory30, setWeightHistory30] = useState<{ date: string; poids: number }[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [roleChecked, setRoleChecked] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [entitlementSnapshot, setEntitlementSnapshot] = useState<EffectiveEntitlementSnapshot>(
    DENIED_ENTITLEMENT_SNAPSHOT,
  )

  const [workoutSession, setWorkoutSession] = useState<ActiveWorkoutDraft | null>(null)
  const [modal, setModal] = useState<string | null>(null)
  const [latestDiagnostic, setLatestDiagnostic] = useState<any>(null)

  // BMR form state
  const [bmrForm, setBmrForm] = useState({ weight: '', height: '', age: '', gender: 'male', activity: 'moderate', body_fat: '' })

  const [photoUploading, setPhotoUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  // Coach link
  const [coachId, setCoachId] = useState<string | null>(null)
  const [isDefaultCoach, setIsDefaultCoach] = useState(false)
  const [coachRelationStatus, setCoachRelationStatus] = useState<ActiveCoachResolutionState['status']>('not_found')

  const initialFetchDone = useRef(false)
  const fetchAllComplete = useRef(false)
  const clientProgramIdRef = useRef<string | null>(null)
  const coachOfProgramIdRef = useRef<string | null>(null)
  const [completedThisWeek, setCompletedThisWeek] = useState<Map<number, string>>(new Map())
  const [nextSession, setNextSession] = useState<SuggestedSession | null>(null)
  const [progressionBaseErrors, setProgressionBaseErrors] = useState<Partial<Record<'weight' | 'sessions' | 'measurements' | 'photos', string>>>({})
  const [progressionPeriod, setProgressionPeriod] = useState<ProgressionPeriod>('30d')

  const mainRef = useRef<HTMLElement>(null)
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current

  // --- Sub-hooks ---
  const userId = session?.user?.id

  const messagesHook = useMessages({ supabase, userId, coachId, activeTab })
  const analyticsHook = useAnalytics({
    supabase,
    enabled: activeTab === 'progress',
    userId,
    workoutSessions: wSessions,
    weightHistory: weightHistory30,
  })
  const scheduledHook = useScheduledSessions({ supabase })
  const foodHook = useFoodLog({
    supabase,
    userId,
    onMutate: () => { setModal(null); fetchAll(true) },
  })

  /* ── Auth ── */
  useEffect(() => {
    setMounted(true)
    let alive = true
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      supabase.from('app_logs').insert({ level: 'info', message: 'CLIENT_DASH_SESSION', details: { hasSession: !!s, userId: s?.user?.id, url: typeof window !== 'undefined' ? window.location.href : '' }, page_url: '/' })
      if (alive) { setSession(s); setLoading(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      supabase.from('app_logs').insert({ level: 'info', message: 'CLIENT_DASH_AUTH_CHANGE', details: { event: _event, hasSession: !!s, userId: s?.user?.id }, page_url: '/' })
      if (!alive) return
      if (_event === 'SIGNED_OUT') { setSession(null); setLoading(false); return }
      if (s) { setSession(s); setLoading(false) }
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session) return
    getRole(session.user.id, session.access_token).then(role => {
      if (!role) { setRoleChecked(true); return }
      setUserRole(role)
      setRoleChecked(true)
    })
  }, [session])

  useEffect(() => {
    if (!session || initialFetchDone.current) return
    initialFetchDone.current = true
    const restored = readActiveWorkoutDraft(localStorage, session.user.id)
    if (restored && restored.status !== 'completed') setWorkoutSession(restored)
    fetchAll()
  }, [session])

  // Scroll-to-top disabled: each tab slide now has its own scroll container
  // (rail architecture, S1 swipe nav). Slides keep their position on tab switch.
  // useEffect(() => {
  //   mainRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  // }, [activeTab])

  /* ── Data fetching (with cache) ── */
  async function fetchAll(forceRefresh = false) {
    const uid = session?.user?.id
    if (!uid) return
    const today = new Date().toISOString().split('T')[0]

    let resolvedEntitlementSnapshot = entitlementSnapshot
    try {
      resolvedEntitlementSnapshot = await fetchEffectiveEntitlementSnapshot()
      setEntitlementSnapshot(resolvedEntitlementSnapshot)
    } catch {
      setEntitlementSnapshot(DENIED_ENTITLEMENT_SNAPSHOT)
      console.error('[client-dashboard] Effective entitlement unavailable')
    }

    // Try cache first (only on initial load, not forced refreshes)
    if (!forceRefresh) {
      const cached = cache.get(`dashboard_${uid}`)
      if (cached) {
        const relation = toActiveCoachResolutionState(await findActiveCoachForClient(supabase, uid))
        const context = normalizeActiveTrainingContext(resolveActiveTrainingProgram({
          coachRelation: relation,
          coachPrograms: cached.coachProgramsData || [],
          personalProgram: cached.customProgData || null,
          capabilities: resolvedEntitlementSnapshot.capabilities,
          coachProgramValidator: program => Boolean(normalizeCoachProgram(program)),
        }))
        applyActiveTrainingContext(context)
        await applyCoachResolution(relation)
        applyFetchedData(cached.profileData, cached.weightsData, cached.sessData, cached.measureData, cached.photosData, context.source === 'coach' ? context.program : null, cached.coachMealData)
        setSessionDates(cached.sessionDatesData || [])
        setHasTrainedBefore(cached.hasTrainedBeforeVal || false)
        setProgressionBaseErrors(cached.progressionBaseErrorsData || {})
        setWorkoutHistoryState(cached.progressionBaseErrorsData?.sessions ? 'error' : cached.sessData?.some((item: { completed?: boolean }) => item.completed) ? 'ready' : 'empty')
        const planningProgram = context.source === 'personal' ? personalToDays(context.program) : coachToDays(context.program)
        setPlanningDays(planningProgram?.days || null)
        await scheduledHook.fetchScheduledSessions(uid, cached.profileData, planningProgram)
        fetchAllComplete.current = true
        return
      }
    }

    const [profRes, weightsRes, , sessRes, measureRes, photosRes, coachProgramsRes, coachMealRes, completedSessionsRes, diagRes, customProgRes, trainedCountRes, sessionDatesRes, relationResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('weight_logs').select('date, poids').eq('user_id', uid).order('date', { ascending: false }).limit(100),
      supabase.from('daily_food_logs').select('*').eq('user_id', uid).eq('date', today).limit(100),
      supabase.from('workout_sessions').select('*, workout_sets(*)').eq('user_id', uid).order('created_at', { ascending: false }).limit(90),
      supabase.from('body_measurements').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(10),
      supabase.from('progress_photos').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(20),
      supabase.from('client_programs').select('id, program, coach_id, created_at, updated_at').eq('client_id', uid).order('created_at', { ascending: false }).limit(20),
      supabase.from('client_meal_plans').select('plan').eq('client_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('completed_sessions').select('session_index, session_name, completed_at').eq('client_id', uid).order('completed_at', { ascending: false }).limit(50),
      supabase.from('weekly_diagnostics').select('*').eq('user_id', uid).order('week_start', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('custom_programs').select('*').eq('user_id', uid).eq('is_active', true).maybeSingle(),
      supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('completed', true),
      supabase.from('workout_sessions').select('created_at').eq('user_id', uid).eq('completed', true).order('created_at', { ascending: false }).limit(400),
      findActiveCoachForClient(supabase, uid),
    ])

    if (!profRes.data) { router.replace('/onboarding-v2'); return }
    // If role is missing but user_metadata has it (trigger guard_profile_sensitive_columns blocks client role updates), fix via RPC
    const metaRole = session?.user?.user_metadata?.role
    if (!profRes.data.role && metaRole) {
      const { error: roleErr } = await supabase.rpc('set_role', { p_role: metaRole })
      if (!roleErr) profRes.data.role = metaRole
    }
    if (profRes.data.role === 'client') {
      try {
        const assignmentResponse = await fetch('/api/coach/default-assignment', { method: 'POST' })
        if (!assignmentResponse.ok && assignmentResponse.status !== 409) {
          const assignmentError = await assignmentResponse.json().catch(() => null)
          console.error('[client-dashboard] Default coach assignment failed:', assignmentError?.code || assignmentResponse.status)
        }
      } catch {
        console.error('[client-dashboard] Default coach assignment request failed')
      }
    }
    if (profRes.data.email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bobitosm@gmail.com')) {
      // Admin users skip all onboarding → proceed to dashboard
    } else if (profRes.data.role === 'coach') {
      if (!profRes.data.coach_onboarding_complete) { router.replace('/onboarding-coach'); return }
      // Coach with completed onboarding → proceed to dashboard
    } else {
      // onboarding_completed = true → authoritative flag, skip all checks
      if (profRes.data.onboarding_completed) {
        // Proceed to dashboard
      } else {
        const V2_MIGRATION_DATE = new Date('2026-05-27')
        const createdAt = profRes.data.created_at ? new Date(profRes.data.created_at) : null
        const isLegacyUser = createdAt && createdAt < V2_MIGRATION_DATE

        if (isLegacyUser) {
          // Legacy users (pre-v2) → preserve v1 onboarding checks
          if (!profRes.data.onboarding_completed_at && !profRes.data.objective) {
            router.replace('/onboarding-fitness'); return
          }
          const fn = profRes.data.full_name?.trim()
          if (!fn || fn === 'Athlete') {
            router.replace('/onboarding'); return
          }
          if (!profRes.data.onboarding_photo_completed_at) {
            const photoFeatureDate = new Date('2026-04-03')
            if (createdAt && createdAt >= photoFeatureDate) {
              router.replace('/onboarding-photo'); return
            }
          }
        } else {
          // New users (post-v2) → unified v2 onboarding
          router.replace('/onboarding-v2'); return
        }
      }
    }

    const profileData = profRes.data
    const weightsData = [...(weightsRes.data || [])].sort((a, b) => a.date.localeCompare(b.date))
    const sessData = sessRes.data || []
    const measureData = measureRes.data || []
    const photosData = photosRes.data || []
    const baseErrors: typeof progressionBaseErrors = {}
    if (weightsRes.error) baseErrors.weight = 'PROGRESSION_WEIGHT_READ_FAILED'
    if (sessRes.error) baseErrors.sessions = 'PROGRESSION_SESSIONS_READ_FAILED'
    if (measureRes.error) baseErrors.measurements = 'PROGRESSION_MEASUREMENTS_READ_FAILED'
    if (photosRes.error) baseErrors.photos = 'PROGRESSION_PHOTOS_READ_FAILED'
    setProgressionBaseErrors(baseErrors)
    setWorkoutHistoryState(sessRes.error ? 'error' : sessData.some(item => item.completed) ? 'ready' : 'empty')
    const relation = toActiveCoachResolutionState(relationResult)
    const trainingContext = normalizeActiveTrainingContext(resolveActiveTrainingProgram({
      coachRelation: relation,
      coachPrograms: (coachProgramsRes.data || []) as CoachTrainingProgramRow[],
      personalProgram: customProgRes.data as PersonalTrainingProgram | null,
      capabilities: resolvedEntitlementSnapshot.capabilities,
      coachProgramReadError: Boolean(coachProgramsRes.error),
      personalProgramReadError: Boolean(customProgRes.error),
      coachProgramValidator: program => Boolean(normalizeCoachProgram(program)),
    }))
    const coachProgData = trainingContext.source === 'coach'
      ? normalizeCoachProgram(trainingContext.program)
      : null
    const coachMealData = coachMealRes.data?.plan || null

    // Build last-completed map for session cards
    const lcMap = new Map<number, string>()
    const startOfWeek = new Date()
    const dow = startOfWeek.getDay() || 7
    startOfWeek.setDate(startOfWeek.getDate() - (dow - 1))
    startOfWeek.setHours(0, 0, 0, 0)
    const cwMap = new Map<number, string>()
    for (const cs of (completedSessionsRes.data || [])) {
      if (!lcMap.has(cs.session_index)) lcMap.set(cs.session_index, cs.completed_at)
      if (new Date(cs.completed_at) >= startOfWeek) cwMap.set(cs.session_index, cs.completed_at)
    }
    setLastCompletedByIndex(lcMap)
    setCompletedThisWeek(cwMap)
    setNextSession(suggestNextSession(coachProgData, lcMap))

    cache.set(`dashboard_${uid}`, { profileData, weightsData, sessData, measureData, photosData, coachProgramsData: coachProgramsRes.data || [], coachMealData, customProgData: customProgRes?.data || null, sessionDatesData: sessionDatesRes?.data || [], hasTrainedBeforeVal: (trainedCountRes?.count ?? 0) > 0, progressionBaseErrorsData: baseErrors }, 5 * 60 * 1000)

    applyActiveTrainingContext(trainingContext)
    await applyCoachResolution(relation)
    applyFetchedData(profileData, weightsData, sessData, measureData, photosData, coachProgData, coachMealData)
    setHasTrainedBefore((trainedCountRes?.count ?? 0) > 0)
    setSessionDates(sessionDatesRes?.data || [])
    if (diagRes.data) setLatestDiagnostic(diagRes.data)
    const planningProgram = trainingContext.source === 'personal' ? personalToDays(trainingContext.program) : coachToDays(coachProgData)
    setPlanningDays(planningProgram?.days || null)
    await scheduledHook.fetchScheduledSessions(uid, profileData, planningProgram)
    fetchAllComplete.current = true
  }

  function normalizeActiveTrainingContext(context: ActiveTrainingProgramContext): ActiveTrainingProgramContext {
    if (context.source !== 'coach') return context
    const normalized = normalizeCoachProgram(context.program)
    if (normalized) return { ...context, program: normalized }
    return {
      ...emptyActiveTrainingProgram(context.coachRelation),
      state: 'error',
      errors: [...context.errors, 'TRAINING_COACH_PROGRAM_INVALID'],
    }
  }

  function applyActiveTrainingContext(context: ActiveTrainingProgramContext) {
    setActiveTrainingProgram(context)
    const coachProgramValue = context.source === 'coach' ? context.program : null
    setCoachProgram(coachProgramValue)
    clientProgramIdRef.current = context.source === 'coach' ? context.programId : null
    coachOfProgramIdRef.current = context.source === 'coach' ? context.coachRelation.coachId : null
  }

  function applyFetchedData(profileData: any, weightsData: any[], sessData: any[], measureData: any[], photosData: any[], coachProgData: any, coachMealData: any) {
    setProfile(profileData)
    const age = profileData.birth_date ? Math.floor((Date.now() - new Date(profileData.birth_date).getTime()) / 31557600000) : ''
    setBmrForm(p => ({
      ...p,
      weight: (weightsData[weightsData.length - 1]?.poids ?? profileData.current_weight)?.toString() || '',
      height: profileData.height?.toString() || '',
      age: age.toString(),
      gender: profileData.gender || 'male',
      activity: profileData.activity_level || 'moderate',
      body_fat: profileData.body_fat_pct?.toString() || '',
    }))
    setWSessions(sessData)
    setMeasurements(measureData)
    setProgressPhotos(photosData)
    setWeightHistory30(weightsData.map(w => ({ date: w.date, poids: w.poids })))
    setCoachProgram(coachProgData || null)
    if (coachMealData) setCoachMealPlan(coachMealData)
  }

  async function applyCoachResolution(resolution: ActiveCoachResolutionState) {
    setCoachId(resolution.coachId)
    setCoachRelationStatus(resolution.status)

    if (!resolution.coachId) {
      setIsDefaultCoach(false)
      if (resolution.status === 'multiple_active' || resolution.status === 'error') {
        console.error('[client-dashboard] Active coach relation resolution failed:', resolution.status)
      }
      return
    }

    const defaultEmail = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'
    const { data: defaultCoachId } = await supabase.rpc('get_default_coach_id', { coach_email: defaultEmail })
    setIsDefaultCoach(!!defaultCoachId && resolution.coachId === defaultCoachId)
  }

  /* ── Handlers ── */
  async function startProgramWorkout(day: any, exercises: any[], weekdayKey?: string) {
    if (!session?.user?.id) return
    const name = day.day_name || day.name || 'Séance'
    const draft = createActiveWorkoutDraft({
      userId: session.user.id,
      programSource: activeTrainingProgram.source,
      programId: activeTrainingProgram.programId,
      sessionKey: `${activeTrainingProgram.programId || 'free'}:${weekdayKey || name}`,
      sessionName: name,
      trainingDay: weekdayKey || null,
      exercises,
    })
    writeActiveWorkoutDraft(localStorage, draft)
    setWorkoutSession(draft)
  }

  function updateWorkoutSessionDraft(draft: ActiveWorkoutDraft) {
    writeActiveWorkoutDraft(localStorage, draft)
    setWorkoutSession(draft)
  }

  async function onFinishWorkout(data: CompletedWorkoutData, submittedDraft?: ActiveWorkoutDraft): Promise<{
    newPRs: { exercise: string; value: number }[]
    newBadges: Badge[]
    secondary: Promise<{ newPRs: { exercise: string; value: number }[]; newBadges: Badge[] }>
  }> {
    const activeDraft = submittedDraft ?? workoutSession
    if (!activeDraft || !session?.user?.id) throw new Error('WORKOUT_DRAFT_UNAVAILABLE')
    const newPRs: { exercise: string; value: number }[] = []
    const newBadges: Badge[] = []
    const persistDraft = (draft: ActiveWorkoutDraft) => {
      writeActiveWorkoutDraft(localStorage, draft)
      setWorkoutSession(draft)
    }
    const musclesWorked = [...new Set(data.exercises.map(exercise => exercise.muscle).filter(Boolean))] as string[]
    const critical = await persistCriticalWorkout({
      draft: activeDraft,
      data,
      persistDraft,
      port: {
        createSession: async () => {
          const { data: created, error } = await supabase.from('workout_sessions').insert({
            user_id: session.user.id,
            name: activeDraft.sessionName,
            completed: false,
            duration_minutes: Math.round(data.duration / 60000),
            notes: `${data.completedSets}/${data.totalSets} sets · ${Math.round(data.totalVolume)} kg volume`,
            muscles_worked: musclesWorked.length > 0 ? musclesWorked : null,
          }).select('id').single()
          if (error || !created?.id) throw new Error('WORKOUT_SESSION_SAVE_FAILED')
          return created.id
        },
        countSessionSets: async (sessionId) => {
          const { count, error } = await supabase.from('workout_sets').select('id', { count: 'exact', head: true }).eq('session_id', sessionId)
          if (error) throw new Error('WORKOUT_SETS_READ_FAILED')
          return count ?? 0
        },
        insertSessionSets: async (sessionId) => {
          const setsToInsert = data.exercises.flatMap(exercise => exercise.sets.map((set, index) => ({
            session_id: sessionId,
            user_id: session.user.id,
            exercise_name: exercise.name,
            exercise_id: exercise.exerciseId ?? null,
            set_number: index + 1,
            reps: Number(set.reps) || 0,
            weight: Number(set.weight) || 0,
            completed: true,
            rir: set.rir ?? null,
          })))
          if (setsToInsert.length === 0) return
          const { error } = await supabase.from('workout_sets').insert(setsToInsert)
          if (error) throw new Error('WORKOUT_SETS_SAVE_FAILED')
        },
        completeSession: async (sessionId) => {
          const { error } = await supabase.from('workout_sessions').update({ completed: true }).eq('id', sessionId).eq('user_id', session.user.id)
          if (error) throw new Error('WORKOUT_SESSION_FINALIZE_FAILED')
        },
      },
    })
    removeActiveWorkoutDraft(localStorage, critical.draft.draftId)

    const completedAt = new Date().toISOString()
    const todayStr = toDateStr(new Date(completedAt))
    const workoutSets = data.exercises.flatMap(exercise => exercise.sets.map((set, index) => ({
      session_id: critical.sessionId,
      user_id: session.user.id,
      exercise_name: exercise.name,
      exercise_id: exercise.exerciseId ?? null,
      set_number: index + 1,
      reps: Number(set.reps) || 0,
      weight: Number(set.weight) || 0,
      completed: true,
      rir: set.rir ?? null,
      created_at: completedAt,
    })))
    const completedSession = {
      id: critical.sessionId,
      user_id: session.user.id,
      name: activeDraft.sessionName,
      completed: true,
      duration_minutes: Math.round(data.duration / 60000),
      notes: `${data.completedSets}/${data.totalSets} sets · ${Math.round(data.totalVolume)} kg volume`,
      muscles_worked: musclesWorked.length > 0 ? musclesWorked : null,
      date: todayStr,
      created_at: completedAt,
      workout_sets: workoutSets,
    }
    setWSessions(previous => [completedSession, ...previous.filter(item => item.id !== critical.sessionId)].slice(0, 90))
    setWorkoutHistoryState('ready')
    setSessionDates(previous => [{ created_at: completedAt }, ...previous.filter(item => item.created_at !== completedAt)].slice(0, 400))
    setHasTrainedBefore(true)
    scheduledHook.markDateCompletedLocally(todayStr, completedAt)
    cache.remove(`dashboard_${session.user.id}`)

    if (clientProgramIdRef.current && activeDraft.trainingDay) {
      const weekdays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
      const sessionIndex = weekdays.indexOf(activeDraft.trainingDay)
      if (sessionIndex >= 0) {
        const nextLastCompleted = new Map(lastCompletedByIndex).set(sessionIndex, completedAt)
        setLastCompletedByIndex(nextLastCompleted)
        setNextSession(suggestNextSession(coachProgram, nextLastCompleted))
        setCompletedThisWeek(previous => new Map(previous).set(sessionIndex, completedAt))
      }
    }

    // The durable completion UI can render now. Every remaining write is
    // observable but secondary and must not delay or revoke critical success.
    const secondary = (async () => {

    // Secondary writes never turn a durable workout back into an apparent failure.
    try {
      await addXP(session.user.id, 100, supabase)
      await updateStreak(session.user.id, supabase)
    } catch (error) { console.error('[workout-secondary] gamification failed', error) }

    try {
      for (const exercise of data.exercises) {
        const valid = exercise.sets.filter(set => Number(set.weight) > 0 && Number(set.reps) > 0)
        if (valid.length === 0) continue
        const best = valid.reduce((left, right) => (
          Number(left.weight) * (1 + Number(left.reps) / 30) >= Number(right.weight) * (1 + Number(right.reps) / 30) ? left : right
        ))
        const result = await checkForPR(exercise.name, Number(best.weight), Number(best.reps))
        if (result.newPR && result.exercise && result.value) newPRs.push({ exercise: result.exercise, value: result.value })
      }
    } catch (error) { console.error('[workout-secondary] PR detection failed', error) }

    try {
      const { newlyUnlockedIds } = await checkAndUnlockBadges(session.user.id, supabase)
      if (newlyUnlockedIds.length > 0) {
        const { data: badges } = await supabase.from('badges').select('*').in('id', newlyUnlockedIds)
        if (badges?.length) newBadges.push(...badges)
      }
    } catch (error) { console.error('[workout-secondary] badges failed', error) }

    for (const exercise of data.exercises) {
      if (!exercise.sets.length || (exercise.setsTarget && exercise.sets.length < exercise.setsTarget)) continue
      const reps = Number(exercise.sets[0].reps) || 0
      const weight = Number(exercise.sets[0].weight) || 0
      if (reps <= 0 || weight <= 0) continue
      if (!exercise.sets.every(set => Number(set.reps) === reps && Number(set.weight) === weight)) continue
      fetch('/api/suggest-overload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseName: exercise.name, currentWeight: weight, currentReps: reps, setsCompleted: exercise.sets.length, setsTarget: exercise.setsTarget, sessionId: critical.sessionId }),
      }).catch(() => console.warn('[workout-secondary] overload suggestion failed'))
    }
    // Mark today's scheduled session as completed
    try {
      await supabase.from('scheduled_sessions').update({ completed: true, completed_at: new Date().toISOString() })
        .eq('user_id', session.user.id).eq('scheduled_date', todayStr).eq('completed', false)
      await updateProfile(session.user.id, { last_workout_at: new Date().toISOString() }, supabase)
    } catch (error) { console.error('[workout-secondary] schedule/profile update failed', error) }

    // Track completed sessions for clients using coach-managed programs.
    if (clientProgramIdRef.current && activeDraft.trainingDay) {
      const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
      const sessionIndex = WEEKDAYS.indexOf(activeDraft.trainingDay)
      const { error: trackingError } = await supabase
        .from('completed_sessions')
        .insert({
          client_id: session.user.id,
          coach_id: coachOfProgramIdRef.current,
          program_id: clientProgramIdRef.current,
          session_index: sessionIndex >= 0 ? sessionIndex : 0,
          session_name: activeDraft.sessionName,
          duration_minutes: data.duration ? Math.round(data.duration / 60000) : null,
        })
      if (trackingError) console.error('Error tracking completed_sessions:', trackingError)
    }

    toast.success('Séance terminée ! Bien joué 💪')
    return { newPRs: [...newPRs], newBadges: [...newBadges] }
    })().catch(error => {
      console.error('[workout-secondary] unexpected failure', error)
      return { newPRs: [...newPRs], newBadges: [...newBadges] }
    })

    return { newPRs: [], newBadges: [], secondary }
  }

  async function saveWeight(value: number, date: string) {
    const { error } = await supabase.from('weight_logs').upsert({ user_id: session.user.id, poids: value, date }, { onConflict: 'user_id,date' })
    if (error) { toast.error('Erreur lors de l’enregistrement'); return }
    await updateProfile(session.user.id, { current_weight: value, ...(profile?.start_weight ? {} : { start_weight: value }) }, supabase)
    setWeightHistory30(previous => [
      ...previous.filter(entry => entry.date !== date),
      { date, poids: value },
    ].sort((a, b) => a.date.localeCompare(b.date)).slice(-100))
    setProfile(profile ? { ...profile, current_weight: value, start_weight: profile.start_weight || value } : profile)
    cache.remove(`dashboard_${session.user.id}`)
    toast.success('Poids enregistré !'); setModal(null)
  }

  async function saveMeasurements(data: Record<string, number>, date: string) {
    const { error } = await supabase.from('body_measurements').insert({ user_id: session.user.id, date, ...data })
    if (error) { toast.error('Erreur lors de l’enregistrement'); return }
    setMeasurements(previous => [{ date, ...data }, ...previous].slice(0, 10))
    cache.remove(`dashboard_${session.user.id}`)
    toast.success('Mensurations enregistrées !'); setModal(null)
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !session?.user?.id) return
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${session.user.id}/avatar.${ext}`
      // Remove old avatar first (ignore errors)
      await supabase.storage.from('avatars').remove([path]).catch(() => {})
      // Upload new avatar
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (uploadErr) { toast.error('Erreur upload: ' + uploadErr.message); return }
      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      // Update profile
      const { error: updateErr } = await updateProfile(session.user.id, { avatar_url: publicUrl }, supabase)
      if (updateErr) { toast.error('Erreur sauvegarde: ' + updateErr.message); return }
      toast.success('Photo de profil mise à jour !')
      fetchAll(true)
    } catch (err: any) {
      toast.error('Erreur: ' + (err?.message || 'Inconnue'))
    }
  }

  async function uploadProgressPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoUploading(true)
    const path = `${session.user.id}/${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('progress-photos').upload(path, file)
    if (uploadError) { toast.error("Erreur lors de l'upload"); setPhotoUploading(false); return }
    await supabase.from('progress_photos').insert({ user_id: session.user.id, photo_url: path, view_type: 'front' })
    toast.success('Photo ajoutée !'); setPhotoUploading(false); fetchAll(true)
  }

  async function deletePhoto(photo: any) {
    await supabase.storage.from('progress-photos').remove([photo.photo_url])
    await supabase.from('progress_photos').delete().eq('id', photo.id)
    setProgressPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  /* ── Computed ── */
  const calorieGoal = profile?.calorie_goal || 2500
  const goalWeight = profile?.target_weight ?? null
  const currentWeight = weightHistory30.length > 0 ? weightHistory30[weightHistory30.length - 1].poids : profile?.current_weight
  const completedSessions = sessionDates.length
  const toLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const restDates = projectRestDates(planningDays)
  // Single source: lib/streak.ts (Duolingo grace period, rest days extend)
  const streakDates = sessionDates.map(s => toLocal(new Date(s.created_at)))
  const streakResult = computeStreak(streakDates, toLocal(new Date()), restDates)
  const streak = streakResult.current
  const todayKey = JS_DAYS_FR[new Date().getDay()]
  const todayCoachDay = coachProgram ? (coachProgram[todayKey] ?? { repos: false, exercises: [] }) : null
  const todaySessionDone = sessionDates.some(s => toLocal(new Date(s.created_at)) === toLocal(new Date()))
  const displayAvatar = session ? (profile?.avatar_url || session.user.user_metadata?.avatar_url) : undefined
  const fullName = session ? (profile?.full_name || session.user.user_metadata?.full_name || 'Athlete') : 'Athlete'
  const firstName = fullName.split(' ')[0]

  const progressionModel = useProgressionViewModel({
    enabled: activeTab === 'progress',
    period: progressionPeriod,
    goal: profile?.objective,
    weight: {
      logs: weightHistory30,
      profileCurrentWeight: profile?.current_weight ?? null,
      targetWeight: profile?.target_weight ?? null,
      isTruncated: weightHistory30.length === 100,
      state: progressionBaseErrors.weight ? 'error' : profile ? 'ready' : 'loading',
      errorCode: progressionBaseErrors.weight,
    },
    sessions: {
      rows: wSessions,
      isTruncated: wSessions.length === 90,
      state: progressionBaseErrors.sessions ? 'error' : profile ? 'ready' : 'loading',
      errorCode: progressionBaseErrors.sessions,
    },
    records: {
      rows: analyticsHook.personalRecords,
      isTruncated: analyticsHook.personalRecords.length === 50,
      state: analyticsHook.sourceStates.records,
      errorCode: analyticsHook.sourceStates.records === 'error' ? 'PROGRESSION_RECORDS_READ_FAILED' : undefined,
    },
    measurements: {
      rows: measurements,
      isTruncated: measurements.length === 10,
      state: progressionBaseErrors.measurements ? 'error' : profile ? 'ready' : 'loading',
      errorCode: progressionBaseErrors.measurements,
    },
    photos: {
      rows: progressPhotos,
      isTruncated: progressPhotos.length === 20,
      state: progressionBaseErrors.photos ? 'error' : profile ? 'ready' : 'loading',
      errorCode: progressionBaseErrors.photos,
    },
    wellbeing: {
      rows: analyticsHook.wellbeingEntries,
      isTruncated: analyticsHook.wellbeingEntries.length === 100,
      state: analyticsHook.sourceStates.wellbeing,
      errorCode: analyticsHook.sourceStates.wellbeing === 'error' ? 'PROGRESSION_WELLBEING_READ_FAILED' : undefined,
    },
    freshness: fetchAllComplete.current ? 'mixed' : 'network',
  })

  // Subscription
  const OWNER_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bobitosm@gmail.com'
  const { effectiveEntitlement, capabilities } = entitlementSnapshot

  const hasPaidSub = (() => {
    if (!profile) return false

    // Product authority is centralized; subscription_status remains only the
    // billing lifecycle fallback for older or temporarily desynced profiles.
    if (effectiveEntitlement.type === 'lifetime') return true
    if (capabilities.coachManaged) return true

    // Beta : accès gratuit limité dans le temps (campagne). REQUIERT une date de fin.
    if (effectiveEntitlement.type === 'beta') {
      if (!profile.subscription_end_date) return false
      return new Date(profile.subscription_end_date) > new Date()
    }

    // Fallback: subscription_status (for older profiles or status-driven flows)
    const st = profile.subscription_status
    if (st === 'lifetime') return true
    if (st === 'beta') {
      if (!profile.subscription_end_date) return false
      return new Date(profile.subscription_end_date) > new Date()
    }
    if (st === 'active') {
      if (!profile.subscription_end_date) return true
      return new Date(profile.subscription_end_date) > new Date()
    }
    return false
  })()

  const isExempt = !!profile && (profile.email === OWNER_EMAIL || profile.email === ADMIN_EMAIL)
  const coachManaged = capabilities.coachManaged
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const now = new Date()
  const isInTrial = !hasPaidSub && !isExempt && !!trialEndsAt && trialEndsAt > now
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const trialExpired = !hasPaidSub && !isExempt && !coachManaged && !!trialEndsAt && trialEndsAt <= now
  const subEndsAt = profile?.subscription_end_date ? new Date(profile.subscription_end_date) : null
  const isInBeta = effectiveEntitlement.type === 'beta' && !!subEndsAt && subEndsAt > now
  const betaDaysLeft = subEndsAt ? Math.max(0, Math.ceil((subEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const betaExpired = effectiveEntitlement.type === 'beta' && !!subEndsAt && subEndsAt <= now
  const isSubActive = hasPaidSub || isExempt || coachManaged || isInTrial

  const handleSubscribe = async (planId?: string) => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: session?.user?.id, planId: planId || 'client_monthly', coachId: coachId || 'platform' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Erreur serveur (${res.status})`)
      }
      const { url } = await res.json()
      if (url) window.location.href = url
      else throw new Error('Lien de paiement indisponible')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible de procéder au paiement. Réessaye.')
    }
  }

  // Wrappers for sub-hooks that need extra context
  const checkForPR = (exerciseName: string, weight: number, reps: number) =>
    analyticsHook.checkForPR(userId, exerciseName, weight, reps)

  const regenerateWeekSchedule = async () => {
    const prog = activeTrainingProgram.source === 'personal'
      ? activeTrainingProgram.program
      : activeTrainingProgram.source === 'coach'
        ? coachToDays(activeTrainingProgram.program)
        : null
    return scheduledHook.regenerateWeekSchedule(userId, profile, prog)
  }

  const updateReminderSettings = (settings: { preferred_training_time?: string; reminder_enabled?: boolean; reminder_minutes_before?: number }) =>
    scheduledHook.updateReminderSettings(supabase, userId, settings, setProfile)

  const updateRirSettings = (settings: { rir_tracking_enabled?: boolean; rir_scale_advanced?: boolean }) =>
    scheduledHook.updateRirSettings(supabase, userId, settings, setProfile)

  return {
    // Auth / loading
    mounted, session, loading, roleChecked, userRole, router, supabase,
    // Profile / data
    profile, measurements, progressPhotos, wSessions, workoutHistoryState,
    coachProgram, activeTrainingProgram, coachMealPlan, planningDays, weightHistory30, lastCompletedByIndex, completedThisWeek, nextSession,
    // Tabs
    activeTab, setActiveTab,
    // Workout session
    workoutSession, setWorkoutSession, updateWorkoutSessionDraft,
    // Modals
    modal, setModal,
    // Food modal (from sub-hook)
    foodSearch: foodHook.foodSearch, setFoodSearch: foodHook.setFoodSearch,
    foodResults: foodHook.foodResults, selectedFood: foodHook.selectedFood,
    setSelectedFood: foodHook.setSelectedFood,
    foodQty: foodHook.foodQty, setFoodQty: foodHook.setFoodQty,
    mealType: foodHook.mealType, setMealType: foodHook.setMealType,
    customFoodForm: foodHook.customFoodForm, setCustomFoodForm: foodHook.setCustomFoodForm,
    searchTab: foodHook.searchTab, setSearchTab: foodHook.setSearchTab,
    addFoodToMeal: foodHook.addFoodToMeal, addCustomFood: foodHook.addCustomFood,
    // BMR
    bmrForm,
    // Photos
    photoUploading, photoRef, avatarRef,
    uploadAvatar, uploadProgressPhoto, deletePhoto,
    // Messages (from sub-hook)
    coachId, coachRelationStatus, isDefaultCoach, hasRealCoach: !isDefaultCoach && !!coachId,
    messages: messagesHook.messages, msgInput: messagesHook.msgInput,
    setMsgInput: messagesHook.setMsgInput, unreadCount: messagesHook.unreadCount,
    msgEndRef: messagesHook.msgEndRef, sendMessage: messagesHook.sendMessage,
    // Computed
    calorieGoal, goalWeight, currentWeight, completedSessions, hasTrainedBefore, streak, sessionDates,
    todayKey, todayCoachDay, todaySessionDone,
    displayAvatar, fullName, firstName,
    // Subscription & trial
    isSubActive, isInTrial, trialDaysLeft, trialExpired, isInBeta, betaDaysLeft, betaExpired, handleSubscribe,
    aiAllowed: capabilities.ai, capabilities,
    // Handlers
    fetchAll, startProgramWorkout, onFinishWorkout, saveWeight, saveMeasurements,
    // Calendar / scheduled sessions (from sub-hook)
    scheduledSessions: scheduledHook.scheduledSessions,
    calendarSelectedDate: scheduledHook.calendarSelectedDate,
    setCalendarSelectedDate: scheduledHook.setCalendarSelectedDate,
    markSessionCompleted: scheduledHook.markSessionCompleted,
    regenerateWeekSchedule, updateReminderSettings, updateRirSettings,
    // Analytics (from sub-hook)
    personalRecords: analyticsHook.personalRecords,
    weeklyCalories: analyticsHook.weeklyCalories,
    weeklyWater: analyticsHook.weeklyWater,
    weeklyVolume: analyticsHook.weeklyVolume,
    weightHistoryFull: analyticsHook.weightHistoryFull,
    wellbeingEntries: analyticsHook.wellbeingEntries,
    progressionModel,
    setProgressionPeriod,
    checkForPR,
    // Weekly diagnostic
    latestDiagnostic, setLatestDiagnostic,
    // Refs
    mainRef,
  }
}
