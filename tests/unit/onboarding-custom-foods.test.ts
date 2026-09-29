// @vitest-environment jsdom
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Preferences, { type MealPrefsState } from '@/app/(application)/onboarding-v2/steps/solo/SoloStep11Preferences'

beforeEach(() => vi.stubGlobal('React', React))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const empty = { breakfast: [], snack: [], lunch: [], dinner: [] }
function Harness({ initial = empty }: { initial?: MealPrefsState }) {
  const [prefs, setPrefs] = useState<MealPrefsState>(initial)
  return React.createElement(Preferences, {
    mealPrefs: prefs, dislikedFoods: [], onAddDisliked: () => {}, onRemoveDisliked: () => {},
    onToggleFood: (meal, food) => setPrefs(old => ({ ...old, [meal]: old[meal].includes(food) ? old[meal].filter(item => item !== food) : [...old[meal], food] })),
  })
}
function snack() { fireEvent.click(screen.getByRole('button', { name: /Collation/ })) }
function add(value: string) {
  const input = screen.getByLabelText(/Ajouter un aliment/)
  fireEvent.change(input, { target: { value } })
  fireEvent.keyDown(input, { key: 'Enter' })
}
it('adds milk to snack, preserves it across meal switches and allows removal', () => {
  render(React.createElement(Harness)); snack(); add('Lait')
  expect(screen.getByRole('button', { name: /Lait/ }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: /Petit-déjeuner/ }))
  expect(screen.getByRole('button', { name: /Lait/ }).getAttribute('aria-pressed')).toBe('false')
  snack()
  fireEvent.click(screen.getByRole('button', { name: /Lait/ }))
  expect(screen.queryByRole('button', { name: /Lait/ })).toBeNull()
})
it('does not duplicate or deselect an existing food when entered again', () => {
  render(React.createElement(Harness)); snack(); add('  Lait  '); add('lait'); add('   ')
  expect(screen.getAllByRole('button', { name: /Lait/ })).toHaveLength(1)
  expect(screen.getByRole('button', { name: /Lait/ }).getAttribute('aria-pressed')).toBe('true')
  add(' pomme ')
  expect(screen.getByRole('button', { name: /Pomme/ }).getAttribute('aria-pressed')).toBe('true')
})
it('renders custom foods restored from saved preferences', () => {
  render(React.createElement(Harness, { initial: { ...empty, snack: ['Lait de riz'] } })); snack()
  expect(screen.getByRole('button', { name: /Lait de riz/ }).getAttribute('aria-pressed')).toBe('true')
})
