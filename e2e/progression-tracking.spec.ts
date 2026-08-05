import { expect, test, type Locator, type Page } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/types'
import { assertOnlyConfiguredLocalOrigins } from '../scripts/e2e-local-contract.mjs'
import { createRunSuffix } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import {
  assertNoSyntheticProgressionRows,
  buildProgressionFixture,
  cleanupProgressionFixture,
  createAuthenticatedProgressionClient,
  PROGRESSION_E2E_PASSWORD,
  seedProgressionFixture,
} from './helpers/progression-fixtures'

test.setTimeout(120_000)

async function loginProgressionClient(page: Page, email: string): Promise<void> {
  await page.goto('/login?next=%2F')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(PROGRESSION_E2E_PASSWORD)
  await page.locator('button.gold-btn').click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 25_000 }).not.toBe('/login')
}

async function openProgression(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Analytics', exact: true }).last().click()
  const title = page.getByText('ÉVOLUTION DU POIDS', { exact: true }).first()
  await expect(title).toBeVisible({ timeout: 25_000 })
  const section = title.locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Enregistrer mon poids")]][1]')
  await expect(section).toBeVisible()
  return section
}

async function saveWeight(page: Page, value: string, date: string): Promise<void> {
  await page.getByRole('button', { name: /Enregistrer mon poids/i }).click()
  const overlay = page.getByText('ENREGISTRER MON POIDS', { exact: true }).locator('xpath=ancestor::div[position()=2]')
  await overlay.locator('input[type="number"]').fill(value)
  await overlay.locator('input[type="date"]').fill(date)
  await overlay.getByRole('button', { name: 'Sauvegarder', exact: true }).click()
}

function mutationWasRefused(result: { data: unknown[] | null; error: unknown | null }): boolean {
  return Boolean(result.error) || (result.data?.length ?? 0) === 0
}

async function signOut(client: SupabaseClient<Database> | null): Promise<void> {
  if (client) await client.auth.signOut().catch(() => undefined)
}

