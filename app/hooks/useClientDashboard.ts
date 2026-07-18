'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { JS_DAYS_FR } from '../../lib/design-tokens'
import { cache } from '../../lib/cache'
import { computeStreak } from '../../lib/streak'
import { projectRestDates } from '../../lib/project-rest-days'
import { resolveLegacyDashboardAccess } from '../../lib/billing/legacy'
import { getSupabaseBrowserClient } from '../../lib/supabase/browser'
import type { Json, Tables } from '../../lib/supabase/types'
import { createIdentityRepository } from '../../lib/repositories/identity'
import { createProfileRepository } from '../../lib/repositories/profile'
import { createTrainingProgramRepository, createTrainingSessionRepository } from '../../lib/repositories/training'
import type { ProfileLoadStatus } from '../../lib/client-dashboard/profile-load-state'
import { createSessionProfileLoader } from '../../lib/client-dashboard/session-profile-loader'
import { createTrainingDashboardLoader, type TrainingDashboardData } from '../../lib/client-dashboard/training-dashboard-loader'
import {
  createNutritionMeasurementsLoader, createNutritionMeasurementsReaders,
  type BodyMeasurementRow, type ProgressPhotoRow, type WeightHistoryRow,
} from '../../lib/client-dashboard/nutrition-measurements-loader'
import { useClientDashboardData, type DashboardFetchedData } from '../../lib/client-dashboard/use-client-dashboard-data'
import { useClientDashboardActions, type WorkoutSessionDraft } from '../../lib/client-dashboard/use-client-dashboard-actions'
import type { SuggestedSession } from '../../lib/suggestNextSession'
import { readActiveWorkout } from '../../lib/training/workout-session-storage'
import useMessages from './useMessages'
import useAnalytics from './useAnalytics'
import useScheduledSessions from './useScheduledSessions'
import useFoodLog from './useFoodLog'

export type Tab = 'home' | 'training' | 'nutrition' | 'progress' | 'compte' | 'profil' | 'messages' | 'coachIA' | 'feedback' | 'preferences' | 'account_section' | 'goals'

type ProfileRow = Tables<'profiles'>
type WorkoutSessionRow = TrainingDashboardData['workoutSessions'][number]
type CoachProgram = TrainingDashboardData['coachProgram']
type WeeklyDiagnosticRow = Tables<'weekly_diagnostics'>
type LegacyDashboardProfile = Omit<ProfileRow, 'email' | 'rir_tracking_enabled' | 'rir_scale_advanced'> & {
  email?: string
  rir_tracking_enabled?: boolean
  rir_scale_advanced?: boolean
}

