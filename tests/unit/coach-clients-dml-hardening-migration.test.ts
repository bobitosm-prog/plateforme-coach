import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrationPath =
  'supabase/migrations/20260910163000_harden_coach_clients_dml_and_account_deletion.sql'
const migration = readFileSync(migrationPath, 'utf8')
const previousDeleteAccount = readFileSync(
  'supabase/migrations/20260706100000_delete_account_weekly_diagnostics.sql',
  'utf8',
)
const accountDeletionIntegration = readFileSync(
  'tests/integration/delete-user-account-relation-cleanup.sql',
  'utf8',
)
const canonicalWriterIntegration = readFileSync(
  'tests/integration/canonical-coach-relation-writer.sql',
  'utf8',
)

const immutableMigrationHashes = {
  'supabase/migrations/20260823100000_add_canonical_coach_relation_writer.sql':
    '470eb9ce43483a344e03555c770fafe8d0facc51c0b334caaebe6f17d3f72b55',
  'supabase/migrations/20260823120000_add_coach_invitation_v2_lifecycle.sql':
    'def51bb7030b61047e623877a75bb377775a60c99d798ccceebf5973152728f1',
  'supabase/migrations/20260823130000_create_legacy_entitlements_dark.sql':
    '54d26a4b24753c4fb7dca5b51c6be39a76691e4a56b9c4691ed98d40aeec92a7',
  'supabase/migrations/20260823140000_revoke_global_public_maintain_privileges.sql':
    'a336eeef7f7f406e9fb646220d901fe9b92a3ac0711b88c7bc53ba313309ea08',
  'supabase/migrations/20260903210000_harden_authoritative_coach_relation_rls.sql':
    '8163e8fbcc2b9d7a080fd654014f509f33da14ffd771615c122006423d1e0032',
} as const

const deletedOrUpdatedTables = [
  'workout_sets',
  'workout_sessions',
  'cardio_sessions',
  'completed_sessions',
  'scheduled_sessions',
  'workouts',
  'daily_food_logs',
  'meal_logs',
  'meal_tracking',
  'water_intake',
  'saved_meals',
  'nutrition',
  'body_measurements',
  'body_analyses',
  'body_assessments',
  'weight_logs',
  'progress_photos',
  'daily_checkins',
  'daily_habits',
  'user_achievements',
  'user_badges',
  'user_xp',
  'personal_records',
  'progressive_overload_suggestions',
  'custom_exercises',
  'custom_foods',
  'custom_programs',
  'exercise_feedback',
  'ai_usage_logs',
  'chat_ai_messages',
  'app_logs',
  'bug_reports',
  'weekly_diagnostics',
  'client_meal_plans',
  'client_programs',
  'meal_plans',
  'user_programs',
  'activity_feed',
  'coach_notes',
  'commissions',
  'training_programs',
  'community_foods',
  'exercises_db',
  'recipes',
  'messages',
  'payments',
  'push_subscriptions',
  'profiles',
] as const

const functionBody = migration.match(
  /CREATE OR REPLACE FUNCTION public\.delete_user_account[\s\S]*?\$function\$;/,
)?.[0]