test('suivi de progression: poids, mensurations, record, reload et frontières RLS', async ({ page }) => {
  page.setDefaultTimeout(25_000)
  const supabaseUrl = process.env.API_URL!
  const anonKey = process.env.ANON_KEY!
  const admin = createLocalAdminClient({
    url: supabaseUrl,
    serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
    mode: 'e2e',
  })
  const referenceInstant = new Date()
  referenceInstant.setUTCDate(referenceInstant.getUTCDate() - 1)
  const referenceDate = referenceInstant.toISOString().split('T')[0]
  const fixture = buildProgressionFixture(createRunSuffix(), referenceDate)
  const fixedNow = new Date(`${referenceDate}T12:00:00.000Z`).valueOf()
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

  await seedProgressionFixture(admin, fixture)
  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginProgressionClient(page, fixture.client.email)
    let weightSection = await openProgression(page)
    await expect(weightSection.getByText(/80\s*KG/i)).toBeVisible()
    await expect(weightSection.locator('svg polyline')).toHaveAttribute('points', /,.*,/)
    await expect(page.getByText('Squat', { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/1 séances · 1 PR/i)).toBeVisible()
    await expect(page.getByText(/TAILLE\s*82\s*cm/i)).toBeVisible()
    await expect(page.getByText(/POITRINE\s*101\s*cm/i)).toBeVisible()

    await saveWeight(page, '81.2', fixture.dates.mutation)
    await expect.poll(async () => {
      const { data } = await admin.from('weight_logs').select('date,poids')
        .eq('user_id', fixture.client.id).order('date', { ascending: true })
      return (data ?? []).map(row => ({ date: row.date, poids: Number(row.poids) }))
    }).toEqual([
      { date: fixture.dates.oldest, poids: 80.4 },
      { date: fixture.dates.latest, poids: 80 },
      { date: fixture.dates.mutation, poids: 81.2 },
    ])
    await saveWeight(page, '81.4', fixture.dates.mutation)
    await expect.poll(async () => {
      const { data } = await admin.from('weight_logs').select('date,poids')
        .eq('user_id', fixture.client.id).eq('date', fixture.dates.mutation)
      return (data ?? []).map(row => ({ date: row.date, poids: Number(row.poids) }))
    }).toEqual([{ date: fixture.dates.mutation, poids: 81.4 }])

    await page.getByRole('button', { name: /Mes mensurations/i }).click()
    const measurementOverlay = page.getByText('MES MENSURATIONS', { exact: true }).locator('xpath=ancestor::div[position()=2]')
    const measurementInputs = measurementOverlay.locator('input[type="number"]')
    await measurementInputs.nth(0).fill('81')
    await measurementInputs.nth(1).fill('95')
    await measurementInputs.nth(2).fill('100')
    await measurementOverlay.locator('input[type="date"]').fill(fixture.dates.mutation)
    await measurementOverlay.getByRole('button', { name: 'Sauvegarder', exact: true }).click()
    await expect.poll(async () => {
      const { data } = await admin.from('body_measurements').select('user_id,date,waist,hips,chest')
        .eq('user_id', fixture.client.id).eq('date', fixture.dates.mutation)
      return (data ?? []).map(row => ({
        user_id: row.user_id,
        date: row.date,
        waist: Number(row.waist),
        hips: Number(row.hips),
        chest: Number(row.chest),
      }))
    }).toEqual([{
      user_id: fixture.client.id,
      date: fixture.dates.mutation,
      waist: 81,
      hips: 95,
      chest: 100,
    }])

    await page.reload()
    weightSection = await openProgression(page)
    await expect(weightSection.getByText(/81\.4\s*KG/i)).toBeVisible()
    await expect.poll(async () => {
      const points = await weightSection.locator('svg polyline').getAttribute('points')
      return points?.trim().split(/\s+/).length
    }).toBe(3)
    await expect(page.getByText(/TAILLE\s*81\s*cm/i)).toBeVisible()
    await expect(page.getByText(/POITRINE\s*100\s*cm/i)).toBeVisible()
    await expect(page.getByText('Squat', { exact: true }).first()).toBeVisible()

    owner = await createAuthenticatedProgressionClient({ url: supabaseUrl, anonKey, persona: fixture.client })
    coach = await createAuthenticatedProgressionClient({ url: supabaseUrl, anonKey, persona: fixture.coach })
    foreignClient = await createAuthenticatedProgressionClient({ url: supabaseUrl, anonKey, persona: fixture.foreignClient })

    const ownerWeightRead = await owner.from('weight_logs').select('id').eq('user_id', fixture.client.id)
    expect(ownerWeightRead.error).toBeNull()
    expect(ownerWeightRead.data).toHaveLength(3)
    const ownerWeightUpdate = await owner.from('weight_logs').update({ poids: 81.4 })
      .eq('user_id', fixture.client.id).eq('date', fixture.dates.mutation).select('id')
    expect(ownerWeightUpdate.error).toBeNull()
    expect(ownerWeightUpdate.data).toHaveLength(1)
    const coachWeightRead = await coach.from('weight_logs').select('id').eq('user_id', fixture.client.id)
    expect(coachWeightRead.error).toBeNull()
    expect(coachWeightRead.data).toHaveLength(3)
    expect(mutationWasRefused(await coach.from('weight_logs').update({ poids: 81.4 }).eq('user_id', fixture.client.id).select('id'))).toBe(true)
    expect(mutationWasRefused(await coach.from('weight_logs').delete().eq('user_id', fixture.client.id).select('id'))).toBe(true)
    const foreignWeightRead = await foreignClient.from('weight_logs').select('id').eq('user_id', fixture.client.id)
    expect(foreignWeightRead.error).toBeNull()
    expect(foreignWeightRead.data).toEqual([])
    expect(mutationWasRefused(await foreignClient.from('weight_logs').update({ poids: 81.4 }).eq('user_id', fixture.client.id).select('id'))).toBe(true)
    expect(mutationWasRefused(await foreignClient.from('weight_logs').delete().eq('user_id', fixture.client.id).select('id'))).toBe(true)

    const ownerMeasurementRead = await owner.from('body_measurements').select('id').eq('user_id', fixture.client.id)
    expect(ownerMeasurementRead.error).toBeNull()
    expect(ownerMeasurementRead.data).toHaveLength(2)
    const ownerMeasurementUpdate = await owner.from('body_measurements').update({ waist: 81 })
      .eq('user_id', fixture.client.id).eq('date', fixture.dates.mutation).select('id')
    expect(ownerMeasurementUpdate.error).toBeNull()
    expect(ownerMeasurementUpdate.data).toHaveLength(1)
    const coachMeasurementRead = await coach.from('body_measurements').select('id').eq('user_id', fixture.client.id)
    expect(coachMeasurementRead.error).toBeNull()
    expect(coachMeasurementRead.data).toHaveLength(2)
    expect(mutationWasRefused(await coach.from('body_measurements').update({ waist: 81 }).eq('user_id', fixture.client.id).select('id'))).toBe(true)
    expect(mutationWasRefused(await coach.from('body_measurements').delete().eq('user_id', fixture.client.id).select('id'))).toBe(true)
    const foreignMeasurementRead = await foreignClient.from('body_measurements').select('id').eq('user_id', fixture.client.id)
    expect(foreignMeasurementRead.error).toBeNull()
    expect(foreignMeasurementRead.data).toEqual([])
    expect(mutationWasRefused(await foreignClient.from('body_measurements').update({ waist: 81 }).eq('user_id', fixture.client.id).select('id'))).toBe(true)
    expect(mutationWasRefused(await foreignClient.from('body_measurements').delete().eq('user_id', fixture.client.id).select('id'))).toBe(true)

    const ownerRecordRead = await owner.from('personal_records').select('id').eq('user_id', fixture.client.id)
    expect(ownerRecordRead.error).toBeNull()
    expect(ownerRecordRead.data).toHaveLength(1)
    const ownerRecordUpdate = await owner.from('personal_records').update({ value: 100 }).eq('user_id', fixture.client.id).select('id')
    expect(ownerRecordUpdate.error).toBeNull()
    expect(ownerRecordUpdate.data).toHaveLength(1)
    const coachRecordRead = await coach.from('personal_records').select('id').eq('user_id', fixture.client.id)
    expect(coachRecordRead.error).toBeNull()
    expect(coachRecordRead.data).toHaveLength(1)
    expect(mutationWasRefused(await coach.from('personal_records').update({ value: 100 }).eq('user_id', fixture.client.id).select('id'))).toBe(true)
    expect(mutationWasRefused(await coach.from('personal_records').delete().eq('user_id', fixture.client.id).select('id'))).toBe(true)
    const foreignRecordRead = await foreignClient.from('personal_records').select('id').eq('user_id', fixture.client.id)
    expect(foreignRecordRead.error).toBeNull()
    expect(foreignRecordRead.data).toEqual([])
    expect(mutationWasRefused(await foreignClient.from('personal_records').update({ value: 100 }).eq('user_id', fixture.client.id).select('id'))).toBe(true)
    expect(mutationWasRefused(await foreignClient.from('personal_records').delete().eq('user_id', fixture.client.id).select('id'))).toBe(true)

    expect(() => assertOnlyConfiguredLocalOrigins(browserOrigins, [
      'http://127.0.0.1:3210',
      supabaseUrl,
    ])).not.toThrow()
  } finally {
    await signOut(owner)
    await signOut(coach)
    await signOut(foreignClient)
    await cleanupProgressionFixture(admin, fixture.ids)
    await assertNoSyntheticProgressionRows(admin, fixture.ids)
  }
})
