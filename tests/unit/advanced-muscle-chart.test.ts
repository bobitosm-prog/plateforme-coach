// @vitest-environment jsdom
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import AnalyticsSection, { MuscleVolumeTooltip, type AdvancedWorkoutSession } from '@/app/components/AnalyticsSection'
import fr from '@/messages/fr.json'
import en from '@/messages/en.json'
import de from '@/messages/de.json'

const chart = vi.hoisted(() => ({ data: [] as { sets: number; tonnage: number }[] }))
vi.mock('@/app/components/ui/SizedChart', () => ({
  useHasSize: () => ({ hasSize: true, rootRef: null }),
  SizedContainer: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('recharts', () => ({
  BarChart: ({ data, children }: { data: typeof chart.data; children: React.ReactNode }) => { chart.data = data; return children },
  XAxis: ({ allowDecimals }: { allowDecimals?: boolean }) => React.createElement('div', { 'data-testid': 'axis', 'data-decimals': String(allowDecimals) }),
  YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, Bar: () => null,
}))
beforeEach(() => { vi.stubGlobal('React', React); vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-23T17:00:00Z')) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('counts only completed recent mapped sets and discloses unmapped ones without guessing', () => {
  const set = { completed: true, exercise_id: 'quads', created_at: '2026-09-23T12:00:00Z', weight: 10, reps: 10, load_mode: 'external_only' }
  const sessions: AdvancedWorkoutSession[] = [
    { completed: true, workout_sets: [set, set, { ...set, load_mode: 'two_dumbbells' },
      { ...set, exercise_id: null }, { ...set, exercise_id: 'unknown' },
      { ...set, completed: false }, { ...set, created_at: '2026-08-01T12:00:00Z' },
      { ...set, created_at: 'invalid' }] },
    { completed: false, workout_sets: [set] },
  ]
  const view = render(React.createElement(NextIntlClientProvider, { locale: 'fr', messages: fr, timeZone: 'Europe/Zurich',
    children: React.createElement(AnalyticsSection, { wSessions: sessions, muscleMap: new Map([['quads', 'Quadriceps']]), mappingState: 'ready' }),
  }))
  expect(chart.data).toEqual([expect.objectContaining({ label: 'Quadriceps', sets: 3, tonnage: 400 })])
  expect(view.getByTestId('axis').dataset.decimals).toBe('false')
  expect(view.getByText('Nombre de séries')).toBeTruthy()
  expect(view.getByText('2 séries sans muscle identifié, non incluses dans cette répartition.')).toBeTruthy()
})

it.each([['fr', fr, '3 séries · 100 kg'], ['en', en, '3 sets · 100 kg'], ['de', de, '3 Sätze · 100 kg']] as const)('renders localized dark tooltip with sets and tonnage in %s', (locale, messages, expected) => {
  const view = render(React.createElement(NextIntlClientProvider, { locale, messages, timeZone: 'Europe/Zurich',
    children: React.createElement(MuscleVolumeTooltip, { active: true, payload: [{ payload: { label: 'Quadriceps', sets: 3, tonnage: 100 } }] }),
  }))
  expect(view.getByText(expected)).toBeTruthy()
  const style = getComputedStyle(view.getByText('Quadriceps').parentElement!)
  expect(style.backgroundColor).toBe('rgb(26, 24, 23)')
  expect(style.color).toBe('rgb(229, 226, 225)')
})

it('keeps an inactive or empty tooltip hidden', () => {
  const view = render(React.createElement(NextIntlClientProvider, { locale: 'fr', messages: fr,
    children: React.createElement(MuscleVolumeTooltip, { active: true, payload: [] }),
  }))
  expect(view.container.textContent).toBe('')
})
