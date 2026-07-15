import { readFileSync } from 'node:fs'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type {
  ActiveRelatedProfileRow,
  Database,
  FunctionArgs,
  FunctionReturns,
  Tables,
  TablesInsert,
  TablesUpdate,
  Views,
} from '../../lib/supabase/types'

type ProfileRow = Tables<'profiles'>
type CoachClientRow = Tables<'coach_clients'>
type InvitationRow = Tables<'coach_invitations'>
type PaymentRow = Tables<'payments'>
type PushSubscriptionRow = Tables<'push_subscriptions'>

const profileInsert: TablesInsert<'profiles'> = { id: 'profile-id' }
const coachClientInsert: TablesInsert<'coach_clients'> = { client_id: 'client-id', coach_id: 'coach-id' }
const invitationInsert: TablesInsert<'coach_invitations'> = {
  coach_id: 'coach-id',
  expires_at: '2026-07-16T00:00:00.000Z',
  recipient_email: 'fixture@moovx.example.test',
  token_hash: 'synthetic-hash',
}
const paymentInsert: TablesInsert<'payments'> = { amount: 10 }
const pushInsert: TablesInsert<'push_subscriptions'> = { subscription: { endpoint: 'local-fixture' } }
const profileUpdate: TablesUpdate<'profiles'> = { full_name: 'Synthetic Profile' }
const relatedProjection = {} as ActiveRelatedProfileRow
// @ts-expect-error the projected view deliberately excludes Stripe authority.
const forbiddenProjectedStripeField = relatedProjection.stripe_account_id

// @ts-expect-error payments.amount is required by the canonical schema.
const paymentWithoutAmount: TablesInsert<'payments'> = {}
// @ts-expect-error subscription_price does not exist in canonical profiles.
const profileWithHistoricalColumn: TablesUpdate<'profiles'> = { subscription_price: 10 }
// @ts-expect-error stripe_checkout_session_id does not exist in canonical payments.
const paymentWithMissingColumn: TablesInsert<'payments'> = { amount: 10, stripe_checkout_session_id: 'local' }

describe('generated Supabase database types', () => {
  it('exposes Row, Insert and Update contracts for critical tables and the related-profile view', () => {
    expectTypeOf<ProfileRow['id']>().toEqualTypeOf<string>()
    expectTypeOf<CoachClientRow['status']>().toEqualTypeOf<string>()
    expectTypeOf<InvitationRow['token_hash']>().toEqualTypeOf<string>()
    expectTypeOf<PaymentRow['amount']>().toEqualTypeOf<number>()
    expectTypeOf<PushSubscriptionRow['subscription']>().toEqualTypeOf<Database['public']['Tables']['push_subscriptions']['Row']['subscription']>()
    expectTypeOf<Views<'active_related_profiles'>>().toEqualTypeOf<ActiveRelatedProfileRow>()
    expect([profileInsert, coachClientInsert, invitationInsert, paymentInsert, pushInsert, profileUpdate]).toHaveLength(6)
    expect(paymentWithoutAmount).toEqual({})
    expect(profileWithHistoricalColumn).toEqual({ subscription_price: 10 })
    expect(paymentWithMissingColumn).toEqual({ amount: 10, stripe_checkout_session_id: 'local' })
    expect(forbiddenProjectedStripeField).toBeUndefined()
  })

  it('types critical RPC arguments and results from the generated schema', () => {
    expectTypeOf<FunctionArgs<'assign_default_coach'>>().toEqualTypeOf<{ p_client_id: string; p_coach_id: string }>()
    expectTypeOf<FunctionArgs<'consume_coach_invitation'>>().toEqualTypeOf<{ p_token_hash: string }>()
    expectTypeOf<FunctionArgs<'claim_stripe_webhook_event'>>().toEqualTypeOf<{ p_event_id: string; p_event_type: string; p_payload: Database['public']['Tables']['coach_invitations']['Row']['metadata'] }>()
    expectTypeOf<FunctionArgs<'finalize_stripe_webhook_event'>>().toEqualTypeOf<{ p_error_message?: string; p_event_id: string; p_status: string }>()
    expectTypeOf<FunctionReturns<'claim_stripe_webhook_event'>>().toEqualTypeOf<string>()
  })

  it('contains schema structure only and no environment or credential material', () => {
    const generated = readFileSync(new URL('../../lib/supabase/database.types.ts', import.meta.url), 'utf8')
    expect(generated).toContain('GENERATED FILE — DO NOT EDIT MANUALLY')
    expect(generated).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL|postgresql:\/\/|https?:\/\//)
    expect(generated).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)
  })
})
