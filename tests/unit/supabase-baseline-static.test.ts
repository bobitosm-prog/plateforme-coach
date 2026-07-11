import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = resolve(process.cwd(), 'supabase/migrations')
const baselineName = '20260317000000_initial_schema_baseline.sql'
const baseline = readFileSync(resolve(migrationsDir, baselineName), 'utf8')
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
    for (const column of ['role', 'subscription_status', 'stripe_customer_id', 'created_at']) {
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
})
