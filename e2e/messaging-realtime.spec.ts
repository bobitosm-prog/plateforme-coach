import { expect, test, type Page, type WebSocket } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/types'
import { assertOnlyConfiguredLocalOrigins } from '../scripts/e2e-local-contract.mjs'
import { createRunSuffix } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import {
  assertNoSyntheticMessagingRows,
  buildMessagingFixture,
  cleanupMessagingFixture,
  createAuthenticatedMessagingClient,
  MESSAGING_E2E_PASSWORD,
  seedMessagingFixture,
} from './helpers/messaging-fixtures'

test.setTimeout(120_000)

type RealtimeProbe = {
  subscribed: () => number
  sockets: () => number
  waitForSubscribedAfter: (count: number) => Promise<void>
  waitForSocketAfter: (count: number) => Promise<void>
}

function frameText(payload: string | Buffer): string {
  return typeof payload === 'string' ? payload : payload.toString('utf8')
}

function observeRealtime(page: Page, supabaseUrl: string): RealtimeProbe {
  const expected = new URL(supabaseUrl)
  let subscribedCount = 0
  let socketCount = 0
  page.on('websocket', (socket: WebSocket) => {
    const url = new URL(socket.url())
    if (url.host !== expected.host || !url.pathname.startsWith('/realtime/v1/')) return
    socketCount += 1
    socket.on('framereceived', event => {
      const frame = frameText(event.payload)
      if (frame.includes('phx_reply') && frame.includes('postgres_changes') && frame.includes('"status":"ok"')) {
        subscribedCount += 1
      }
    })
  })
  return {
    subscribed: () => subscribedCount,
    sockets: () => socketCount,
    waitForSubscribedAfter: async count => {
      await expect.poll(() => subscribedCount, { timeout: 10_000, intervals: [50, 100, 200] }).toBeGreaterThan(count)
    },
    waitForSocketAfter: async count => {
      await expect.poll(() => socketCount, { timeout: 10_000, intervals: [50, 100, 200] }).toBeGreaterThan(count)
    },
  }
}

async function login(page: Page, email: string, next: '/' | '/coach'): Promise<void> {
  await page.goto(`/login?next=${encodeURIComponent(next)}`)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(MESSAGING_E2E_PASSWORD)
  await page.locator('button.gold-btn').click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 25_000 }).toBe(next)
}

async function openClientMessages(page: Page): Promise<void> {
  await page.evaluate(() => {
    const account = document.querySelectorAll<HTMLButtonElement>('nav.mobile-nav button')[4]
    if (!account) throw new Error('Client account navigation unavailable')
    account.click()
  })
  await page.getByRole('button', { name: /Messages/i }).first().click()
  await expect(page.getByPlaceholder('Écrire un message...')).toBeVisible({ timeout: 15_000 })
}

async function signOut(client: SupabaseClient<Database> | null): Promise<void> {
  if (client) await client.auth.signOut().catch(() => undefined)
}

function mutationWasRefused(result: { data: unknown[] | null; error: unknown | null }): boolean {
  return Boolean(result.error) || (result.data?.length ?? 0) === 0
}

