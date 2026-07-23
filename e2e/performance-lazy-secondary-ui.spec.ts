import { expect, test, type Page, type Request } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { createRunSuffix } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import {
  assertNoSyntheticCoachClientRows,
  buildCoachClientFixture,
  cleanupCoachClientFixture,
  loginLocalPersona,
  seedCoachClientFixture,
} from './helpers/coach-client-fixtures'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])
const EVIDENCE_PATH = process.env.MOOVX_LAZY_UI_EVIDENCE_PATH

type RequestEvidence = {
  readonly initialScripts: string[]
  readonly firstOpenScripts: string[]
  readonly reopenScripts: string[]
  readonly reopenDataRequests: string[]
}

function createRecorder(page: Page) {
  const scripts: string[] = []
  const data: string[] = []
  const external = new Set<string>()
  const onRequest = (request: Request) => {
    const url = new URL(request.url())
    if (!LOCAL_HOSTS.has(url.hostname)) {
      external.add(url.origin)
      return
    }
    if (request.resourceType() === 'script') scripts.push(url.pathname)
    if (
      url.pathname.startsWith('/auth/v1/')
      || url.pathname.startsWith('/rest/v1/')
      || url.pathname.startsWith('/realtime/v1/')
    ) data.push(url.pathname)
  }
  page.on('request', onRequest)
  const take = () => {
    const result = {
      data: [...new Set(data)].sort(),
      scripts: [...new Set(scripts)].sort(),
    }
    data.length = 0
    scripts.length = 0
    return result
  }
  return {
    assertLocal: () => expect([...external], 'external network origins').toEqual([]),
    take,
  }
}

async function settle(page: Page) {
  await page.waitForTimeout(750)
}

async function selectMobileTab(page: Page, index: number) {
  await page.locator('nav.mobile-nav button').nth(index).dispatchEvent('click')
}

test.setTimeout(120_000)

