import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260822121000_harden_progression_active_coach_rls.sql',
  'utf8',
)

const policies = [
  ['progress_photos', 'progress_photos_coach_read'],
  ['body_measurements', 'body_measurements_coach_read'],
  ['weight_logs', 'weight_logs_coach_read'],
  ['daily_checkins', 'daily_checkins_coach_read'],
  ['personal_records', 'personal_records_coach_read'],
] as const

describe('progression active coach RLS migration', () => {
  it('fails fast when the shared helper or a target table is missing', () => {
    expect(migration).toContain(
      "to_regprocedure(\n    'public.is_active_coach_client_relation(uuid,uuid)'",
    )
    for (const [table] of policies) expect(migration).toContain(`'${table}'`)
    expect(migration).toContain('PROGRESSION_RLS_REQUIRES_TABLE')
  })

  it.each(policies)('replaces %s coach access with active-only SELECT policy %s', (table, policy) => {
    expect(migration).toContain(`DROP POLICY IF EXISTS "${policy}"`)
    expect(migration).toMatch(
      new RegExp(
        `CREATE POLICY "${policy}"[\\s\\S]*?ON public\\.${table}[\\s\\S]*?FOR SELECT[\\s\\S]*?TO authenticated[\\s\\S]*?is_active_coach_client_relation\\(auth\\.uid\\(\\), ${table}\\.user_id\\)`,
      ),
    )
  })

  it('uses the shared helper instead of inline or legacy relation lookups', () => {
    const createPolicies = migration.slice(migration.indexOf('CREATE POLICY'))
    expect(createPolicies).not.toMatch(/FROM\s+(?:public\.)?coach_clients/i)
    expect(createPolicies).not.toMatch(/auth\.uid\(\)\s*=\s*coach_id/)
    expect(migration.match(/is_active_coach_client_relation\(auth\.uid\(\),/g)).toHaveLength(5)
    expect(migration).not.toMatch(/invited_by_coach|subscription_(?:type|status)/)
  })

  it('adds no coach mutation policy', () => {
    const coachPolicyBlocks = migration.match(/CREATE POLICY "[^"]+_coach_read"[\s\S]*?\);/g) ?? []
    expect(coachPolicyBlocks).toHaveLength(5)
    for (const block of coachPolicyBlocks) {
      expect(block).toContain('FOR SELECT')
      expect(block).not.toMatch(/FOR (?:ALL|INSERT|UPDATE|DELETE)/)
      expect(block).not.toContain('WITH CHECK')
    }
  })

  it('preserves every existing owner policy', () => {
    expect(migration).not.toMatch(/DROP POLICY[^;]*(?:_own|clients can|Users manage)/)
    expect(migration).not.toMatch(/CREATE POLICY[^;]*(?:_own|clients can|Users manage)/)
  })

  it('asserts that no parallel legacy coach bypass remains', () => {
    expect(migration).toContain('PROGRESSION_ACTIVE_COACH_POLICIES_INCOMPLETE')
    expect(migration).toContain('PROGRESSION_LEGACY_COACH_BYPASS_REMAINS')
    expect(migration).toContain("coalesce(qual, '') LIKE '%coach_clients%'")
    expect(migration).toContain("coalesce(with_check, '') LIKE '%coach_clients%'")
  })

  it('is transactional and leaves every other RLS domain untouched', () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).not.toMatch(
      /ON public\.(?:profiles|daily_food_logs|meal_logs|meal_tracking|meal_plans|client_meal_plans|workout_sessions|workout_sets|custom_programs|client_programs|messages|payments|coach_notes|coach_appointments|activity_feed)/,
    )
    expect(migration).not.toMatch(/\b(?:GRANT|REVOKE)\b/)
  })
})
