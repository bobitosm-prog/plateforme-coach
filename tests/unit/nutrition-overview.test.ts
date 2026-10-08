// @vitest-environment jsdom
import React from 'react'
import {
  cleanup,
  render,
  screen,
  fireEvent,
  within,
  act,
} from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import NutritionOverview from '@/app/components/nutrition-v2/NutritionOverview'
import { buildNutritionViewModel } from '@/lib/nutrition/nutrition-dashboard-model'
import {
  getNutritionDayWindow,
  getNutritionWeekWindow,
} from '@/lib/nutrition/nutrition-date'
import { nutritionWeek } from '@/lib/nutrition/nutrition-week'
import messages from '@/messages/fr.json'
const date = '2026-10-06',
  day = getNutritionDayWindow(new Date(date + 'T12:00:00Z'))
function model(selectedDate = date, failed = false) {
  return buildNutritionViewModel({
    day,
    week: getNutritionWeekWindow(day.date),
    selectedDate,
    profile: {
      calorie_goal: 2200,
      protein_goal: 120,
      carbs_goal: 250,
      fat_goal: 70,
    },
    capabilities: {
      ai: true,
      training: true,
      nutrition: true,
      coachManaged: false,
    },
    coachRelation: { status: 'not_found', coachId: null },
    dailyLogs: [
      {
        id: 'today',
        date,
        meal_type: 'lunch',
        calories: 1700,
        protein: 90,
        carbs: 200,
        fat: 60,
      },
      {
        id: 'yesterday',
        date: '2026-10-05',
        meal_type: 'breakfast',
        calories: 400,
        protein: 20,
        carbs: 45,
        fat: 15,
      },
    ],
    tracking: [],
    personalPlan: null,
    coachPlan: null,
    hydration: [],
    ...(failed ? { errors: { dailyLogs: 'READ_FAILED' } } : {}),
  })
}
const callbacks = {
  onDateChange: vi.fn(),
  onTabChange: vi.fn(),
  onRetry: vi.fn(),
}
function content(selectedDate = date, account = 'A', failed = false, recipesEnabled = true) {
  return React.createElement(NextIntlClientProvider, {
    locale: 'fr',
    messages,
    timeZone: 'Europe/Zurich',
    children: React.createElement(NutritionOverview, {
      key: account + selectedDate,
      userId: account,
      model: model(selectedDate, failed),
      selectedDate,
      historyStart: '2026-09-06',
      mealCounts: { '2026-10-05': 4, [date]: 2 },
      tab: 'today',
      recipesEnabled,
      ...callbacks,
      children: React.createElement('p', null, 'Journal sélectionné'),
    }),
  })
}
function bridge(post: ReturnType<typeof vi.fn>) {
  ;(window as any).webkit = {
    messageHandlers: { moovxDailyEnergy: { postMessage: post } },
  }
}
const ready = {
  status: 'ready',
  date,
  through: new Date(date + 'T12:00:00Z').getTime(),
  active: 500,
  resting: 1300,
  workout: 300,
}
beforeEach(() => {
  vi.stubGlobal('React', React)
  vi.clearAllMocks()
})
afterEach(() => {
  cleanup()
  delete (window as any).webkit
  vi.unstubAllGlobals()
})
it('calculates Monday weeks across month/year and daylight-saving boundaries', () => {
  expect(nutritionWeek('2027-01-01')).toEqual([
    '2026-12-28',
    '2026-12-29',
    '2026-12-30',
    '2026-12-31',
    '2027-01-01',
    '2027-01-02',
    '2027-01-03',
  ])
  expect(nutritionWeek('2026-10-25')).toHaveLength(7)
  expect(nutritionWeek('2026-10-25')[0]).toBe('2026-10-19')
})
it('selects recorded dates, disables future dates, and changes all four sections', () => {
  const view = render(content())
  fireEvent.click(
    screen.getByRole('button', { name: /lundi 5 octobre · 4 repas/ }),
  )
  expect(callbacks.onDateChange).toHaveBeenCalledWith('2026-10-05')
  expect(
    screen
      .getByRole('button', { name: /mercredi 7 octobre/ })
      .hasAttribute('disabled'),
  ).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }))
  expect(callbacks.onDateChange).toHaveBeenCalledWith('2026-09-28')
  for (const [name, id] of [
    ['Journal', 'today'],
    ['Plan', 'plan'],
    ['Mes repas', 'meals'],
    ['Recettes', 'recipes'],
  ]) {
    fireEvent.click(screen.getByRole('button', { name }))
    expect(callbacks.onTabChange).toHaveBeenLastCalledWith(id)
  }
  view.rerender(content('2026-10-05'))
  expect(screen.getByText('400')).toBeTruthy()
  expect(screen.queryByText(/^1\s700$/)).toBeNull()
})
it('offers a Health explanation on web without inventing energy totals', () => {
  render(content())
  fireEvent.click(screen.getByRole('button', { name: 'Connecter Santé' }))
  const dialog = screen.getByRole('dialog', { name: 'Connecter Santé' })
  expect(
    within(dialog).getByText(/disponible dans l’app MoovX sur iPhone/),
  ).toBeTruthy()
  expect(screen.queryByText('Écart informatif')).toBeNull()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('connects only on explicit action and sums active plus resting without workout double counting', async () => {
  const post = vi
    .fn()
    .mockResolvedValueOnce({ status: 'off' })
    .mockResolvedValueOnce(ready)
    .mockResolvedValue({ status: 'off' })
  bridge(post)
  render(content())
  await act(async () => {})
  expect(post).toHaveBeenCalledTimes(1)
  expect(post.mock.calls[0][0].action).toBe('read')
  fireEvent.click(screen.getByRole('button', { name: 'Connecter Santé' }))
  const dialog = screen.getByRole('dialog')
  fireEvent.click(
    within(dialog).getByRole('button', { name: messages.daily_energy.connect }),
  )
  await screen.findByText(/^1\s800$/)
  expect(screen.getByText('−100 kcal')).toBeTruthy()
  expect(post.mock.calls[1][0]).toEqual({
    action: 'connect',
    account: 'A',
    date,
  })
  fireEvent.click(
    within(dialog).getByRole('button', {
      name: messages.daily_energy.disconnect,
    }),
  )
  await act(async () => {})
  expect(screen.queryByText('Écart informatif')).toBeNull()
})
it('does not compare missing resting data or a failed journal read', async () => {
  const post = vi.fn().mockResolvedValue({ ...ready, resting: null })
  bridge(post)
  const view = render(content())
  await screen.findByText('Données Santé incomplètes pour ce jour.')
  expect(screen.queryByText('Écart informatif')).toBeNull()
  post.mockResolvedValue(ready)
  view.rerender(content(date, 'B', true))
  await act(async () => {})
  expect(screen.getByText('Impossible de charger les repas.')).toBeTruthy()
  expect(screen.queryByText('Écart informatif')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(callbacks.onRetry).toHaveBeenCalled()
})
it('discards delayed Health responses for an old account/date', async () => {
  let resolve!: (value: unknown) => void
  const post = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r
        }),
    )
    .mockResolvedValue({ status: 'off' })
  bridge(post)
  const view = render(content())
  view.rerender(content('2026-10-05', 'B'))
  await act(async () => resolve(ready))
  expect(screen.queryByText(/^1\s800$/)).toBeNull()
  expect(screen.queryByText('Écart informatif')).toBeNull()
  expect(post.mock.calls[1][0]).toEqual({
    action: 'read',
    account: 'B',
    date: '2026-10-05',
  })
})

it('disables recipes without blocking saved meals when recipes are unavailable', () => {
  render(content(date, 'A', false, false))
  const recipes = screen.getByRole('button', { name: 'Recettes' })
  expect(recipes.hasAttribute('disabled')).toBe(true)
  fireEvent.click(recipes)
  expect(callbacks.onTabChange).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Mes repas' }))
  expect(callbacks.onTabChange).toHaveBeenCalledWith('meals')
})
