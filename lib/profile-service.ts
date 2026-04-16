/**
 * Profile Service — single source of truth for profile data.
 * Replaces scattered supabase.from('profiles') calls with cached access.
 */

export type Profile = {
  id: string
  email?: string
  full_name?: string | null
  role?: string | null
  current_weight?: number | null
  start_weight?: number | null
  target_weight?: number | null
  height?: number | null
  birth_date?: string | null
  gender?: string | null
  objective?: string | null
  activity_level?: string | null
  body_fat_pct?: number | null
  calorie_goal?: number | null
  protein_goal?: number | null
  carbs_goal?: number | null
  fat_goal?: number | null
  tdee?: number | null
  avatar_url?: string | null
  subscription_type?: string | null
  subscription_status?: string | null
  subscription_end_date?: string | null
  coach_id?: string | null
  stripe_account_id?: string | null
  stripe_customer_id?: string | null
  last_workout_at?: string | null
  dietary_type?: string | null
  allergies?: any
  liked_foods?: any
  meal_preferences?: any
  onboarding_completed?: boolean
  coach_onboarding_complete?: boolean
  onboarding_answers?: any
  phone?: string | null
  status?: string | null
  created_at?: string
  [key: string]: any // Allow additional fields
}

let cachedProfile: Profile | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60_000 // 1 minute

export async function getProfile(userId: string, supabase: any, force = false): Promise<Profile | null> {
  if (!force && cachedProfile?.id === userId && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedProfile
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) return cachedProfile // Return stale cache on error
  cachedProfile = data
  cacheTimestamp = Date.now()
  return data
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>,
  supabase: any
): Promise<{ data: Profile | null; error: any }> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (!error && data) {
    cachedProfile = data
    cacheTimestamp = Date.now()
  }

  return { data, error }
}

export function invalidateProfileCache() {
  cachedProfile = null
  cacheTimestamp = 0
}

export function getCachedProfile(): Profile | null {
  if (cachedProfile && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedProfile
  }
  return null
}
