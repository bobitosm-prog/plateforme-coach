import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { NutritionSavedMealsReadNotice } from '@/app/components/tabs/nutrition/NutritionSavedMealsSection'

describe('C06 Mes repas read-state rendering', () => {
  it('renders the first loading state accessibly', () => {
    const html = renderToStaticMarkup(createElement(
      NutritionSavedMealsReadNotice,
      {
        status: 'loading',
        loadingLabel: 'Chargement des repas',
        errorLabel: 'Repas indisponibles',
      },
    ))
    expect(html).toContain('role="status"')
    expect(html).toContain('Chargement des repas')
    expect(html).not.toContain('Repas indisponibles')
  })

  it('renders a read error as an alert distinct from empty content', () => {
    const html = renderToStaticMarkup(createElement(
      NutritionSavedMealsReadNotice,
      {
        status: 'error',
        loadingLabel: 'Chargement des repas',
        errorLabel: 'Repas indisponibles',
      },
    ))
    expect(html).toContain('role="alert"')
    expect(html).toContain('Repas indisponibles')
  })

  it.each(['idle', 'ready', 'empty'] as const)(
    'does not add a notice for %s',
    status => {
      expect(renderToStaticMarkup(createElement(
        NutritionSavedMealsReadNotice,
        {
          status,
          loadingLabel: 'Chargement',
          errorLabel: 'Erreur',
        },
      ))).toBe('')
    },
  )
})
