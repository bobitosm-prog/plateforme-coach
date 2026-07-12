import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const supabaseUrl = process.env.API_URL!
const serviceKey = process.env.SERVICE_ROLE_KEY!
const password = 'Local-E2E-Password-42!'
const mailpitUrl = 'http://127.0.0.1:55324'

function assertLocalUrl(value: string) {
  const url = new URL(value)
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('E2E URL must target localhost')
}

async function login(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button.gold-btn').click()
  await expect(page).toHaveURL(new RegExp(`${next.replace('/', '\\/')}(?:$|\\?)`), { timeout: 20_000 })
}

async function createFixture(admin: SupabaseClient, email: string, role: 'coach' | 'client') {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role },
  })
  if (error || !data.user) throw new Error(`Unable to create local ${role} fixture`)
  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id,
    email,
    full_name: role === 'coach' ? 'Coach E2E' : 'Client E2E',
    role,
    onboarding_completed: role === 'client',
    coach_onboarding_complete: role === 'coach',
  })
  if (profileError) throw new Error(`Unable to create local ${role} profile`)
  return data.user.id
}

async function cleanupStaleFixtures(admin: SupabaseClient) {
  const pattern = /^(coach|client|other)-[0-9]{13}-[a-f0-9]{6}@example\.test$/
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error('Unable to inspect local E2E fixtures')
  const stale = data.users.filter(user => user.email && pattern.test(user.email))
  const staleIds = stale.map(user => user.id)
  const staleEmails = stale.flatMap(user => user.email ? [user.email] : [])
  if (staleIds.length) {
    await admin.from('coach_invitations').delete().in('coach_id', staleIds)
    if (staleEmails.length) await admin.from('coach_invitations').delete().in('recipient_email', staleEmails)
    await admin.from('coach_clients').delete().in('coach_id', staleIds)
    await admin.from('coach_clients').delete().in('client_id', staleIds)
  }
  for (const user of stale) await admin.auth.admin.deleteUser(user.id)
  await fetch(`${mailpitUrl}/api/v1/messages`, { method: 'DELETE' })
}

async function findInvitationMessage(recipient: string) {
  const response = await fetch(`${mailpitUrl}/api/v1/messages`)
  if (!response.ok) return null
  const payload = await response.json() as { messages?: Array<{ ID?: string; To?: Array<{ Address?: string }> }> }
  return payload.messages?.find(message => message.To?.some(to => to.Address === recipient))?.ID || null
}

