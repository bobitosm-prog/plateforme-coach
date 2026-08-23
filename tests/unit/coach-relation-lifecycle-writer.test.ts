import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260823100000_add_canonical_coach_relation_writer.sql',
  'utf8',
)

const functionBody = migration.slice(
  migration.indexOf('CREATE OR REPLACE FUNCTION public.transition_coach_client_relation'),
  migration.indexOf('REVOKE ALL ON FUNCTION public.transition_coach_client_relation'),
)

describe('canonical coach relation lifecycle writer', () => {
  it('fails fast unless the complete lifecycle schema and active uniqueness guard exist', () => {
    expect(migration).toContain("to_regclass('public.coach_clients')")
    for (const column of [
      'status',
      'source',
      'started_at',
      'ended_at',
      'ended_by',
      'end_reason',
    ]) {
      expect(migration).toContain(`'${column}'`)
    }
    expect(migration).toContain("is_nullable = 'NO'")
    expect(migration).toContain("to_regclass('public.coach_clients_one_active_per_client_idx')")
    expect(migration).toContain("client_column.attname = 'client_id'")
    expect(migration).toContain('relation_index.indnkeyatts = 1')
    expect(migration).not.toMatch(/ADD COLUMN(?: IF NOT EXISTS)?/i)
  })

  it('exposes one service-role-only security definer RPC', () => {
    expect(functionBody).toMatch(/RETURNS jsonb[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = ''/)
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.transition_coach_client_relation\([\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    )
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.transition_coach_client_relation\([\s\S]*TO service_role/,
    )
    expect(migration).not.toMatch(/GRANT EXECUTE[\s\S]*TO (?:PUBLIC|anon|authenticated)/)
  })

  it('uses bounded operations, sources and end reasons', () => {
    expect(functionBody).toContain("p_operation NOT IN ('create', 'end', 'replace')")
    expect(functionBody).toContain("p_source NOT IN ('default', 'invitation', 'admin', 'legacy')")
    for (const reason of [
      'client_request',
      'coach_request',
      'replaced',
      'admin_action',
      'legacy_reconciliation',
    ]) {
      expect(functionBody).toContain(`'${reason}'`)
    }
  })

  it('serializes every transition by client before reading the active row', () => {
    const lock = functionBody.indexOf('pg_catalog.pg_advisory_xact_lock')
    const activeRead = functionBody.indexOf('SELECT count(*)')
    const firstWrite = Math.min(
      functionBody.indexOf('INSERT INTO public.coach_clients'),
      functionBody.indexOf('UPDATE public.coach_clients'),
    )

    expect(lock).toBeGreaterThan(-1)
    expect(lock).toBeLessThan(activeRead)
    expect(activeRead).toBeLessThan(firstWrite)
    expect(functionBody).toContain('COACH_RELATION_MULTIPLE_ACTIVE_ROWS')
  })

  it('creates a new active period without upsert or historical-row lookup', () => {
    expect(functionBody).toMatch(
      /INSERT INTO public\.coach_clients \([\s\S]*coach_id,[\s\S]*client_id,[\s\S]*status,[\s\S]*source,[\s\S]*started_at,[\s\S]*ended_at,[\s\S]*ended_by,[\s\S]*end_reason/,
    )
    expect(functionBody).toContain("'outcome', 'created'")
    expect(functionBody).toContain("'outcome', 'already_active_same_coach'")
    expect(functionBody).toContain("'outcome', 'conflict'")
    expect(functionBody).not.toMatch(/\bUPSERT\b/i)
    expect(functionBody).not.toMatch(/ON CONFLICT/i)
    expect(functionBody).not.toMatch(/coach_id\s*=\s*p_coach_id[\s\S]{0,120}client_id\s*=\s*p_client_id[\s\S]{0,120}status\s*=\s*'ended'/)
  })

  it('ends only the exact active relation and preserves historical identity fields', () => {
    expect(functionBody).toMatch(
      /IF p_operation = 'end'[\s\S]*active_relation\.coach_id <> p_coach_id[\s\S]*UPDATE public\.coach_clients AS relation[\s\S]*status = 'ended'[\s\S]*ended_at = transition_time[\s\S]*ended_by = p_actor_id[\s\S]*end_reason = p_end_reason[\s\S]*relation\.id = active_relation\.id[\s\S]*relation\.status = 'active'/,
    )
    expect(functionBody).toContain("'outcome', 'ended'")
    expect(functionBody).toContain("'outcome', 'no_active_relation'")
    expect(functionBody).not.toMatch(/SET[\s\S]{0,160}(?:coach_id|client_id|source|started_at|created_at)\s*=/)
    expect(functionBody).not.toMatch(/\bDELETE\s+FROM\s+public\.coach_clients/i)
  })

  it('atomically ends the old active period and inserts a new replacement period', () => {
    const replacementUpdate = functionBody.lastIndexOf('UPDATE public.coach_clients AS relation')
    const replacementInsert = functionBody.lastIndexOf('INSERT INTO public.coach_clients')

    expect(replacementUpdate).toBeGreaterThan(-1)
    expect(replacementUpdate).toBeLessThan(replacementInsert)
    expect(functionBody.slice(replacementUpdate, replacementInsert)).toContain("end_reason = 'replaced'")
    expect(functionBody).toContain("'outcome', 'replaced'")
    expect(functionBody).not.toMatch(/SET[\s\S]{0,100}coach_id\s*=\s*p_coach_id/)
  })

  it('keeps relation writes independent from product entitlements', () => {
    expect(functionBody).not.toMatch(
      /subscription_(?:type|status)|trial_ends_at|stripe_|\bplan\b|entitlement/i,
    )
  })

  it('returns recognizable outcomes while allowing database failures to propagate', () => {
    for (const outcome of [
      'created',
      'ended',
      'replaced',
      'already_active_same_coach',
      'no_active_relation',
      'conflict',
      'error',
    ]) {
      expect(functionBody).toContain(`'outcome', '${outcome}'`)
    }
    expect(functionBody).not.toMatch(/EXCEPTION\s+WHEN\s+OTHERS/i)
  })

  it('is transactional and idempotently versions only the writer authority', () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.transition_coach_client_relation')
    expect(migration).not.toMatch(/(?:CREATE|DROP) POLICY/i)
  })
})
