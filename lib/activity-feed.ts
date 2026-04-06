export async function postActivity(userId: string, coachId: string | null, type: string, title: string, description?: string, metadata?: Record<string, any>, supabase?: any) {
  if (!supabase) return
  await supabase.from('activity_feed').insert({ user_id: userId, coach_id: coachId, activity_type: type, title, description, metadata: metadata || {}, is_public: true }).catch(() => {})
}