test('invitation coach vérifiée: création, livraison et consommation unique', async ({ browser, page }) => {
  test.setTimeout(120_000)
  const mark = (stage: string) => console.log(`[invitation-e2e] ${stage}`)
  assertLocalUrl(supabaseUrl)
  assertLocalUrl(mailpitUrl)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const coachEmail = `coach-${runId}@example.test`
  const clientEmail = `client-${runId}@example.test`
  const otherEmail = `other-${runId}@example.test`
  const userIds: string[] = []
  const observedRequests: string[] = []
  let invitationId: string | null = null
  let messageId: string | null = null
  let token: string | null = null
  let clientContext: BrowserContext | null = null

  page.on('request', request => observedRequests.push(new URL(request.url()).pathname + new URL(request.url()).search))

  try {
    mark('fixtures')
    await cleanupStaleFixtures(admin)
    const coachId = await createFixture(admin, coachEmail, 'coach'); userIds.push(coachId)
    const clientId = await createFixture(admin, clientEmail, 'client'); userIds.push(clientId)
    const otherId = await createFixture(admin, otherEmail, 'client'); userIds.push(otherId)

    mark('coach-login')
    await login(page, coachEmail, '/coach')
    mark('invitation-create')
    const invitationResponse = page.waitForResponse(response =>
      response.url().endsWith('/api/coach/invitations') && response.request().method() === 'POST')
    await page.locator('input[placeholder="email@client.com"]').first().fill(clientEmail)
    await page.getByRole('button', { name: 'Inviter', exact: true }).first().click()
    const response = await invitationResponse
    expect(response.status()).toBe(201)
    const body = await response.json() as { data?: { invitationId?: string } }
    invitationId = body.data?.invitationId || null
    expect(invitationId).toBeTruthy()

    mark('invitation-persisted')
    const { data: stored } = await admin.from('coach_invitations')
      .select('id,token_hash,status,recipient_email').eq('id', invitationId!).single()
    expect(stored?.status).toBe('pending')
    expect(typeof stored?.token_hash).toBe('string')
    expect(Object.hasOwn(stored || {}, 'token')).toBe(false)

    mark('mail-capture')
    await expect.poll(async () => {
      messageId = await findInvitationMessage(clientEmail)
      return Boolean(messageId)
    }, { timeout: 10_000 }).toBe(true)
    const messageResponse = await fetch(`${mailpitUrl}/api/v1/message/${messageId}`)
    expect(messageResponse.ok).toBe(true)
    const message = await messageResponse.json() as { HTML?: string; Text?: string }
    const content = message.HTML || message.Text || ''
    const match = content.match(/\/join\?token=([A-Za-z0-9_-]{43})/)
    expect(Boolean(match)).toBe(true)
    token = match![1]
    expect(JSON.stringify(stored)).not.toContain(token)

    mark('client-open-link')
    clientContext = await browser.newContext()
    const clientPage = await clientContext.newPage()
    clientPage.on('request', request => observedRequests.push(new URL(request.url()).pathname + new URL(request.url()).search))
    await clientPage.goto('/')
    const validationResponse = clientPage.waitForResponse(response =>
      response.url().endsWith('/api/coach/invitations/validate') && response.request().method() === 'POST')
    await clientPage.evaluate(path => window.location.assign(path), `/join?token=${token}`)
    await expect(clientPage).toHaveURL(/\/join$/)
    expect((await validationResponse).status()).toBe(200)
    mark('client-login')
    await clientPage.goto('/login?next=/join')
    await clientPage.locator('input[type="email"]').fill(clientEmail)
    await clientPage.locator('input[type="password"]').fill(password)
    await clientPage.locator('button.gold-btn').click()

    mark('consumption-wait')
    await expect.poll(async () => {
      const { data } = await admin.from('coach_invitations').select('status,consumed_by').eq('id', invitationId!).single()
      return data?.status === 'consumed' && data.consumed_by === clientId
    }, { timeout: 20_000 }).toBe(true)

    mark('relation-check')
    const { data: relation } = await admin.from('coach_clients')
      .select('coach_id,client_id,status,invited_by_coach').eq('coach_id', coachId).eq('client_id', clientId).single()
    expect(relation).toMatchObject({ status: 'active', invited_by_coach: true })

    mark('second-use')
    const secondUse = await clientPage.evaluate(async invitationToken => {
      const response = await fetch('/api/coach/invitations/consume', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: invitationToken }),
      })
      return { status: response.status, body: await response.json() }
    }, token)
    expect(secondUse.status).toBe(409)
    expect(secondUse.body.error?.code).toBe('INVITATION_ALREADY_USED')

    mark('other-account')
    const otherContext = await browser.newContext()
    try {
      const otherPage = await otherContext.newPage()
      otherPage.on('request', request => observedRequests.push(new URL(request.url()).pathname + new URL(request.url()).search))
      await login(otherPage, otherEmail, '/')
      const otherUse = await otherPage.evaluate(async invitationToken => {
        const response = await fetch('/api/coach/invitations/consume', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: invitationToken }),
        })
        return { status: response.status, body: await response.json() }
      }, token)
      expect(otherUse.status).toBe(409)
      expect(otherUse.body.error?.code).toBe('INVITATION_ALREADY_USED')
    } finally {
      await otherContext.close()
    }

    mark('legacy-check')
    expect(observedRequests.some(url => url.startsWith('/api/assign-coach'))).toBe(false)
    expect(observedRequests.some(url => url.startsWith('/join?coach='))).toBe(false)
  } finally {
    mark('cleanup')
    if (clientContext) await clientContext.close()
    await fetch(`${mailpitUrl}/api/v1/messages`, { method: 'DELETE' }).catch(() => undefined)
    if (invitationId) await admin.from('coach_invitations').delete().eq('id', invitationId)
    if (userIds.length) {
      await admin.from('coach_clients').delete().or(userIds.map(id => `coach_id.eq.${id}`).join(','))
      await admin.from('profiles').delete().in('id', userIds)
      for (const id of userIds.reverse()) await admin.auth.admin.deleteUser(id)
    }
    token = null
    mark('cleanup-done')
  }
})

test('socle navigateur: refuse le lien coach legacy sans appeler assign-coach', async ({ page }) => {
  const applicationRequests: string[] = []
  page.on('request', request => applicationRequests.push(new URL(request.url()).pathname + new URL(request.url()).search))
  await page.goto('/join?coach=00000000-0000-4000-8000-000000000001')
  await expect(page).toHaveURL(/\/join$/)
  expect(applicationRequests.some(request => request.includes('/api/assign-coach'))).toBe(false)
})
