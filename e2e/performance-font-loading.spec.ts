import { expect, test, type Browser, type Page, type Response } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { stableJson } from '../lib/performance/baseline'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import {
  assertNoSyntheticCoachClientRows,
  buildCoachClientFixture,
  cleanupCoachClientFixture,
  loginLocalPersona,
  seedCoachClientFixture,
} from './helpers/coach-client-fixtures'

const evidencePath = process.env.MOOVX_FONT_EVIDENCE_PATH
const screenshotDir = process.env.MOOVX_FONT_SCREENSHOT_DIR
const appOrigin = new URL(process.env.MOOVX_E2E_APP_URL ?? 'http://127.0.0.1:3211').origin

type FontTransfer = {
  url: string
  status: number
  bytes: number
  cacheControl: string | null
}

async function capturePage(
  browser: Browser,
  name: string,
  path: string,
  setup?: (page: Page) => Promise<void>,
) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block',
  })
  const page = await context.newPage()
  const fonts: FontTransfer[] = []
  const pendingFontResponses: Promise<void>[] = []
  const blockedExternalOrigins = new Set<string>()
  page.on('response', (response: Response) => {
    if (response.request().resourceType() !== 'font') return
    pendingFontResponses.push((async () => {
      const headers = await response.allHeaders()
      const body = await response.body()
      fonts.push({
        url: new URL(response.url()).pathname,
        status: response.status(),
        bytes: body.byteLength,
        cacheControl: headers['cache-control'] ?? null,
      })
    })())
  })
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      blockedExternalOrigins.add(url.origin)
      await route.abort('blockedbyclient')
      if (route.request().resourceType() === 'font') {
        throw new Error(`External font request blocked: ${url.origin}`)
      }
      return
    }
    await route.continue()
  })
  try {
    if (setup) await setup(page)
    else await page.goto(path)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(setup ? 2_500 : 250)
    await Promise.all(pendingFontResponses)
    if (screenshotDir) {
      mkdirSync(screenshotDir, { recursive: true })
      await page.screenshot({ path: resolve(screenshotDir, `${name}.png`), fullPage: true })
    }
    const tofu = await page.locator('body').evaluate((body) => body.textContent?.includes('\uFFFD') ?? false)
    expect(tofu).toBe(false)
    return {
      name,
      path,
      fonts,
      totalBytes: fonts.reduce((total, font) => total + font.bytes, 0),
      preloadCount: await page.locator('link[rel="preload"][as="font"]').count(),
      fallback: await page.locator('body').evaluate((body) => getComputedStyle(body).fontFamily),
      blockedExternalOrigins: [...blockedExternalOrigins].sort(),
    }
  } finally {
    await context.close()
  }
}

test('captures local font requests and deterministic visual specimens', async ({ browser }) => {
  test.skip(!evidencePath, 'opt-in font evidence')
  const admin = createLocalAdminClient({
    url: process.env.API_URL!,
    serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
    mode: 'e2e',
  })
  const fixture = buildCoachClientFixture(`font-${Date.now().toString(36)}`)
  await seedCoachClientFixture(admin, fixture)
  try {
    const pages = [
      await capturePage(browser, 'login', '/login'),
      await capturePage(browser, 'onboarding', '/onboarding'),
      await capturePage(browser, 'landing-fr', '/fr/landing'),
      await capturePage(browser, 'guide-musculation', '/guide-musculation.html'),
      await capturePage(browser, 'guide-nutrition', '/guide-nutrition.html'),
      await capturePage(browser, 'index-vitrine', '/index-vitrine.html'),
      await capturePage(browser, 'vitrine', '/vitrine.html'),
      await capturePage(browser, 'client', '/', (page) =>
        loginLocalPersona(page, fixture.client, '/')),
      await capturePage(browser, 'coach', '/coach', (page) =>
        loginLocalPersona(page, fixture.coach, '/coach')),
      await capturePage(browser, 'specimen', '/font-specimen', async (page) => {
        await page.setContent(`<!doctype html><meta charset="utf-8"><style>
          @font-face{font-family:Bebas;src:url("${appOrigin}/fonts/moovx/BebasNeue-Regular.ttf")}
          @font-face{font-family:Barlow;src:url("${appOrigin}/fonts/moovx/BarlowCondensed-Bold.ttf");font-weight:700}
          @font-face{font-family:Barlow;src:url("${appOrigin}/fonts/moovx/BarlowCondensed-ExtraBold.ttf");font-weight:800}
          @font-face{font-family:Outfit;src:url("${appOrigin}/fonts/moovx/Outfit-Variable.ttf");font-weight:300 600}
          @font-face{font-family:DM;src:url("${appOrigin}/fonts/moovx/DMSans-Variable.ttf");font-weight:400 700}
          @font-face{font-family:Anton;src:url("${appOrigin}/fonts/moovx/Anton-Regular.ttf")}
          body{background:#0d0b08;color:#f0ede8;padding:36px;font-family:Arial,sans-serif}
          p{font-size:28px;margin:12px 0}.bebas{font-family:Bebas,Arial,sans-serif}
          .barlow{font-family:Barlow,Arial,sans-serif}.outfit{font-family:Outfit,Arial,sans-serif}
          .dm{font-family:DM,Arial,sans-serif}.anton{font-family:Anton,Arial,sans-serif}
        </style><h1>Spécimen MoovX</h1>
        ${['bebas','barlow','outfit','dm','anton'].map(family =>
          `<p class="${family}">Équilibre · Größe · Ação · 1’234,50 CHF · 82,5 kg · 2 450 kcal</p>`).join('')}`)
      }),
    ]
    mkdirSync(dirname(evidencePath!), { recursive: true })
    writeFileSync(evidencePath!, stableJson({ schemaVersion: 1, pages }), { mode: 0o600 })
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})
