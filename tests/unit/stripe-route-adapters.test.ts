import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const ROUTES = [
  'checkout',
  'coach-checkout',
  'connect',
  'check-account',
  'webhook',
  'setup-products',
] as const

const source = (route: typeof ROUTES[number]) => readFileSync(`app/api/stripe/${route}/route.ts`, 'utf8')

describe('Stripe HTTP adapter inventory', () => {
  it('tracks exactly the six audited Stripe routes', () => {
    expect(ROUTES).toHaveLength(6)
    for (const route of ROUTES) expect(source(route)).toContain('export async function POST')
  })

  it('keeps every route within the HTTP adapter size target', () => {
    for (const route of ROUTES) {
      expect(source(route).trimEnd().split('\n').length, route).toBeLessThanOrEqual(80)
    }
  })

  it('moves checkout repository queries out of both checkout routes', () => {
    for (const route of ['checkout', 'coach-checkout'] as const) {
      expect(source(route)).not.toContain('.from(')
      expect(source(route)).not.toMatch(/async find(Profile|CallerProfile|Coach|Client|UniqueActiveCoachId)/)
    }
  })

  it('keeps webhook raw-body verification in the route and durable workflow in Billing', () => {
    expect(source('webhook')).toContain('await req.text()')
    expect(source('webhook')).toContain('webhooks.constructEvent')
    expect(source('webhook')).toContain('deliverWebhookEvent')
    expect(source('webhook')).not.toContain('.rpc(')
    expect(source('webhook')).not.toContain('processWebhookEvent')
  })

  it('moves product and price creation out of the admin route', () => {
    expect(source('setup-products')).toContain('setupBillingProducts')
    expect(source('setup-products')).not.toContain('.products.create')
    expect(source('setup-products')).not.toContain('.prices.create')
  })

  it('keeps Connect profile authorization server-side', () => {
    expect(source('connect')).toContain(".select('role, email, stripe_account_id')")
    expect(source('connect')).toContain('assertCoachAuthority')
    expect(source('check-account')).toContain(".select('role, stripe_account_id')")
    expect(source('check-account')).toContain("profile.role !== 'coach'")
  })
})