test('secondary tabs and detail overlays load once on first use', async ({ page }) => {
  const admin = createLocalAdminClient({
    url: process.env.API_URL!,
    serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
    mode: 'e2e',
  })
  const fixture = buildCoachClientFixture(createRunSuffix())
  await seedCoachClientFixture(admin, fixture)
  const recorder = createRecorder(page)

  try {
    const step = (name: string) => process.stdout.write(`lazy-ui:${name}\n`)
    step('client-login')
    await page.setViewportSize({ width: 390, height: 844 })
    await loginLocalPersona(page, fixture.client)
    recorder.take()
    await page.goto('/')
    await expect(page.getByText('SÉANCE DU JOUR').first()).toBeVisible({ timeout: 25_000 })
    await settle(page)
    const clientInitial = recorder.take()

    step('client-training-first')
    await selectMobileTab(page, 1)
    await expect(page.getByText(/MES PROGRAMMES/i).first()).toBeVisible()
    await settle(page)
    const clientTrainingFirst = recorder.take()
    expect(clientTrainingFirst.scripts.length).toBeGreaterThan(0)

    step('client-training-reopen')
    await selectMobileTab(page, 0)
    await settle(page)
    recorder.take()
    await selectMobileTab(page, 1)
    await expect(page.getByText(/MES PROGRAMMES/i).first()).toBeVisible()
    await settle(page)
    const clientTrainingReopen = recorder.take()
    expect(clientTrainingReopen.scripts).toEqual([])
    expect(clientTrainingReopen.data).toEqual([])

    step('client-rapid-switch')
    await selectMobileTab(page, 2)
    await selectMobileTab(page, 1)
    await selectMobileTab(page, 2)
    await expect(page.getByText(/JOURNAL|PLAN/i).first()).toBeVisible()
    await settle(page)
    const clientRapidSwitch = recorder.take()

    step('detail-login')
    await page.evaluate(() => localStorage.clear())
    await page.context().clearCookies()
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginLocalPersona(page, fixture.coach, '/coach')
    recorder.take()
    await page.goto('/coach')
    await expect(page.getByText(/COACH PRO/).first()).toBeVisible()
    await settle(page)
    const coachInitial = recorder.take()
    step('coach-secondary-return')
    await page.getByRole('button', { name: /Clients|Dashboard/i }).first().click()
    await expect(page.getByText('Client Parcours').first()).toBeVisible()
    await settle(page)
    const coachClientsFirst = recorder.take()
    await page.getByRole('button', { name: 'Messages', exact: true }).first().click()
    await settle(page)
    const coachMessagesFirst = recorder.take()
    await page.getByRole('button', { name: /Home|Accueil/i }).first().click()
    await expect(page.getByText(/COACH PRO/).first()).toBeVisible()
    await settle(page)
    recorder.take()
    await page.getByRole('button', { name: /Clients|Dashboard/i }).first().click()
    await expect(page.getByText('Client Parcours').first()).toBeVisible()
    await settle(page)
    const coachClientsReopen = recorder.take()
    expect(coachClientsReopen.scripts).toEqual([])

    await page.goto(`/client/${fixture.client.id}`)
    await expect(page.getByText('FICHE CLIENT')).toBeVisible()
    await settle(page)
    const detailInitial = recorder.take()

    step('detail-program-first')
    await page.getByRole('button', { name: 'Programme', exact: true }).first().click()
    await expect(page.getByText(/PROGRAMME D'ENTRAÎNEMENT|PROGRAMME/i).first()).toBeVisible()
    await settle(page)
    const detailProgramFirst = recorder.take()
    expect(detailProgramFirst.scripts.length).toBeGreaterThan(0)

    step('detail-program-reopen')
    await page.getByRole('button', { name: 'Aperçu', exact: true }).first().click()
    await settle(page)
    recorder.take()
    await page.getByRole('button', { name: 'Programme', exact: true }).first().click()
    await settle(page)
    const detailProgramReopen = recorder.take()
    expect(detailProgramReopen.scripts).toEqual([])

    step('detail-nutrition-first')
    await page.getByRole('button', { name: 'Nutrition', exact: true }).first().click()
    await expect(page.getByText('Plan alimentaire').first()).toBeVisible()
    await settle(page)
    const detailNutritionFirst = recorder.take()
    expect(detailNutritionFirst.scripts.length).toBeGreaterThan(0)

    step('detail-overlay-first')
    await page.getByRole('button', { name: 'MODIFIER', exact: true }).first().click()
    await expect(page.getByText('Modifier le profil')).toBeVisible()
    await settle(page)
    const detailOverlayFirst = recorder.take()
    expect(detailOverlayFirst.scripts.length).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Annuler', exact: true }).click()
    await expect(page.getByText('Modifier le profil')).toHaveCount(0)

    step('detail-overlay-reopen')
    await page.getByRole('button', { name: 'MODIFIER', exact: true }).first().click()
    await expect(page.getByText('Modifier le profil')).toBeVisible()
    await settle(page)
    const detailOverlayReopen = recorder.take()
    expect(detailOverlayReopen.scripts).toEqual([])

    recorder.assertLocal()
    const evidence = {
      clientTraining: {
        initialScripts: clientInitial.scripts,
        firstOpenScripts: clientTrainingFirst.scripts,
        reopenScripts: clientTrainingReopen.scripts,
        reopenDataRequests: clientTrainingReopen.data,
      } satisfies RequestEvidence,
      clientRapidSwitch,
      coachClients: {
        initialScripts: coachInitial.scripts,
        firstOpenScripts: coachClientsFirst.scripts,
        reopenScripts: coachClientsReopen.scripts,
        reopenDataRequests: coachClientsReopen.data,
      } satisfies RequestEvidence,
      coachMessagesFirst,
      detailProgram: {
        initialScripts: detailInitial.scripts,
        firstOpenScripts: detailProgramFirst.scripts,
        reopenScripts: detailProgramReopen.scripts,
        reopenDataRequests: detailProgramReopen.data,
      } satisfies RequestEvidence,
      detailNutritionFirst,
      detailOverlay: {
        initialScripts: detailInitial.scripts,
        firstOpenScripts: detailOverlayFirst.scripts,
        reopenScripts: detailOverlayReopen.scripts,
        reopenDataRequests: detailOverlayReopen.data,
      } satisfies RequestEvidence,
    }
    if (EVIDENCE_PATH) writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 })
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})
