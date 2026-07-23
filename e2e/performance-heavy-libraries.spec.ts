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

const EVIDENCE_PATH = process.env.MOOVX_HEAVY_UI_EVIDENCE_PATH
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])

function recordScripts(page: Page) {
  const scripts: string[] = []
  const external = new Set<string>()
  page.on('request', (request: Request) => {
    const url = new URL(request.url())
    if (!LOCAL_HOSTS.has(url.hostname)) {
      external.add(url.origin)
      return
    }
    if (request.resourceType() === 'script') scripts.push(url.pathname)
  })
  return {
    take: () => {
      const result = [...new Set(scripts)].sort()
      scripts.length = 0
      return result
    },
    assertLocal: () => expect([...external]).toEqual([]),
  }
}

async function selectMobileTab(page: Page, index: number) {
  await page.locator('nav.mobile-nav button').nth(index).dispatchEvent('click')
  await page.waitForTimeout(750)
}

test.setTimeout(120_000)

test('heavy libraries load only on their visible feature or explicit action', async ({ page }) => {
  const admin = createLocalAdminClient({
    url: process.env.API_URL!,
    serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
    mode: 'e2e',
  })
  const fixture = buildCoachClientFixture(createRunSuffix())
  await seedCoachClientFixture(admin, fixture)
  const recorder = recordScripts(page)

  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginLocalPersona(page, fixture.client)
    recorder.take()
    await page.goto('/')
    await expect(page.getByText('SÉANCE DU JOUR').first()).toBeVisible({ timeout: 25_000 })
    await page.waitForTimeout(750)
    const initial = recorder.take()

    await selectMobileTab(page, 3)
    await expect(page.getByText('GRAPHIQUES', { exact: true }).first()).toBeVisible()
    const rechartsFirst = recorder.take()
    expect(rechartsFirst.length).toBeGreaterThan(0)
    await selectMobileTab(page, 0)
    recorder.take()
    await selectMobileTab(page, 3)
    const rechartsReopen = recorder.take()
    expect(rechartsReopen).toEqual([])

    await selectMobileTab(page, 1)
    await page.getByRole('button', { name: 'Gerer mes programmes' }).click()
    await expect(page.getByText(/Télécharger le modèle vierge/i)).toBeVisible()
    recorder.take()
    const download = page.waitForEvent('download')
    await page.getByText(/Télécharger le modèle vierge/i).click()
    await download
    const xlsxFirst = recorder.take()
    expect(xlsxFirst.length).toBeGreaterThan(0)
    const secondDownload = page.waitForEvent('download')
    await page.getByText(/Télécharger le modèle vierge/i).click()
    await secondDownload
    const xlsxReopen = recorder.take()
    expect(xlsxReopen).toEqual([])

    recorder.assertLocal()
    if (EVIDENCE_PATH) {
      writeFileSync(EVIDENCE_PATH, `${JSON.stringify({
        initial,
        recharts: { first: rechartsFirst, reopen: rechartsReopen },
        xlsx: { first: xlsxFirst, reopen: xlsxReopen },
        mediapipe: { unavailable: 'Synthetic fixture has no pair of stored progress photos; no external model request was attempted.' },
        qr: { unavailable: 'Canonical scanner action is covered statically; production camera hardware is unavailable in the hermetic harness.' },
      }, null, 2)}\n`, { mode: 0o600 })
    }
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})
