export type CoachClientRow = {
  id: string; client_id: string; created_at: string; invited_by_coach?: boolean
  profiles: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; current_weight: number | null; calorie_goal: number | null } | null
}
export type CompletedSessionRow = { client_id: string; session_name: string; completed_at: string }
export type AtRiskClient = { id: string; name: string; daysSince: number; lastSession: Date | null }
