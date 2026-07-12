import { expect, test } from '@playwright/test'

test('socle navigateur: refuse le lien coach legacy sans appeler assign-coach', async ({ page }) => {
  const applicationRequests: string[] = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) {
      applicationRequests.push(`${request.method()} ${url.pathname}${url.search}`)
    }
  })

  await page.goto('/join?coach=00000000-0000-4000-8000-000000000001')

  await expect(page).toHaveURL(/\/join$/)
  await expect(page.locator('body')).not.toBeEmpty()
  expect(applicationRequests.some(request => request.includes('/api/assign-coach'))).toBe(false)
  expect(applicationRequests.some(request => request.includes('/join?coach='))).toBe(true)
})
