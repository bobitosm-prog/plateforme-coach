import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260822122000_harden_nutrition_active_coach_rls.sql',
  'utf8',
)

const authoritativeMigration = readFileSync(
  'supabase/migrations/20260903210000_harden_authoritative_coach_relation_rls.sql',
  'utf8',
)

const runtimeTest = readFileSync(
  'tests/integration/nutrition-active-rls-migration.sql',
  'utf8',
)

const directCoachAuthorityPattern =
  /(auth\.uid\(\).{0,120}(coach_id|created_by)|(coach_id|created_by).{0,120}auth\.uid\(\))/i

const readPolicies = [
  ['daily_food_logs', 'daily_food_logs_coach_read', 'user_id'],
  ['meal_logs', 'meal_logs_coach_read', 'user_id'],
  ['meal_tracking', 'meal_tracking_coach_read', 'user_id'],
] as const

describe('nutrition active coach RLS migration', () => {
  it('fails fast when the shared helper or a target table is missing', () => {
    expect(migration).toContain(
      "to_regprocedure(\n    'public.is_active_coach_client_relation(uuid,uuid)'",
    )
    for (const table of [
      'daily_food_logs',
      'meal_logs',
      'meal_tracking',
      'meal_plans',
      'client_meal_plans',
    ]) {
      expect(migration).toContain(`'${table}'`)
    }
    expect(migration).toContain('NUTRITION_RLS_REQUIRES_TABLE')
  })

  it.each(readPolicies)(
    'replaces %s coach access with one active-only SELECT policy',
    (table, policy, clientColumn) => {
      expect(migration).toContain(`DROP POLICY IF EXISTS "${policy}"`)
      expect(migration).toMatch(
        new RegExp(
          `CREATE POLICY "${policy}"[\\s\\S]*?ON public\\.${table}[\\s\\S]*?FOR SELECT[\\s\\S]*?TO authenticated[\\s\\S]*?is_active_coach_client_relation\\(auth\\.uid\\(\\), ${table}\\.${clientColumn}\\)`,
        ),
      )
    },
  )

  it('removes the duplicate historical meal tracking policy', () => {
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Coaches can view client meal tracking"',
    )
    expect(migration).not.toContain(
      'CREATE POLICY "Coaches can view client meal tracking"',
    )
    expect(migration.match(/CREATE POLICY "meal_tracking_coach_read"/g)).toHaveLength(1)
  })

  it('removes author-only meal plan access and binds every coach operation to an active relation', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "meal_plans_coach"')
    expect(migration).toContain('DROP POLICY IF EXISTS "meal_plans_coach_read"')

    for (const command of ['select', 'insert', 'update', 'delete']) {
      expect(migration).toContain(`CREATE POLICY "meal_plans_coach_${command}_active"`)
    }

    expect(migration).toMatch(
      /CREATE POLICY "meal_plans_coach_select_active"[\s\S]*FOR SELECT[\s\S]*is_active_coach_client_relation\(auth\.uid\(\), meal_plans\.user_id\)/,
    )
    expect(migration).toMatch(
      /CREATE POLICY "meal_plans_coach_insert_active"[\s\S]*FOR INSERT[\s\S]*auth\.uid\(\) = meal_plans\.created_by[\s\S]*is_active_coach_client_relation\(auth\.uid\(\), meal_plans\.user_id\)/,
    )
    expect(migration).toMatch(
      /CREATE POLICY "meal_plans_coach_update_active"[\s\S]*FOR UPDATE[\s\S]*USING[\s\S]*created_by[\s\S]*is_active_coach_client_relation[\s\S]*WITH CHECK[\s\S]*created_by[\s\S]*is_active_coach_client_relation/,
    )
    expect(migration).not.toMatch(
      /CREATE POLICY "meal_plans_coach"[\s\S]*auth\.uid\(\) = created_by/,
    )
  })

  it('replaces duplicate client meal plan ALL policies with active-bound operation policies', () => {
    for (const legacyPolicy of [
      'client_meal_plans_coach_all',
      'client_meal_plans_coach_write',
      'coaches manage meal plans',
    ]) {
      expect(migration).toContain(`DROP POLICY IF EXISTS "${legacyPolicy}"`)
      expect(migration).not.toContain(`CREATE POLICY "${legacyPolicy}"`)
    }

    for (const command of ['select', 'insert', 'update', 'delete']) {
      expect(migration).toContain(
        `CREATE POLICY "client_meal_plans_coach_${command}_active"`,
      )
    }

    expect(migration).toMatch(
      /CREATE POLICY "client_meal_plans_coach_update_active"[\s\S]*FOR UPDATE[\s\S]*USING[\s\S]*coach_id[\s\S]*is_active_coach_client_relation[\s\S]*WITH CHECK[\s\S]*coach_id[\s\S]*is_active_coach_client_relation/,
    )
    expect(migration).not.toMatch(
      /CREATE POLICY "client_meal_plans_coach_(?:all|write)"/,
    )
  })

  it('uses the shared helper and detects every known parallel bypass', () => {
    const createPolicies = migration.slice(migration.indexOf('CREATE POLICY'))
    expect(createPolicies).not.toMatch(/FROM\s+(?:public\.)?coach_clients/i)
    expect(migration).toContain('NUTRITION_ACTIVE_COACH_POLICIES_INCOMPLETE')
    expect(migration).toContain('NUTRITION_LEGACY_COACH_BYPASS_REMAINS')
    expect(migration).toContain("'coaches manage meal plans'")
    expect(migration).toContain("coalesce(qual, '') LIKE '%coach_clients%'")
    expect(migration).toMatch(/coach_id\|created_by/)
    expect(migration).not.toMatch(/invited_by_coach|subscription_(?:type|status)/)
  })

  it.each([
    'auth.uid() = coach_id',
    'coach_id = auth.uid()',
    'auth.uid() = created_by',
    'created_by = auth.uid()',
  ])('detects direct coach authority written as %s', (expression) => {
    expect(directCoachAuthorityPattern.test(expression)).toBe(true)
  })

  it('verifies exact policy structure and helper dependencies in PostgreSQL catalogs', () => {
    for (const catalog of [
      'pg_catalog.pg_namespace',
      'pg_catalog.pg_class',
      'pg_catalog.pg_policy',
      'pg_catalog.pg_depend',
    ]) {
      expect(migration).toContain(catalog)
    }
    expect(migration).toContain('pg_catalog.pg_get_expr')
    expect(migration).toContain("'public.is_active_coach_client_relation(uuid,uuid)'::regprocedure")
    expect(migration).toContain('policy.polpermissive')
    expect(migration).toContain('policy.polroles = ARRAY[')
    expect(migration).toContain('required_policy_count <> 11')
    expect(migration).toContain('nutrition_policy_count <> 21')
    expect(migration).toContain('NUTRITION_POLICY_SET_INVALID')
    expect(migration).toContain('NUTRITION_UNRESTRICTED_POLICY_REMAINS')
  })

  it('remains idempotently compatible with the later authoritative cleanup', () => {
    const legacyDrop =
      'DROP POLICY IF EXISTS "coaches manage meal plans" ON public.client_meal_plans;'

    expect(migration.replace(/\s+/g, ' ')).toContain(legacyDrop)
    expect(authoritativeMigration.replace(/\s+/g, ' ')).toContain(legacyDrop)
    expect(authoritativeMigration).not.toContain(
      'CREATE POLICY "coaches manage meal plans"',
    )
  })

  it('ships a rollback-only runtime matrix for active, ended, unrelated, own, and anonymous access', () => {
    expect(runtimeTest.trimStart()).toMatch(/^\\set ON_ERROR_STOP on\s+BEGIN;/)
    expect(runtimeTest.trimEnd()).toMatch(/ROLLBACK;$/)
    for (const assertion of [
      'ACTIVE_COACH_SELECT_DENIED',
      'ACTIVE_COACH_INSERT_DENIED',
      'ACTIVE_COACH_UPDATE_DENIED',
      'ACTIVE_COACH_DELETE_DENIED',
      'ENDED_COACH_SELECT_ALLOWED',
      'ENDED_COACH_INSERT_ALLOWED',
      'ENDED_COACH_UPDATE_ALLOWED',
      'ENDED_COACH_DELETE_ALLOWED',
      'UNRELATED_COACH_SELECT_ALLOWED',
      'CLIENT_OWN_SELECT_DENIED',
      'ANONYMOUS_SELECT_ALLOWED',
      'NUTRITION_LEGACY_POLICY_REMAINS',
    ]) {
      expect(runtimeTest).toContain(assertion)
    }
  })

  it('does not invent meal log owner access or alter existing owner policies', () => {
    expect(migration).not.toMatch(/CREATE POLICY "meal_logs_(?:own|owner)/)
    expect(migration).not.toMatch(/DROP POLICY[^;]*(?:_own|users own|users manage)/i)
  })

  it('is transactional and leaves unrelated RLS domains untouched', () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).not.toMatch(
      /ON public\.(?:profiles|progress_photos|body_measurements|weight_logs|daily_checkins|personal_records|workout_sessions|workout_sets|custom_programs|client_programs|messages|payments|coach_notes|coach_appointments|activity_feed)/,
    )
    expect(migration).not.toMatch(/\b(?:GRANT|REVOKE)\b/)
  })
})
