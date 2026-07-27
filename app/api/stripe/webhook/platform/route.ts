import { createScopedStripeWebhookHandler, PLATFORM_WEBHOOK_EVENTS } from '@/lib/billing/webhook/scoped-http-handler'

export const POST = createScopedStripeWebhookHandler({
  scope: 'platform',
  operation: 'POST /api/stripe/webhook/platform',
  secretVariable: 'STRIPE_PLATFORM_WEBHOOK_SECRET',
  allowedEvents: PLATFORM_WEBHOOK_EVENTS,
})
