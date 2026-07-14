import { expect, test, type Page } from '@playwright/test'
import { createRunSuffix, personaForRun } from '../tests/fixtures/personas'
import { cleanupLocalPersonas, createLocalAdminClient, createLocalPersona, upsertCoachClientRelation } from '../tests/fixtures/supabase'

const supabaseUrl = process.env.API_URL!
const serviceKey = process.env.SERVICE_ROLE_KEY!
const stripeUrl = 'http://127.0.0.1:55326'
const password = 'Local-E2E-Password-42!'
type StripeCall = { path: string; params: Record<string, string> }

async function login(page: Page, email: string) {
  await page.goto('/login?next=/'); await page.locator('input[type="email"]').fill(email); await page.locator('input[type="password"]').fill(password)
  await page.locator('button.gold-btn').click(); await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/')
}
async function calls() { return await (await fetch(`${stripeUrl}/__requests`)).json() as StripeCall[] }
async function post(page: Page, body: Record<string, unknown> = {}) {
  return page.evaluate(async value => (await fetch('/api/stripe/coach-checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) })).status, body)
}

test('checkout coach: relation active, Connect local et isolation serveur', async ({ browser, page }) => {
  test.setTimeout(120_000)
  const admin = createLocalAdminClient({ url: supabaseUrl, serviceRoleKey: serviceKey, mode: 'e2e' })
  const run = createRunSuffix()
  const client = personaForRun('client', `coach-checkout-${run}`)
  const coach = personaForRun('coach', `coach-checkout-${run}`)
  const foreignCoach = personaForRun('secondCoach', `coach-checkout-${run}`)
  const foreignClient = personaForRun('secondClient', `coach-checkout-${run}`)
  const invited = personaForRun('invited', `coach-checkout-${run}`)
  const lifetime = personaForRun('lifetime', `coach-checkout-${run}`)
  const configuredAdmin = personaForRun('admin', `coach-checkout-${run}`)
  const ids: string[] = []
  try {
    await fetch(`${stripeUrl}/__requests`, { method: 'DELETE' })
    const clientId = await createLocalPersona(admin, client, password, { subscription_status: null, subscription_type: null }); ids.push(clientId)
    const coachId = await createLocalPersona(admin, coach, password, { subscription_status: null, subscription_type: null, stripe_account_id: 'acct_local_coach', coach_monthly_rate: 75 }); ids.push(coachId)
    const foreignCoachId = await createLocalPersona(admin, foreignCoach, password, { subscription_status: null, subscription_type: null, stripe_account_id: 'acct_local_foreign', coach_monthly_rate: 90 }); ids.push(foreignCoachId)
    const foreignClientId = await createLocalPersona(admin, foreignClient, password, { subscription_status: null, subscription_type: null }); ids.push(foreignClientId)
    ids.push(await createLocalPersona(admin, invited, password))
    ids.push(await createLocalPersona(admin, lifetime, password))
    ids.push(await createLocalPersona(admin, configuredAdmin, password))
    await upsertCoachClientRelation(admin, coachId, clientId, 'active')

    const anonymous = await browser.newContext()
    try { expect((await anonymous.request.post('/api/stripe/coach-checkout', { data: {} })).status()).toBe(401); expect(await calls()).toHaveLength(0) } finally { await anonymous.close() }
    await login(page, client.email)

    for (const body of [{ clientId: foreignClientId }, { coachId: foreignCoachId }, { stripeAccountId: 'acct_local_foreign' }]) {
      expect(await post(page, body)).toBe(400); expect(await calls()).toHaveLength(0)
    }
    await admin.from('profiles').update({ role: 'coach' }).eq('id', clientId)
    expect(await post(page)).toBe(403); expect(await calls()).toHaveLength(0)
    await admin.from('profiles').update({ role: 'client' }).eq('id', clientId)

    await admin.from('coach_clients').update({ status: 'inactive' }).eq('client_id', clientId)
    expect(await post(page)).toBe(403); expect(await calls()).toHaveLength(0)
    await admin.from('coach_clients').update({ status: 'active' }).eq('client_id', clientId)
    await admin.from('profiles').update({ role: 'client' }).eq('id', coachId)
    expect(await post(page)).toBe(403); expect(await calls()).toHaveLength(0)
    await admin.from('profiles').update({ role: 'coach', stripe_account_id: null }).eq('id', coachId)
    expect(await post(page)).toBe(400); expect(await calls()).toHaveLength(0)
    await admin.from('profiles').update({ stripe_account_id: 'acct_local_coach' }).eq('id', coachId)

    const foreignContext = await browser.newContext()
    try {
      const foreignPage = await foreignContext.newPage(); await login(foreignPage, foreignClient.email)
      expect(await post(foreignPage)).toBe(403); expect(await calls()).toHaveLength(0)
    } finally { await foreignContext.close() }

    await fetch(`${stripeUrl}/__fail`, { method: 'POST' })
    expect(await post(page)).toBe(500)
    expect((await admin.from('payments').select('id', { count: 'exact', head: true }).eq('client_id', clientId)).count).toBe(0)
    await fetch(`${stripeUrl}/__requests`, { method: 'DELETE' })

    const checkoutResponse = page.waitForResponse(response => response.url().endsWith('/api/stripe/coach-checkout') && response.request().method() === 'POST')
    await expect(page.getByRole('button', { name: /75/ })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: /75/ }).click()
    expect((await checkoutResponse).status()).toBe(200)
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:55326\/checkout\//)

    const stripeCalls = await calls()
    expect(stripeCalls.map(call => call.path)).toEqual(['/v1/customers', '/v1/checkout/sessions'])
    expect(stripeCalls[0].params).toMatchObject({ 'metadata[userId]': clientId, 'metadata[coachId]': coachId })
    expect(stripeCalls[1].params).toMatchObject({
      mode: 'subscription', 'line_items[0][price_data][currency]': 'chf', 'line_items[0][price_data][unit_amount]': '7500',
      'subscription_data[application_fee_percent]': '3', 'subscription_data[transfer_data][destination]': 'acct_local_coach',
      'metadata[clientId]': clientId, 'metadata[coachId]': coachId,
      success_url: 'http://127.0.0.1:3210/?payment=success', cancel_url: 'http://127.0.0.1:3210/?payment=canceled',
    })
    const { data: storedClient } = await admin.from('profiles').select('stripe_customer_id').eq('id', clientId).single()
    expect(storedClient?.stripe_customer_id).toMatch(/^cus_test_local_/)
    const paymentCount = await admin.from('payments').select('id', { count: 'exact', head: true }).eq('client_id', clientId)
    expect(paymentCount.count).toBe(0)
  } finally {
    await admin.from('payments').delete().in('client_id', ids)
    await cleanupLocalPersonas(admin, ids)
    await fetch(`${stripeUrl}/__requests`, { method: 'DELETE' }).catch(() => undefined)
  }
})