describe('coach_clients permanent DML and account-deletion hardening', () => {
  it('is ordered after M12 without changing any applied security migration', () => {
    expect(migrationPath.localeCompare(
      'supabase/migrations/20260903210000_harden_authoritative_coach_relation_rls.sql',
    )).toBeGreaterThan(0)

    for (const [path, expectedHash] of Object.entries(immutableMigrationHashes)) {
      const actualHash = createHash('sha256')
        .update(readFileSync(path))
        .digest('hex')
      expect(actualHash, path).toBe(expectedHash)
    }
  })

  it('records the complete 55-reference legacy hardening baseline', () => {
    const legacyBody = previousDeleteAccount.match(
      /CREATE OR REPLACE FUNCTION public\.delete_user_account[\s\S]*?\$func\$;/,
    )?.[0]
    expect(legacyBody).toBeDefined()

    const legacySql = legacyBody?.replace(/--.*$/gm, '') ?? ''
    const unqualifiedRelations = legacySql.match(
      /\b(?:FROM|UPDATE|JOIN)\s+(?!public\.|auth\.|pg_catalog\.)[a-z_][a-z0-9_]*/gi,
    ) ?? []
    const unqualifiedBuiltins = legacyBody?.match(
      /(?<![a-z0-9_.])(?:jsonb_build_object|now)\s*\(/gi,
    ) ?? []

    expect(unqualifiedRelations).toHaveLength(53)
    expect(unqualifiedBuiltins).toHaveLength(2)
  })

  it('uses an empty search path and qualifies every relation and builtin', () => {
    expect(functionBody).toBeDefined()
    expect(functionBody).toContain('SECURITY DEFINER')
    expect(functionBody).toContain("SET search_path = ''")
    expect(functionBody).toContain('auth.uid()')
    expect(functionBody).toContain('pg_catalog.jsonb_build_object(')
    expect(functionBody).toContain('pg_catalog.now()')

    for (const table of deletedOrUpdatedTables) {
      expect(functionBody).toContain(`public.${table}`)
    }

    const hardenedSql = functionBody?.replace(/--.*$/gm, '') ?? ''
    expect(hardenedSql).not.toMatch(
      /\b(?:FROM|UPDATE|JOIN)\s+(?!public\.|auth\.|pg_catalog\.)[a-z_][a-z0-9_]*/i,
    )
    expect(functionBody).not.toMatch(
      /(?<![a-z0-9_.])(?:jsonb_build_object|now)\s*\(/i,
    )
    expect(functionBody).not.toMatch(/\bEXECUTE\b/)
  })

  it('preserves the RPC contract while delegating relation cleanup to cascades', () => {
    expect(functionBody).toContain(
      'CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)',
    )
    expect(functionBody).toContain('RETURNS jsonb')
    expect(functionBody).toContain(
      "RAISE EXCEPTION 'Unauthorized: can only delete your own account'",
    )
    expect(functionBody).toContain(
      "caller_role IS DISTINCT FROM 'super_admin'",
    )
    expect(functionBody).toContain("'success', true")
    expect(functionBody).toContain("'user_id', target_user_id")
    expect(functionBody).toContain("'deleted_at', pg_catalog.now()")
    expect(functionBody).not.toMatch(/DELETE FROM public\.coach_clients/)
    expect(functionBody).toContain(
      'DELETE FROM public.profiles WHERE id = target_user_id',
    )
    expect(migration).toContain("constraint_definition.confdeltype = 'c'")
    expect(migration.match(/constraint_definition\.confdeltype = 'c'/g)).toHaveLength(2)
  })

  it('preserves the exact execute contract and postgres ownership', () => {
    expect(migration).toContain(
      'ALTER FUNCTION public.delete_user_account(uuid) OWNER TO postgres',
    )
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.delete_user_account\(uuid\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    )
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.delete_user_account\(uuid\)[\s\S]*TO authenticated, service_role/,
    )
    expect(migration).toContain('DELETE_USER_ACCOUNT_EXECUTE_GRANTS_INVALID')
  })

  it('implements and asserts the final coach_clients ACL', () => {
    expect(migration).toMatch(
      /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.coach_clients\s+FROM authenticated/,
    )
    expect(migration).toMatch(
      /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER\s+ON TABLE public\.coach_clients\s+FROM service_role/,
    )
    expect(migration).not.toMatch(/REVOKE SELECT[^;]*coach_clients/)
    for (const marker of [
      'COACH_CLIENTS_REQUIRED_SELECT_GRANT_MISSING',
      'AUTHENTICATED_COACH_CLIENTS_DML_GRANT_REMAINS',
      'SERVICE_ROLE_COACH_CLIENTS_PRIVILEGE_REMAINS',
      'PUBLIC_OR_ANON_COACH_CLIENTS_DML_GRANT_REMAINS',
      'SERVICE_ROLE_COACH_CLIENTS_MAINTAIN_GRANT_REMAINS',
    ]) {
      expect(migration).toContain(marker)
    }
  })

  it('preserves the temporary writer lock and unrelated relation functions', () => {
    expect(migration).toContain("'moovx.writer_lock_before'")
    expect(migration).toContain(
      'TEMPORARY_COACH_CLIENTS_WRITER_LOCK_STATE_CHANGED',
    )
    expect(migration).not.toMatch(/DROP TRIGGER/)
    expect(migration).not.toMatch(
      /DROP FUNCTION public\.rc1_guard_coach_clients_direct_write/,
    )
    expect(migration).not.toMatch(
      /CREATE OR REPLACE FUNCTION public\.(?:transition_coach_client_relation|consume_coach_invitation_v2|is_active_coach_client_relation)/,
    )
  })

  it('is transactional and limits table ACL changes to coach_clients', () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    const aclTargets = [...migration.matchAll(
      /(?:GRANT|REVOKE)[\s\S]*?ON TABLE\s+([a-z_.]+)/g,
    )].map((match) => match[1])
    expect(new Set(aclTargets)).toEqual(new Set(['public.coach_clients']))
  })

  it('defines rollback-only permanent-writer and account-deletion probes', () => {
    for (const integration of [canonicalWriterIntegration, accountDeletionIntegration]) {
      expect(integration.trimStart()).toMatch(/^\\set ON_ERROR_STOP on\s+BEGIN;/)
      expect(integration.trimEnd()).toMatch(/ROLLBACK;$/)
    }
    for (const marker of [
      'SERVICE_ROLE_DIRECT_RELATION_TRUNCATE_ALLOWED',
      'AUTHORIZED_INVITATION_CREATE_FAILED',
      'DEFAULT_SOURCE_ESCALATION_ALLOWED',
    ]) {
      expect(canonicalWriterIntegration).toContain(marker)
    }
    for (const marker of [
      'DELETE_ACCOUNT_SOLO_CLIENT_FAILED',
      'DELETE_ACCOUNT_CLIENT_RELATION_NOT_CASCADED',
      'DELETE_ACCOUNT_COACH_RELATION_NOT_CASCADED',
      'DELETE_ACCOUNT_WRONG_USER_ALLOWED',
      'DELETE_ACCOUNT_NULL_ROLE_WRONG_USER_ALLOWED',
      'DELETE_ACCOUNT_NO_JWT_ALLOWED',
      'DELETE_ACCOUNT_PG_TEMP_HIJACKED',
    ]) {
      expect(accountDeletionIntegration).toContain(marker)
    }
  })
})
