import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrationPath = 'supabase/migrations/20260903210000_harden_authoritative_coach_relation_rls.sql'
const migration = readFileSync(migrationPath, 'utf8')

const domainMigrations = {
  profiles: readFileSync('supabase/migrations/20260822120000_harden_active_coach_profile_rls.sql', 'utf8'),
  progression: readFileSync('supabase/migrations/20260822121000_harden_progression_active_coach_rls.sql', 'utf8'),
  nutrition: readFileSync('supabase/migrations/20260822122000_harden_nutrition_active_coach_rls.sql', 'utf8'),
  training: readFileSync('supabase/migrations/20260822123000_harden_training_active_coach_rls.sql', 'utf8'),
  communication: readFileSync('supabase/migrations/20260822124000_harden_communication_active_coach_rls.sql', 'utf8'),
  payments: readFileSync('supabase/migrations/20260822125000_harden_payments_and_application_grants.sql', 'utf8'),
}

describe('authoritative coach relation RLS hardening', () => {
  it('runs after the relation provenance schema migration', () => {
    expect(migrationPath.localeCompare(
      'supabase/migrations/20260821211322_prepare_coach_clients_relation_lifecycle.sql',
    )).toBeGreaterThan(0)
    expect(migration).toContain("column_name = 'source'")
    expect(migration).toContain("is_nullable = 'NO'")
  })

  it('allows only active invitation and admin relations', () => {
    const helper = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION public.is_active_coach_client_relation'),
      migration.indexOf('REVOKE ALL ON FUNCTION public.is_active_coach_client_relation'),
    )

    expect(helper).toContain("relation.status = 'active'")
    expect(helper).toContain("relation.source IN ('invitation', 'admin')")
    expect(helper).not.toMatch(/\bdefault\b|\blegacy\b/)
  })

  it('keeps the helper fail-closed and preserves its restricted grants', () => {
    expect(migration).toMatch(/SECURITY DEFINER[\s\S]*SET search_path = ''/)
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.is_active_coach_client_relation\(uuid, uuid\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    )
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.is_active_coach_client_relation\(uuid, uuid\)[\s\S]*TO authenticated, service_role/,
    )
  })

  it.each([
    ['profiles', 3],
    ['progression', 5],
    ['nutrition', 11],
    ['training', 17],
    ['communication', 12],
    ['payments', 2],
  ] as const)('keeps all %s policies behind the canonical helper (%i)', (domain, count) => {
    const sql = domainMigrations[domain]
    expect(sql.match(/CREATE POLICY/g)).toHaveLength(count)
    expect(sql).toMatch(/is_active_coach_client_relation|is_active_messaging_pair/)
  })

  it('hardens messaging transitively through the canonical relation helper', () => {
    const communication = domainMigrations.communication
    const messagingHelper = communication.slice(
      communication.indexOf('CREATE OR REPLACE FUNCTION public.is_active_messaging_pair'),
      communication.indexOf('REVOKE ALL ON FUNCTION public.is_active_messaging_pair'),
    )
    expect(messagingHelper.match(/public\.is_active_coach_client_relation/g)).toHaveLength(2)
    expect(messagingHelper).not.toMatch(/FROM\s+public\.coach_clients/i)
  })

  it('changes no policy or client ownership rule in this focused migration', () => {
    expect(migration).not.toMatch(/(?:CREATE|ALTER|DROP) POLICY/i)
    expect(migration).not.toMatch(/(?:GRANT|REVOKE)[\s\S]*ON TABLE/i)
    expect(migration).not.toMatch(/INSERT INTO|UPDATE public\.|DELETE FROM/i)
  })

  it('preserves physical lifecycle semantics in the canonical writer', () => {
    const writer = readFileSync(
      'supabase/migrations/20260823100000_add_canonical_coach_relation_writer.sql',
      'utf8',
    )
    expect(writer).toContain("relation.status = 'active'")
    expect(writer).toContain("p_source NOT IN ('default', 'invitation', 'admin', 'legacy')")
    expect(writer).not.toContain('is_active_coach_client_relation')
  })

  it('keeps invitation authoritative and retires the default runtime writer', () => {
    const invitation = readFileSync(
      'supabase/migrations/20260823120000_add_coach_invitation_v2_lifecycle.sql',
      'utf8',
    )
    const defaultAssignmentRoute = readFileSync('app/api/coach/default-assignment/route.ts', 'utf8')
    expect(invitation).toMatch(/'create',\s*'invitation'/)
    expect(defaultAssignmentRoute).toContain('DEFAULT_COACH_ASSIGNMENT_DEPRECATED')
    expect(defaultAssignmentRoute).not.toMatch(/createCoachClientRelation|transition_coach_client_relation/)
  })

  it('requires all 49 coach-sensitive policies during migration postflight', () => {
    expect(migration).toContain('IF protected_policy_count <> 49 THEN')
    expect(migration).toContain('AUTHORITATIVE_RELATION_POLICIES_INCOMPLETE')
  })

  it('adds no application query, index, table or runtime authority implementation', () => {
    expect(migration).not.toMatch(/CREATE (?:TABLE|INDEX)/i)
    expect(migration).not.toMatch(/subscription|entitlement/i)
  })
})
