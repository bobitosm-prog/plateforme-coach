import { spawn, type ChildProcess } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const baseUrl = 'http://127.0.0.1:55326'
let server: ChildProcess

async function waitUntilReady() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/__requests`)).ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('Fake Stripe server did not start')
}

async function form(path: string, values: Record<string, string>) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values),
  })
}

async function control(path: string, method: 'POST' | 'DELETE', body?: Record<string, unknown>) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('fake Stripe local lifecycle contract', () => {
  beforeAll(async () => {
    server = spawn(process.execPath, ['scripts/fake-stripe-server.mjs'], {
      cwd: process.cwd(),
      stdio: 'ignore',
    })
    await waitUntilReady()
    await fetch(`${baseUrl}/__requests`, { method: 'DELETE' })
  })

  afterAll(async () => {
    server.kill('SIGTERM')
  })

  it('persists Customer, Checkout, Subscription and Invoice authorities', async () => {
    const customerResponse = await form('/v1/customers', { email: 'billing@example.test' })
    const customer = await customerResponse.json() as { id: string }
    expect(customerResponse.status).toBe(200)
    expect((await fetch(`${baseUrl}/v1/customers/${customer.id}`)).status).toBe(200)

    const checkoutResponse = await form('/v1/checkout/sessions', {
      mode: 'subscription',
      customer: customer.id,
      'metadata[clientId]': 'client-local',
      'metadata[planId]': 'client_monthly',
      'metadata[coachId]': 'platform',
      'metadata[subType]': 'client_monthly',
    })
    const checkout = await checkoutResponse.json() as { id: string; subscription: string; customer: string }
    expect(checkout).toMatchObject({ customer: customer.id })

    const subscriptionResponse = await fetch(`${baseUrl}/v1/subscriptions/${checkout.subscription}`)
    expect(await subscriptionResponse.json()).toMatchObject({
      id: checkout.subscription,
      customer: customer.id,
      status: 'active',
    })

    const list = await (await fetch(`${baseUrl}/v1/checkout/sessions?limit=10`)).json() as { data: Array<{ id: string }> }
    expect(list.data.map(session => session.id)).toContain(checkout.id)

    const updated = await control(`/__subscriptions/${checkout.subscription}`, 'POST', { status: 'past_due' })
    expect(await updated.json()).toMatchObject({ status: 'past_due' })

    const invoiceResponse = await control('/__invoices', 'POST', {
      id: 'in_local_contract',
      customer: customer.id,
      subscription: checkout.subscription,
      billing_reason: 'subscription_cycle',
      amount_paid: 1000,
      currency: 'chf',
      status: 'paid',
    })
    expect(invoiceResponse.status).toBe(200)
    expect(await (await fetch(`${baseUrl}/v1/invoices/in_local_contract`)).json()).toMatchObject({
      customer: customer.id,
      billing_reason: 'subscription_cycle',
      amount_paid: 1000,
    })
  })

  it('supports targeted failures, missing resources and a complete reset', async () => {
    await control('/__fail-next', 'POST', {
      method: 'GET',
      path: '/v1/invoices/in_targeted',
      status: 503,
    })
    expect((await fetch(`${baseUrl}/v1/invoices/in_targeted`)).status).toBe(503)
    expect((await fetch(`${baseUrl}/v1/invoices/in_targeted`)).status).toBe(404)

    await control('/__invoices', 'POST', {
      id: 'in_missing_contract',
      customer: 'cus_missing_contract',
      subscription: 'sub_missing_contract',
      billing_reason: 'subscription_cycle',
      amount_paid: 1000,
      currency: 'chf',
      status: 'paid',
    })
    const deletion = await control('/__resources/invoices/in_missing_contract', 'DELETE')
    expect(await deletion.json()).toEqual({ deleted: true })
    expect((await fetch(`${baseUrl}/v1/invoices/in_missing_contract`)).status).toBe(404)

    await fetch(`${baseUrl}/__requests`, { method: 'DELETE' })
    const state = await (await fetch(`${baseUrl}/__state`)).json()
    expect(state).toEqual({ customers: [], checkoutSessions: [], subscriptions: [], invoices: [] })
  })
})
