import type { Locale } from 'date-fns'
import type React from 'react'
import type { AnalyticsPersonalRecord, AnalyticsWorkoutSession } from '../../../../lib/progression'

export interface ProgressWeight { readonly date: string; readonly poids: number }
export interface ProgressMeasurement { readonly date?: string | null; readonly waist?: number | null; readonly hips?: number | null; readonly chest?: number | null; readonly left_arm?: number | null; readonly right_arm?: number | null; readonly left_thigh?: number | null; readonly right_thigh?: number | null; readonly body_fat?: number | null; readonly [key: string]: string | number | null | undefined }
export interface ProgressPhoto { readonly id: string; readonly date?: string | null; readonly photo_url: string; readonly ai_analysis?: string | null }
export interface ProgressCheckin { readonly date: string; readonly mood?: string | null; readonly sleep_hours?: number | null; readonly note?: string | null }
export interface ProgressBodyAnalysis { readonly created_at?: string | null; readonly body_fat_estimate?: number | null; readonly lean_mass_estimate?: number | null; readonly strengths?: readonly string[] | null; readonly improvements?: readonly string[] | null; readonly symmetry_score?: number | null; readonly summary?: string | null; readonly photos_used?: number | null }
export interface ProgressProfile { readonly objective?: string | null; readonly current_weight?: number | null; readonly target_weight?: number | null; readonly gender?: string | null; readonly height?: number | null; readonly full_name?: string | null; readonly fitness_score?: number | null; readonly fitness_level?: string | null; readonly calorie_goal?: number | null; readonly tdee?: number | null; readonly protein_goal?: number | null; readonly carbs_goal?: number | null; readonly fat_goal?: number | null; readonly activity_level?: string | null }
export type ProgressTranslate = (key: string, values?: Record<string, string | number | Date>) => string

export interface ProgressTabPublicProps {
  readonly supabase: import('@supabase/supabase-js').SupabaseClient
  readonly session: { readonly user?: { readonly id?: string } } | null
  readonly weightHistory30: ProgressWeight[]
  readonly measurements: ProgressMeasurement[]
  readonly progressPhotos: ProgressPhoto[]
  readonly photoRef: React.RefObject<HTMLInputElement | null>
  readonly photoUploading: boolean
  readonly uploadProgressPhoto: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  readonly deletePhoto: (photo: never) => Promise<void>
  readonly setModal: (modal: string) => void
  readonly chartMin: number
  readonly chartMax: number
  readonly onRefresh: () => void
  readonly profile: ProgressProfile | null
  readonly coachId: string | null
  readonly personalRecords: AnalyticsPersonalRecord[]
  readonly weeklyCalories: { date: string; calories: number; protein: number; carbs: number; fat: number }[]
  readonly weeklyWater: { date: string; ml: number }[]
  readonly weeklyVolume: { week: string; volume: number }[]
  readonly weightHistoryFull: ProgressWeight[]
  readonly wSessions: AnalyticsWorkoutSession[]
  readonly calorieGoal: number
  readonly goalWeight: number | null
  readonly waterGoal: number
  readonly streak: number
  readonly currentWeight: number | undefined
}

export interface ProgressPresentationContext { readonly t: ProgressTranslate; readonly dateLocale: Locale }