test('messagerie coach-client: Realtime bidirectionnel, lecture, reconnexion et RLS', async ({ browser }) => {
  const supabaseUrl = process.env.API_URL!
  const anonKey = process.env.ANON_KEY!
  const admin = createLocalAdminClient({
    url: supabaseUrl,
    serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
    mode: 'e2e',
  })
  const fixture = buildMessagingFixture(createRunSuffix())
  const correlationId = crypto.randomUUID().slice(0, 8)
  const clientContent = `Client Realtime ${correlationId}`
  const coachContent = `Coach Realtime ${correlationId}`
  const origins = new Set<string>()
  const clientContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const coachContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const clientPage = await clientContext.newPage()
  const coachPage = await coachContext.newPage()
  for (const page of [clientPage, coachPage]) {
    page.on('request', request => {
      const url = new URL(request.url())
      if (url.protocol === 'http:' || url.protocol === 'https:') origins.add(url.origin)
    })
  }
  const clientRealtime = observeRealtime(clientPage, supabaseUrl)
  const coachRealtime = observeRealtime(coachPage, supabaseUrl)
  let activeClient: SupabaseClient<Database> | null = null
  let foreignClient: SupabaseClient<Database> | null = null
  let unrelatedCoach: SupabaseClient<Database> | null = null

  await seedMessagingFixture(admin, fixture)
  try {
    await Promise.all([
      login(clientPage, fixture.client.email, '/'),
      login(coachPage, fixture.coach.email, '/coach'),
    ])
    await expect(clientPage.getByText('SÉANCE DU JOUR').first()).toBeVisible({ timeout: 25_000 })
    await expect(coachPage.getByText(/COACH PRO/).first()).toBeVisible({ timeout: 25_000 })
    await openClientMessages(clientPage)
    await coachPage.getByRole('button', { name: /Messagerie|Messages/i }).first().click()
    await expect(coachPage.getByText('Client Messaging E2E', { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await Promise.all([
      clientRealtime.waitForSubscribedAfter(0),
      coachRealtime.waitForSubscribedAfter(0),
    ])

    const clientSentAt = Date.now()
    await clientPage.getByPlaceholder('Écrire un message...').fill(clientContent)
    await clientPage.getByPlaceholder('Écrire un message...').press('Enter')
    await expect(coachPage.getByText(clientContent, { exact: true })).toHaveCount(1, { timeout: 8_000 })
    const clientToCoachMs = Date.now() - clientSentAt
    expect(clientToCoachMs).toBeLessThan(10_000)
    await expect(coachPage.getByRole('button', { name: /MESSAGERIE\s+1/i })).toBeVisible()

    await coachPage.getByText('Client Messaging E2E', { exact: true }).first().click()
    await expect(coachPage.locator('p').filter({ hasText: new RegExp(`^${clientContent}$`) })).toHaveCount(1)
    await expect.poll(async () => {
      const { data } = await admin.from('messages').select('read')
        .eq('sender_id', fixture.client.id).eq('receiver_id', fixture.coach.id).eq('content', clientContent).single()
      return data?.read
    }).toBe(true)

    const coachSentAt = Date.now()
    const coachInput = coachPage.locator('input.msg-input')
    await coachInput.fill(coachContent)
    await coachInput.press('Enter')
    const clientCoachBubble = clientPage.locator('p').filter({ hasText: new RegExp(`^${coachContent}$`) })
    await expect(clientCoachBubble).toHaveCount(1, { timeout: 8_000 })
    const coachToClientMs = Date.now() - coachSentAt
    expect(coachToClientMs).toBeLessThan(10_000)

    const { data: beforeRead } = await admin.from('messages').select('read')
      .eq('sender_id', fixture.coach.id).eq('receiver_id', fixture.client.id).eq('content', coachContent).single()
    expect(beforeRead?.read).toBe(false)
    await clientPage.getByRole('button', { name: /Retour|Compte/i }).first().click()
    await clientPage.getByRole('button', { name: /Messages/i }).first().click()
    await expect.poll(async () => {
      const { data } = await admin.from('messages').select('read')
        .eq('sender_id', fixture.coach.id).eq('receiver_id', fixture.client.id).eq('content', coachContent).single()
      return data?.read
    }).toBe(true)

    const { data: persisted, error: persistedError } = await admin.from('messages')
      .select('id,sender_id,receiver_id,content,read,created_at')
      .in('content', [clientContent, coachContent])
      .order('created_at', { ascending: true }).order('id', { ascending: true })
    expect(persistedError).toBeNull()
    expect(persisted).toHaveLength(2)
    expect(persisted?.map(message => message.content)).toEqual([clientContent, coachContent])
    expect(persisted).toMatchObject([
      { sender_id: fixture.client.id, receiver_id: fixture.coach.id, read: true },
      { sender_id: fixture.coach.id, receiver_id: fixture.client.id, read: true },
    ])

    const clientSockets = clientRealtime.sockets()
    const coachSockets = coachRealtime.sockets()
    await Promise.all([clientPage.reload(), coachPage.reload()])
    await Promise.all([
      clientRealtime.waitForSocketAfter(clientSockets),
      coachRealtime.waitForSocketAfter(coachSockets),
    ])
    await openClientMessages(clientPage)
    await coachPage.getByRole('button', { name: /Messagerie|Messages/i }).first().click()
    await coachPage.getByText('Client Messaging E2E', { exact: true }).first().click()
    for (const content of [clientContent, coachContent]) {
      await expect(clientPage.locator('p').filter({ hasText: new RegExp(`^${content}$`) })).toHaveCount(1)
      await expect(coachPage.locator('p').filter({ hasText: new RegExp(`^${content}$`) })).toHaveCount(1)
    }

    activeClient = await createAuthenticatedMessagingClient({ url: supabaseUrl, anonKey, persona: fixture.client })
    foreignClient = await createAuthenticatedMessagingClient({ url: supabaseUrl, anonKey, persona: fixture.foreignClient })
    unrelatedCoach = await createAuthenticatedMessagingClient({ url: supabaseUrl, anonKey, persona: fixture.unrelatedCoach })
    const activeRead = await activeClient.from('messages').select('id')
      .or(`sender_id.eq.${fixture.client.id},receiver_id.eq.${fixture.client.id}`)
    expect(activeRead.error).toBeNull()
    expect(activeRead.data).toHaveLength(2)
    for (const [actor, actorId, receiver] of [
      [foreignClient, fixture.foreignClient.id, fixture.coach.id],
      [unrelatedCoach, fixture.unrelatedCoach.id, fixture.client.id],
    ] as const) {
      const read = await actor.from('messages').select('id')
        .or(`sender_id.eq.${fixture.client.id},receiver_id.eq.${fixture.client.id}`)
      expect(read.error).toBeNull()
      expect(read.data).toEqual([])
      const write = await actor.from('messages').insert({ sender_id: actorId, receiver_id: receiver, content: `Foreign ${correlationId}` }).select('id')
      expect(mutationWasRefused(write)).toBe(true)
    }

    expect(() => assertOnlyConfiguredLocalOrigins(origins, [
      process.env.MOOVX_E2E_APP_URL || 'http://127.0.0.1:3210',
      supabaseUrl,
    ])).not.toThrow()
    console.log(`MESSAGING_REALTIME_REPORT ${JSON.stringify({
      subscribed: { client: clientRealtime.subscribed(), coach: coachRealtime.subscribed() },
      clientToCoachMs,
      coachToClientMs,
      unreadThenRead: true,
      messageCount: persisted?.length ?? 0,
      duplicateCount: 0,
      rls: 'pass',
    })}`)
  } finally {
    await signOut(activeClient)
    await signOut(foreignClient)
    await signOut(unrelatedCoach)
    await Promise.all([clientContext.close(), coachContext.close()])
    await cleanupMessagingFixture(admin, fixture.ids)
    await assertNoSyntheticMessagingRows(admin, fixture.ids)
  }
})
