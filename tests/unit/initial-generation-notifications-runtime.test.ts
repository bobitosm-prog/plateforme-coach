// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import InitialGenerationStatus from '@/components/initial-generation/InitialGenerationStatus'
import type { UseInitialGenerationResult } from '@/app/hooks/useInitialGeneration'
import messages from '@/messages/fr.json'
const notifications = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: notifications }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
function state(overrides: Partial<UseInitialGenerationResult> = {}): UseInitialGenerationResult {
  return { training: { phase: 'generating' }, nutrition: { phase: 'idle' }, finalization: 'idle',
    globalState: 'preparing', generating: true, visible: true,
    retryTraining: vi.fn(), retryNutrition: vi.fn(), retryAll: vi.fn(), ...overrides }
}
function ui(generation: UseInitialGenerationResult) {
  const providerProps = { locale: 'fr', messages, children: null }
  return React.createElement(NextIntlClientProvider, providerProps,
    React.createElement(InitialGenerationStatus, { generation }))
}
it('hides the panel without invoking generation callbacks and announces each verified plan once', () => {
  const initial = state()
  const view = render(ui(initial))
  fireEvent.click(screen.getByRole('button', { name: 'Masquer' }))
  expect(screen.queryByRole('complementary')).toBeNull()
  expect(initial.retryAll).not.toHaveBeenCalled()
  const trainingReady = state({ training: { phase: 'ready' }, nutrition: { phase: 'generating' } })
  view.rerender(ui(trainingReady))
  expect(notifications.success).toHaveBeenCalledWith('Ton programme d’entraînement est prêt.', expect.anything())
  view.rerender(ui(trainingReady))
  expect(notifications.success).toHaveBeenCalledTimes(1)
  view.rerender(ui(state({ training: { phase: 'ready' }, nutrition: { phase: 'ready' }, finalization: 'ready', visible: false, generating: false })))
  expect(notifications.success).toHaveBeenCalledWith('Ton plan nutritionnel est prêt.', expect.anything())
  expect(notifications.success).toHaveBeenCalledTimes(2)
})
it('does not announce plans already ready on mount', () => {
  render(ui(state({ training: { phase: 'ready' }, nutrition: { phase: 'ready' }, visible: false })))
  expect(notifications.success).not.toHaveBeenCalled()
})
it('keeps hidden errors actionable and retries the failed domain', () => {
  const view = render(ui(state()))
  fireEvent.click(screen.getByRole('button', { name: 'Masquer' }))
  const failed = state({ training: { phase: 'error', reason: 'persistence' }, generating: false })
  view.rerender(ui(failed))
  expect(notifications.success).not.toHaveBeenCalled()
  expect(notifications.error).toHaveBeenCalledOnce()
  const action = notifications.error.mock.calls[0][1].action
  render(React.createElement('button', { onClick: action.onClick }, action.label))
  fireEvent.click(screen.getByRole('button', { name: 'Voir le détail' }))
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer Programme d’entraînement' }))
  expect(failed.retryTraining).toHaveBeenCalledOnce()
})
