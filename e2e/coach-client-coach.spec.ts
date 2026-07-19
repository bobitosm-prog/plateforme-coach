import { expect, test } from '@playwright/test'
import { createRunSuffix } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import { assertNoSyntheticCoachClientRows, buildCoachClientFixture, cleanupCoachClientFixture, loginLocalPersona, seedCoachClientFixture } from './helpers/coach-client-fixtures'

test.setTimeout(90_000)

test('coach: linked client detail and foreign boundaries use real local data', async ({ page }) => {
  const admin = createLocalAdminClient({ url: process.env.API_URL!, serviceRoleKey: process.env.SERVICE_ROLE_KEY!, mode: 'e2e' })
  const fixture = buildCoachClientFixture(createRunSuffix())
  await seedCoachClientFixture(admin, fixture)
  try {
    await loginLocalPersona(page, fixture.coach)
    await expect(page.getByText(/COACH PRO/).first()).toBeVisible()
    await page.getByRole('button', { name: /Clients|Dashboard/i }).first().click()
    await expect(page.getByText('Client Parcours').first()).toBeVisible()
    await expect(page.getByText(fixture.secondClient.email)).toHaveCount(0)
    await page.getByText('Client Parcours').first().click()
    await expect.poll(() => new URL(page.url()).pathname).toBe(`/client/${fixture.client.id}`)
    await expect(page.getByText('FICHE CLIENT')).toBeVisible()
    for (const tab of ['Programme', 'Progression', 'Nutrition', 'Messages', 'Notes', 'Aperçu']) {
      await page.getByRole('button', { name: tab, exact: true }).first().click()
    }
    await expect(page.locator('body')).not.toContainText('stripe_customer_id')
    await expect(page.locator('body')).not.toContainText('subscription_status')

    await page.goto(`/client/${fixture.secondClient.id}`)
    await expect(page.getByText(/Client introuvable|permission denied|aucune ligne|Cannot coerce/i)).toBeVisible({ timeout: 20_000 })
    await page.goto(`/client/${fixture.inactiveClient.id}`)
    await expect(page.getByText(/Client introuvable|permission denied|aucune ligne|Cannot coerce/i)).toBeVisible({ timeout: 20_000 })
    await page.reload()
    await expect(page.getByText(/Client introuvable|permission denied|aucune ligne|Cannot coerce/i)).toBeVisible()
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})

test('coach boundaries: anonymous direct URL and coach without relation fail closed', async ({ page }) => {
  const admin = createLocalAdminClient({ url: process.env.API_URL!, serviceRoleKey: process.env.SERVICE_ROLE_KEY!, mode: 'e2e' })
  const fixture = buildCoachClientFixture(createRunSuffix())
  await seedCoachClientFixture(admin, fixture)
  try {
    await page.goto(`/client/${fixture.client.id}`)
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).not.toBe(`/client/${fixture.client.id}`)
    await loginLocalPersona(page, fixture.secondCoach, `/client/${fixture.client.id}`)
    await page.goto(`/client/${fixture.client.id}`)
    await expect(page.getByText(/Client introuvable|permission denied|aucune ligne|Cannot coerce/i)).toBeVisible({ timeout: 20_000 })
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})
