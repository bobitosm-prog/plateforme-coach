import { createElement } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'

import EnergyCard from '@/app/components/home/cards/EnergyCard'
import NutritionCard from '@/app/components/home/cards/NutritionCard'
import { readHomeNutritionSummary } from '@/lib/nutrition/home-nutrition-summary'
import {
  createActivePersonalMealPlanReader,
} from '@/lib/nutrition/personal-meal-plan-reader'
import { LEGACY_AI_WEEK } from '@/tests/fixtures/nutrition-plan-envelope'
import messages from '@/messages/fr.json'

const IntlProvider = NextIntlClientProvider as unknown as ComponentType<{
  locale: string
  messages: typeof messages
  children?: ReactNode
}>

describe('Home nutrition regression', () => {
  it('renders the reported daily totals instead of À évaluer with an active plan', async () => {
    const plan = await createActivePersonalMealPlanReader({
      findActivePersonalPlanForOwner: async () => ({
        ok: true,
        data: {
          id: 'active-plan',
          user_id: 'owner',
          created_by: null,
          name: null,
          plan: LEGACY_AI_WEEK,
          active: true,
          created_at: '2026-07-24T08:00:00.000Z',
        },
      }),
    }).load('owner')
    const logs = [
      { calories: 400, protein: 30, carbs: 40, fat: 10 },
      { calories: 500, protein: 35, carbs: 60, fat: 12 },
      { calories: 450, protein: 38, carbs: 53, fat: 13 },
      { calories: 460, protein: 30, carbs: 50, fat: 14 },
    ]
    expect(logs.reduce((sum, log) => sum + log.calories, 0)).toBe(1810)
    expect(logs.reduce((sum, log) => sum + log.protein, 0)).toBe(133)
    expect(logs.reduce((sum, log) => sum + log.carbs, 0)).toBe(203)
    expect(logs.reduce((sum, log) => sum + log.fat, 0)).toBe(49)

    const summary = readHomeNutritionSummary(plan, [], logs, 'lundi')
    expect(summary).toMatchObject({ status: 'ready', consumedKcal: 1810 })
    if (summary.status !== 'ready') throw new Error('Home summary must be ready')

    const html = renderToStaticMarkup(createElement(
      IntlProvider,
      { locale: 'fr', messages },
      createElement('div', null,
        createElement(EnergyCard, {
          consumedKcal: summary.consumedKcal,
          calorieGoal: 2283,
          weekData: [],
        }),
        createElement(NutritionCard, {
          consumedKcal: summary.consumedKcal,
          calorieGoal: 2283,
          proteinGoal: 134,
          carbsGoal: 266,
          fatGoal: 76,
        }),
      ),
    ))

    expect(html).toContain('79%')
    expect(html).toContain('1810')
    expect(html).toContain('134g')
    expect(html).toContain('266g')
    expect(html).toContain('76g')
    expect(html).not.toContain('À évaluer')
  })
})
