import { expect, test, type Locator, type Page } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertOnlyConfiguredLocalOrigins } from '../scripts/e2e-local-contract.mjs'
import { createRunSuffix } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import type { Database } from '../lib/supabase/types'
import {
  assertFoodItemsEmpty,
  assertNoSyntheticNutritionRows,
  buildNutritionFixture,
  cleanupNutritionFixture,
  createAuthenticatedNutritionClient,
  NUTRITION_E2E_FOOD_NAME,
  NUTRITION_E2E_PASSWORD,
  readNutritionLogs,
  seedNutritionFixture,
} from './helpers/nutrition-fixtures'

test.setTimeout(120_000)

async function loginNutritionClient(page: Page, email: string): Promise<void> {
  await page.goto('/login?next=%2F')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(NUTRITION_E2E_PASSWORD)
  await page.locator('button.gold-btn').click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 25_000 }).not.toBe('/login')
}

async function openNutrition(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Nutrition', exact: true }).last().click()
  const lunchTitle = page.getByText(/^Déjeuner$/i).first()
  await expect(lunchTitle).toBeVisible({ timeout: 25_000 })
  const lunchCard = lunchTitle.locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Ajouter")]][1]')
  await expect(lunchCard).toBeVisible()
  return lunchCard
}

function mutationWasRefused(result: { data: unknown[] | null; error: unknown | null }): boolean {
  return Boolean(result.error) || (result.data?.length ?? 0) === 0
}

async function signOut(client: SupabaseClient<Database> | null): Promise<void> {
  if (client) await client.auth.signOut().catch(() => undefined)
}

