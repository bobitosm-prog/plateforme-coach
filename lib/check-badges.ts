// Gamification: badge checking, XP, levels

export interface Badge {
  id: string
  name: string
  description: string
  category: string
  xp_reward: number
  icon: string
  condition_type: string
  condition_value: number
  sort_order: number
}

export interface LevelInfo {
  level: number
  name: string
  minXp: number
  maxXp: number
}

const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Débutant', minXp: 0, maxXp: 100 },
  { level: 2, name: 'Initié', minXp: 100, maxXp: 250 },
  { level: 3, name: 'Confirmé', minXp: 250, maxXp: 500 },
  { level: 4, name: 'Avancé', minXp: 500, maxXp: 1000 },
  { level: 5, name: 'Expert', minXp: 1000, maxXp: 2000 },
  { level: 6, name: 'Master', minXp: 2000, maxXp: 4000 },
  { level: 7, name: 'Légende', minXp: 4000, maxXp: 99999 },
]

export function getLevelInfo(totalXp: number): LevelInfo {
  return LEVELS.find(l => totalXp >= l.minXp && totalXp < l.maxXp) || LEVELS[0]
}

export function getProgress(conditionValue: number, currentValue: number): number {
  return Math.min(100, Math.round((currentValue / conditionValue) * 100))
}

async function getConditionValue(userId: string, conditionType: string, supabase: any): Promise<number> {
  switch (conditionType) {
    case 'workout_count': {
      const { count } = await supabase.from('workout_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true)
      return count || 0
    }
    case 'streak_days': {
      // Calculate current streak from workout_sessions
      const { data } = await supabase.from('workout_sessions').select('created_at').eq('user_id', userId).eq('completed', true).order('created_at', { ascending: false }).limit(400)
      if (!data?.length) return 0
      const dates = [...new Set<string>(data.map((s: any) => s.created_at?.split('T')[0]))].sort().reverse()
      let streak = 1
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i - 1] as string).getTime() - new Date(dates[i] as string).getTime()) / 86400000
        if (diff <= 1.5) streak++
        else break
      }
      return streak
    }
    case 'total_volume': {
      const { data } = await supabase.from('workout_sets').select('weight, reps').eq('user_id', userId)
      return (data || []).reduce((s: number, r: any) => s + (r.weight || 0) * (r.reps || 0), 0)
    }
    case 'pr_count': {
      const { data } = await supabase.from('workout_sessions').select('personal_records').eq('user_id', userId).not('personal_records', 'is', null)
      return (data || []).reduce((s: number, r: any) => s + (Array.isArray(r.personal_records) ? r.personal_records.length : 0), 0)
    }
    case 'meal_count': {
      const { count } = await supabase.from('daily_food_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      return count || 0
    }
    case 'weight_log_count': {
      const { count } = await supabase.from('weight_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      return count || 0
    }
    case 'photo_count': {
      const { count } = await supabase.from('progress_photos').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      return count || 0
    }
    case 'nutrition_streak': {
      const { data } = await supabase.from('daily_food_logs').select('date').eq('user_id', userId).order('date', { ascending: false }).limit(100)
      if (!data?.length) return 0
      const dates = [...new Set<string>(data.map((d: any) => d.date))].sort().reverse()
      let streak = 1
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i - 1] as string).getTime() - new Date(dates[i] as string).getTime()) / 86400000
        if (diff <= 1.5) streak++
        else break
      }
      return streak
    }
    case 'scan_count': {
      const { count } = await supabase.from('daily_food_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).not('food_id', 'is', null)
      return count || 0
    }
    case 'macros_on_target': {
      // Simplified: count days where calories are within 10% of goal
      const { data: prof } = await supabase.from('profiles').select('calorie_goal').eq('id', userId).single()
      if (!prof?.calorie_goal) return 0
      const goal = prof.calorie_goal
      const { data: logs } = await supabase.from('daily_food_logs').select('date, calories').eq('user_id', userId).order('date', { ascending: false }).limit(200)
      if (!logs?.length) return 0
      const byDate: Record<string, number> = {}
      logs.forEach((l: any) => { byDate[l.date] = (byDate[l.date] || 0) + (l.calories || 0) })
      return Object.values(byDate).filter(cal => Math.abs(cal - goal) / goal <= 0.1).length
    }
    case 'subscription_type': {
      const { data } = await supabase.from('profiles').select('subscription_status').eq('id', userId).single()
      return data?.subscription_status === 'lifetime' ? 1 : 0
    }
    case 'share_count':
    case 'referral_count':
      return 0 // Future implementation
    default:
      return 0
  }
}

export async function checkAndUnlockBadges(userId: string, supabase: any): Promise<{ newlyUnlockedIds: string[]; currentValues: Record<string, number> }> {
  // 1. Get all badges
  const { data: allBadges } = await supabase.from('badges').select('*').order('sort_order')
  if (!allBadges?.length) return { newlyUnlockedIds: [], currentValues: {} }

  // 2. Get already unlocked badge IDs
  const { data: unlocked } = await supabase.from('user_badges').select('badge_id, badge_type').eq('user_id', userId)
  const unlockedIds = new Set<string>((unlocked || []).map((u: any) => u.badge_id || u.badge_type))

  // 3. Check conditions and unlock new badges
  const newlyUnlockedIds: string[] = []
  const currentValues: Record<string, number> = {}

  const conditionTypes = [...new Set<string>(allBadges.map((b: Badge) => b.condition_type))]
  for (const ct of conditionTypes) {
    currentValues[ct] = await getConditionValue(userId, ct as string, supabase)
  }

  for (const badge of allBadges as Badge[]) {
    if (unlockedIds.has(badge.id)) continue
    const current = currentValues[badge.condition_type] || 0
    if (current >= badge.condition_value) {
      // Use upsert to avoid duplicates — ignoreDuplicates silently skips conflicts
      const { error } = await supabase.from('user_badges').upsert(
        { user_id: userId, badge_id: badge.id, celebrated: false },
        { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
      )
      if (!error) newlyUnlockedIds.push(badge.id)
    }
  }

  // 4. Update XP only for truly new unlocks
  if (newlyUnlockedIds.length > 0) {
    const xpGained = (allBadges as Badge[]).filter(b => newlyUnlockedIds.includes(b.id)).reduce((s, b) => s + b.xp_reward, 0)
    const { data: xpRow } = await supabase.from('user_xp').select('*').eq('user_id', userId).maybeSingle()
    const newTotal = (xpRow?.total_xp || 0) + xpGained
    const levelInfo = getLevelInfo(newTotal)
    await supabase.from('user_xp').upsert(
      { user_id: userId, total_xp: newTotal, level: levelInfo.level, level_name: levelInfo.name },
      { onConflict: 'user_id' }
    )
  } else {
    // Ensure user_xp row exists even with 0 XP
    await supabase.from('user_xp').upsert(
      { user_id: userId, total_xp: 0, level: 1, level_name: 'Débutant' },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
  }

  return { newlyUnlockedIds, currentValues }
}
