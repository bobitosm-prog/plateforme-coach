import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = resolve(process.cwd(), 'supabase/migrations')
const baselineName = '20260317000000_initial_schema_baseline.sql'
const baseline = readFileSync(resolve(migrationsDir, baselineName), 'utf8')
const exerciseSeed = readFileSync(
  resolve(migrationsDir, '20260317010000_seed_exercises_catalog.sql'),
  'utf8',
)
const brokenMigration = readFileSync(
  resolve(migrationsDir, '20260521212741_fix_coach_clients_policy_with_security_definer.sql'),
  'utf8',
)

describe('Supabase initial schema baseline', () => {
  it('sorts before the first incremental migration', () => {
    expect(baselineName.localeCompare('20260318_messages.sql')).toBeLessThan(0)
  })

  it('defines every relation assumed before the master schema migration', () => {
    for (const relation of [
      'profiles',
      'coach_clients',
      'progress_photos',
      'meal_tracking',
      'custom_foods',
      'exercises_db',
      'beta_campaigns',
      'commissions',
      'workout_sessions',
      'scheduled_sessions',
      'client_programs',
      'badges',
      'user_badges',
      'daily_checkins',
      'meal_logs',
    ]) {
      expect(baseline).toContain(`CREATE TABLE IF NOT EXISTS public.${relation}`)
    }
  })

  it('is additive and contains no data mutation or destructive DDL', () => {
    expect(baseline).not.toMatch(/^\s*(?:DROP|DELETE|UPDATE|TRUNCATE)\b/im)
    expect(baseline).not.toMatch(/^\s*INSERT\s+INTO\b/im)
  })

  it('keeps profiles linked to auth.users with its required early columns', () => {
    expect(baseline).toMatch(/id uuid PRIMARY KEY REFERENCES auth\.users\(id\) ON DELETE CASCADE/)
    for (const column of [
      'role',
      'coach_speciality',
      'coach_experience_years',
      'subscription_status',
      'stripe_customer_id',
      'created_at',
    ]) {
      expect(baseline).toMatch(new RegExp(`\\b${column}\\b`))
    }
  })

  it('carries the compatible union of both historical scheduled session models', () => {
    for (const column of [
      'user_id',
      'coach_id',
      'client_id',
      'scheduled_at',
      'scheduled_date',
      'duration_minutes',
      'duration_min',
    ]) {
      expect(baseline).toMatch(new RegExp(`\\b${column}\\b`))
    }
  })

  it('uses a valid dollar-quoted body in the historical coach-role helper', () => {
    expect(brokenMigration).toContain('AS $$')
    expect(brokenMigration).toContain('$$;')
    expect(brokenMigration).not.toMatch(/AS \$\n/)
  })

  it('versions the 178-row historical exercise catalog without overwriting an existing catalog', () => {
    const seededIds = exerciseSeed.match(/'[0-9a-f-]{36}'::uuid/g) ?? []

    expect(seededIds).toHaveLength(178)
    expect(new Set(seededIds).size).toBe(178)
    expect(exerciseSeed).toContain('WHERE NOT EXISTS (SELECT 1 FROM public.exercises_db)')
    expect(exerciseSeed).toContain("'97a7f20b-22d5-4cca-b26f-8b97bdde0292'::uuid")
    expect(exerciseSeed).toContain("'f4301131-4961-4410-b88f-c5d371dd9a87'::uuid")
  })

  it('versions the dashboard-created beta campaign contract before its first policy', () => {
    for (const column of ['name', 'free_days', 'max_slots', 'used_slots', 'is_active']) {
      expect(baseline).toMatch(new RegExp(`\\b${column}\\b`))
    }
    expect(baseline).toContain('CHECK (used_slots <= max_slots)')
    expect(baseline).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_beta_one_active')
    expect(baseline).toContain('ALTER TABLE public.beta_campaigns ENABLE ROW LEVEL SECURITY')
  })

  it('versions the canonical commissions contract without financial seed data', () => {
    expect(baseline).toMatch(/CREATE TABLE IF NOT EXISTS public\.commissions \([\s\S]*amount numeric NOT NULL/)
    expect(baseline).toContain('coach_id uuid REFERENCES public.profiles(id)')
  })
})
