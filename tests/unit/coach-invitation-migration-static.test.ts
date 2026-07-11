import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260711190500_add_coach_invitations.sql',
)
const sql = readFileSync(migrationPath, 'utf8')

describe('coach invitations migration — static security contract', () => {
  it('creates an additive table with a 32-byte unique token hash and no raw token column', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.coach_invitations/)
    expect(sql).toMatch(/token_hash bytea NOT NULL/)
    expect(sql).toMatch(/octet_length\(token_hash\) = 32/)
    expect(sql).toMatch(/UNIQUE \(token_hash\)/)
    expect(sql).not.toMatch(/^\s*token\s+(?:text|bytea)/m)
  })

  it('constrains statuses and coherent terminal lifecycle fields', () => {
    expect(sql).toContain("status IN ('pending', 'consumed', 'revoked')")
    expect(sql).toMatch(/status = 'consumed'[\s\S]*consumed_at IS NOT NULL[\s\S]*consumed_by IS NOT NULL/)
    expect(sql).toMatch(/status = 'revoked'[\s\S]*revoked_at IS NOT NULL[\s\S]*revoked_by IS NOT NULL/)
    expect(sql).toContain('expires_at > created_at')
  })

  it('serializes non-expired pending duplicates without persisting expired status', () => {
    expect(sql).toContain("IF NEW.status <> 'pending' THEN")
    expect(sql).toContain('pg_advisory_xact_lock')
    expect(sql).toContain("invitations.status = 'pending'")
    expect(sql).toContain('invitations.expires_at > clock_timestamp()')
    expect(sql).toContain('INVITATION_ALREADY_PENDING')
  })

  it('enables and forces RLS without granting direct delete access', () => {
    expect(sql).toContain('ALTER TABLE public.coach_invitations ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('ALTER TABLE public.coach_invitations FORCE ROW LEVEL SECURITY')
    expect(sql).toContain('REVOKE ALL ON TABLE public.coach_invitations FROM anon, authenticated')
    expect(sql).not.toMatch(/GRANT DELETE[\s\S]*coach_invitations/)
  })

  it('never grants token_hash as a selectable column to authenticated users', () => {
    const selectGrant = sql.match(
      /GRANT SELECT \(([\s\S]*?)\) ON public\.coach_invitations TO authenticated;/,
    )

    expect(selectGrant).not.toBeNull()
    expect(selectGrant?.[1]).not.toContain('token_hash')
  })

  it('defines a SECURITY DEFINER consumption RPC with a fixed safe search path', () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.consume_coach_invitation\(p_token_hash bytea\)/,
    )
    expect(sql).toMatch(/SECURITY DEFINER\s+SET search_path TO pg_catalog, public/)
    expect(sql).toContain('v_uid uuid := auth.uid()')
  })

  it('accepts no client, coach or subscription authority parameters', () => {
    const signature = sql.match(
      /CREATE OR REPLACE FUNCTION public\.consume_coach_invitation\(([^)]*)\)/,
    )

    expect(signature?.[1].trim()).toBe('p_token_hash bytea')
    expect(signature?.[1]).not.toMatch(/client|coach|subscription|auto_assign/i)
  })

  it('locks the invitation and client profile before performing atomic mutations', () => {
    const rpc = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.consume_coach_invitation'))

    expect(rpc).toMatch(/FROM public\.coach_invitations AS invitations[\s\S]*FOR UPDATE/)
    expect(rpc).toMatch(/FROM public\.profiles[\s\S]*WHERE profiles\.id = v_uid[\s\S]*FOR UPDATE/)
    expect(rpc).toContain("subscription_type = 'invited'")
    expect(rpc).toContain('INSERT INTO public.coach_clients')
    expect(rpc).toContain("SET status = 'consumed'")
  })

  it('revokes public and anonymous execution before granting authenticated only', () => {
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.consume_coach_invitation(bytea) FROM PUBLIC',
    )
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.consume_coach_invitation(bytea) FROM anon',
    )
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.consume_coach_invitation\(bytea\)\s+TO authenticated/,
    )
  })
})
