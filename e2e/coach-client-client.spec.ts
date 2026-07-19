import { expect, test } from '@playwright/test'
import { createRunSuffix } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import { assertNoSyntheticCoachClientRows, buildCoachClientFixture, cleanupCoachClientFixture, loginLocalPersona, seedCoachClientFixture } from './helpers/coach-client-fixtures'

test.setTimeout(90_000)

test('client: linked coach, representative dashboard navigation and reload', async ({ page }) => {
  const admin = createLocalAdminClient({ url: process.env.API_URL!, serviceRoleKey: process.env.SERVICE_ROLE_KEY!, mode: 'e2e' })
  const fixture = buildCoachClientFixture(createRunSuffix())
  await seedCoachClientFixture(admin, fixture)
  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginLocalPersona(page, fixture.client)
    await expect(page.getByText('SÉANCE DU JOUR').first()).toBeVisible({ timeout: 25_000 })
    const openNav = async (index: number) => page.evaluate(value => {
      const button = document.querySelectorAll<HTMLButtonElement>('nav.mobile-nav button')[value]
      if (!button) throw new Error('Mobile navigation boundary unavailable')
      button.click()
    }, index)
    await openNav(1)
    await expect(page.getByText(/MES PROGRAMMES/i).first()).toBeVisible()
    await openNav(2)
    await expect(page.getByText(/JOURNAL|PLAN/i).first()).toBeVisible()
    await openNav(4)
    await page.getByRole('button', { name: /Mon profil/i }).first().click()
    await expect(page.getByText('Coach actif').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Actif', { exact: true }).first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText(fixture.secondCoach.email)
    await page.reload()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/')
    await expect(page.getByText('SÉANCE DU JOUR').first()).toBeVisible({ timeout: 20_000 })
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})

test('client boundaries: inactive, unrelated and invited personas do not inherit a coach', async ({ page }) => {
  const admin = createLocalAdminClient({ url: process.env.API_URL!, serviceRoleKey: process.env.SERVICE_ROLE_KEY!, mode: 'e2e' })
  const fixture = buildCoachClientFixture(createRunSuffix())
  await seedCoachClientFixture(admin, fixture)
  try {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const persona of [fixture.inactiveClient, fixture.secondClient, fixture.invited]) {
      await page.context().clearCookies()
      await page.goto('/login')
      await page.evaluate(() => localStorage.clear())
      await loginLocalPersona(page, persona)
      await expect(page.getByText('SÉANCE DU JOUR').first()).toBeVisible({ timeout: 25_000 })
      await page.evaluate(() => {
        const button = document.querySelectorAll<HTMLButtonElement>('nav.mobile-nav button')[4]
        if (!button) throw new Error('Mobile navigation boundary unavailable')
        button.click()
      })
      await page.getByRole('button', { name: /Mon profil/i }).first().click()
      await expect(page.getByText('Coach Parcours')).toHaveCount(0)
      await page.goto('/login')
    }
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})
