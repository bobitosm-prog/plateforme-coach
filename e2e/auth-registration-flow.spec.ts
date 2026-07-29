import { expect, test, type Page } from '@playwright/test'
import { createRunSuffix } from '../tests/fixtures/personas'
import {
  cleanupLocalPersonas,
  createLocalAdminClient,
} from '../tests/fixtures/supabase'

const password = 'Local-Registration-42!'

type LocalAdmin = ReturnType<typeof createLocalAdminClient>

async function readCreatedProfile(admin: LocalAdmin, email: string) {
  await expect.poll(async () => {
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (error) throw error
    return data?.id || null
  }, { timeout: 15_000 }).not.toBeNull()

  const { data, error } = await admin
    .from('profiles')
    .select('id,email,role,full_name,coach_speciality,coach_experience_years,coach_onboarding_complete')
    .eq('email', email)
    .single()
  expect(error).toBeNull()
  if (!data) throw new Error('Signup profile was not created by handle_new_user')
  return data
}

async function assertAuthUser(admin: LocalAdmin, id: string, email: string) {
  const { data, error } = await admin.auth.admin.getUserById(id)
  expect(error).toBeNull()
  expect(data.user).toMatchObject({ id, email })
}

async function clearSignupSession(page: Page) {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

async function login(page: Page, email: string, expectedPath: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button.gold-btn').click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe(expectedPath)
}

async function cleanupRegisteredUsers(admin: LocalAdmin, emails: string[]) {
  const ids = new Set<string>()
  const profiles = await admin.from('profiles').select('id').in('email', emails)
  for (const profile of profiles.data || []) ids.add(profile.id)
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const user of users.data.users) {
    if (user.email && emails.includes(user.email)) ids.add(user.id)
  }
  await cleanupLocalPersonas(admin, [...ids])
}

test.describe('authentification, inscription et récupération de session', () => {
  test.setTimeout(120_000)

  test('inscription client: trigger profil, login, dashboard et reload', async ({ page }) => {
    const admin = createLocalAdminClient({
      url: process.env.API_URL!,
      serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
      mode: 'e2e',
    })
    const email = `registration-client-${createRunSuffix()}@moovx.example.test`

    try {
      await page.goto('/register-client')
      await page.locator('.role-grid .gold-btn').click()
      await page.locator('input[type="email"]').fill(email)
      await page.locator('input[type="password"]').nth(0).fill(password)
      await page.locator('input[type="password"]').nth(1).fill(password)
      await page.locator('button.gold-btn').click()
      await expect(page.locator('body')).toContainText(email, { timeout: 20_000 })

      const profile = await readCreatedProfile(admin, email)
      expect(profile).toMatchObject({
        email,
        role: 'client',
        coach_onboarding_complete: false,
      })
      await assertAuthUser(admin, profile.id, email)

      await clearSignupSession(page)
      await login(page, email, '/onboarding-v2')
      await page.reload()
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/onboarding-v2')
    } finally {
      await cleanupRegisteredUsers(admin, [email])
    }
  })

  test('inscription coach: trigger profil, login, onboarding et reload', async ({ page }) => {
    const admin = createLocalAdminClient({
      url: process.env.API_URL!,
      serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
      mode: 'e2e',
    })
    const email = `registration-coach-${createRunSuffix()}@moovx.example.test`

    try {
      await page.goto('/register-client')
      await page.locator('.role-grid .ghost-btn').click()
      await page.locator('input[type="text"]').fill('Coach Auth E2E')
      await page.locator('input[type="email"]').fill(email)
      await page.locator('input[type="password"]').nth(0).fill(password)
      await page.locator('input[type="password"]').nth(1).fill(password)
      await page.locator('select.auth-select').nth(0).selectOption({ index: 1 })
      await page.locator('select.auth-select').nth(1).selectOption({ index: 1 })
      await page.locator('button.gold-btn').click()
      await expect(page.locator('body')).toContainText(email, { timeout: 20_000 })

      const profile = await readCreatedProfile(admin, email)
      expect(profile).toMatchObject({
        email,
        role: 'coach',
        full_name: 'Coach Auth E2e',
        coach_onboarding_complete: false,
      })
      expect(profile.coach_speciality).toBeTruthy()
      expect(profile.coach_experience_years).toBeTruthy()
      await assertAuthUser(admin, profile.id, email)

      await clearSignupSession(page)
      await login(page, email, '/onboarding-coach')
      await page.reload()
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/onboarding-coach')
    } finally {
      await cleanupRegisteredUsers(admin, [email])
    }
  })
})
