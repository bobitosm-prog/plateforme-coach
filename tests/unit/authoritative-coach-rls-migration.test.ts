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

  it('retires every proven legacy authority bypass', () => {
    for (const [table, policy] of [
      ['body_analyses', 'body_analyses_coach_read'],
      ['profiles', 'coaches can read their clients profiles'],
      ['program_days', 'program_days_coach_all'],
      ['program_exercises', 'program_exercises_coach_all'],
      ['program_days', 'program days visible'],
      ['program_exercises', 'program exercises visible'],
      ['user_badges', 'user_badges_coach_read'],
      ['user_xp', 'user_xp_coach_read'],
      ['client_meal_plans', 'coaches manage meal plans'],
      ['coach_clients', 'coach clients'],
      ['coach_clients', 'coach_clients_manage'],
      ['coach_clients', 'coach_clients_self_insert_safe'],
    ]) {
      expect(migration).toContain(
        `DROP POLICY IF EXISTS "${policy}" ON public.${table}`,
      )
    }
  })

  it('replaces downstream coach access with the authoritative helper', () => {
    for (const policy of [
      'body_analyses_coach_read',
      'program_days_coach_select_active',
      'program_days_coach_insert_active',
      'program_days_coach_update_active',
      'program_days_coach_delete_active',
      'program_exercises_coach_select_active',
      'program_exercises_coach_insert_active',
      'program_exercises_coach_update_active',
      'program_exercises_coach_delete_active',
      'user_badges_coach_read',
      'user_xp_coach_read',
    ]) {
      const policyStart = migration.indexOf(`CREATE POLICY "${policy}"`)
      expect(policyStart).toBeGreaterThan(-1)
      const nextStatement = migration.indexOf(';', policyStart)
      expect(migration.slice(policyStart, nextStatement)).toContain(
        'is_active_coach_client_relation',
      )
    }
  })

  it('preserves client ownership and adds no table grant or data mutation', () => {
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

  it('requires all 60 coach-sensitive policies during migration postflight', () => {
    expect(migration).toContain('IF protected_policy_count <> 60 THEN')
    expect(migration).toContain('AUTHORITATIVE_RELATION_POLICIES_INCOMPLETE')
  })

  it('scans globally for direct authority and browser relation writers', () => {
    expect(migration).toContain('WITH client_data_tables AS')
    expect(migration).toContain("column_name IN ('client_id', 'user_id')")
    expect(migration).toContain("coalesce(policy.qual, '') LIKE '%coach_clients%'")
    expect(migration).toContain('unsafe_direct_policy_count')
    expect(migration).toContain('AUTHORITATIVE_DIRECT_COACH_BYPASS_REMAINS')
    expect(migration).toContain('unrestricted_sensitive_policy_count')
    expect(migration).toContain(
      'AUTHORITATIVE_UNRESTRICTED_SENSITIVE_POLICY_REMAINS',
    )
    expect(migration).toContain('AUTHORITATIVE_BROWSER_RELATION_WRITER_REMAINS')
    expect(migration.indexOf('WITH helper_scoped_tables AS')).toBeGreaterThan(
      migration.indexOf('AUTHORITATIVE_DIRECT_COACH_BYPASS_REMAINS'),
    )
    expect(migration).not.toMatch(
      /policyname\s+IN\s*\([^)]*body_analyses_coach_read[^)]*\)[\s\S]*DIRECT_COACH_BYPASS/,
    )
  })

  it('adds no application query, index, table or runtime authority implementation', () => {
    expect(migration).not.toMatch(/CREATE (?:TABLE|INDEX)/i)
    expect(migration).not.toMatch(/subscription|entitlement/i)
  })
})
