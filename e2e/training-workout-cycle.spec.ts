import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createRunSuffix } from '../tests/fixtures/personas'
import type { TestPersona } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import type { Database } from '../lib/supabase/types'
import { ACTIVE_WORKOUT_STORAGE_KEY, WORKOUT_DRAFT_STORAGE_KEY } from '../lib/training/workout-session-storage'
import {
  assertNoSyntheticTrainingRows,
  buildTrainingFixture,
  cleanupTrainingFixture,
  seedTrainingFixture,
  TRAINING_E2E_EXERCISE_NAME,
  TRAINING_E2E_PASSWORD,
  TRAINING_E2E_SESSION_NAME,
} from './helpers/training-fixtures'

test.setTimeout(120_000)

async function loginTrainingPersona(page: Page, persona: TestPersona): Promise<void> {
  await page.goto('/login?next=%2F')
  await page.locator('input[type="email"]').fill(persona.email)
  await page.locator('input[type="password"]').fill(TRAINING_E2E_PASSWORD)
  await page.locator('button.gold-btn').click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 25_000 }).not.toBe('/login')
}

test('cycle d’une séance Training: saisie, reprise, finalisation et frontières RLS', async ({ page }) => {
  page.setDefaultTimeout(25_000)
  const admin = createLocalAdminClient({
    url: process.env.API_URL!,
    serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
    mode: 'e2e',
  })
  const fixture = buildTrainingFixture(createRunSuffix())
  await seedTrainingFixture(admin, fixture)

  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginTrainingPersona(page, fixture.client)
    await expect(page.getByText('SÉANCE DU JOUR').first()).toBeVisible({ timeout: 25_000 })

    await page.evaluate(() => {
      const trainingButton = document.querySelectorAll<HTMLButtonElement>('nav.mobile-nav button').item(1)
      if (!trainingButton) throw new Error('Training navigation boundary unavailable')
      trainingButton.click()
    })
    await expect(page.getByText(TRAINING_E2E_SESSION_NAME, { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')]
        .filter(button => button.textContent?.trim().toUpperCase().startsWith('COMMENCER'))
      const trainingStart = buttons.at(-1)
      if (!trainingStart) throw new Error('Training start boundary unavailable')
      trainingStart.click()
    })
    await expect(page.locator('[data-workout-phase="active"]')).toBeVisible()
    await expect(page.getByText(TRAINING_E2E_EXERCISE_NAME, { exact: false }).first()).toBeVisible()

    const inputs = page.locator('.ws-input')
    await expect(inputs).toHaveCount(4)
    await inputs.nth(0).fill('40')
    await inputs.nth(1).fill('8')
    await inputs.nth(1).locator('xpath=../following-sibling::div//button').last().click()
    await expect(page.locator('[data-workout-phase="resting"]')).toBeVisible()
    await page.getByRole('button', { name: /Passer/i }).click()

    await expect.poll(() => page.evaluate(key => {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const draft = JSON.parse(raw)
      return draft.exos?.[0]?.sets?.[0]?.done === true ? 'saved' : 'incomplete'
    }, WORKOUT_DRAFT_STORAGE_KEY)).toBe('saved')
    await expect.poll(() => page.evaluate(key => Boolean(localStorage.getItem(key)), ACTIVE_WORKOUT_STORAGE_KEY)).toBe(true)

    await page.reload()
    await expect(page.locator('[data-workout-phase="preparation"]')).toBeVisible({ timeout: 25_000 })
    await page.getByRole('button', { name: /^Reprendre$/i }).click()
    await expect(page.locator('[data-workout-phase="active"]')).toBeVisible()
    await expect(inputs.nth(0)).toHaveValue('40')
    await expect(inputs.nth(1)).toHaveValue('8')
    await expect(inputs.nth(0)).toBeDisabled()

    await inputs.nth(2).fill('42')
    await inputs.nth(3).fill('7')
    await inputs.nth(3).locator('xpath=../following-sibling::div//button').last().click()
    await expect(page.locator('[data-workout-phase="resting"]')).toBeVisible()
    await page.getByRole('button', { name: /Passer/i }).click()

    await page.getByRole('button', { name: /^TERMINER$/i }).click()
    await expect(page.locator('[data-workout-phase="finalizing"]')).toBeVisible()
    await page.getByRole('button', { name: /SAUVEGARDER LA SEANCE/i }).click()
    await expect(page.locator('[data-workout-phase="template-save"]')).toBeVisible()
    await page.getByRole('button', { name: /NON.*JUSTE CETTE FOIS/i }).click()
    await expect(page.locator('[data-workout-phase="completed"]')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: /Séance terminée/i })).toBeVisible()
    await page.getByRole('button', { name: /Retour au Dashboard/i }).click()
    await expect(page.locator('[data-workout-phase]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^CONTINUER$/i })).toBeVisible()
    await page.getByRole('button', { name: /^CONTINUER$/i }).click()

    let sessionId = ''
    await expect.poll(async () => {
      const sessions = await admin.from('workout_sessions').select('id,name,completed,user_id').eq('user_id', fixture.client.id).eq('name', TRAINING_E2E_SESSION_NAME)
      sessionId = sessions.data?.[0]?.id ?? ''
      const sets = sessionId
        ? await admin.from('workout_sets').select('exercise_name,set_number,weight,reps,completed').eq('session_id', sessionId).order('set_number')
        : { data: [] }
      const completions = await admin.from('completed_sessions').select('id', { count: 'exact', head: true }).eq('client_id', fixture.client.id)
      const schedule = await admin.from('scheduled_sessions').select('id', { count: 'exact', head: true }).eq('user_id', fixture.client.id)
      const profile = await admin.from('profiles').select('last_workout_at').eq('id', fixture.client.id).single()
      const records = await admin.from('personal_records').select('record_type', { count: 'exact' }).eq('user_id', fixture.client.id)
      const xp = await admin.from('user_xp').select('user_id', { count: 'exact', head: true }).eq('user_id', fixture.client.id)
      const badges = await admin.from('user_badges').select('user_id', { count: 'exact', head: true }).eq('user_id', fixture.client.id)
      return {
        sessionCount: sessions.data?.length ?? 0,
        sessionCompleted: sessions.data?.[0]?.completed ?? false,
        sets: sets.data ?? [],
        completionCount: completions.count ?? 0,
        scheduledCount: schedule.count ?? 0,
        lastWorkoutPresent: Boolean(profile.data?.last_workout_at),
        recordCount: records.count ?? 0,
        xpCount: xp.count ?? 0,
        badgeCount: badges.count ?? 0,
      }
    }, { timeout: 20_000 }).toEqual({
      sessionCount: 1,
      sessionCompleted: true,
      sets: [
        { exercise_name: TRAINING_E2E_EXERCISE_NAME, set_number: 1, weight: 40, reps: 8, completed: true },
        { exercise_name: TRAINING_E2E_EXERCISE_NAME, set_number: 2, weight: 42, reps: 7, completed: true },
      ],
      completionCount: 0,
      scheduledCount: 7,
      lastWorkoutPresent: true,
      recordCount: 2,
      xpCount: 1,
      badgeCount: 1,
    })

    const foreign = createClient<Database>(process.env.API_URL!, process.env.ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const login = await foreign.auth.signInWithPassword({ email: fixture.foreignClient.email, password: TRAINING_E2E_PASSWORD })
    expect(login.error).toBeNull()
    const foreignRead = await foreign.from('workout_sessions').select('id').eq('id', sessionId)
    expect(foreignRead.error).toBeNull()
    expect(foreignRead.data).toEqual([])
    const foreignWrite = await foreign.from('workout_sessions').insert({
      user_id: fixture.client.id,
      name: 'Forbidden Training write',
      completed: true,
      duration_minutes: 1,
    })
    expect(foreignWrite.error).not.toBeNull()
    await foreign.auth.signOut()

    await expect.poll(() => page.evaluate(keys => {
      const active = localStorage.getItem(keys[0])
      const rawDraft = localStorage.getItem(keys[1])
      if (!rawDraft) return { active, draftHasProgress: false }
      const draft = JSON.parse(rawDraft)
      const draftHasProgress = draft.exos?.some((exercise: { sets?: { done?: boolean }[] }) =>
        exercise.sets?.some(set => set.done === true),
      ) ?? false
      return { active, draftHasProgress }
    }, [ACTIVE_WORKOUT_STORAGE_KEY, WORKOUT_DRAFT_STORAGE_KEY])).toEqual({ active: null, draftHasProgress: false })
    await page.evaluate(() => {
      const trainingButton = document.querySelectorAll<HTMLButtonElement>('nav.mobile-nav button').item(1)
      if (!trainingButton) throw new Error('Training navigation boundary unavailable')
      trainingButton.click()
    })
    await expect(page.getByText(TRAINING_E2E_SESSION_NAME, { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  } finally {
    await page.evaluate(keys => keys.forEach(key => localStorage.removeItem(key)), [
      ACTIVE_WORKOUT_STORAGE_KEY,
      WORKOUT_DRAFT_STORAGE_KEY,
    ]).catch(() => undefined)
    await cleanupTrainingFixture(admin, fixture.ids)
    await assertNoSyntheticTrainingRows(admin, fixture.ids)
  }
})
