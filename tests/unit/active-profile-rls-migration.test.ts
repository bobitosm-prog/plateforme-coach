import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260822120000_harden_active_coach_profile_rls.sql',
  'utf8',
)

describe('active coach profile RLS migration', () => {
  it('fails fast unless the relation status and profile tables already exist', () => {
    expect(migration).toContain("to_regclass('public.coach_clients')")
    expect(migration).toContain("column_name = 'status'")
    expect(migration).toContain("to_regclass('public.profiles')")
    expect(migration).not.toMatch(/ADD COLUMN(?: IF NOT EXISTS)? status/i)
  })

  it('defines one immutable-scope active relation helper', () => {
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.is_active_coach_client_relation\([\s\S]*coach_uuid uuid,[\s\S]*client_uuid uuid[\s\S]*RETURNS boolean/,
    )
    expect(migration).toMatch(/STABLE\s+SECURITY DEFINER\s+SET search_path = ''/)
    expect(migration).toMatch(/relation\.coach_id = coach_uuid/)
    expect(migration).toMatch(/relation\.client_id = client_uuid/)
    expect(migration).toMatch(/relation\.status = 'active'/)
    expect(migration).not.toMatch(/invited_by_coach|subscription_(?:type|status)/)
  })

  it('allows helper execution only to authenticated and service roles', () => {
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.is_active_coach_client_relation\(uuid, uuid\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    )
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.is_active_coach_client_relation\(uuid, uuid\)[\s\S]*TO authenticated, service_role/,
    )
    expect(migration).not.toMatch(/GRANT EXECUTE[\s\S]*TO anon/)
  })

  it('binds coach profile reads and writes to the active relation helper', () => {
    expect(migration).toMatch(
      /CREATE POLICY "coaches can update active client profiles"[\s\S]*FOR UPDATE[\s\S]*USING \([\s\S]*is_active_coach_client_relation\(auth\.uid\(\), profiles\.id\)[\s\S]*WITH CHECK \([\s\S]*is_active_coach_client_relation\(auth\.uid\(\), profiles\.id\)/,
    )
    expect(migration).toMatch(
      /CREATE POLICY "profiles_coach_select_active_client"[\s\S]*FOR SELECT[\s\S]*is_active_coach_client_relation\(auth\.uid\(\), profiles\.id\)/,
    )
    expect(migration).toMatch(
      /CREATE POLICY "profiles_client_select_active_coach"[\s\S]*FOR SELECT[\s\S]*is_active_coach_client_relation\(profiles\.id, auth\.uid\(\)\)/,
    )
  })

  it('removes known unfiltered policies without touching owner policies', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "coaches can update client profiles"')
    expect(migration).toContain('DROP POLICY IF EXISTS "clients can read their coach profiles"')
    expect(migration).toContain('LEGACY_UNFILTERED_PROFILE_POLICY_REMAINS')
    expect(migration).not.toMatch(/DROP POLICY IF EXISTS "profiles_(?:insert|select|update)_own"/)
    expect(migration).not.toMatch(/CREATE POLICY "coaches can update client profiles"/)
    expect(migration).not.toMatch(/CREATE POLICY "clients can read their coach profiles"/)
  })

  it('is transactional and leaves unrelated RLS domains untouched', () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).not.toMatch(
      /ON public\.(?:workout_sessions|daily_food_logs|weight_logs|messages|payments|coach_notes|coach_appointments|activity_feed)/,
    )
  })
})
