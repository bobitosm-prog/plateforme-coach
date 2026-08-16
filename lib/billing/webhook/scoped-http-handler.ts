import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSecurityAudit } from '@/lib/security/audit-log'
import { deliverWebhookEvent } from './delivery'

export const PLATFORM_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'invoice.payment_succeeded',
  'customer.subscription.deleted',
] as const

export const CONNECT_WEBHOOK_EVENTS = ['account.updated'] as const

type WebhookScope = 'platform' | 'connect'
type WebhookEventType =
  | typeof PLATFORM_WEBHOOK_EVENTS[number]
  | typeof CONNECT_WEBHOOK_EVENTS[number]

interface ScopedWebhookConfig {
  scope: WebhookScope
  operation: string
  secretVariable:
    | 'STRIPE_PLATFORM_WEBHOOK_SECRET'
    | 'STRIPE_CONNECT_WEBHOOK_SECRET'
  allowedEvents: readonly WebhookEventType[]
}

interface ScopedWebhookDependencies {
  createStripe(secretKey: string): Stripe
  createSupabase(): SupabaseClient | Promise<SupabaseClient>
  deliver: typeof deliverWebhookEvent
}

const defaultDependencies: ScopedWebhookDependencies = {
  createStripe: secretKey => {
    const endpoint = process.env.STRIPE_E2E_BASE_URL
    if (!endpoint) return new Stripe(secretKey)
    if (process.env.MOOVX_E2E !== '1') {
      throw new Error('Stripe E2E endpoint requires MOOVX_E2E=1')
    }
    const url = new URL(endpoint)
    if (
      url.protocol !== 'http:'
      || !['127.0.0.1', 'localhost'].includes(url.hostname)
      || url.pathname !== '/'
    ) {
      throw new Error('Stripe E2E endpoint must be a local HTTP origin')
    }
    return new Stripe(secretKey, {
      host: url.hostname,
      port: Number(url.port),
      protocol: 'http',
    })
  },
  createSupabase: async () => {
    const { createSupabaseAdminClient } = await import('@/lib/supabase/admin')
    return createSupabaseAdminClient()
  },
  deliver: deliverWebhookEvent,
}

function configurationError(
  request: NextRequest,
  operation: string,
  reason: string,
) {
  const audit = createSecurityAudit(request)
  return audit.reject(
    NextResponse.json({ error: 'Webhook configuration unavailable' }, { status: 503 }),
    {
      event: 'STRIPE_WEBHOOK_REJECTED',
      domain: 'stripe',
      operation,
      outcome: 'failed',
      reason,
      status: 503,
    },
  )
}

function requestError(
  request: NextRequest,
  operation: string,
  reason: string,
) {
  const audit = createSecurityAudit(request)
  return audit.reject(
    NextResponse.json({ error: 'Invalid webhook request' }, { status: 400 }),
    {
      event: 'STRIPE_WEBHOOK_REJECTED',
      domain: 'stripe',
      operation,
      outcome: 'rejected',
      reason,
      status: 400,
    },
  )
}

