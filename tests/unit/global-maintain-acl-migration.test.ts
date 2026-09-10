import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrationPath =
  'supabase/migrations/20260823140000_revoke_global_public_maintain_privileges.sql'
const migration = readFileSync(migrationPath, 'utf8')
const integration = readFileSync(
  'tests/integration/global-maintain-acl.sql',
  'utf8',
)

describe('global PostgreSQL 17 MAINTAIN ACL corrective migration', () => {
  it('is ordered between immutable M11 and M12', () => {
    expect(migrationPath.localeCompare(
      'supabase/migrations/20260823130000_create_legacy_entitlements_dark.sql',
    )).toBeGreaterThan(0)
    expect(migrationPath.localeCompare(
      'supabase/migrations/20260903210000_harden_authoritative_coach_relation_rls.sql',
    )).toBeLessThan(0)

    expect(createHash('sha256').update(readFileSync(
      'supabase/migrations/20260823130000_create_legacy_entitlements_dark.sql',
    )).digest('hex')).toBe(
      '54d26a4b24753c4fb7dca5b51c6be39a76691e4a56b9c4691ed98d40aeec92a7',
    )
    expect(createHash('sha256').update(readFileSync(
      'supabase/migrations/20260903210000_harden_authoritative_coach_relation_rls.sql',
    )).digest('hex')).toBe(
      '8163e8fbcc2b9d7a080fd654014f509f33da14ffd771615c122006423d1e0032',
    )
  })

  it('fails fast on the exact owner, schema, role and version prerequisites', () => {
    expect(migration).toContain("current_user <> 'postgres'")
    expect(migration).toContain("nspname = 'public'")
    for (const role of ['postgres', 'anon', 'authenticated', 'service_role']) {
      expect(migration).toContain(`'${role}'`)
    }
    expect(migration).toContain("current_setting('server_version_num')::integer")
  })

  it('keeps both PG17-only statements inside a PG17 dynamic-SQL guard', () => {
    expect(migration).toContain(
      "IF current_setting('server_version_num')::integer >= 170000 THEN",
    )
    expect(migration).toMatch(
      /EXECUTE\s+'REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public\s+FROM anon, authenticated, service_role'/,
    )
    expect(migration).toMatch(
      /EXECUTE\s+'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE MAINTAIN ON TABLES FROM anon, authenticated, service_role'/,
    )
    expect(migration.match(/\bREVOKE MAINTAIN\b/g)).toHaveLength(2)
  })

  it('uses authoritative catalogs for the existing and postgres-default postflights', () => {
    for (const catalog of [
      'pg_catalog.pg_class',
      'pg_catalog.pg_namespace',
      'pg_catalog.pg_default_acl',
      'pg_catalog.aclexplode',
      "pg_catalog.acldefault('r', relation.relowner)",
    ]) {
      expect(migration).toContain(catalog)
    }
    expect(migration).toContain("relation.relkind IN ('r', 'p')")
    expect(migration).toContain('GLOBAL_MAINTAIN_EXISTING_TABLE_GRANT_REMAINS')
    expect(migration).toContain('GLOBAL_MAINTAIN_POSTGRES_DEFAULT_GRANT_REMAINS')
    expect(migration).toContain('GLOBAL_MAINTAIN_POSTGRES_OWNER_PRIVILEGE_MISSING')
  })

  it('documents and preserves the platform-managed supabase_admin default ACL', () => {
    expect(migration).toMatch(/Supabase owns the supabase_admin default ACL/)
    expect(migration).not.toMatch(/ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin/i)
    expect(migration).not.toMatch(/REVOKE[^;]*FROM supabase_admin/i)
  })

  it('is transactional and contains no data, RLS, policy or function mutation', () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).not.toMatch(/(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE TABLE)/i)
    expect(migration).not.toMatch(/(?:ENABLE|DISABLE|FORCE) ROW LEVEL SECURITY/i)
    expect(migration).not.toMatch(/(?:CREATE|ALTER|DROP) POLICY/i)
    expect(migration).not.toMatch(/SECURITY DEFINER|CREATE (?:OR REPLACE )?FUNCTION/i)
    expect(migration).not.toMatch(/\bGRANT\b/i)
  })

  it('defines a transactional PG17 runtime contract for ACL and M11 DML preservation', () => {
    for (const assertion of [
      'GLOBAL_MAINTAIN_PG17_REQUIRED',
      'GLOBAL_MAINTAIN_PATTERN_NOT_REPRODUCED',
      'GLOBAL_MAINTAIN_EXISTING_GRANT_REMAINS',
      'GLOBAL_MAINTAIN_POSTGRES_DEFAULT_REMAINS',
      'GLOBAL_MAINTAIN_POSTGRES_FIXTURE_GRANT_PRESENT',
      'GLOBAL_MAINTAIN_NON_MAINTAIN_ACL_DRIFT',
      'GLOBAL_MAINTAIN_NON_MAINTAIN_DEFAULT_ACL_DRIFT',
      'GLOBAL_MAINTAIN_SUPABASE_ADMIN_DEFAULT_ACL_DRIFT',
      'GLOBAL_MAINTAIN_SERVICE_ROLE_DML_FAILED',
      'GLOBAL_MAINTAIN_M11_BROWSER_GRANT_PRESENT',
    ]) {
      expect(integration).toContain(assertion)
    }
    expect(integration).toContain('ROLLBACK;')
  })

  it('round-trips byte-exactly through safe ledger transports', () => {
    const hazardousMarkers = ["$'", '$&', '$`', '$$'].join('\n')
    const payload = `${hazardousMarkers}\n${migration}`
    const base64 = Buffer.from(payload, 'utf8').toString('base64')
    expect(Buffer.from(base64, 'base64').toString('utf8')).toBe(payload)
    expect(JSON.parse(JSON.stringify({ statements: [migration] })).statements[0]).toBe(
      migration,
    )
  })
})
