import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260823120000_add_coach_invitation_v2_lifecycle.sql',
), 'utf8')

const consume = sql.slice(
  sql.indexOf('CREATE OR REPLACE FUNCTION public.consume_coach_invitation_v2'),
  sql.indexOf('CREATE OR REPLACE FUNCTION public.revoke_coach_invitation_v2'),
)

describe('Invitation V2 migration contract', () => {
  it('stores only a unique 32-byte hash bound to normalized email', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.coach_invitations')
    expect(sql).toContain('token_hash bytea NOT NULL')
    expect(sql).toContain('UNIQUE (token_hash)')
    expect(sql).toContain('octet_length(token_hash) = 32')
    expect(sql).toContain('recipient_email = lower(btrim(recipient_email))')
    expect(sql).not.toMatch(/^\s*token\s+(?:text|bytea)/m)
  })

  it('enforces single-use/revocation lifecycle and locks before consumption', () => {
    expect(sql).toContain("status IN ('pending', 'consumed', 'revoked')")
    expect(consume).toMatch(/FROM public\.coach_invitations[\s\S]*FOR UPDATE/)
    expect(consume).toContain("invitation.status = 'consumed'")
    expect(consume).toContain("invitation.status = 'revoked'")
    expect(consume).toContain("SET\n    status = 'consumed'")
  })

  it('checks confirmed normalized email and delegates only create/invitation to the canonical writer', () => {
    expect(consume).toContain('users.email_confirmed_at')
    expect(consume).toContain('user_email IS DISTINCT FROM invitation.recipient_email')
    expect(consume).toContain('public.transition_coach_client_relation(')
    expect(consume).toMatch(/'create',\s*'invitation'/)
    expect(consume).not.toContain('INSERT INTO public.coach_clients')
    expect(consume).not.toContain("'replace'")
  })

  it('supports idempotent same-coach consumption, conflict preservation and same-pair history', () => {
    expect(consume).toContain("relation_result->>'outcome' = 'conflict'")
    expect(consume).toContain("('created', 'already_active_same_coach')")
    expect(consume).toContain('INVITATION_ACTIVE_COACH_CONFLICT')
    const canonical = readFileSync(resolve(
      process.cwd(),
      'supabase/migrations/20260823100000_add_canonical_coach_relation_writer.sql',
    ), 'utf8')
    expect(canonical).toContain("relation.status = 'active'")
    expect(canonical).toContain('INSERT INTO public.coach_clients')
  })

  it('serializes duplicates and relies on the canonical per-client lock for competing invitations', () => {
    expect(sql).toContain('prevent_duplicate_pending_coach_invitation')
    expect(sql).toContain('pg_catalog.pg_advisory_xact_lock')
    const canonical = readFileSync(resolve(
      process.cwd(),
      'supabase/migrations/20260823100000_add_canonical_coach_relation_writer.sql',
    ), 'utf8')
    expect(canonical).toContain('pg_catalog.pg_advisory_xact_lock')
    expect(canonical).toContain('coach_clients_one_active_per_client_idx')
  })

  it('keeps entitlement completely outside invitation consumption', () => {
    expect(consume).not.toMatch(/subscription_type|subscription_status|trial_ends_at|stripe_|entitlement|plan/i)
  })

  it('forces RLS, exposes no token hash and grants no anonymous table access', () => {
    expect(sql).toContain('ALTER TABLE public.coach_invitations ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('ALTER TABLE public.coach_invitations FORCE ROW LEVEL SECURITY')
    expect(sql).toContain('REVOKE ALL ON TABLE public.coach_invitations FROM PUBLIC, anon, authenticated')
    const selectGrant = sql.match(/GRANT SELECT \(([\s\S]*?)\) ON public\.coach_invitations TO authenticated;/)
    expect(selectGrant?.[1]).not.toContain('token_hash')
    expect(sql).toContain('DROP FUNCTION IF EXISTS public.consume_coach_invitation(bytea)')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.consume_coach_invitation_v2(bytea) TO authenticated')
    expect(sql).not.toMatch(/GRANT (?:SELECT|INSERT|UPDATE|DELETE).* TO anon/)
  })
})
