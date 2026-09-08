import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260822125000_harden_payments_and_application_grants.sql',
  'utf8',
)
const integration = readFileSync(
  'tests/integration/payments-grants-rls-migration.sql',
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

  it('retires every proven duplicate client payment policy', () => {
    for (const policy of [
      'payments_client_read',
      'Clients can view their payments',
      'client see own payments',
    ]) {
      expect(migration).toContain(
        `DROP POLICY IF EXISTS "${policy}" ON public.payments`,
      )
    }
    expect(migration.match(/CREATE POLICY "payments_client_select_own"/g)).toHaveLength(1)
  })

  it('removes legacy and all coach payment write policies', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "payments_coach_all"')
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "coach see own payments"',
    )
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Coaches can view their payments"',
    )
    expect(migration).not.toContain('CREATE POLICY "payments_coach_all"')
    expect(migration).not.toMatch(
      /CREATE POLICY "[^"]*payments[^"]*coach[^"]*"[\s\S]*FOR (?:ALL|INSERT|UPDATE|DELETE)/,
    )
    expect(migration).toContain('PAYMENTS_LEGACY_POLICY_REMAINS')
    expect(migration).toContain('PAYMENTS_BROWSER_WRITE_POLICY_REMAINS')
  })

  it('requires the exact two-policy set through PostgreSQL catalogs', () => {
    expect(migration).toContain('FROM pg_catalog.pg_policy AS policy')
    expect(migration).toContain('JOIN pg_catalog.pg_class AS relation')
    expect(migration).toContain('JOIN pg_catalog.pg_namespace AS namespace')
    expect(migration).toContain('PAYMENTS_POLICY_SET_INVALID')
    expect(migration).toContain('PAYMENTS_POLICY_NAMES_INVALID')
    expect(migration).toContain('PAYMENTS_POLICY_SHAPE_INVALID')
    expect(migration).toContain('PAYMENTS_CLIENT_SELECT_POLICY_INVALID')
    expect(migration).toContain('PAYMENTS_COACH_SELECT_POLICY_INVALID')
    expect(migration).toMatch(
      /array_agg\(policy\.polname::text ORDER BY policy\.polname\)[\s\S]*payments_client_select_own[\s\S]*payments_coach_select_active_clients/,
    )
  })

  it('removes payment mutations from browser roles without touching service_role', () => {
    expect(migration).toContain(
      'REVOKE INSERT, UPDATE, DELETE ON TABLE public.payments FROM anon, authenticated',
    )
    expect(migration).toContain('PAYMENTS_SERVICE_ROLE_WRITER_GRANT_MISSING')
    expect(migration).not.toMatch(/REVOKE[^;]*FROM service_role/)
    expect(migration).toContain('FROM information_schema.role_table_grants')
    expect(migration).toContain(
      'PAYMENTS_BROWSER_WRITE_GRANT_CATALOG_REMAINS',
    )
  })

  it('keeps Stripe webhook event access server-only', () => {
    expect(migration).toContain("'stripe_webhook_events'")
    expect(migration).toMatch(
      /REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE\s+public\.stripe_webhook_events\s+FROM anon, authenticated/,
    )
    expect(migration).toContain('STRIPE_WEBHOOK_BROWSER_GRANT_REMAINS')
    expect(migration).toContain('STRIPE_WEBHOOK_SERVICE_ROLE_GRANT_MISSING')
    expect(migration).not.toMatch(
      /REVOKE[^;]*public\.stripe_webhook_events[^;]*FROM service_role/,
    )
  })

  it('removes administrative grants on the bounded table allowlist', () => {
    expect(migration).toContain(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE',
    )
    expect(migration).not.toMatch(/\bMAINTAIN\b/)
    expect(migration).toContain('FROM anon, authenticated')
    for (const table of targetTables) {
      expect(migration).toContain(`public.${table}`)
    }
    expect(migration).toContain('APPLICATION_ADMIN_GRANT_REMAINS')
  })

  it('removes anonymous business DML while preserving SELECT grants', () => {
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE ON TABLE')
    expect(migration).toContain('ANON_APPLICATION_DML_GRANT_REMAINS')
    const anonSelectRevokes =
      migration.match(/REVOKE SELECT[^;]*FROM anon(?:, authenticated)?;/g) ?? []
    expect(anonSelectRevokes).toHaveLength(1)
    expect(anonSelectRevokes[0]).toContain('public.stripe_webhook_events')
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
    expect(migration).toContain('PUBLIC_SECURITY_DEFINER_EXECUTE_REMAINS')
    expect(migration).toContain(
      'FROM information_schema.routine_privileges',
    )
    expect(migration).toContain(
      'BROWSER_SECURITY_DEFINER_EXECUTE_CATALOG_REMAINS',
    )
    expect(migration).toContain('pg_catalog.aclexplode')
  })

  it('rejects browser privileges on any payment-owned sequence', () => {
    expect(migration).toContain('PAYMENTS_BROWSER_SEQUENCE_GRANT_REMAINS')
    expect(migration).toContain("dependency.deptype IN ('a', 'i')")
    expect(migration).toContain(
      "'public.stripe_webhook_events'::regclass",
    )
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

  it('covers the complete payment and webhook access matrix transactionally', () => {
    for (const assertion of [
      'ANON_PAYMENT_SELECT_ALLOWED',
      'ANON_PAYMENT_INSERT_ALLOWED',
      'ANON_WEBHOOK_SELECT_ALLOWED',
      'OWNER_PAYMENT_SELECT_DENIED',
      'AUTH_PAYMENT_INSERT_ALLOWED',
      'AUTH_PAYMENT_UPDATE_ALLOWED',
      'AUTH_PAYMENT_DELETE_ALLOWED',
      'AUTH_WEBHOOK_SELECT_ALLOWED',
      'UNRELATED_PAYMENT_SELECT_ALLOWED',
      'ACTIVE_COACH_PAYMENT_SELECT_DENIED',
      'SERVICE_PAYMENT_SELECT_DENIED',
      'SERVICE_WEBHOOK_SELECT_DENIED',
    ]) {
      expect(integration).toContain(assertion)
    }
    expect(integration.trimStart()).toMatch(/^\\set ON_ERROR_STOP on\s+BEGIN;/)
    expect(integration.trimEnd()).toMatch(/ROLLBACK;$/)
    expect(integration).not.toMatch(/https?:\/\/|stripe\.com/i)
  })
})
