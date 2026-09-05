import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260822125000_harden_payments_and_application_grants.sql',
  'utf8',
)

const targetTables = [
  'coach_clients',
  'profiles',
  'workout_sessions',
  'workout_sets',
  'custom_programs',
  'training_programs',
  'client_programs',
  'completed_sessions',
  'personal_records',
  'exercise_feedback',
  'scheduled_sessions',
  'daily_food_logs',
  'meal_logs',
  'meal_tracking',
  'meal_plans',
  'client_meal_plans',
  'weight_logs',
  'body_measurements',
  'progress_photos',
  'daily_checkins',
  'messages',
  'coach_notes',
  'coach_appointments',
  'activity_feed',
  'payments',
] as const

describe('payments and application grants migration', () => {
  it('fails fast on every target table and required helper or RPC', () => {
    for (const table of targetTables) expect(migration).toContain(`'${table}'`)
    expect(migration).toContain(
      "'public.is_active_coach_client_relation(uuid,uuid)'",
    )
    expect(migration).toContain("'public.is_active_messaging_pair(uuid,uuid)'")
    for (const fn of [
      'get_workout_session_summary(uuid,uuid)',
      'delete_user_account(uuid)',
      'set_role(text)',
    ]) {
      expect(migration).toContain(`'public.${fn}'`)
    }
  })

  it('versions owner and active row-coach payment reads only', () => {
    expect(migration).toMatch(
      /CREATE POLICY "payments_client_select_own"[\s\S]*FOR SELECT[\s\S]*TO authenticated[\s\S]*payments\.client_id = auth\.uid\(\)/,
    )
    expect(migration).toMatch(
      /CREATE POLICY "payments_coach_select_active_clients"[\s\S]*FOR SELECT[\s\S]*TO authenticated[\s\S]*payments\.coach_id = auth\.uid\(\)[\s\S]*is_active_coach_client_relation\([\s\S]*auth\.uid\(\)[\s\S]*payments\.client_id/,
    )
  })

  it('removes legacy and all coach payment write policies', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "payments_coach_all"')
    expect(migration).not.toContain('CREATE POLICY "payments_coach_all"')
    expect(migration).not.toMatch(
      /CREATE POLICY "[^"]*payments[^"]*coach[^"]*"[\s\S]*FOR (?:ALL|INSERT|UPDATE|DELETE)/,
    )
    expect(migration).toContain('PAYMENTS_COACH_WRITE_POLICY_REMAINS')
  })

  it('removes payment mutations from browser roles without touching service_role', () => {
    expect(migration).toContain(
      'REVOKE INSERT, UPDATE, DELETE ON TABLE public.payments FROM anon, authenticated',
    )
    expect(migration).toContain('PAYMENTS_SERVICE_ROLE_WRITER_GRANT_MISSING')
    expect(migration).not.toMatch(/REVOKE[^;]*FROM service_role/)
  })

  it('removes administrative grants on the bounded table allowlist', () => {
    expect(migration).toContain(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE',
    )
    expect(migration).toContain('FROM anon, authenticated')
    for (const table of targetTables) {
      expect(migration).toContain(`public.${table}`)
    }
    expect(migration).toContain('APPLICATION_ADMIN_GRANT_REMAINS')
  })

  it('removes anonymous business DML while preserving SELECT grants', () => {
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE ON TABLE')
    expect(migration).toContain('ANON_APPLICATION_DML_GRANT_REMAINS')
    expect(migration).not.toMatch(/REVOKE SELECT[^;]*FROM anon/)
  })

  it('preserves the messages read-only column grant', () => {
    expect(migration).toContain(
      "has_column_privilege(\n    'authenticated',\n    'public.messages',\n    'read',\n    'UPDATE'",
    )
    expect(migration).toContain('MESSAGES_TABLE_UPDATE_GRANT_REINTRODUCED')
    expect(migration).not.toMatch(/GRANT UPDATE ON (?:TABLE )?public\.messages/)
    expect(migration).not.toMatch(/REVOKE UPDATE \(read\)/)
  })

  it('removes anonymous execution of the three audited security definer RPCs', () => {
    for (const signature of [
      'public.get_workout_session_summary(uuid, uuid)',
      'public.delete_user_account(uuid)',
      'public.set_role(text)',
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION ${signature}`)
    }
    expect(migration).toContain('FROM PUBLIC, anon')
    expect(migration).toContain('TO authenticated, service_role')
    expect(migration).toContain('ANON_SECURITY_DEFINER_EXECUTE_REMAINS')
  })

  it('preserves active relation helper contracts without changing their logic', () => {
    expect(migration).not.toMatch(
      /CREATE OR REPLACE FUNCTION public\.(?:is_active_coach_client_relation|is_active_messaging_pair)/,
    )
    expect(migration).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.(?:is_active_coach_client_relation|is_active_messaging_pair)/,
    )
  })

  it('is transactional and touches no RLS domain outside payments', () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).not.toMatch(
      /(?:CREATE|DROP) POLICY[\s\S]*ON public\.(?:profiles|progress_photos|body_measurements|weight_logs|daily_checkins|personal_records|daily_food_logs|meal_logs|meal_tracking|meal_plans|client_meal_plans|workout_sessions|workout_sets|custom_programs|training_programs|client_programs|completed_sessions|exercise_feedback|scheduled_sessions|messages|coach_notes|coach_appointments|activity_feed)/,
    )
  })
})