function initialWorkoutSession(): WorkoutSessionDraft | null {
  if (typeof window === 'undefined') return null
  return readActiveWorkout<WorkoutSessionDraft>(localStorage)
}

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function useClientDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [measurements, setMeasurements] = useState<BodyMeasurementRow[]>([])
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhotoRow[]>([])
  const [wSessions, setWSessions] = useState<WorkoutSessionRow[]>([])
  const [hasTrainedBefore, setHasTrainedBefore] = useState(false)
  const [sessionDates, setSessionDates] = useState<Array<{ created_at: string }>>([])
  const [coachProgram, setCoachProgram] = useState<CoachProgram>(null)
  const [planningDays, setPlanningDays] = useState<unknown[] | null>(null)
  const [coachMealPlan, setCoachMealPlan] = useState<Json | null>(null)
  const [lastCompletedByIndex, setLastCompletedByIndex] = useState(new Map<number, string>())
  const [completedThisWeek, setCompletedThisWeek] = useState(new Map<number, string>())
  const [nextSession, setNextSession] = useState<SuggestedSession | null>(null)
  const [weightHistory30, setWeightHistory30] = useState<WeightHistoryRow[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [roleChecked, setRoleChecked] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [profileLoadStatus, setProfileLoadStatus] = useState<ProfileLoadStatus>('idle')
  const [workoutSession, setWorkoutSession] = useState<WorkoutSessionDraft | null>(initialWorkoutSession)
  const [modal, setModal] = useState<string | null>(null)
  const [latestDiagnostic, setLatestDiagnostic] = useState<WeeklyDiagnosticRow | null>(null)
  const [bmrForm, setBmrForm] = useState({ weight: '', height: '', age: '', gender: 'male', activity: 'moderate', body_fat: '' })
  const [photoUploading, setPhotoUploading] = useState(false)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [isDefaultCoach, setIsDefaultCoach] = useState(false)

  const photoRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const [supabase] = useState(getSupabaseBrowserClient)
  const [sessionProfileLoader] = useState(() => createSessionProfileLoader({
    identityRepository: createIdentityRepository(supabase),
    profileRepository: createProfileRepository(supabase), cache,
  }))
  const [trainingDashboardLoader] = useState(() => createTrainingDashboardLoader({
    programRepository: createTrainingProgramRepository(supabase),
    sessionRepository: createTrainingSessionRepository(supabase),
  }))
  const [nutritionMeasurementsLoader] = useState(() => createNutritionMeasurementsLoader(
    createNutritionMeasurementsReaders(supabase),
  ))

  const userId = session?.user.id
  const messagesHook = useMessages({ supabase, userId, coachId, activeTab })
  const analyticsHook = useAnalytics({ supabase })
  const scheduledHook = useScheduledSessions({ supabase })

  function applyFetchedData(data: DashboardFetchedData) {
    const nextProfile = data.profileData as ProfileRow
    const weights = data.weightsData as WeightHistoryRow[]
    setProfile(nextProfile)
    const age = nextProfile.birth_date
      ? Math.floor((Date.now() - new Date(nextProfile.birth_date).getTime()) / 31557600000)
      : ''
    setBmrForm(previous => ({
      ...previous,
      weight: (weights[weights.length - 1]?.poids ?? nextProfile.current_weight)?.toString() || '',
      height: nextProfile.height?.toString() || '', age: age.toString(),
      gender: nextProfile.gender || 'male', activity: nextProfile.activity_level || 'moderate',
      body_fat: nextProfile.body_fat_pct?.toString() || '',
    }))
    setWSessions(data.sessData as WorkoutSessionRow[])
    setMeasurements(data.measureData as BodyMeasurementRow[])
    setProgressPhotos(data.photosData as ProgressPhotoRow[])
    setWeightHistory30(weights.map(({ date, poids }) => ({ date, poids })))
    if (data.coachProgData) setCoachProgram(data.coachProgData as CoachProgram)
    if (data.coachMealData) setCoachMealPlan(data.coachMealData as Json)
  }

  const { fetchAll, retryProfileLoad, getProgramAssignment } = useClientDashboardData({
    supabase, session, setSession, setLoading, setMounted, setRoleChecked, setUserRole,
    setProfileLoadStatus, setProfile: () => setProfile(null), setSessionDates, setHasTrainedBefore,
    setPlanningDays, setLastCompletedByIndex, setCompletedThisWeek, setNextSession,
    setLatestDiagnostic, setCoachId, setIsDefaultCoach, applyFetchedData, replace: router.replace,
    sessionProfileLoader, trainingDashboardLoader, nutritionMeasurementsLoader,
    fetchScheduledSessions: scheduledHook.fetchScheduledSessions,
    fetchAnalyticsData: analyticsHook.fetchAnalyticsData,
  })
  const checkForPR = (exerciseName: string, weight: number, reps: number) =>
    userId ? analyticsHook.checkForPR(userId, exerciseName, weight, reps) : Promise.resolve({ newPR: false })
  const actions = useClientDashboardActions({
    supabase, session, profile, coachProgram, workoutSession, setWorkoutSession, setModal,
    setPhotoUploading, setProgressPhotos, setProfile,
    getProgramAssignment,
    fetchAll, checkForPR, regenerateWeekSchedule: scheduledHook.regenerateWeekSchedule,
    updateReminderSettings: scheduledHook.updateReminderSettings,
    updateRirSettings: scheduledHook.updateRirSettings,
  })
  const foodHook = useFoodLog({
    supabase, userId,
    onMutate: () => { setModal(null); void fetchAll(true) },
  })

  const calorieGoal = profile?.calorie_goal || 2500
  const goalWeight = profile?.target_weight ?? null
  const currentWeight = weightHistory30.at(-1)?.poids ?? profile?.current_weight
  const restDates = projectRestDates(planningDays as Parameters<typeof projectRestDates>[0])
  const streakDates = sessionDates.map(item => localDate(new Date(item.created_at)))
  const streak = computeStreak(streakDates, localDate(new Date()), restDates).current
  const todayKey = JS_DAYS_FR[new Date().getDay()]
  const coachDays = coachProgram as Record<string, { repos?: boolean; exercises?: unknown[] } | undefined> | null
  const todayCoachDay = coachDays ? coachDays[todayKey] ?? { repos: false, exercises: [] } : null
  const todaySessionDone = sessionDates.some(item => localDate(new Date(item.created_at)) === localDate(new Date()))
  const chartMin = weightHistory30.length ? Math.min(...weightHistory30.map(item => item.poids)) - 1 : 0
  const chartMax = weightHistory30.length ? Math.max(...weightHistory30.map(item => item.poids)) + 1 : 1
  const displayAvatar = session ? profile?.avatar_url || session.user.user_metadata?.avatar_url : undefined
  const fullName = session ? profile?.full_name || session.user.user_metadata?.full_name || 'Athlete' : 'Athlete'
  const now = new Date()
  const hasPaidSub = !!profile && resolveLegacyDashboardAccess(profile, now).allowed
  const ownerEmail = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bobitosm@gmail.com'
  const isExempt = !!profile && (profile.email === ownerEmail || profile.email === adminEmail)
  const isInvited = profile?.subscription_type === 'invited'
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const subEndsAt = profile?.subscription_end_date ? new Date(profile.subscription_end_date) : null
  const isInTrial = !hasPaidSub && !isExempt && !!trialEndsAt && trialEndsAt > now

  return {
    mounted, session: session as Session, loading, roleChecked, userRole, router, supabase, profileLoadStatus, retryProfileLoad,
    profile: profile as LegacyDashboardProfile | null, measurements, progressPhotos, wSessions, coachProgram, coachMealPlan, weightHistory30,
    lastCompletedByIndex, completedThisWeek, nextSession, activeTab, setActiveTab, workoutSession,
    setWorkoutSession, modal, setModal, bmrForm, photoUploading, photoRef, avatarRef, coachId,
    isDefaultCoach, hasRealCoach: !isDefaultCoach && !!coachId, mainRef, latestDiagnostic, setLatestDiagnostic,
    ...foodHook, ...actions,
    messages: messagesHook.messages, msgInput: messagesHook.msgInput, setMsgInput: messagesHook.setMsgInput,
    unreadCount: messagesHook.unreadCount, msgEndRef: messagesHook.msgEndRef, sendMessage: messagesHook.sendMessage,
    calorieGoal, goalWeight, currentWeight: currentWeight ?? undefined,
    completedSessions: sessionDates.length, hasTrainedBefore,
    streak, sessionDates, todayKey, todayCoachDay, todaySessionDone, chartMin, chartMax, displayAvatar,
    fullName, firstName: fullName.split(' ')[0],
    isSubActive: hasPaidSub || isExempt || isInvited || isInTrial, isInTrial,
    trialDaysLeft: trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)) : 0,
    trialExpired: !hasPaidSub && !isExempt && !isInvited && !!trialEndsAt && trialEndsAt <= now,
    isInBeta: profile?.subscription_type === 'beta' && !!subEndsAt && subEndsAt > now,
    betaDaysLeft: subEndsAt ? Math.max(0, Math.ceil((subEndsAt.getTime() - now.getTime()) / 86400000)) : 0,
    betaExpired: profile?.subscription_type === 'beta' && !!subEndsAt && subEndsAt <= now,
    aiAllowed: !isInvited, fetchAll,
    scheduledSessions: scheduledHook.scheduledSessions, calendarSelectedDate: scheduledHook.calendarSelectedDate,
    setCalendarSelectedDate: scheduledHook.setCalendarSelectedDate,
    markSessionCompleted: scheduledHook.markSessionCompleted,
    personalRecords: analyticsHook.personalRecords, weeklyCalories: analyticsHook.weeklyCalories,
    weeklyWater: analyticsHook.weeklyWater, weeklyVolume: analyticsHook.weeklyVolume,
    weightHistoryFull: analyticsHook.weightHistoryFull, checkForPR,
  }
}
