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
import useScheduledSessions from './useScheduledSessions'
import useFoodLog from './useFoodLog'
import { getProfile, updateProfile, invalidateProfileCache } from '../../lib/profile-service'
import { normalizeCoachProgram } from '../../lib/normalizeCoachProgram'
import { suggestNextSession, SuggestedSession } from '../../lib/suggestNextSession'
import { computeStreak } from '../../lib/streak'
import { checkAndUnlockBadges, type Badge } from '../../lib/check-badges'
import { addXP, updateStreak } from '../../lib/gamification'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export type Tab = 'home' | 'training' | 'nutrition' | 'progress' | 'compte' | 'profil' | 'messages' | 'coachIA' | 'feedback'

// Convertit un coach program normalisé (objet {lundi,...}) en forme .days[]
function coachToDays(normalized: any): { days: any[] } | null {
  if (!normalized) return null
  const WD = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
  return { days: WD.map(d => normalized[d] || { is_rest: true, name: '', exercises: [] }) }
}

export default function useClientDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  const [progressPhotos, setProgressPhotos] = useState<any[]>([])
  const [wSessions, setWSessions] = useState<any[]>([])
  const [hasTrainedBefore, setHasTrainedBefore] = useState(false)
  const [sessionDates, setSessionDates] = useState<{ created_at: string }[]>([])
  const [coachProgram, setCoachProgram] = useState<any>(null)
  const [coachMealPlan, setCoachMealPlan] = useState<any>(null)
  const [lastCompletedByIndex, setLastCompletedByIndex] = useState<Map<number, string>>(new Map())
  const [weightHistory30, setWeightHistory30] = useState<{ date: string; poids: number }[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [roleChecked, setRoleChecked] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  const [workoutSession, setWorkoutSession] = useState<{ name: string; exercises: any[]; startedAt?: string; weekdayKey?: string } | null>(() => {
    if (typeof window === 'undefined') return null
    try { const s = localStorage.getItem('moovx_active_workout'); return s ? JSON.parse(s) : null } catch { return null }
  })
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

  const initialFetchDone = useRef(false)
  const fetchAllComplete = useRef(false)
  const clientProgramIdRef = useRef<string | null>(null)
  const coachOfProgramIdRef = useRef<string | null>(null)
  const [completedThisWeek, setCompletedThisWeek] = useState<Map<number, string>>(new Map())
  const [nextSession, setNextSession] = useState<SuggestedSession | null>(null)

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
      setRoleChecked(true)
    })
  }, [session])

  useEffect(() => {
    if (!session || initialFetchDone.current) return
    initialFetchDone.current = true
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

    // Try cache first (only on initial load, not forced refreshes)
    if (!forceRefresh) {
      const cached = cache.get(`dashboard_${uid}`)
      if (cached) {
        applyFetchedData(cached.profileData, cached.weightsData, cached.sessData, cached.measureData, cached.photosData, cached.coachProgData, cached.coachMealData)
        setSessionDates(cached.sessionDatesData || [])
        setHasTrainedBefore(cached.hasTrainedBeforeVal || false)
        resolveCoachLink(uid)
        const planningProgram = cached.customProgData || coachToDays(cached.coachProgData)
        await scheduledHook.fetchScheduledSessions(uid, cached.profileData, planningProgram)
        analyticsHook.fetchAnalyticsData(uid)
        fetchAllComplete.current = true
        return
      }
    }

    const [profRes, weightsRes, , sessRes, measureRes, photosRes, , , coachProgRes, coachMealRes, completedSessionsRes, diagRes, customProgRes, trainedCountRes, sessionDatesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('weight_logs').select('date, poids').eq('user_id', uid).order('date', { ascending: true }).limit(30),
      supabase.from('daily_food_logs').select('*').eq('user_id', uid).eq('date', today).limit(100),
      supabase.from('workout_sessions').select('*, workout_sets(*)').eq('user_id', uid).order('created_at', { ascending: false }).limit(90),
      supabase.from('body_measurements').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(10),
      supabase.from('progress_photos').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(20),
      supabase.from('training_programs').select('*').eq('is_template', true).limit(50),
      supabase.from('user_programs').select('*, training_programs(*)').eq('user_id', uid).eq('active', true).maybeSingle(),
      supabase.from('client_programs').select('id, program, coach_id').eq('client_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('client_meal_plans').select('plan').eq('client_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('completed_sessions').select('session_index, session_name, completed_at').eq('client_id', uid).order('completed_at', { ascending: false }).limit(50),
      supabase.from('weekly_diagnostics').select('*').eq('user_id', uid).order('week_start', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('custom_programs').select('*').eq('user_id', uid).eq('is_active', true).maybeSingle(),
      supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('completed', true),
      supabase.from('workout_sessions').select('created_at').eq('user_id', uid).eq('completed', true).order('created_at', { ascending: false }).limit(400),
    ])

    if (!profRes.data) { router.replace('/onboarding-v2'); return }
    // If role is missing but user_metadata has it (RLS blocked the UPDATE at signup), fix it now
    const metaRole = session?.user?.user_metadata?.role
    if (!profRes.data.role && metaRole) {
      await updateProfile(uid, { role: metaRole }, supabase)
      profRes.data.role = metaRole
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
    const weightsData = weightsRes.data || []
    const sessData = sessRes.data || []
    const measureData = measureRes.data || []
    const photosData = photosRes.data || []
    const coachProgData = normalizeCoachProgram(coachProgRes.data?.program)
    clientProgramIdRef.current = coachProgRes.data?.id ?? null
    coachOfProgramIdRef.current = coachProgRes.data?.coach_id ?? null
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

    cache.set(`dashboard_${uid}`, { profileData, weightsData, sessData, measureData, photosData, coachProgData, coachMealData, customProgData: customProgRes?.data || null, sessionDatesData: sessionDatesRes?.data || [], hasTrainedBeforeVal: (trainedCountRes?.count ?? 0) > 0 }, 5 * 60 * 1000)

    applyFetchedData(profileData, weightsData, sessData, measureData, photosData, coachProgData, coachMealData)
    setHasTrainedBefore((trainedCountRes?.count ?? 0) > 0)
    setSessionDates(sessionDatesRes?.data || [])
    if (diagRes.data) setLatestDiagnostic(diagRes.data)
    const customProg = customProgRes?.data || null
    const planningProgram = customProg || coachToDays(coachProgData)
    await scheduledHook.fetchScheduledSessions(uid, profileData, planningProgram)
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
    const { data: defaultCoachId } = await supabase.rpc('get_default_coach_id', { coach_email: defaultEmail })

    const { data: coachLink } = await supabase.from('coach_clients').select('coach_id').eq('client_id', uid).maybeSingle()
    if (coachLink?.coach_id) {
      setCoachId(coachLink.coach_id)
      setIsDefaultCoach(!!defaultCoachId && coachLink.coach_id === defaultCoachId)
    } else if (defaultCoachId) {
      await supabase.from('coach_clients').upsert({ coach_id: defaultCoachId, client_id: uid }, { onConflict: 'coach_id,client_id', ignoreDuplicates: true }).select().maybeSingle()
      setCoachId(defaultCoachId)
      setIsDefaultCoach(true)
    }
  }

  /* ── Handlers ── */
  async function startProgramWorkout(day: any, exercises: any[], weekdayKey?: string) {
    const ws = { name: day.day_name || day.name || 'Séance', exercises, startedAt: new Date().toISOString(), weekdayKey }
    setWorkoutSession(ws)
    try { localStorage.setItem('moovx_active_workout', JSON.stringify(ws)) } catch {}
  }

  async function onFinishWorkout(data: any): Promise<{ newPRs: { exercise: string; value: number }[]; newBadges: Badge[] }> {
    const newPRs: { exercise: string; value: number }[] = []
    const newBadges: Badge[] = []
    try { localStorage.removeItem('moovx_active_workout') } catch {}
    // Extract unique muscles worked from exercises
    const musclesWorked = [...new Set(data.exercises.map((e: any) => e.muscle).filter(Boolean))] as string[]
    const { data: sess } = await supabase.from('workout_sessions').insert({
      user_id: session.user.id, name: workoutSession?.name, completed: true,
      duration_minutes: Math.round(data.duration / 60000),
      notes: `${data.completedSets}/${data.totalSets} sets · ${Math.round(data.totalVolume)} kg volume`,
      muscles_worked: musclesWorked.length > 0 ? musclesWorked : null,
    }).select().single()
    if (sess) {
      // Marquer la séance planifiée du jour comme complétée (sync calendrier).
      // Update ciblé : si aucune ligne planifiée aujourd'hui (séance libre), 0 ligne touchée — voulu.
      const todayFinish = toDateStr(new Date())
      await supabase
        .from('scheduled_sessions')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .eq('scheduled_date', todayFinish)
        .eq('completed', false)

      // Gamification : +100 XP séance + streak (flux réel de fin de séance)
      try {
        await addXP(session.user.id, 100, supabase)
        await updateStreak(session.user.id, supabase)
      } catch (e) { console.error('[gamification] fin de séance:', e) }

      // PR detection : 1 appel checkForPR par exercice (meilleur set Epley)
      // Le hook n'a pas useTranslations — on collecte les PRs et on les
      // retourne pour que l'appelant (page.tsx) toast avec la bonne locale.
      try {
        for (const exo of data.exercises) {
          const valid = (exo.sets || []).filter((s: any) => Number(s.weight) > 0 && Number(s.reps) > 0)
          if (valid.length === 0) continue
          const best = valid.reduce((a: any, b: any) => {
            const scoreA = Number(a.weight) * (1 + Number(a.reps) / 30)
            const scoreB = Number(b.weight) * (1 + Number(b.reps) / 30)
            return scoreA >= scoreB ? a : b
          })
          const result = await checkForPR(exo.name, Number(best.weight), Number(best.reps))
          if (result.newPR && result.exercise && result.value) {
            newPRs.push({ exercise: result.exercise, value: result.value })
          }
        }
      } catch (e) { console.error('[PR detection] fin de séance:', e) }

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

      // Badge check: after sets insert so stats include this session
      try {
        const { newlyUnlockedIds } = await checkAndUnlockBadges(session.user.id, supabase)
        if (newlyUnlockedIds.length > 0) {
          const { data: badges } = await supabase.from('badges').select('*').in('id', newlyUnlockedIds)
          if (badges?.length) newBadges.push(...badges)
        }
      } catch (e) { console.error('[badges] fin de séance:', e) }

      // ── Sprint 6 - Progressive Overload IA (fire-and-forget) ──
      // Pour chaque exercice où tous les sets ont meme reps + meme weight,
      // declencher une suggestion IA pour la prochaine seance.
      // L'API fait elle-meme la gate canUseAI (refuse les invites).
      for (const exo of data.exercises) {
        if (!exo.sets || exo.sets.length === 0) continue
        // Sprint 6 tech debt fix : ne pas suggerer un overload si le user
        // a oublie un ou plusieurs sets (n'a pas fait tous les sets prevus).
        // WorkoutSession filtre les sets non-done avant l'envoi, donc exo.sets.length
        // = sets reellement faits. setsTarget = sets prevus par le programme.
        if (exo.setsTarget && exo.sets.length < exo.setsTarget) continue

        const reps = Number(exo.sets[0].reps) || 0
        const weight = Number(exo.sets[0].weight) || 0
        if (reps <= 0 || weight <= 0) continue

        const allSameReps = exo.sets.every((s: any) => Number(s.reps) === reps)
        const allSameWeight = exo.sets.every((s: any) => Number(s.weight) === weight)
        if (!allSameReps || !allSameWeight) continue

        // Fire-and-forget : on ne bloque pas la fin de seance
        fetch('/api/suggest-overload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exerciseName: exo.name,
            currentWeight: weight,
            currentReps: reps,
            setsCompleted: exo.sets.length,
            setsTarget: exo.setsTarget || exo.sets.length,
            sessionId: sess.id,
          }),
        }).catch(err => {
          // Silent fail : pas grave si l'IA est down ou refuse (invited)
          console.warn('[overload] fetch error:', err?.message)
        })
      }
    }
    // Mark today's scheduled session as completed
    const todayStr = toDateStr(new Date())
    await supabase.from('scheduled_sessions').update({ completed: true, completed_at: new Date().toISOString() })
      .eq('user_id', session.user.id).eq('scheduled_date', todayStr).eq('completed', false)
    // Update last_workout_at
    await updateProfile(session.user.id, { last_workout_at: new Date().toISOString() }, supabase)

    // Track completed session for invited clients with coach program
    if (clientProgramIdRef.current && workoutSession?.weekdayKey) {
      const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
      const sessionIndex = WEEKDAYS.indexOf(workoutSession.weekdayKey)
      const { error: trackingError } = await supabase
        .from('completed_sessions')
        .insert({
          client_id: session.user.id,
          coach_id: coachOfProgramIdRef.current,
          program_id: clientProgramIdRef.current,
          session_index: sessionIndex >= 0 ? sessionIndex : 0,
          session_name: workoutSession.name,
          duration_minutes: data.duration ? Math.round(data.duration / 60000) : null,
        })
      if (trackingError) console.error('Error tracking completed_sessions:', trackingError)
    }

    toast.success('Séance terminée ! Bien joué 💪')
    fetchAll(true)
    return { newPRs, newBadges }
  }

  async function saveWeight(value: number, date: string) {
    await supabase.from('weight_logs').upsert({ user_id: session.user.id, poids: value, date }, { onConflict: 'user_id,date' })
    await updateProfile(session.user.id, { current_weight: value, ...(profile?.start_weight ? {} : { start_weight: value }) }, supabase)
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
  // Single source: lib/streak.ts (Duolingo grace period)
  const streakDates = sessionDates.map(s => toLocal(new Date(s.created_at)))
  const streakResult = computeStreak(streakDates, toLocal(new Date()))
  const streak = streakResult.current
  const todayKey = JS_DAYS_FR[new Date().getDay()]
  const todayCoachDay = coachProgram ? (coachProgram[todayKey] ?? { repos: false, exercises: [] }) : null
  const todaySessionDone = sessionDates.some(s => toLocal(new Date(s.created_at)) === toLocal(new Date()))
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

    // Bypass priority: subscription_type is the source of truth for
    // lifetime/invited accounts. This protects against subscription_status
    // being temporarily desynced (e.g. Stripe webhook missed an event).
    if (profile.subscription_type === 'lifetime') return true
    if (profile.subscription_type === 'invited') return true

    // Beta : accès gratuit limité dans le temps (campagne). REQUIERT une date de fin.
    if (profile.subscription_type === 'beta') {
      if (!profile.subscription_end_date) return false
      return new Date(profile.subscription_end_date) > new Date()
    }

    // Fallback: subscription_status (for older profiles or status-driven flows)
    const st = profile.subscription_status
    if (st === 'lifetime' || st === 'invited') return true
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
  const isInvited = profile?.subscription_type === 'invited'
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const now = new Date()
  const isInTrial = !hasPaidSub && !isExempt && !!trialEndsAt && trialEndsAt > now
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const trialExpired = !hasPaidSub && !isExempt && !isInvited && !!trialEndsAt && trialEndsAt <= now
  const isSubActive = hasPaidSub || isExempt || isInvited || isInTrial

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
    const { data: customProg } = await supabase.from('custom_programs')
      .select('*').eq('user_id', userId).eq('is_active', true).maybeSingle()
    const prog = customProg || coachToDays(coachProgram)
    return scheduledHook.regenerateWeekSchedule(userId, profile, prog)
  }

  const updateReminderSettings = (settings: { preferred_training_time?: string; reminder_enabled?: boolean; reminder_minutes_before?: number }) =>
    scheduledHook.updateReminderSettings(supabase, userId, settings, setProfile)

  return {
    // Auth / loading
    mounted, session, loading, roleChecked, userRole, router, supabase,
    // Profile / data
    profile, measurements, progressPhotos, wSessions,
    coachProgram, coachMealPlan, weightHistory30, lastCompletedByIndex, completedThisWeek, nextSession,
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
    calorieGoal, goalWeight, currentWeight, completedSessions, hasTrainedBefore, streak,
    todayKey, todayCoachDay, todaySessionDone, chartMin, chartMax,
    displayAvatar, fullName, firstName,
    // Subscription & trial
    isSubActive, isInTrial, trialDaysLeft, trialExpired, handleSubscribe, aiAllowed: !isInvited,
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
    // Weekly diagnostic
    latestDiagnostic, setLatestDiagnostic,
    // Refs
    mainRef,
  }
}
