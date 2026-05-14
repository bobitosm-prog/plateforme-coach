/**
 * Types partagés pour la console admin.
 * Utilisés par les API routes et l'UI.
 */

export type UserRole = 'client' | 'coach' | 'admin'

export type SubscriptionType =
  | 'client_monthly'
  | 'lifetime'
  | 'invited'
  | 'trial'
  | null

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'inactive'
  | null

export interface AdminUserRow {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole | string  // string pour tolérer les valeurs DB legacy
  status: string | null

  // Abonnement
  subscription_type: SubscriptionType
  subscription_status: SubscriptionStatus
  subscription_price: number | null
  subscription_end_date: string | null
  trial_ends_at: string | null

  // Stripe
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_account_id: string | null

  // Activité
  created_at: string
  updated_at: string | null
  last_workout_at: string | null
  onboarding_completed: boolean | null

  // Engagement
  streak_current: number | null
  fitness_score: number | null
}

export type BugReportType = 'bug' | 'amelioration' | 'autre'

export type BugReportStatus =
  | 'new'
  | 'in_progress'
  | 'resolved'
  | 'wontfix'
  | null

export type BugReportPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'
  | null

export interface AdminBugReportRow {
  id: string
  user_id: string | null
  user_email: string | null
  user_role: string | null
  type: BugReportType | string
  title: string
  description: string
  screenshot_url: string | null
  page_url: string | null
  status: BugReportStatus | string
  priority: BugReportPriority | string
  admin_notes: string | null
  created_at: string
  updated_at: string | null
}

export interface AdminActionLog {
  action: 'role_change' | 'subscription_change' | 'user_delete' | 'bug_report_update'
  target_user_id: string
  target_email: string
  actor_email: string
  metadata: Record<string, unknown>
}
