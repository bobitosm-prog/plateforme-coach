// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ImportPlanSheet from '@/app/components/tabs/nutrition/ImportPlanSheet'
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
afterEach(cleanup)
it('shows planned quantities and delegates import without changing the payload', () => {
  const onImport = vi.fn(), onClose = vi.fn()
  render(React.createElement(ImportPlanSheet, { mealLabel: 'Déjeuner', foods: [{ name: 'Riz complet', qty: 150, kcal: 195, prot: 4, carb: 41, fat: 1 }], onImport, onClose }))
  expect(screen.getByRole('dialog', { name: 'Importer le plan IA' })).toBeTruthy()
  expect(screen.getByText('150 g')).toBeTruthy()
  expect(screen.getByText('195 kcal')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Importer' }))
  expect(onImport).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
  expect(onClose).toHaveBeenCalledOnce()
})
it('keeps the coach title and supports Escape without importing', () => {
  const onImport = vi.fn(), onClose = vi.fn()
  render(React.createElement(ImportPlanSheet, { mealLabel: 'Dîner', foods: [], isCoachManaged: true, onImport, onClose }))
  fireEvent.keyDown(screen.getByRole('dialog', { name: 'Importer du plan' }), { key: 'Escape' })
  expect(onClose).toHaveBeenCalledOnce()
  expect(onImport).not.toHaveBeenCalled()
})