test('journal nutritionnel quotidien: fallback, persistance, modification, RLS et suppression', async ({ page }) => {
  page.setDefaultTimeout(25_000)
  const supabaseUrl = process.env.API_URL!
  const anonKey = process.env.ANON_KEY!
  const admin = createLocalAdminClient({
    url: supabaseUrl,
    serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
    mode: 'e2e',
  })
  const fixture = buildNutritionFixture(createRunSuffix())
  const runDate = new Date().toISOString().split('T')[0]
  const fixedNow = new Date(`${runDate}T12:00:00.000Z`).valueOf()
  const browserOrigins = new Set<string>()
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.protocol === 'http:' || url.protocol === 'https:') browserOrigins.add(url.origin)
  })
  await page.addInitScript(now => {
    const NativeDate = Date
    const FixedDate = new Proxy(NativeDate, {
      construct(target, args) {
        return Reflect.construct(target, args.length ? args : [now])
      },
      apply(target, thisArg, args) {
        return Reflect.apply(target, thisArg, args.length ? args : [now])
      },
    })
    Object.defineProperty(FixedDate, 'now', { value: () => now })
    globalThis.Date = FixedDate as DateConstructor
  }, fixedNow)

  let owner: SupabaseClient<Database> | null = null
  let coach: SupabaseClient<Database> | null = null
  let foreignClient: SupabaseClient<Database> | null = null

  await assertFoodItemsEmpty(admin)
  await seedNutritionFixture(admin, fixture)

  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginNutritionClient(page, fixture.client.email)
    let lunchCard = await openNutrition(page)

    await lunchCard.getByRole('button', { name: /^Ajouter$/i }).click()
    await expect(page.getByText('AJOUTER UN ALIMENT', { exact: true })).toBeVisible()
    const search = page.getByPlaceholder('Rechercher un aliment...')
    await search.fill('poulet')
    await expect(page.getByRole('button', { name: /Blanc de poulet cuit/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Cuisse de poulet cuite sans peau/ })).toBeVisible()

    await page.getByRole('button', { name: /Blanc de poulet cuit/ }).click()
    const quantity = page.locator('input[inputmode="numeric"]')
    await expect(quantity).toHaveValue('100')
    await expect(page.getByText('165', { exact: true })).toBeVisible()
    await expect(page.getByText('31g', { exact: true })).toBeVisible()
    await expect(page.getByText('0g', { exact: true })).toBeVisible()
    await expect(page.getByText('3.6g', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Ajouter au repas', exact: true }).click()

    let logId = ''
    await expect.poll(async () => {
      const rows = await readNutritionLogs(admin, fixture.client.id, runDate)
      logId = rows[0]?.id ?? ''
      return rows.map(row => ({
        user_id: row.user_id,
        date: row.date,
        meal_type: row.meal_type,
        food_id: row.food_id,
        custom_name: row.custom_name,
        quantity_g: Number(row.quantity_g),
        calories: Number(row.calories),
        protein: Number(row.protein),
        carbs: Number(row.carbs),
        fat: Number(row.fat),
      }))
    }).toEqual([{
      user_id: fixture.client.id,
      date: runDate,
      meal_type: 'dejeuner',
      food_id: null,
      custom_name: NUTRITION_E2E_FOOD_NAME,
      quantity_g: 100,
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
    }])
    await expect(lunchCard.getByText(NUTRITION_E2E_FOOD_NAME, { exact: true })).toBeVisible()
    await expect(lunchCard.getByText(/100g.*P:31g.*G:0g.*L:4g/)).toBeVisible()
    await expect(lunchCard.getByText('165 kcal', { exact: true })).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^165$/ }).first()).toBeVisible()

    await page.reload()
    lunchCard = await openNutrition(page)
    await expect(lunchCard.getByText(NUTRITION_E2E_FOOD_NAME, { exact: true })).toBeVisible()
    await expect(lunchCard.getByText(/100g.*P:31g.*G:0g.*L:4g/)).toBeVisible()
    await expect(lunchCard.getByText('165 kcal', { exact: true })).toBeVisible()

    await lunchCard.getByText(/100g.*P:31g.*G:0g.*L:4g/).click()
    const editQuantity = lunchCard.locator('input[type="number"]')
    await expect(editQuantity).toBeVisible()
    await editQuantity.fill('200')
    await lunchCard.getByRole('button', { name: 'OK', exact: true }).click()

    await expect.poll(async () => {
      const rows = await readNutritionLogs(admin, fixture.client.id, runDate)
      return rows.map(row => ({
        id: row.id,
        quantity_g: Number(row.quantity_g),
        calories: Number(row.calories),
        protein: Number(row.protein),
        carbs: Number(row.carbs),
        fat: Number(row.fat),
      }))
    }).toEqual([{
      id: logId,
      quantity_g: 200,
      calories: 330,
      protein: 62,
      carbs: 0,
      fat: 7.2,
    }])
    await expect(lunchCard.getByText(/200g.*P:62g.*G:0g.*L:7g/)).toBeVisible()
    await expect(lunchCard.getByText('330 kcal', { exact: true })).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^330$/ }).first()).toBeVisible()

    owner = await createAuthenticatedNutritionClient({ url: supabaseUrl, anonKey, persona: fixture.client })
    coach = await createAuthenticatedNutritionClient({ url: supabaseUrl, anonKey, persona: fixture.coach })
    foreignClient = await createAuthenticatedNutritionClient({ url: supabaseUrl, anonKey, persona: fixture.foreignClient })

    const ownerRead = await owner.from('daily_food_logs').select('id').eq('id', logId)
    expect(ownerRead.error).toBeNull()
    expect(ownerRead.data).toEqual([{ id: logId }])

    const coachRead = await coach.from('daily_food_logs').select('id').eq('id', logId)
    expect(coachRead.error).toBeNull()
    expect(coachRead.data).toEqual([{ id: logId }])
    const coachInsert = await coach.from('daily_food_logs').insert({
      user_id: fixture.client.id,
      date: runDate,
      meal_type: 'dejeuner',
      custom_name: 'Forbidden coach insert',
      quantity_g: 1,
      calories: 1,
    }).select('id')
    expect(mutationWasRefused(coachInsert)).toBe(true)
    const coachUpdate = await coach.from('daily_food_logs').update({ quantity_g: 999 }).eq('id', logId).select('id')
    expect(mutationWasRefused(coachUpdate)).toBe(true)
    const coachDelete = await coach.from('daily_food_logs').delete().eq('id', logId).select('id')
    expect(mutationWasRefused(coachDelete)).toBe(true)

    const foreignRead = await foreignClient.from('daily_food_logs').select('id').eq('id', logId)
    expect(foreignRead.error).toBeNull()
    expect(foreignRead.data).toEqual([])
    const foreignInsert = await foreignClient.from('daily_food_logs').insert({
      user_id: fixture.client.id,
      date: runDate,
      meal_type: 'dejeuner',
      custom_name: 'Forbidden foreign insert',
      quantity_g: 1,
      calories: 1,
    }).select('id')
    expect(mutationWasRefused(foreignInsert)).toBe(true)
    const foreignUpdate = await foreignClient.from('daily_food_logs').update({ quantity_g: 998 }).eq('id', logId).select('id')
    expect(mutationWasRefused(foreignUpdate)).toBe(true)
    const foreignDelete = await foreignClient.from('daily_food_logs').delete().eq('id', logId).select('id')
    expect(mutationWasRefused(foreignDelete)).toBe(true)

    await expect.poll(async () => {
      const rows = await readNutritionLogs(admin, fixture.client.id, runDate)
      return rows.map(row => ({ id: row.id, quantity_g: Number(row.quantity_g) }))
    }).toEqual([{ id: logId, quantity_g: 200 }])

    await lunchCard.getByTitle(/Supprimer/i).click()
    await expect.poll(async () => (await readNutritionLogs(admin, fixture.client.id, runDate)).length).toBe(0)
    await expect(lunchCard.getByText(NUTRITION_E2E_FOOD_NAME, { exact: true })).toHaveCount(0)
    await expect(lunchCard.getByText('0 kcal', { exact: true })).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^0$/ }).first()).toBeVisible()

    await assertFoodItemsEmpty(admin)
    expect(() => assertOnlyConfiguredLocalOrigins(browserOrigins, [
      'http://127.0.0.1:3210',
      supabaseUrl,
    ])).not.toThrow()
  } finally {
    await signOut(owner)
    await signOut(coach)
    await signOut(foreignClient)
    await cleanupNutritionFixture(admin, fixture.ids)
    await assertNoSyntheticNutritionRows(admin, fixture.ids)
  }
})
