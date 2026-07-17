import type Stripe from 'stripe'

export type PlatformPlanId = 'client_monthly' | 'client_yearly' | 'client_lifetime' | 'coach_monthly'

export interface PlatformPlan {
  id: PlatformPlanId
  mode: 'subscription' | 'payment'
  requiredRole: 'client' | 'coach'
  amount: number
  description: string
}

export const PLATFORM_PLANS: Record<PlatformPlanId, PlatformPlan> = {
  client_monthly: { id: 'client_monthly', mode: 'subscription', requiredRole: 'client', amount: 10, description: 'MoovX Athena — Mensuel' },
  client_yearly: { id: 'client_yearly', mode: 'subscription', requiredRole: 'client', amount: 80, description: 'MoovX Athena — Annuel' },
  client_lifetime: { id: 'client_lifetime', mode: 'payment', requiredRole: 'client', amount: 150, description: 'MoovX Athena — À vie' },
  coach_monthly: { id: 'coach_monthly', mode: 'subscription', requiredRole: 'coach', amount: 50, description: 'MoovX Coach Pro — Mensuel' },
}

export type CheckoutErrorCode =
  | 'INVALID_REQUEST'
  | 'PROFILE_NOT_FOUND'
  | 'STRIPE_NOT_CONFIGURED'
  | 'SERVER_MISCONFIGURED'
  | 'INVALID_PLAN'
  | 'ROLE_FORBIDDEN'
  | 'PRICE_NOT_CONFIGURED'
  | 'RELATION_FORBIDDEN'
  | 'COACH_NOT_FOUND'
  | 'COACH_STRIPE_MISSING'
  | 'RATE_INVALID'

export class CheckoutServiceError extends Error {
  constructor(public readonly code: CheckoutErrorCode) {
    super(code)
    this.name = 'CheckoutServiceError'
  }
}

export interface StripeCheckoutPort {
  createSession(
    params: Stripe.Checkout.SessionCreateParams,
    idempotencyKey: string,
  ): Promise<{ id: string; url: string | null }>
  createCustomer(params: Stripe.CustomerCreateParams): Promise<{ id: string }>
}

export interface PlatformCheckoutRepository {
  findProfile(userId: string): Promise<{ role: string | null } | null>
  findPlatformConnectAccount(): Promise<string | null>
  insertPendingPayment(payment: {
    coach_id: null
    client_id: string
    stripe_checkout_session_id: string
    amount: number
    currency: 'chf'
    description: string
    status: 'pending'
  }): Promise<void>
}

export interface CoachCheckoutRepository {
  findCallerProfile(clientId: string): Promise<{ role: string | null } | null>
  findUniqueActiveCoachId(clientId: string): Promise<string | null>
  findCoach(coachId: string): Promise<{
    role: string | null
    stripeAccountId: string | null
    monthlyRate: number | null
    fullName: string | null
  } | null>
  findClient(clientId: string): Promise<{
    email: string | null
    fullName: string | null
    stripeCustomerId: string | null
  } | null>
  updateStripeCustomerId(clientId: string, customerId: string): Promise<void>
}

export function validatePlatformCheckoutBody(body: unknown): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CheckoutServiceError('INVALID_REQUEST')
  const record = body as Record<string, unknown>
  if (Object.keys(record).some(key => key !== 'planId') || typeof record.planId !== 'string') {
    throw new CheckoutServiceError('INVALID_REQUEST')
  }
  return record.planId
}

export function validateCoachCheckoutBody(body: unknown): void {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length > 0) {
    throw new CheckoutServiceError('INVALID_REQUEST')
  }
}

export function resolvePlatformPlan(planId: string): PlatformPlan {
  const plan = PLATFORM_PLANS[planId as PlatformPlanId]
  if (!plan) throw new CheckoutServiceError('INVALID_PLAN')
  return plan
}

export function buildPlatformMetadata(userId: string, plan: PlatformPlan) {
  return { clientId: userId, planId: plan.id, coachId: 'platform', subType: plan.id }
}

export function buildCoachMetadata(clientId: string, coachId: string) {
  return { clientId, coachId, subType: 'coach_monthly', type: 'coach_subscription' }
}

