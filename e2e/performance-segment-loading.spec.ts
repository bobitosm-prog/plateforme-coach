import { expect, test } from '@playwright/test'
import { createRunSuffix } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import {
  assertNoSyntheticCoachClientRows,
  buildCoachClientFixture,
  cleanupCoachClientFixture,
  loginLocalPersona,
  seedCoachClientFixture,
} from './helpers/coach-client-fixtures'

test.setTimeout(90_000)

test('segment loading boundaries settle after navigation, back and unavailable detail', async ({ page }) => {
  const admin = createLocalAdminClient({
    url: process.env.API_URL!,
    serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
    mode: 'e2e',
  })
  const fixture = buildCoachClientFixture(createRunSuffix())
  await seedCoachClientFixture(admin, fixture)

  try {
    await loginLocalPersona(page, fixture.coach, '/coach')
    await expect(page.getByText(/COACH PRO/).first()).toBeVisible()
    await page.getByRole('button', { name: /Clients|Dashboard/i }).first().click()
    await page.getByText('Client Parcours').first().click()

    await expect.poll(() => new URL(page.url()).pathname).toBe(`/client/${fixture.client.id}`)
    await expect(page.getByText('FICHE CLIENT')).toBeVisible()
    await expect(page.locator('[data-dashboard-segment-loading]')).toHaveCount(0)

    await page.goBack()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/coach')
    await expect(page.getByText(/COACH PRO/).first()).toBeVisible()
    await expect(page.locator('[data-dashboard-segment-loading]')).toHaveCount(0)

    await page.goto(`/client/${fixture.secondClient.id}`)
    await expect(page.getByText(/Client introuvable|permission denied|aucune ligne|Cannot coerce/i)).toBeVisible()
    await expect(page.locator('[data-dashboard-segment-loading]')).toHaveCount(0)
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})
