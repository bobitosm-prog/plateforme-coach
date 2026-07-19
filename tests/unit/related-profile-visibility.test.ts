import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260715001000_secure_related_profile_visibility.sql', 'utf8')
const coachDashboard = readFileSync('app/coach/hooks/useCoachDashboard.ts', 'utf8')
const coachAnalytics = readFileSync('app/coach/hooks/useCoachAnalytics.ts', 'utf8')
const clientDetail = readFileSync('app/client/[id]/hooks/useClientDetail.ts', 'utf8')
const coachSection = readFileSync('app/components/tabs/profile/CoachSection.tsx', 'utf8')
const relationRepository = readFileSync('lib/repositories/coach-client-relations/index.ts', 'utf8')

describe('related profile visibility contract', () => {
  it('requires an active symmetric relation and excludes authority fields from the projection', () => {
    expect(migration).toContain("relation.status = 'active'")
    expect(migration).toContain('relation.coach_id = auth.uid() AND relation.client_id = profile.id')
    expect(migration).toContain('relation.client_id = auth.uid() AND relation.coach_id = profile.id')

    const projection = migration.slice(
      migration.indexOf('CREATE VIEW public.active_related_profiles'),
      migration.indexOf('REVOKE ALL ON public.active_related_profiles'),
    )
    for (const authority of ['stripe_customer_id', 'stripe_subscription_id', 'stripe_account_id', 'trial_ends_at', 'beta_campaign_id']) {
      expect(projection).not.toContain(`profile.${authority}`)
    }
  })

  it('limits coach updates to an active relation and an explicit field allowlist', () => {
    expect(migration).toContain('CREATE POLICY "coaches can update active client profiles"')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.update_active_client_profile')
    expect(migration).toContain('PROFILE_FIELD_NOT_COACH_EDITABLE')
    expect(migration).toContain('ACTIVE_COACH_RELATION_REQUIRED')
    expect(migration).toContain("SET search_path = ''")
  })

  it('routes coach dashboard, analytics, detail and client coach display through the projection', () => {
    expect(coachDashboard).toContain('createCoachClientRelationRepository')
    expect(coachAnalytics).toContain('createCoachClientRelationRepository')
    expect(relationRepository).toContain("from('active_related_profiles')")
    expect(clientDetail).toContain(".from('active_related_profiles')")
    expect(clientDetail).toContain(".rpc('update_active_client_profile'")
    expect(clientDetail).not.toContain(".from('profiles').update")
    expect(coachSection).toContain(".from('active_related_profiles')")
  })
})
