import { expect, test } from '@playwright/test'
import { createLocalAdminClient, createLocalPersona, cleanupLocalPersonas } from '../tests/fixtures/supabase'
import type { TestPersona } from '../tests/fixtures/personas'

const client: TestPersona = { id: '76000000-0000-4000-8000-000000000001', email: 'default-client@moovx.example.test', role: 'client', subscriptionType: null, subscriptionStatus: null, onboardingCompleted: true, admin: false }
const coach: TestPersona = { id: '76000000-0000-4000-8000-000000000002', email: 'default-coach@moovx.example.test', role: 'coach', subscriptionType: null, subscriptionStatus: null, onboardingCompleted: true, admin: false }
const password = 'Local-Default-Coach-42!'

test('default coach: session authority, idempotence and unchanged subscription', async ({ request, page }) => {
  const admin = createLocalAdminClient({ url: process.env.API_URL!, serviceRoleKey: process.env.SERVICE_ROLE_KEY!, mode: 'e2e' })
  const ids = [client.id, coach.id]
  await cleanupLocalPersonas(admin, ids).catch(() => undefined)
  try {
    await createLocalPersona(admin, coach, password)
    await createLocalPersona(admin, client, password)
    const anonymous = await request.post('/api/coach/default-assignment')
    expect(anonymous.status()).toBe(401)

    await page.goto('/login?next=/')
    await page.locator('input[type="email"]').fill(client.email)
    await page.locator('input[type="password"]').fill(password)
    await page.locator('button.gold-btn').click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/')
    const post = (body?: object) => page.evaluate(async value => (await fetch('/api/coach/default-assignment', {
      method: 'POST', headers: value ? { 'content-type': 'application/json' } : undefined, body: value ? JSON.stringify(value) : undefined,
    })).status, body)
    expect(await post({ coachId: 'forged' })).toBe(400)
    expect(await post()).toBe(200)
    expect(await post()).toBe(200)

    const relations = await admin.from('coach_clients').select('coach_id,status').eq('client_id', client.id)
    expect(relations.error).toBeNull()
    expect(relations.data).toEqual([{ coach_id: coach.id, status: 'active' }])
    const profile = await admin.from('profiles').select('subscription_type,subscription_status').eq('id', client.id).single()
    expect(profile.data).toMatchObject({ subscription_type: null, subscription_status: null })
  } finally {
    await cleanupLocalPersonas(admin, ids)
  }
})
