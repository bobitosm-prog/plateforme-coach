import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CoachCheckoutRepository, PlatformCheckoutRepository } from './service'

export function createPlatformCheckoutRepository(input: {
  auth: SupabaseClient
  supabaseUrl: string
  serviceRoleKey: string | undefined
  ownerEmail: string
}): PlatformCheckoutRepository {
  let admin: SupabaseClient | null = null
  const getAdmin = () => {
    if (admin) return admin
    if (!input.serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for Stripe checkout')
    admin = createClient(input.supabaseUrl, input.serviceRoleKey)
    return admin
  }
  return {
    async findProfile(userId) {
      const { data } = await input.auth.from('profiles').select('role').eq('id', userId).single()
      return data
    },
    async findPlatformConnectAccount() {
      const { data } = await getAdmin().from('profiles').select('stripe_account_id, stripe_onboarding_complete').eq('email', input.ownerEmail).maybeSingle()
      return data?.stripe_account_id && data.stripe_onboarding_complete ? data.stripe_account_id : null
    },
    async insertPendingPayment(payment) {
      await getAdmin().from('payments').insert(payment)
    },
  }
}

export function createCoachCheckoutRepository(admin: SupabaseClient): CoachCheckoutRepository {
  return {
    async findCallerProfile(clientId) {
      const { data } = await admin.from('profiles').select('role').eq('id', clientId).single()
      return data
    },
    async findUniqueActiveCoachId(clientId) {
      const { data } = await admin.from('coach_clients').select('coach_id').eq('client_id', clientId).eq('status', 'active').maybeSingle()
      return data?.coach_id || null
    },
    async findCoach(coachId) {
      const { data } = await admin.from('profiles').select('role, stripe_account_id, coach_monthly_rate, full_name').eq('id', coachId).single()
      return data ? { role: data.role, stripeAccountId: data.stripe_account_id, monthlyRate: data.coach_monthly_rate, fullName: data.full_name } : null
    },
    async findClient(clientId) {
      const { data } = await admin.from('profiles').select('email, full_name, stripe_customer_id').eq('id', clientId).single()
      return data ? { email: data.email, fullName: data.full_name, stripeCustomerId: data.stripe_customer_id } : null
    },
    async updateStripeCustomerId(clientId, customerId) {
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', clientId)
    },
  }
}
