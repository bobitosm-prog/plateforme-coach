import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'

const supabaseUrl = process.env.API_URL!
const serviceKey = process.env.SERVICE_ROLE_KEY!
const anthropicControl = 'http://127.0.0.1:55330'
const password = 'Local-E2E-Password-42!'

type AnthropicCall = { method: string; path: string; body: { model: string; max_tokens: number; system: string; messages: Array<{ role: string; content: string }> } }

async function createFixture(admin: SupabaseClient, email: string, invited = false) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'client' } })
  if (error || !data.user) throw new Error('Unable to create local chat fixture')
  const profile = {
    id: data.user.id, email, full_name: invited ? 'Invited Chat E2E' : 'Server Profile Chat E2E', role: 'client',
    onboarding_completed: true, subscription_status: 'active', subscription_type: invited ? 'invited' : 'client_monthly',
    current_weight: 81, target_weight: 75, height: 181, gender: 'male', tdee: 2450, calorie_goal: 2100,
    protein_goal: 155, carbs_goal: 220, fat_goal: 70, fitness_level: 'intermediate', fitness_score: 73,
    objective: 'cut', activity_level: 'moderate', dietary_type: 'omnivore', onboarding_answers: { experience: '3 ans local' },
  }
  const { error: profileError } = await admin.from('profiles').upsert(profile)
  if (profileError) throw new Error(`Unable to create local chat profile: ${profileError.message}`)
  return data.user.id
}

async function login(page: Page, email: string) {
  await page.goto('/login?next=/')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button.gold-btn').click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/')
}

async function calls() {
  return await (await fetch(`${anthropicControl}/__requests`)).json() as AnthropicCall[]
}

async function mode(value: string) {
  await fetch(`${anthropicControl}/__mode/${value}`, { method: 'POST' })
}

