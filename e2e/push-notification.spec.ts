import { createECDH, randomBytes } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const supabaseUrl = process.env.API_URL!
const serviceKey = process.env.SERVICE_ROLE_KEY!
const controlUrl = 'http://127.0.0.1:55329'
const password = 'Local-E2E-Password-42!'

async function fixture(admin: SupabaseClient, email: string, role: 'coach' | 'client' | 'invited') {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role } })
  if (error || !data.user) throw new Error('Unable to create push fixture')
  const { error: profileError } = await admin.from('profiles').upsert({ id: data.user.id, email, full_name: `${role} Push E2E`, role, onboarding_completed: true, coach_onboarding_complete: role === 'coach', subscription_status: 'active', subscription_type: role === 'invited' ? 'invited' : 'client_monthly' })
  if (profileError) throw new Error('Unable to create push profile')
  return data.user.id
}
function subscription() {
  const ecdh = createECDH('prime256v1'); ecdh.generateKeys()
  return { endpoint: `https://127.0.0.1:55328/push/${Date.now()}`, expirationTime: null, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } }
}
async function login(page: Page, email: string, next = '/coach') {
  await page.goto(`/login?next=${encodeURIComponent(next)}`); await page.locator('input[type="email"]').fill(email); await page.locator('input[type="password"]').fill(password); await page.locator('button.gold-btn').click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe(next)
}
async function deliveries() { return await (await fetch(`${controlUrl}/__deliveries`)).json() as Array<{ path: string; bytes: number; encoding: string }> }
async function post(page: Page, payload: Record<string, unknown>) { return page.evaluate(async value => { const r = await fetch('/api/send-notification', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) }); return { status: r.status, body: await r.json() } }, payload) }
async function cleanupStale(admin: SupabaseClient) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const users = data.users.filter(user => /^push-(coach|client|foreign|invited)-.*@example\.test$/.test(user.email || ''))
  const ids = users.map(user => user.id)
  if (ids.length) { await admin.from('push_subscriptions').delete().in('user_id', ids); await admin.from('messages').delete().or(ids.map(id => `sender_id.eq.${id},receiver_id.eq.${id}`).join(',')); await admin.from('coach_clients').delete().or(ids.map(id => `coach_id.eq.${id},client_id.eq.${id}`).join(',')); await admin.from('profiles').delete().in('id', ids) }
  for (const user of users) await admin.auth.admin.deleteUser(user.id)
}

test.afterEach(async () => {
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  await cleanupStale(admin)
  await fetch(`${controlUrl}/__deliveries`, { method: 'DELETE' }).catch(() => undefined)
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  expect(data.users.filter(user => /^push-(coach|client|foreign|invited)-.*@example\.test$/.test(user.email || ''))).toHaveLength(0)
})

async function dispatchNotificationClick(context: BrowserContext, url: string) {
  const worker = context.serviceWorkers().find(item => item.url().endsWith('/sw.js'))
  if (!worker) throw new Error('Real service worker target unavailable')
  await worker.evaluate(async destination => {
    const event = new Event('notificationclick')
    let completion: Promise<unknown> = Promise.resolve()
    Object.defineProperty(event, 'notification', { value: { data: { url: destination }, close() {} } })
    Object.defineProperty(event, 'waitUntil', { value(p: Promise<unknown>) { completion = Promise.resolve(p) } })
    self.dispatchEvent(event)
    await completion.catch(() => undefined)
  }, url)
}

