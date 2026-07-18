'use client'

import { useEffect, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { cache } from '@/lib/cache'
import { getRole } from '@/lib/getRole'
import { suggestNextSession, type SuggestedSession } from '@/lib/suggestNextSession'
import type { DatabaseClient, Tables } from '@/lib/supabase/types'
import type { ProfileLoadStatus } from '@/lib/client-dashboard/profile-load-state'
import type { SessionProfileLoader } from '@/lib/client-dashboard/session-profile-loader'
import type { TrainingDashboardLoader } from '@/lib/client-dashboard/training-dashboard-loader'
import type { NutritionMeasurementsLoader } from '@/lib/client-dashboard/nutrition-measurements-loader'

type ProfileRow = Tables<'profiles'>
type WeeklyDiagnosticRow = Tables<'weekly_diagnostics'>

export const DASHBOARD_PROFILE_PROJECTION = 'activity_level,allergies,avatar_url,beta_campaign_id,birth_date,body_fat_pct,calorie_goal,carbs_goal,cardio_enabled,cardio_frequency,cardio_preference,coach_available_days,coach_experience_years,coach_max_clients,coach_monthly_rate,coach_onboarding_complete,coach_speciality,created_at,current_weight,dietary_type,email,fat_goal,fitness_level,fitness_objectives,fitness_score,full_name,gender,height,home_equipment,id,last_streak_reminder_at,last_workout_at,liked_foods,meal_preferences,needs_initial_generation,next_diagnostic_at,next_program_regen_at,objective,onboarding_answers,onboarding_completed,onboarding_completed_at,onboarding_photo_completed_at,phone,preferred_locale,preferred_training_time,protein_goal,reminder_enabled,reminder_minutes_before,rir_scale_advanced,rir_tracking_enabled,role,start_weight,status,streak_best,streak_current,streak_last_date,stripe_account_id,stripe_customer_id,stripe_subscription_id,subscription_end_date,subscription_status,subscription_type,target_weight,tdee,training_location,trial_ends_at,updated_at,water_goal' as const
export const WEEKLY_DIAGNOSTIC_PROJECTION = 'adherence_pct,ai_model,ai_tokens_used,ajustements,applied_at,applied_changes,calorie_avg_real,calorie_avg_target,created_at,exercice_a_ajouter,id,objectif_semaine_prochaine,points_alerte,points_forts,protein_avg_g,protein_compliance_pct,raisonnement,score_semaine,sessions_done,sessions_planned,training_volume_total,user_id,week_start,weight_delta_kg' as const

export interface DashboardFetchedData {
  profileData: Record<string, unknown> & { id: string }
  weightsData: unknown[]
  sessData: unknown[]
  measureData: unknown[]
  photosData: unknown[]
  coachProgData: Record<string, unknown> | null
  coachMealData: unknown
}

interface UseClientDashboardDataOptions {
  supabase: DatabaseClient
  session: Session | null
  setSession(value: Session | null): void
  setLoading(value: boolean): void
  setMounted(value: boolean): void
  setRoleChecked(value: boolean): void
  setUserRole(value: string | null): void
  setProfileLoadStatus(value: ProfileLoadStatus): void
  setProfile(value: null): void
  setSessionDates(value: Array<{ created_at: string }>): void
  setHasTrainedBefore(value: boolean): void
  setPlanningDays(value: unknown[] | null): void
  setLastCompletedByIndex(value: Map<number, string>): void
  setCompletedThisWeek(value: Map<number, string>): void
  setNextSession(value: SuggestedSession | null): void
  setLatestDiagnostic(value: WeeklyDiagnosticRow): void
  setCoachId(value: string): void
  setIsDefaultCoach(value: boolean): void
  applyFetchedData(value: DashboardFetchedData): void
  replace(path: string): void
  sessionProfileLoader: SessionProfileLoader
  trainingDashboardLoader: TrainingDashboardLoader
  nutritionMeasurementsLoader: NutritionMeasurementsLoader
  fetchScheduledSessions(userId: string, profile: ProfileRow | Record<string, unknown>, program: unknown): Promise<void>
  fetchAnalyticsData(userId: string): Promise<void>
}

function coachToDays(normalized: unknown): { days: unknown[] } | null {
  if (!normalized || typeof normalized !== 'object') return null
  const weekdays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  const program = normalized as Record<string, unknown>
  return {
    days: weekdays.map(day => program[day] ?? { is_rest: true, name: '', exercises: [] }),
  }
}

function planningDays(program: unknown): unknown[] | null {
  if (!program || typeof program !== 'object') return null
  const days = (program as { days?: unknown }).days
  return Array.isArray(days) ? days : null
}

export function useClientDashboardData(options: UseClientDashboardDataOptions) {
  const {
    supabase, session, setSession, setLoading, setMounted, setRoleChecked, setUserRole,
    setProfileLoadStatus, setProfile, setSessionDates, setHasTrainedBefore, setPlanningDays,
    setLastCompletedByIndex, setCompletedThisWeek, setNextSession, setLatestDiagnostic,
    setCoachId, setIsDefaultCoach, applyFetchedData, replace, sessionProfileLoader,
    trainingDashboardLoader, nutritionMeasurementsLoader, fetchScheduledSessions,
    fetchAnalyticsData,
  } = options
  const initialFetchDone = useRef(false)
  const fetchAllComplete = useRef(false)
  const mounted = useRef(false)
  const activeUser = useRef<string | null>(null)
  const confirmedProfileUser = useRef<string | null>(null)
  const onboardingRedirectUser = useRef<string | null>(null)
  const clientProgramId = useRef<string | null>(null)
  const coachOfProgramId = useRef<string | null>(null)

  async function resolveCoachLink(userId: string) {
    const { data: coachLink } = await supabase.from('coach_clients').select('coach_id')
      .eq('client_id', userId).eq('status', 'active').maybeSingle()
    if (!mounted.current || activeUser.current !== userId) return
    if (coachLink?.coach_id) {
      setCoachId(coachLink.coach_id)
      return
    }
    const response = await fetch('/api/coach/default-assignment', { method: 'POST' })
    if (!mounted.current || activeUser.current !== userId) return
    if (!response.ok) return
    const payload: unknown = await response.json()
    if (!payload || typeof payload !== 'object') return
    const data = (payload as { data?: { coachId?: unknown; isDefault?: unknown } }).data
    if (typeof data?.coachId === 'string' && data.isDefault === true) {
      setCoachId(data.coachId)
      setIsDefaultCoach(true)
    }
  }

  async function fetchAll(forceRefresh = false, requestedUserId?: string) {
    const userId = requestedUserId ?? session?.user.id
    if (!userId) return
    const profileLoad = sessionProfileLoader.begin(userId)
    if (!profileLoad) return
    const isCurrentRequest = () => profileLoad.isCurrent()
    const hasConfirmedProfile = () => confirmedProfileUser.current === userId
    try {
      if (!hasConfirmedProfile()) setProfileLoadStatus('loading')
      const sessionProfile = await profileLoad.load({ forceRefresh, hasConfirmedProfile: hasConfirmedProfile() })
      if (!isCurrentRequest() || sessionProfile.kind === 'stale') return

      if (sessionProfile.kind === 'cache') {
        const cached = sessionProfile.cached
        applyFetchedData({
          profileData: cached.profileData,
          weightsData: cached.weightsData ?? [],
          sessData: cached.sessData ?? [],
          measureData: cached.measureData ?? [],
          photosData: cached.photosData ?? [],
          coachProgData: cached.coachProgData ?? null,
          coachMealData: cached.coachMealData,
        })
        setSessionDates(cached.sessionDatesData ?? [])
        setHasTrainedBefore(cached.hasTrainedBeforeVal ?? false)
        await resolveCoachLink(userId)
        if (!isCurrentRequest()) return
        const program = cached.customProgData ?? coachToDays(cached.coachProgData)
        setPlanningDays(planningDays(program))
        await fetchScheduledSessions(userId, cached.profileData, program)
        if (!isCurrentRequest()) return
        void fetchAnalyticsData(userId)
        fetchAllComplete.current = true
        confirmedProfileUser.current = userId
        setProfileLoadStatus('ready')
        return
      }

      if (sessionProfile.kind !== 'profile') {
        const status: ProfileLoadStatus = sessionProfile.kind === 'not_found'
          ? 'not_found'
          : sessionProfile.kind === 'retained' ? 'ready' : 'error'
        setProfileLoadStatus(status)
        if (sessionProfile.kind === 'not_found' && onboardingRedirectUser.current !== userId) {
          onboardingRedirectUser.current = userId
          replace('/onboarding-v2')
        }
        return
      }

      const [training, nutrition, profileResult, diagnostic] = await Promise.all([
        trainingDashboardLoader.load(userId),
        nutritionMeasurementsLoader.load(userId),
        supabase.from('profiles').select(DASHBOARD_PROFILE_PROJECTION).eq('id', userId).single(),
        supabase.from('weekly_diagnostics').select(WEEKLY_DIAGNOSTIC_PROJECTION).eq('user_id', userId)
          .order('week_start', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (!isCurrentRequest()) return
      if (!training.ok || !nutrition.ok || profileResult.error || !profileResult.data) {
        setProfileLoadStatus(hasConfirmedProfile() ? 'ready' : 'error')
        return
      }

      const profile = profileResult.data
      const metaRole = session?.user.user_metadata?.role
      if (!profile.role && typeof metaRole === 'string') {
        const { error } = await supabase.rpc('set_role', { p_role: metaRole })
        if (!error) profile.role = metaRole
      }
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bobitosm@gmail.com'
      if (profile.email !== adminEmail && profile.role === 'coach' && !profile.coach_onboarding_complete) {
        replace('/onboarding-coach')
        return
      }
      if (profile.email !== adminEmail && profile.role !== 'coach' && !profile.onboarding_completed) {
        const createdAt = profile.created_at ? new Date(profile.created_at) : null
        const isLegacyUser = createdAt && createdAt < new Date('2026-05-27')
        if (!isLegacyUser) {
          replace('/onboarding-v2')
          return
        }
        if (!profile.onboarding_completed_at && !profile.objective) {
          replace('/onboarding-fitness')
          return
        }
        const fullName = profile.full_name?.trim()
        if (!fullName || fullName === 'Athlete') {
          replace('/onboarding')
          return
        }
        if (!profile.onboarding_photo_completed_at && createdAt >= new Date('2026-04-03')) {
          replace('/onboarding-photo')
          return
        }
      }

      clientProgramId.current = training.data.assignedProgram?.id ?? null
      coachOfProgramId.current = training.data.assignedProgram?.coach_id ?? null
      const lastCompleted = new Map<number, string>()
      const completedThisWeek = new Map<number, string>()
      const weekStart = new Date()
      const day = weekStart.getDay() || 7
      weekStart.setDate(weekStart.getDate() - (day - 1))
      weekStart.setHours(0, 0, 0, 0)
      for (const completion of training.data.completions) {
        if (!completion.completed_at) continue
        if (!lastCompleted.has(completion.session_index)) lastCompleted.set(completion.session_index, completion.completed_at)
        if (new Date(completion.completed_at) >= weekStart) completedThisWeek.set(completion.session_index, completion.completed_at)
      }
      setLastCompletedByIndex(lastCompleted)
      setCompletedThisWeek(completedThisWeek)
      setNextSession(suggestNextSession(training.data.coachProgram, lastCompleted))

      const fetched: DashboardFetchedData = {
        profileData: profile,
        weightsData: nutrition.data.weightHistory,
        sessData: training.data.workoutSessions,
        measureData: nutrition.data.measurements,
        photosData: nutrition.data.progressPhotos,
        coachProgData: training.data.coachProgram,
        coachMealData: nutrition.data.coachMealPlan,
      }
      cache.set(`dashboard_${userId}`, {
        ownerUserId: userId, ...fetched,
        customProgData: training.data.activePersonalProgram,
        sessionDatesData: training.data.sessionDates,
        hasTrainedBeforeVal: training.data.hasTrainedBefore,
      }, 5 * 60 * 1000)
      applyFetchedData(fetched)
      setHasTrainedBefore(training.data.hasTrainedBefore)
      setSessionDates(training.data.sessionDates)
      if (diagnostic.data) setLatestDiagnostic(diagnostic.data)
      const program = training.data.activePersonalProgram && Array.isArray(training.data.activePersonalProgram.days)
        ? { ...training.data.activePersonalProgram, days: training.data.activePersonalProgram.days }
        : coachToDays(training.data.coachProgram)
      setPlanningDays(planningDays(program))
      await fetchScheduledSessions(userId, profile, program)
      void fetchAnalyticsData(userId)
      await resolveCoachLink(userId)
      if (!isCurrentRequest()) return
      fetchAllComplete.current = true
      confirmedProfileUser.current = userId
      setProfileLoadStatus('ready')
    } catch {
      if (isCurrentRequest()) setProfileLoadStatus(hasConfirmedProfile() ? 'ready' : 'error')
    } finally {
      profileLoad.finish()
    }
  }

  function retryProfileLoad() {
    const userId = session?.user.id
    if (!userId || sessionProfileLoader.isLoading(userId)) return
    void fetchAll(true, userId)
  }

  useEffect(() => {
    sessionProfileLoader.mount()
    setMounted(true)
    mounted.current = true
    let alive = true
    void supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      void supabase.from('app_logs').insert({
        level: 'info', message: 'CLIENT_DASH_SESSION',
        details: { hasSession: !!currentSession, userId: currentSession?.user.id, url: typeof window !== 'undefined' ? window.location.href : '' },
        page_url: '/',
      })
      if (alive) { setSession(currentSession); setLoading(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      void supabase.from('app_logs').insert({
        level: 'info', message: 'CLIENT_DASH_AUTH_CHANGE',
        details: { event, hasSession: !!currentSession, userId: currentSession?.user.id }, page_url: '/',
      })
      if (!alive) return
      if (event === 'SIGNED_OUT') { setSession(null); setLoading(false); return }
      if (currentSession) { setSession(currentSession); setLoading(false) }
    })
    return () => {
      alive = false
      mounted.current = false
      sessionProfileLoader.unmount()
      subscription.unsubscribe()
    }
  }, [sessionProfileLoader, setLoading, setMounted, setSession, supabase])

  useEffect(() => {
    if (!session) return
    const userId = session.user.id
    let alive = true
    setRoleChecked(false)
    setUserRole(null)
    void getRole(userId, session.access_token).then(role => {
      if (!alive || session.user.id !== userId) return
      if (role) setUserRole(role)
      setRoleChecked(true)
    })
    return () => { alive = false }
  }, [session, setRoleChecked, setUserRole])

  useEffect(() => {
    const userId = session?.user.id ?? null
    if (!userId) {
      activeUser.current = null
      sessionProfileLoader.switchUser(null)
      initialFetchDone.current = false
      fetchAllComplete.current = false
      setProfileLoadStatus('idle')
      return
    }
    if (activeUser.current !== userId) {
      activeUser.current = userId
      sessionProfileLoader.switchUser(userId)
      initialFetchDone.current = false
      fetchAllComplete.current = false
      confirmedProfileUser.current = null
      onboardingRedirectUser.current = null
      setProfile(null)
      setProfileLoadStatus('loading')
    }
    if (initialFetchDone.current) return
    initialFetchDone.current = true
    void fetchAll(false, userId)
    // The user id is the sole trigger; fetchAll is intentionally not a render dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  return {
    fetchAll,
    retryProfileLoad,
    getProgramAssignment: () => ({
      clientProgramId: clientProgramId.current,
      coachOfProgramId: coachOfProgramId.current,
    }),
  }
}
