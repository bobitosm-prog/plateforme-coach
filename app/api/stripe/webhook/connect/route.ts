import { CONNECT_WEBHOOK_EVENTS, createScopedStripeWebhookHandler } from '@/lib/billing/webhook/scoped-http-handler'

export const POST = createScopedStripeWebhookHandler({
  scope: 'connect',
  operation: 'POST /api/stripe/webhook/connect',
  secretVariable: 'STRIPE_CONNECT_WEBHOOK_SECRET',
  allowedEvents: CONNECT_WEBHOOK_EVENTS,
})
