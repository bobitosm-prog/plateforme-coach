import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260823130000_create_legacy_entitlements_dark.sql',
  'utf8',
)

describe('legacy entitlement dark persistence migration', () => {
  it('creates the isolated table with its audited identity and lifecycle fields', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.legacy_entitlements')
    expect(migration).toMatch(/user_id uuid NOT NULL REFERENCES public\.profiles\(id\) ON DELETE CASCADE/)
    expect(migration).toMatch(/revoked_by uuid REFERENCES auth\.users\(id\) ON DELETE SET NULL/)
    expect(migration).toMatch(/created_by uuid REFERENCES auth\.users\(id\) ON DELETE SET NULL/)
    expect(migration).toContain("metadata jsonb NOT NULL DEFAULT '{}'::jsonb")
  })

  it('keeps entitlement type and source allowlists closed', () => {
    expect(migration).toContain("CHECK (type IN ('legacy_invited_access'))")
    expect(migration).toContain(
      "CHECK (source IN ('migration', 'admin', 'support_reconciliation'))",
    )
  })

  it('enforces temporal, revocation and metadata consistency', () => {
    expect(migration).toContain('CHECK (ends_at IS NULL OR ends_at > starts_at)')
    expect(migration).toContain('CHECK (revoked_at IS NULL OR revoked_at >= starts_at)')
    expect(migration).toMatch(
      /revoked_at IS NOT NULL[\s\S]*revocation_reason IS NOT NULL/,
    )
    expect(migration).toContain("CHECK (jsonb_typeof(metadata) = 'object')")
  })

  it('creates the uniqueness and audit lifecycle indexes idempotently', () => {
    expect(migration).toContain('UNIQUE (user_id, type)')
    expect(migration).toMatch(
      /CREATE INDEX IF NOT EXISTS legacy_entitlements_source_created_idx[\s\S]*\(source, created_at DESC\)/,
    )
    expect(migration).toMatch(
      /CREATE INDEX IF NOT EXISTS legacy_entitlements_ends_at_idx[\s\S]*WHERE ends_at IS NOT NULL/,
    )
    expect(migration).toMatch(
      /CREATE INDEX IF NOT EXISTS legacy_entitlements_revoked_at_idx[\s\S]*WHERE revoked_at IS NOT NULL/,
    )
  })

  it('forces RLS and leaves no browser policy or table privilege', () => {
    expect(migration).toContain(
      'ALTER TABLE public.legacy_entitlements ENABLE ROW LEVEL SECURITY',
    )
    expect(migration).toContain(
      'ALTER TABLE public.legacy_entitlements FORCE ROW LEVEL SECURITY',
    )
    expect(migration).toMatch(
      /REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN[\s\S]*FROM PUBLIC, anon, authenticated/,
    )
    expect(migration).not.toMatch(/CREATE POLICY/)
    expect(migration).not.toMatch(/GRANT [\s\S]* TO (?:anon|authenticated)/)
  })

  it('is transactional, repeatable and validates its dark-table postconditions', () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS')
    expect(migration.match(/CREATE INDEX IF NOT EXISTS/g)).toHaveLength(3)
    expect(migration).toContain('LEGACY_ENTITLEMENTS_RLS_INCOMPLETE')
    expect(migration).toContain('LEGACY_ENTITLEMENTS_BROWSER_POLICY_PRESENT')
    expect(migration).toContain('LEGACY_ENTITLEMENTS_BROWSER_GRANT_PRESENT')
  })

  it('contains no backfill, profile mutation or capability authority', () => {
    expect(migration).not.toMatch(/INSERT INTO public\.legacy_entitlements/i)
    expect(migration).not.toMatch(/(?:INSERT INTO|UPDATE|DELETE FROM) public\.profiles/i)
    expect(migration).not.toMatch(/subscription_type|subscription_status|stripe|coach_clients|invited_by_coach/i)
  })
})