test('push local: producteur coach, autorisation, livraison et clic du vrai service worker', async ({ browser, page }) => {
  test.setTimeout(120_000)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const run = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`; const ids: string[] = []; const subscriptionIds: string[] = []
  try {
    await cleanupStale(admin)
    await fetch(`${controlUrl}/__deliveries`, { method: 'DELETE' })
    const coachId = await fixture(admin, `push-coach-${run}@example.test`, 'coach'); ids.push(coachId)
    const clientId = await fixture(admin, `push-client-${run}@example.test`, 'client'); ids.push(clientId)
    const foreignClientId = await fixture(admin, `push-foreign-${run}@example.test`, 'client'); ids.push(foreignClientId)
    const invitedId = await fixture(admin, `push-invited-${run}@example.test`, 'invited'); ids.push(invitedId)
    await admin.from('coach_clients').insert({ coach_id: coachId, client_id: clientId, status: 'active' })
    const { data: storedSub, error: subError } = await admin.from('push_subscriptions').insert({ user_id: clientId, subscription: subscription() }).select('id').single()
    if (subError || !storedSub) throw new Error('Unable to create local push subscription'); subscriptionIds.push(storedSub.id)

    const anonymous = await browser.newContext(); try { expect((await anonymous.request.post('/api/send-notification', { data: { userId: clientId, title: 'x', body: 'x', url: '/' } })).status()).toBe(401) } finally { await anonymous.close() }
    await login(page, `push-coach-${run}@example.test`)
    const base = { title: 'Nouveau message', body: 'Message E2E', url: '/' }
    for (const payload of [
      { ...base, userId: coachId }, { ...base, userId: foreignClientId }, { ...base, userId: invitedId },
      { ...base, userId: clientId, url: 'https://evil.example' }, { ...base, userId: clientId, url: '//evil.example' }, { ...base, userId: clientId, url: 'javascript:alert(1)' },
    ]) { expect((await post(page, payload)).status).toBeGreaterThanOrEqual(400); expect(await deliveries()).toHaveLength(0) }

    let producerPayload: unknown
    page.on('request', request => { if (request.url().endsWith('/api/send-notification') && request.method() === 'POST') producerPayload = request.postDataJSON() })
    await page.getByRole('button', { name: 'MESSAGERIE' }).click()
    await page.getByText('client Push E2E', { exact: true }).click()
    const textarea = page.locator('input[placeholder^="Message à"]'); await textarea.fill('Message E2E')
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/send-notification') && response.request().method() === 'POST')
    await textarea.locator('xpath=following-sibling::button').click(); const response = await responsePromise
    expect(response.status()).toBe(200); expect(await response.json()).toEqual({ sent: 1, failed: 0 })
    expect(producerPayload).toEqual({ userId: clientId, title: 'Nouveau message', body: 'Message E2E', url: '/' })
    const delivered = await deliveries(); expect(delivered).toHaveLength(1); expect(delivered[0].bytes).toBeGreaterThan(0); expect(delivered[0].encoding).toBeTruthy()

    await page.goto('/'); expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active))).toBe(true)
    await dispatchNotificationClick(page.context(), '/coach'); await expect.poll(() => new URL(page.url()).pathname).toBe('/coach')
    await dispatchNotificationClick(page.context(), 'https://evil.example'); await expect.poll(() => new URL(page.url()).pathname).toBe('/')

    await fetch(`${controlUrl}/__status/410`, { method: 'POST' }); expect((await post(page, { ...base, userId: clientId })).body).toEqual({ sent: 0, failed: 1 })
    await expect.poll(async () => (await admin.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('id', storedSub.id)).count).toBe(0)
    const { data: replacement } = await admin.from('push_subscriptions').insert({ user_id: clientId, subscription: subscription() }).select('id').single(); if (replacement) subscriptionIds.push(replacement.id)
    await fetch(`${controlUrl}/__status/500`, { method: 'POST' }); expect((await post(page, { ...base, userId: clientId })).body).toEqual({ sent: 0, failed: 1 })
    expect((await admin.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('id', replacement!.id)).count).toBe(1)
  } finally {
    await admin.from('push_subscriptions').delete().in('id', subscriptionIds); await admin.from('messages').delete().or(ids.map(id => `sender_id.eq.${id},receiver_id.eq.${id}`).join(',')); await admin.from('coach_clients').delete().or(ids.map(id => `coach_id.eq.${id},client_id.eq.${id}`).join(',')); await admin.from('profiles').delete().in('id', ids); for (const id of ids.reverse()) await admin.auth.admin.deleteUser(id); await fetch(`${controlUrl}/__deliveries`, { method: 'DELETE' }).catch(() => undefined)
  }
})
