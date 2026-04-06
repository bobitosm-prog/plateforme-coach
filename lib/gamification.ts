// ─── Gamification System ───

export function getLevelFromXP(xp: number): { level: number; xpForNext: number; xpInLevel: number; progress: number } {
  let level = 1
  let xpNeeded = 100
  let totalXpForLevel = 0
  while (xp >= totalXpForLevel + xpNeeded) {
    totalXpForLevel += xpNeeded
    level++
    xpNeeded = Math.floor(xpNeeded * 1.3)
  }
  const xpInLevel = xp - totalXpForLevel
  return { level, xpForNext: xpNeeded, xpInLevel, progress: xpInLevel / xpNeeded }
}

export function getLevelTitle(level: number): string {
  const t: Record<number, string> = { 1: 'DEBUTANT', 2: 'INITIE', 3: 'SPORTIF', 4: 'ATHLETE', 5: 'GUERRIER', 6: 'CHAMPION', 7: 'ELITE', 8: 'MAITRE', 9: 'LEGENDE', 10: 'TITAN' }
  return t[Math.min(level, 10)] || 'TITAN'
}

export async function addXP(userId: string, amount: number, supabase: any) {
  const { data: current } = await supabase.from('user_xp').select('total_xp').eq('user_id', userId).maybeSingle()
  const newXP = (current?.total_xp || 0) + amount
  const { level } = getLevelFromXP(newXP)
  await supabase.from('user_xp').upsert({ user_id: userId, total_xp: newXP, level, updated_at: new Date().toISOString() })
  return { newXP, level }
}

export async function updateStreak(userId: string, supabase: any) {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase.from('user_xp').select('current_streak, longest_streak, last_activity_date').eq('user_id', userId).maybeSingle()
  let streak = data?.current_streak || 0
  let longest = data?.longest_streak || 0
  const lastDate = data?.last_activity_date
  if (lastDate === today) return streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  streak = lastDate === yesterday ? streak + 1 : 1
  longest = Math.max(longest, streak)
  await supabase.from('user_xp').upsert({ user_id: userId, current_streak: streak, longest_streak: longest, last_activity_date: today, updated_at: new Date().toISOString() })
  return streak
}

export async function checkAchievements(userId: string, stats: Record<string, number>, supabase: any): Promise<{ key: string; name: string; icon: string; xp_reward: number }[]> {
  const [{ data: all }, { data: unlocked }] = await Promise.all([
    supabase.from('achievements').select('*'),
    supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
  ])
  const unlockedIds = new Set((unlocked || []).map((u: any) => u.achievement_id))
  const newlyUnlocked: any[] = []
  for (const a of (all || [])) {
    if (unlockedIds.has(a.id)) continue
    if ((stats[a.condition_type] || 0) >= a.condition_value) {
      await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: a.id })
      await addXP(userId, a.xp_reward, supabase)
      newlyUnlocked.push({ key: a.key, name: a.name, icon: a.icon, xp_reward: a.xp_reward })
    }
  }
  return newlyUnlocked
}
