'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getRole } from '../../lib/getRole'
import { toast } from 'sonner'
import { JS_DAYS_FR } from '../../lib/design-tokens'
import { cache } from '../../lib/cache'
import useMessages from './useMessages'
import useAnalytics from './useAnalytics'
import useScheduledSessions from './useScheduledSessions'
import useFoodLog from './useFoodLog'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export type Tab = 'home' | 'training' | 'nutrition' | 'progress' | 'profil' | 'messages' | 'coachIA'

export default function useClientDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  const [progressPhotos, setProgressPhotos] = useState<any[]>([])
  const [wSessions, setWSessions] = useState<any[]>([])
  const [coachProgram, setCoachProgram] = useState<any>(null)
  const [coachMealPlan, setCoachMealPlan] = useState<any>(null)
  const [weightHistory30, setWeightHistory30] = useState<{ date: string; poids: number }[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [roleChecked, setRoleChecked] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  const [workoutSession, setWorkoutSession] = useState<{ name: string; exercises: any[]; startedAt?: string } | null>(() => {
    if (typeof window === 'undefined') return null
    try { const s = localStorage.getItem('moovx_active_workout'); return s ? JSON.parse(s) : null } catch { return null }
  })
  const [modal, setModal] = useState<string | null>(null)

  // BMR form state
  const [bmrForm, setBmrForm] = useState({ weight: '', height: '', age: '', gender: 'male', activity: 'moderate', body_fat: '' })

  const [photoUploading, setPhotoUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  // Coach link
  const [coachId, setCoachId] = useState<string | null>(null)
  const [isDefaultCoach, setIsDefaultCoach] = useState(false)

  const initialFetchDone = useRef(false)
  const fetchAllComplete = useRef(false)

  const mainRef = useRef<HTMLElement>(null)
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current

  // --- Sub-hooks ---
  const userId = session?.user?.id

  const messagesHook = useMessages({ supabase, userId, coachId, activeTab })
  const analyticsHook = useAnalytics({ supabase })
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
      if (role === 'super_admin') { router.replace('/admin') }
      else { setRoleChecked(true) }
    })
  }, [session])

  useEffect(() => {
    if (!session || initialFetchDone.current) return
    initialFetchDone.current = true
    fetchAll()
  }, [session])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [activeTab])

  /* ── Data fetching (with cache) ── */
  async function fetchAll(forceRefresh = false) {
    const uid = session?.user?.id
    if (!uid) return
    const today = new Date().toISOString().split('T')[0]

    // Try cache first (only on initial load, not forced refreshes)
    if (!forceRefresh) {
      const cached = cache.get(`dashboard_${uid}`)
      if (cached) {
        applyFetchedData(cached.profileData, cached.weightsData, cached.sessData, cached.measureData, cached.photosData, cached.coachProgData, cached.coachMealData)
        resolveCoachLink(uid)
        fetchAllComplete.current = true
        return
      }
    }

    const [profRes, weightsRes, , sessRes, measureRes, photosRes, , , coachProgRes, coachMealRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('weight_logs').select('date, poids').eq('user_id', uid).order('date', { ascending: true }).limit(30),
      supabase.from('daily_food_logs').select('*').eq('user_id', uid).eq('date', today).limit(100),
      supabase.from('workout_sessions').select('*, workout_sets(*)').eq('user_id', uid).order('created_at', { ascending: false }).limit(90),
      supabase.from('body_measurements').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(10),
      supabase.from('progress_photos').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(20),
      supabase.from('training_programs').select('*').eq('is_template', true).limit(50),
      supabase.from('user_programs').select('*, training_programs(*)').eq('user_id', uid).eq('active', true).maybeSingle(),
      supabase.from('client_programs').select('program').eq('client_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('client_meal_plans').select('plan').eq('client_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (!profRes.data) { router.replace('/onboarding'); return }
    // If role is missing but user_metadata has it (RLS blocked the UPDATE at signup), fix it now
    const metaRole = session?.user?.user_metadata?.role
    if (!profRes.data.role && metaRole) {
      await supabase.from('profiles').update({ role: metaRole }).eq('id', uid)
      profRes.data.role = metaRole
    }
    if (profRes.data.role === 'super_admin' || profRes.data.role === 'admin') {
      // Admin users skip all onboarding → proceed to dashboard
    } else if (profRes.data.role === 'coach') {
      if (!profRes.data.coach_onboarding_complete) { router.replace('/onboarding-coach'); return }
      // Coach with completed onboarding → proceed to dashboard
    } else {
      // Étape 1 : onboarding fitness pas encore fait ?
      // Check both onboarding_completed_at AND objective (for users created before the column existed)
      if (!profRes.data.onboarding_completed_at && !profRes.data.objective) {
        router.replace('/onboarding-fitness'); return
      }
      // Étape 2 : onboarding repas/profil pas encore fait ?
      const fn = profRes.data.full_name?.trim()
      if (!fn || fn === 'Athlete') {
        router.replace('/onboarding'); return
      }
      // Étape 3 : photo onboarding — only for NEW users (skip if profile was created before the feature)
      // Users who completed steps 1+2 before onboarding-photo existed should not be blocked
      if (!profRes.data.onboarding_photo_completed_at) {
        const createdAt = profRes.data.created_at ? new Date(profRes.data.created_at) : null
        const photoFeatureDate = new Date('2026-04-03')
        if (createdAt && createdAt >= photoFeatureDate) {
          router.replace('/onboarding-photo'); return
        }
      }
      // All onboarding steps completed (or grandfathered) → proceed
    }

    const profileData = profRes.data
    const weightsData = weightsRes.data || []
    const sessData = sessRes.data || []
    const measureData = measureRes.data || []
    const photosData = photosRes.data || []
    const coachProgData = coachProgRes.data?.program || null
    const coachMealData = coachMealRes.data?.plan || null

    cache.set(`dashboard_${uid}`, { profileData, weightsData, sessData, measureData, photosData, coachProgData, coachMealData }, 5 * 60 * 1000)

    applyFetchedData(profileData, weightsData, sessData, measureData, photosData, coachProgData, coachMealData)
    await scheduledHook.fetchScheduledSessions(uid, profileData, !!coachProgData)
    analyticsHook.fetchAnalyticsData(uid)
    await resolveCoachLink(uid)
    fetchAllComplete.current = true
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
    if (coachProgData) setCoachProgram(coachProgData)
    if (coachMealData) setCoachMealPlan(coachMealData)
  }

  async function resolveCoachLink(uid: string) {
    const defaultEmail = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'
    const { data: defaultCoachProfile } = await supabase.from('profiles').select('id').eq('email', defaultEmail).maybeSingle()
    const defaultCoachId = defaultCoachProfile?.id || null

    const { data: coachLink } = await supabase.from('coach_clients').select('coach_id').eq('client_id', uid).maybeSingle()
    if (coachLink?.coach_id) {
      setCoachId(coachLink.coach_id)
      setIsDefaultCoach(!!defaultCoachId && coachLink.coach_id === defaultCoachId)
    } else if (defaultCoachId) {
      await supabase.from('coach_clients').insert({ coach_id: defaultCoachId, client_id: uid }).select().maybeSingle()
      setCoachId(defaultCoachId)
      setIsDefaultCoach(true)
    }
  }

  /* ── Handlers ── */
  async function startProgramWorkout(day: any, exercises: any[]) {
    const ws = { name: day.day_name || day.name || 'Séance', exercises, startedAt: new Date().toISOString() }
    setWorkoutSession(ws)
    try { localStorage.setItem('moovx_active_workout', JSON.stringify(ws)) } catch {}
  }

  async function onFinishWorkout(data: any) {
    try { localStorage.removeItem('moovx_active_workout') } catch {}
    const { data: sess } = await supabase.from('workout_sessions').insert({
      user_id: session.user.id, name: workoutSession?.name, completed: true,
      duration_minutes: Math.round(data.duration / 60000),
      notes: `${data.completedSets}/${data.totalSets} sets · ${Math.round(data.totalVolume)} kg volume`,
    }).select().single()
    if (sess) {
      const setsToInsert: any[] = []
      data.exercises.forEach((exo: any) => {
        exo.sets.forEach((s: any, i: number) => {
          setsToInsert.push({
            session_id: sess.id, user_id: session.user.id,
            exercise_name: exo.name, set_number: i + 1,
            reps: Number(s.reps) || 0,
            weight: Number(s.weight) || 0,
            completed: true,
          })
        })
      })
      if (setsToInsert.length > 0) await supabase.from('workout_sets').insert(setsToInsert)
    }
    // Update last_workout_at
    await supabase.from('profiles').update({ last_workout_at: new Date().toISOString() }).eq('id', session.user.id)
    toast.success('Séance terminée ! Bien joué 💪')
    fetchAll(true)
  }

  async function saveWeight(value: number, date: string) {
    await supabase.from('weight_logs').upsert({ user_id: session.user.id, poids: value, date }, { onConflict: 'user_id,date' })
    await supabase.from('profiles').upsert({ id: session.user.id, current_weight: value })
    if (!profile?.start_weight) await supabase.from('profiles').update({ start_weight: value }).eq('id', session.user.id)
    toast.success('Poids enregistré !'); setModal(null); fetchAll(true)
  }

  async function saveMeasurements(data: Record<string, number>, date: string) {
    await supabase.from('body_measurements').insert({ user_id: session.user.id, date, ...data })
    toast.success('Mensurations enregistrées !'); setModal(null); fetchAll(true)
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
      const { error: updateErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id)
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
  const completedSessions = wSessions.filter(s => s.completed).length
  const streak = (() => {
    const dates = new Set(wSessions.filter(s => s.completed).map(s => new Date(s.created_at).toDateString()))
    let count = 0; const d = new Date()
    while (dates.has(d.toDateString())) { count++; d.setDate(d.getDate() - 1) }
    return count
  })()
  const todayKey = JS_DAYS_FR[new Date().getDay()]
  const todayCoachDay = coachProgram ? (coachProgram[todayKey] ?? { repos: false, exercises: [] }) : null
  const todaySessionDone = wSessions.some(s => s.completed && new Date(s.created_at).toDateString() === new Date().toDateString())
  const chartMin = weightHistory30.length > 0 ? Math.min(...weightHistory30.map(p => p.poids)) - 1 : 0
  const chartMax = weightHistory30.length > 0 ? Math.max(...weightHistory30.map(p => p.poids)) + 1 : 1
  const displayAvatar = session ? (profile?.avatar_url || session.user.user_metadata?.avatar_url) : undefined
  const fullName = session ? (profile?.full_name || session.user.user_metadata?.full_name || 'Athlete') : 'Athlete'
  const firstName = fullName.split(' ')[0]

  // Subscription
  const OWNER_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bobitosm@gmail.com'

  const hasPaidSub = (() => {
    if (!profile) return false
    const st = profile.subscription_status
    if (st === 'lifetime' || st === 'invited') return true
    if (st === 'active') {
      if (!profile.subscription_end_date) return true
      return new Date(profile.subscription_end_date) > new Date()
    }
    return false
  })()

  const isExempt = !!profile && (profile.email === OWNER_EMAIL || profile.email === ADMIN_EMAIL)
  const isInvited = profile?.subscription_type === 'invited'
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const now = new Date()
  const isInTrial = !hasPaidSub && !isExempt && !!trialEndsAt && trialEndsAt > now
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const trialExpired = !hasPaidSub && !isExempt && !isInvited && !!trialEndsAt && trialEndsAt <= now
  const isSubActive = hasPaidSub || isExempt || isInvited || isInTrial

  const handleSubscribe = async (planId?: string) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: session?.user?.id, planId: planId || 'client_monthly', coachId: coachId || 'platform' }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  // Wrappers for sub-hooks that need extra context
  const checkForPR = (exerciseName: string, weight: number, reps: number) =>
    analyticsHook.checkForPR(userId, exerciseName, weight, reps)

  const regenerateWeekSchedule = () =>
    scheduledHook.regenerateWeekSchedule(userId, profile)

  const updateReminderSettings = (settings: { preferred_training_time?: string; reminder_enabled?: boolean; reminder_minutes_before?: number }) =>
    scheduledHook.updateReminderSettings(supabase, userId, settings, setProfile)

  return {
    // Auth / loading
    mounted, session, loading, roleChecked, userRole, router, supabase,
    // Profile / data
    profile, measurements, progressPhotos, wSessions,
    coachProgram, coachMealPlan, weightHistory30,
    // Tabs
    activeTab, setActiveTab,
    // Workout session
    workoutSession, setWorkoutSession,
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
    coachId, isDefaultCoach, hasRealCoach: !isDefaultCoach && !!coachId,
    messages: messagesHook.messages, msgInput: messagesHook.msgInput,
    setMsgInput: messagesHook.setMsgInput, unreadCount: messagesHook.unreadCount,
    msgEndRef: messagesHook.msgEndRef, sendMessage: messagesHook.sendMessage,
    // Computed
    calorieGoal, goalWeight, currentWeight, completedSessions, streak,
    todayKey, todayCoachDay, todaySessionDone, chartMin, chartMax,
    displayAvatar, fullName, firstName,
    // Subscription & trial
    isSubActive, isInTrial, trialDaysLeft, trialExpired, handleSubscribe,
    // Handlers
    fetchAll, startProgramWorkout, onFinishWorkout, saveWeight, saveMeasurements,
    // Calendar / scheduled sessions (from sub-hook)
    scheduledSessions: scheduledHook.scheduledSessions,
    calendarSelectedDate: scheduledHook.calendarSelectedDate,
    setCalendarSelectedDate: scheduledHook.setCalendarSelectedDate,
    markSessionCompleted: scheduledHook.markSessionCompleted,
    regenerateWeekSchedule, updateReminderSettings,
    // Analytics (from sub-hook)
    personalRecords: analyticsHook.personalRecords,
    weeklyCalories: analyticsHook.weeklyCalories,
    weeklyWater: analyticsHook.weeklyWater,
    weeklyVolume: analyticsHook.weeklyVolume,
    weightHistoryFull: analyticsHook.weightHistoryFull,
    checkForPR,
    // Refs
    mainRef,
  }
}
