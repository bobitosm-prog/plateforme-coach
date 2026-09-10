import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrationPath =
  'supabase/migrations/20260910203000_remove_rc1_coach_clients_writer_lock.sql'
const migration = readFileSync(migrationPath, 'utf8')

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
  'supabase/migrations/20260910163000_harden_coach_clients_dml_and_account_deletion.sql':
    '7a3688cfd044a7aa93767c0a3a1bb41a1397e749b7d2716c97f1fc06eec6021e',
} as const

describe('versioned RC1 coach_clients writer-lock removal', () => {
  it('is ordered after M14 and preserves every applied migration byte', () => {
    expect(migrationPath.localeCompare(
      'supabase/migrations/20260910163000_harden_coach_clients_dml_and_account_deletion.sql',
    )).toBeGreaterThan(0)

    for (const [path, expectedHash] of Object.entries(immutableMigrationHashes)) {
      expect(createHash('sha256').update(readFileSync(path)).digest('hex'), path)
        .toBe(expectedHash)
    }
  })

  it('is transactional and removes only the exact temporary trigger and function', () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).toMatch(
      /DROP TRIGGER IF EXISTS rc1_guard_coach_clients_direct_write\s+ON public\.coach_clients;/,
    )
    expect(migration).toContain(
      'DROP FUNCTION IF EXISTS public.rc1_guard_coach_clients_direct_write();',
    )
    expect(migration).not.toMatch(/\bCASCADE\b/i)
    expect(migration.match(/\bDROP TRIGGER\b/g)).toHaveLength(1)
    expect(migration.match(/\bDROP FUNCTION\b/g)).toHaveLength(1)
  })

  it('fails closed unless the permanent M9, M10, M12, M14 and ACL model is ready', () => {
    for (const marker of [
      'WRITER_LOCK_REMOVAL_AUTHENTICATED_DML_REMAINS',
      'WRITER_LOCK_REMOVAL_SERVICE_ROLE_PRIVILEGE_REMAINS',
      'WRITER_LOCK_REMOVAL_M9_CONTRACT_INVALID',
      'WRITER_LOCK_REMOVAL_M10_CONTRACT_INVALID',
      'WRITER_LOCK_REMOVAL_M12_CONTRACT_INVALID',
      'WRITER_LOCK_REMOVAL_DELETE_ACCOUNT_CONTRACT_INVALID',
      'WRITER_LOCK_REMOVAL_TEMPORARY_LOCK_STATE_INCONSISTENT',
      'WRITER_LOCK_REMOVAL_TEMPORARY_GUARD_CONTRACT_INVALID',
    ]) {
      expect(migration).toContain(marker)
    }
    expect(migration).toContain("ARRAY['search_path=\"\"']::text[]")
    expect(migration).toContain("relation.source IN (''invitation'', ''admin'')")
    expect(migration).toContain("NOT LIKE '%''legacy''%'")
  })

  it('supports both the lock-present and lock-absent states idempotently', () => {
    expect(migration).toContain(
      "guard_function oid := to_regprocedure(\n    'public.rc1_guard_coach_clients_direct_write()'",
    )
    expect(migration).toContain(
      '(guard_function IS NULL AND guard_trigger_count <> 0)',
    )
    expect(migration).toContain(
      '(guard_function IS NOT NULL AND (',
    )
    expect(migration).toMatch(/DROP TRIGGER IF EXISTS/)
    expect(migration).toMatch(/DROP FUNCTION IF EXISTS/)
  })

  it('asserts the post-removal security contract and absence of both objects', () => {
    for (const marker of [
      'WRITER_LOCK_REMOVAL_OBJECT_REMAINS',
      'WRITER_LOCK_REMOVAL_AUTHENTICATED_DML_REGRESSION',
      'WRITER_LOCK_REMOVAL_SERVICE_ROLE_REGRESSION',
      'WRITER_LOCK_REMOVAL_MAINTAIN_REGRESSION',
      'WRITER_LOCK_REMOVAL_RELATION_FUNCTION_REGRESSION',
      'WRITER_LOCK_REMOVAL_DELETE_ACCOUNT_REGRESSION',
    ]) {
      expect(migration).toContain(marker)
    }
  })

  it('does not mutate grants, policies, relation functions or business rows', () => {
    expect(migration).not.toMatch(/^\s*(?:GRANT|REVOKE)\b/im)
    expect(migration).not.toMatch(/(?:CREATE|ALTER|DROP)\s+POLICY/i)
    expect(migration).not.toMatch(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i)
    expect(migration).not.toMatch(
      /^\s*(?:INSERT\s+INTO|UPDATE\s+[a-z_]|DELETE\s+FROM|TRUNCATE\s+)/im,
    )
    expect(migration).not.toMatch(
      /(?:DROP|ALTER)\s+FUNCTION\s+public\.(?:transition_coach_client_relation|consume_coach_invitation_v2|is_active_coach_client_relation|delete_user_account)/i,
    )
  })
})