test('chat local: session, profil serveur, historique réel, persistance et Markdown hostile inerte', async ({ browser, page }) => {
  test.setTimeout(120_000)
  for (const value of [supabaseUrl, anthropicControl]) if (!['127.0.0.1', 'localhost'].includes(new URL(value).hostname)) throw new Error('Chat E2E must remain local')
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const run = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const email = `chat-client-${run}@example.test`
  const otherEmail = `chat-other-${run}@example.test`
  const invitedEmail = `chat-invited-${run}@example.test`
  const ids: string[] = []
  const browserOrigins = new Set<string>()
  const dialogs: string[] = []
  page.on('request', request => browserOrigins.add(new URL(request.url()).origin))
  page.on('dialog', async dialog => {
    if (dialog.type() === 'alert') { dialogs.push(dialog.message()); await dialog.dismiss() }
    else await dialog.accept()
  })

  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await fetch(`${anthropicControl}/__requests`, { method: 'DELETE' })
    const userId = await createFixture(admin, email); ids.push(userId)
    const otherId = await createFixture(admin, otherEmail); ids.push(otherId)
    const invitedId = await createFixture(admin, invitedEmail, true); ids.push(invitedId)
    await admin.from('chat_ai_messages').insert([
      { user_id: userId, role: 'assistant', content: 'Historique initial local' },
      { user_id: otherId, role: 'assistant', content: 'SECRET AUTRE UTILISATEUR' },
    ])

    const anonymous = await browser.newContext()
    try {
      expect((await anonymous.request.post('/api/chat-ai', { data: { message: 'anonyme' } })).status()).toBe(401)
      expect(await calls()).toHaveLength(0)
    } finally { await anonymous.close() }

    const invitedContext = await browser.newContext()
    try {
      const invitedPage = await invitedContext.newPage(); await login(invitedPage, invitedEmail)
      expect(await invitedPage.evaluate(async () => (await fetch('/api/chat-ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'refus' }) })).status)).toBe(403)
      expect(await calls()).toHaveLength(0)
    } finally { await invitedContext.close() }

    await login(page, email)
    await page.getByRole('button', { name: 'Athena' }).click()
    const panel = page.getByTestId('chat-ai-panel')
    await expect(panel).toBeVisible({ timeout: 20_000 })
    await expect(panel.getByText('Historique initial local')).toBeVisible()
    await expect(panel.getByText('SECRET AUTRE UTILISATEUR')).toHaveCount(0)

    await mode('hostile')
    const overlong = `  message local ${'x'.repeat(600)}  `
    await page.getByTestId('chat-input').fill(overlong)
    const apiResponse = page.waitForResponse(response => response.url().endsWith('/api/chat-ai') && response.request().method() === 'POST')
    await page.getByTestId('chat-send').click()
    expect((await apiResponse).status()).toBe(200)

    const recorded = await calls()
    expect(recorded).toHaveLength(1)
    expect(recorded[0]).toMatchObject({ method: 'POST', path: '/v1/messages', body: { model: 'claude-sonnet-4-6', max_tokens: 1024 } })
    expect(recorded[0].body.system).toContain('Server Profile Chat E2E')
    expect(recorded[0].body.system).toContain('Poids : 81kg')
    expect(recorded[0].body.system).not.toContain(otherEmail)
    expect(recorded[0].body.messages.at(-1)?.content).toHaveLength(500)
    expect(JSON.stringify(recorded[0].body.messages)).toContain('Historique initial local')
    expect(JSON.stringify(recorded[0].body.messages)).not.toContain('SECRET AUTRE UTILISATEUR')

    const assistant = panel.getByTestId('chat-message-assistant').last()
    await expect(assistant).toContainText('<script>alert(1)</script>')
    await expect(assistant).toContainText('Markdown légitime restant.')
    await expect(assistant.locator('[data-chat-markdown="heading-2"]')).toHaveCount(1)
    await expect(assistant.locator('[data-chat-markdown="heading-3"]')).toHaveCount(1)
    await expect(assistant.locator('[data-chat-markdown="list-item"]')).toHaveCount(1)
    await expect(assistant.locator('strong').filter({ hasText: 'sûr' })).toHaveCount(1)
    await expect(assistant.locator('script,img,svg,iframe,a')).toHaveCount(0)
    expect(await assistant.locator('*').evaluateAll(nodes => nodes.some(node => [...node.attributes].some(attr => attr.name.startsWith('on'))))).toBe(false)
    expect(dialogs).toEqual([])
    expect([...browserOrigins].every(origin => ['http://127.0.0.1:3210', 'http://127.0.0.1:55321'].includes(origin))).toBe(true)

    const { data: persisted } = await admin.from('chat_ai_messages').select('role,content').eq('user_id', userId).order('created_at')
    expect(persisted?.filter(row => row.role === 'user').at(-1)?.content).toHaveLength(500)
    expect(persisted?.filter(row => row.role === 'assistant').at(-1)?.content).toContain('<script>alert(1)</script>')

    await page.reload(); await page.getByRole('button', { name: 'Athena' }).click()
    await expect(page.getByTestId('chat-ai-panel').getByText('Markdown légitime restant.')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: /supprimer|delete|effacer/i }).click()
    await expect.poll(async () => (await admin.from('chat_ai_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId)).count).toBe(0)

    await admin.from('ai_usage_logs').insert(Array.from({ length: 20 }, () => ({ user_id: userId, endpoint: 'chat-ai' })))
    const beforeQuota = (await calls()).length
    expect(await page.evaluate(async () => (await fetch('/api/chat-ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'quota' }) })).status)).toBe(429)
    expect(await calls()).toHaveLength(beforeQuota)
  } finally {
    await admin.from('chat_ai_messages').delete().in('user_id', ids)
    await admin.from('ai_usage_logs').delete().in('user_id', ids)
    await admin.from('profiles').delete().in('id', ids)
    for (const id of ids.reverse()) await admin.auth.admin.deleteUser(id)
    await fetch(`${anthropicControl}/__requests`, { method: 'DELETE' }).catch(() => undefined)
  }
})

test('chat local: erreurs Anthropic restent bornées et sans injection', async ({ page }) => {
  test.setTimeout(90_000)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const email = `chat-errors-${Date.now()}@example.test`
  const id = await createFixture(admin, email)
  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, email)
    for (const [failureMode, expected] of [['429', 429], ['500', 500], ['malformed', 500]] as const) {
      await mode(failureMode)
      const result = await page.evaluate(async value => { const response = await fetch('/api/chat-ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: `panne ${value}` }) }); return { status: response.status, body: await response.json() } }, failureMode)
      expect(result.status).toBe(expected)
      expect(result.body.error).toBeTruthy()
    }
    const rows = await admin.from('chat_ai_messages').select('role').eq('user_id', id)
    expect(rows.data?.every(row => row.role === 'user')).toBe(true)
  } finally {
    await admin.from('chat_ai_messages').delete().eq('user_id', id)
    await admin.from('ai_usage_logs').delete().eq('user_id', id)
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id)
    await fetch(`${anthropicControl}/__requests`, { method: 'DELETE' }).catch(() => undefined)
  }
})
