import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'

const supabaseUrl = process.env.API_URL!
const serviceKey = process.env.SERVICE_ROLE_KEY!
const stripeUrl = 'http://127.0.0.1:55326'
const password = 'Local-E2E-Password-42!'

type StripeRequest = { method: string; path: string; params: Record<string, string>; idempotencyKey: string | null }

async function createClientFixture(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'client' } })
  if (error || !data.user) throw new Error('Unable to create local checkout fixture')
  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id, email, full_name: 'Checkout Client E2E', role: 'client', onboarding_completed: true,
    subscription_status: null, subscription_type: null,
  })
  if (profileError) throw new Error('Unable to create local checkout profile')
  return data.user.id
}

async function login(page: Page, email: string) {
  await page.goto('/login?next=/')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button.gold-btn').click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/')
}

async function stripeRequests() {
  const response = await fetch(`${stripeUrl}/__requests`)
  return await response.json() as StripeRequest[]
}

test('checkout plateforme local: identité serveur, paywall et refus avant Stripe', async ({ browser, page }) => {
  test.setTimeout(120_000)
  for (const value of [supabaseUrl, stripeUrl]) {
    if (!['127.0.0.1', 'localhost'].includes(new URL(value).hostname)) throw new Error('Checkout E2E must remain local')
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const firstEmail = `checkout-first-${runId}@example.test`
  const secondEmail = `checkout-second-${runId}@example.test`
  const ids: string[] = []
  const browserOrigins = new Set<string>()
  page.on('request', request => browserOrigins.add(new URL(request.url()).origin))

  try {
    await fetch(`${stripeUrl}/__requests`, { method: 'DELETE' })
    const firstId = await createClientFixture(admin, firstEmail); ids.push(firstId)
    const secondId = await createClientFixture(admin, secondEmail); ids.push(secondId)

    const anonymous = await browser.newContext()
    try {
      const anonymousResponse = await anonymous.request.post('/api/stripe/checkout', { data: { planId: 'client_monthly' } })
      expect(anonymousResponse.status()).toBe(401)
      expect(await stripeRequests()).toHaveLength(0)
    } finally { await anonymous.close() }

    await login(page, firstEmail)
    await expect(page.getByText('CHF').first()).toBeVisible({ timeout: 20_000 })

    const rejectedBodies = [
      { planId: 'client_monthly', clientId: secondId },
      { planId: 'client_monthly', coachId: secondId },
      { planId: 'unknown_plan' },
      { planId: 'coach_monthly' },
    ]
    for (const body of rejectedBodies) {
      const response = await page.evaluate(async value => {
        const result = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) })
        return result.status
      }, body)
      expect([400, 403]).toContain(response)
      expect(await stripeRequests()).toHaveLength(0)
    }

    let producerBody: unknown
    page.on('request', request => {
      if (request.url().endsWith('/api/stripe/checkout') && request.method() === 'POST') producerBody = request.postDataJSON()
    })
    const checkoutResponse = page.waitForResponse(response => response.url().endsWith('/api/stripe/checkout') && response.request().method() === 'POST')
    await page.getByRole('button', { name: /10/ }).first().click()
    expect((await checkoutResponse).status()).toBe(200)
    await expect(page).toHaveURL(new RegExp(`^${stripeUrl.replaceAll('.', '\\.')}/checkout/`), { timeout: 20_000 })
    expect(producerBody).toEqual({ planId: 'client_monthly' })

    const calls = await stripeRequests()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/v1/checkout/sessions' })
    expect(calls[0].idempotencyKey).toMatch(new RegExp(`^checkout-${firstId}-client_monthly-\\d+$`))
    expect(calls[0].params).toMatchObject({
      mode: 'subscription', 'line_items[0][price]': 'price_local_client_monthly',
      success_url: 'http://127.0.0.1:3210/?payment=success', cancel_url: 'http://127.0.0.1:3210/?payment=cancel',
      'metadata[clientId]': firstId, 'metadata[planId]': 'client_monthly', 'metadata[coachId]': 'platform',
    })
    expect(JSON.stringify(calls[0])).not.toContain(secondId)

    const secondContext = await browser.newContext()
    try {
      const secondPage = await secondContext.newPage()
      await login(secondPage, secondEmail)
      const before = (await stripeRequests()).length
      const status = await secondPage.evaluate(async foreignId => (await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ planId: 'client_monthly', clientId: foreignId }),
      })).status, firstId)
      expect(status).toBe(400)
      expect(await stripeRequests()).toHaveLength(before)
    } finally { await secondContext.close() }

    await fetch(`${stripeUrl}/__fail`, { method: 'POST' })
    const beforePayments = await admin.from('payments').select('id', { count: 'exact', head: true }).in('client_id', ids)
    const failureContext = await browser.newContext()
    try {
      const failurePage = await failureContext.newPage()
      await login(failurePage, secondEmail)
      const response = await failurePage.evaluate(async () => {
        const result = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ planId: 'client_monthly' }) })
        return { status: result.status, body: await result.json() }
      })
      expect(response).toEqual({ status: 500, body: { error: 'Erreur lors de la création du paiement' } })
    } finally { await failureContext.close() }
    const afterPayments = await admin.from('payments').select('id', { count: 'exact', head: true }).in('client_id', ids)
    expect(afterPayments.count).toBe(beforePayments.count)
    expect([...browserOrigins].every(origin => [
      'http://127.0.0.1:3210', 'http://127.0.0.1:55321', stripeUrl,
    ].includes(origin))).toBe(true)
  } finally {
    await admin.from('payments').delete().in('client_id', ids)
    await admin.from('profiles').delete().in('id', ids)
    for (const id of ids.reverse()) await admin.auth.admin.deleteUser(id)
    await fetch(`${stripeUrl}/__requests`, { method: 'DELETE' }).catch(() => undefined)
  }
})