export function buildPlatformSessionParams(input: {
  userId: string
  plan: PlatformPlan
  priceId: string
  appUrl: string
  destinationAccountId: string | null
}): Stripe.Checkout.SessionCreateParams {
  const { userId, plan, priceId, appUrl, destinationAccountId } = input
  const isCoachPlan = plan.id === 'coach_monthly'
  const metadata = buildPlatformMetadata(userId, plan)
  const params: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    mode: plan.mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}${isCoachPlan ? '/coach?payment=success' : '/?payment=success'}`,
    cancel_url: `${appUrl}${isCoachPlan ? '/coach?payment=cancel' : '/?payment=cancel'}`,
    metadata,
  }

  if (plan.mode === 'subscription') {
    params.subscription_data = { metadata: { clientId: userId, subType: plan.id } }
  }
  if (destinationAccountId && plan.mode === 'subscription') {
    params.subscription_data = {
      ...params.subscription_data,
      transfer_data: { destination: destinationAccountId },
    }
  }
  if (destinationAccountId && plan.mode === 'payment') {
    params.payment_intent_data = {
      transfer_data: { destination: destinationAccountId },
      metadata: { clientId: userId, subType: plan.id },
    }
  }
  return params
}

export function buildCoachSessionParams(input: {
  clientId: string
  coachId: string
  customerId: string
  coachName: string | null
  coachStripeAccountId: string
  amountCentimes: number
  appUrl: string
}): Stripe.Checkout.SessionCreateParams {
  const coachName = input.coachName || 'MoovX'
  const metadata = buildCoachMetadata(input.clientId, input.coachId)
  return {
    payment_method_types: ['card'],
    mode: 'subscription',
    customer: input.customerId,
    line_items: [{
      price_data: {
        currency: 'chf',
        product_data: {
          name: `Coaching ${coachName}`,
          description: `Abonnement mensuel coaching fitness avec ${input.coachName || 'votre coach'}`,
        },
        unit_amount: input.amountCentimes,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    subscription_data: {
      application_fee_percent: 3,
      transfer_data: { destination: input.coachStripeAccountId },
      metadata,
    },
    success_url: `${input.appUrl}/?payment=success`,
    cancel_url: `${input.appUrl}/?payment=canceled`,
    metadata,
  }
}

export async function createPlatformCheckout(input: {
  userId: string
  body: unknown
  stripeConfigured: boolean
  stripe: () => StripeCheckoutPort
  repository: PlatformCheckoutRepository
  priceIds: Partial<Record<PlatformPlanId, string | undefined>>
  appUrl: string
  nowMs?: () => number
}): Promise<{ url: string | null }> {
  const planId = validatePlatformCheckoutBody(input.body)
  const profile = await input.repository.findProfile(input.userId)
  if (!profile) throw new CheckoutServiceError('PROFILE_NOT_FOUND')
  if (!input.stripeConfigured) throw new CheckoutServiceError('STRIPE_NOT_CONFIGURED')

  const plan = resolvePlatformPlan(planId)
  if (profile.role !== plan.requiredRole) throw new CheckoutServiceError('ROLE_FORBIDDEN')
  const priceId = input.priceIds[plan.id]
  if (!priceId) throw new CheckoutServiceError('PRICE_NOT_CONFIGURED')

  const destinationAccountId = await input.repository.findPlatformConnectAccount()
  const session = await input.stripe().createSession(buildPlatformSessionParams({
    userId: input.userId,
    plan,
    priceId,
    appUrl: input.appUrl,
    destinationAccountId,
  }), `checkout-${input.userId}-${plan.id}-${(input.nowMs || Date.now)()}`)

  await input.repository.insertPendingPayment({
    coach_id: null,
    client_id: input.userId,
    stripe_checkout_session_id: session.id,
    amount: plan.amount,
    currency: 'chf',
    description: plan.description,
    status: 'pending',
  })
  return { url: session.url }
}

export async function createCoachCheckout(input: {
  clientId: string
  body: unknown
  stripeConfigured: boolean
  stripe: () => StripeCheckoutPort
  repository: CoachCheckoutRepository
  appUrl: string
  nowMs?: () => number
}): Promise<{ url: string | null }> {
  if (!input.stripeConfigured) throw new CheckoutServiceError('STRIPE_NOT_CONFIGURED')
  validateCoachCheckoutBody(input.body)

  const caller = await input.repository.findCallerProfile(input.clientId)
  if (!caller) throw new CheckoutServiceError('PROFILE_NOT_FOUND')
  if (caller.role !== 'client') throw new CheckoutServiceError('ROLE_FORBIDDEN')

  const coachId = await input.repository.findUniqueActiveCoachId(input.clientId)
  if (!coachId) throw new CheckoutServiceError('RELATION_FORBIDDEN')
  const coach = await input.repository.findCoach(coachId)
  if (!coach) throw new CheckoutServiceError('COACH_NOT_FOUND')
  if (coach.role !== 'coach') throw new CheckoutServiceError('ROLE_FORBIDDEN')
  if (!coach.stripeAccountId) throw new CheckoutServiceError('COACH_STRIPE_MISSING')

  const rawRate = coach.monthlyRate || 50
  if (typeof rawRate !== 'number' || !Number.isFinite(rawRate) || rawRate < 30 || rawRate > 500) {
    throw new CheckoutServiceError('RATE_INVALID')
  }
  const amountCentimes = Math.round(Math.round(rawRate * 100) / 100 * 100)

  const client = await input.repository.findClient(input.clientId)
  if (!client) throw new CheckoutServiceError('PROFILE_NOT_FOUND')
  const stripe = input.stripe()
  let customerId = client.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.createCustomer({
      email: client.email || undefined,
      name: client.fullName || undefined,
      metadata: { userId: input.clientId, coachId },
    })
    customerId = customer.id
    await input.repository.updateStripeCustomerId(input.clientId, customerId)
  }

  const session = await stripe.createSession(buildCoachSessionParams({
    clientId: input.clientId,
    coachId,
    customerId,
    coachName: coach.fullName,
    coachStripeAccountId: coach.stripeAccountId,
    amountCentimes,
    appUrl: input.appUrl,
  }), `coach-checkout-${input.clientId}-${coachId}-${(input.nowMs || Date.now)()}`)
  return { url: session.url }
}