function parseExpectedLivemode(value: string | undefined): boolean | null {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function hasConnectedAccount(event: Stripe.Event): boolean {
  return typeof event.account === 'string' && event.account.trim() !== ''
}

function connectAuthorityMatches(event: Stripe.Event): boolean {
  if (!hasConnectedAccount(event)) return false
  const object = event.data.object
  return (
    typeof object === 'object'
    && object !== null
    && 'id' in object
    && typeof object.id === 'string'
    && object.id === event.account
  )
}

function responseForDelivery(
  request: NextRequest,
  operation: string,
  eventType: string,
  result: Awaited<ReturnType<typeof deliverWebhookEvent>>,
) {
  const audit = createSecurityAudit(request)
  if (result.outcome === 'reservation_failed') {
    return NextResponse.json({ error: 'Webhook reservation failed' }, { status: 503 })
  }
  if (result.outcome === 'duplicate') {
    return audit.reject(
      NextResponse.json({ received: true, duplicate: true }),
      {
        event: 'STRIPE_WEBHOOK_REPLAY_SKIPPED',
        domain: 'stripe',
        operation: 'claim_webhook',
        outcome: 'skipped',
        reason: 'WEBHOOK_ALREADY_PROCESSED',
        status: 200,
        context: { event_type: eventType },
      },
    )
  }
  if (result.outcome === 'already_processing') {
    return audit.reject(
      NextResponse.json(
        { error: 'Webhook already processing' },
        { status: 409 },
      ),
      {
        event: 'STRIPE_WEBHOOK_REJECTED',
        domain: 'stripe',
        operation: 'claim_webhook',
        outcome: 'rejected',
        reason: 'WEBHOOK_ALREADY_PROCESSING',
        status: 409,
        context: { event_type: eventType },
      },
    )
  }
  if (result.outcome === 'skipped') {
    return NextResponse.json({ received: true, skipped: true })
  }
  if (result.outcome === 'success') {
    return NextResponse.json({ received: true })
  }
  if (result.outcome === 'finalization_failed') {
    const error = result.processingFailed
      ? 'Webhook processing and finalization failed'
      : 'Webhook finalization failed'
    if (!result.processingFailed) {
      return NextResponse.json({ error }, { status: 503 })
    }
    return audit.reject(
      NextResponse.json({ error }, { status: 503 }),
      {
        event: 'STRIPE_WEBHOOK_REJECTED',
        domain: 'stripe',
        operation,
        outcome: 'failed',
        reason: result.reason,
        status: 503,
        context: { event_type: eventType, finalization_failed: true },
      },
    )
  }
  return audit.reject(
    NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 }),
    {
      event: 'STRIPE_WEBHOOK_REJECTED',
      domain: 'stripe',
      operation,
      outcome: 'failed',
      reason: result.reason,
      status: 500,
      context: { event_type: eventType },
    },
  )
}

export function createScopedStripeWebhookHandler(
  config: ScopedWebhookConfig,
  dependencies: ScopedWebhookDependencies = defaultDependencies,
) {
  const allowedEvents = new Set<string>(config.allowedEvents)

  return async function POST(request: NextRequest) {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    const routeSecret = process.env[config.secretVariable]
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const expectedLivemode = parseExpectedLivemode(
      process.env.STRIPE_WEBHOOK_EXPECTED_LIVEMODE,
    )

    if (!routeSecret) {
      return configurationError(
        request,
        config.operation,
        'WEBHOOK_ROUTE_SECRET_MISSING',
      )
    }
    if (!stripeSecretKey) {
      return configurationError(
        request,
        config.operation,
        'STRIPE_CONFIGURATION_MISSING',
      )
    }
    if (expectedLivemode === null) {
      return configurationError(
        request,
        config.operation,
        'WEBHOOK_LIVEMODE_CONFIGURATION_INVALID',
      )
    }
    if (!signature) {
      return requestError(
        request,
        config.operation,
        'STRIPE_SIGNATURE_INVALID',
      )
    }

    let stripe: Stripe
    let event: Stripe.Event
    try {
      stripe = dependencies.createStripe(stripeSecretKey)
      event = stripe.webhooks.constructEvent(body, signature, routeSecret)
    } catch {
      return requestError(
        request,
        config.operation,
        'STRIPE_SIGNATURE_INVALID',
      )
    }

    if (event.livemode !== expectedLivemode) {
      return requestError(
        request,
        config.operation,
        'WEBHOOK_LIVEMODE_MISMATCH',
      )
    }
    if (!allowedEvents.has(event.type)) {
      return requestError(
        request,
        config.operation,
        'WEBHOOK_EVENT_SCOPE_MISMATCH',
      )
    }
    if (config.scope === 'platform' && hasConnectedAccount(event)) {
      return requestError(
        request,
        config.operation,
        'CONNECTED_EVENT_FORBIDDEN',
      )
    }
    if (config.scope === 'connect' && !connectAuthorityMatches(event)) {
      return requestError(
        request,
        config.operation,
        'CONNECTED_ACCOUNT_INVALID',
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return configurationError(
        request,
        config.operation,
        'SUPABASE_CONFIGURATION_MISSING',
      )
    }

    const supabase = await dependencies.createSupabase()
    const result = await dependencies.deliver({
      event,
      stripe,
      supabase,
    })
    return responseForDelivery(
      request,
      config.operation,
      event.type,
      result,
    )
  }
}
