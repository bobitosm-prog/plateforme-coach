// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import { EMPTY_INITIAL_GENERATION_SNAPSHOT, runInitialGenerationAttempt } from '@/lib/initial-generation/engine'
import { AiConsentDeclinedError } from '@/lib/ai/consent-policy'
import InitialGenerationStatus from '@/components/initial-generation/InitialGenerationStatus'
import useNutritionDashboardModel from '@/app/hooks/useNutritionDashboardModel'
import messages from '@/messages/fr.json'
const repo = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('@/lib/meal-plan/personal-plan-repository', () => ({ readActivePersonalMealPlan: repo.read }))
afterEach(cleanup)

function ports() {
  const make = () => {
    let saved = false
    return {
      read: vi.fn(async () => ({ kind: saved ? 'ready' as const : 'missing' as const })),
      generate: vi.fn(async () => ({})), validate: () => true,
      persist: vi.fn(async () => { saved = true; return true }), canGenerate: true,
    }
  }
  return { training: make(), nutrition: make() }
}
it('waits for saved consent before displaying preparation or invoking either generator', async () => {
  const p = ports(), onChange = vi.fn(), quota = vi.fn(async () => 'available' as const)
  let accept!: () => void
  const consent = new Promise<void>(resolve => { accept = resolve })
  const run = runInitialGenerationAttempt({ snapshot: EMPTY_INITIAL_GENERATION_SNAPSHOT,
    domains: ['training', 'nutrition'], ports: p, authorize: () => consent,
    checkQuota: quota, clearFlag: async () => true, onChange })
  await Promise.resolve()
  expect(onChange).not.toHaveBeenCalled()
  expect(quota).not.toHaveBeenCalled()
  expect(p.training.generate).not.toHaveBeenCalled()
  expect(p.nutrition.generate).not.toHaveBeenCalled()
  accept()
  expect((await run).finalization).toBe('ready')
  expect(p.training.persist).toHaveBeenCalledOnce()
  expect(p.nutrition.persist).toHaveBeenCalledOnce()
})
it('Later never generates or consumes quota, and does not finalize missing plans', async () => {
  const p = ports(), checkQuota = vi.fn(), clearFlag = vi.fn()
  const result = await runInitialGenerationAttempt({ snapshot: EMPTY_INITIAL_GENERATION_SNAPSHOT,
    domains: ['training', 'nutrition'], ports: p,
    authorize: async () => { throw new AiConsentDeclinedError('later') }, checkQuota, clearFlag })
  expect(result.nutrition).toEqual({ phase: 'missing', reason: 'consent_declined' })
  expect(checkQuota).not.toHaveBeenCalled()
  expect(clearFlag).not.toHaveBeenCalled()
  expect(p.training.generate).not.toHaveBeenCalled()
  expect(p.nutrition.generate).not.toHaveBeenCalled()
})
it('a failed consent save does not start either generator', async () => {
  const p = ports()
  const result = await runInitialGenerationAttempt({ snapshot: EMPTY_INITIAL_GENERATION_SNAPSHOT,
    domains: ['training', 'nutrition'], ports: p,
    authorize: async () => { throw new Error('network') }, checkQuota: async () => 'available', clearFlag: async () => true })
  expect(result.nutrition.phase).toBe('error')
  expect(p.training.generate).not.toHaveBeenCalled()
  expect(p.nutrition.generate).not.toHaveBeenCalled()
})
it('renders a waiting nutrition plan without a false error while training is preparing', () => {
  render(React.createElement(NextIntlClientProvider, { locale: 'fr', messages, children: null },
    React.createElement(InitialGenerationStatus, { generation: {
      ...EMPTY_INITIAL_GENERATION_SNAPSHOT, training: { phase: 'generating' },
      globalState: 'preparing', generating: true, visible: true,
      retryAll: vi.fn(), retryTraining: vi.fn(), retryNutrition: vi.fn(),
    } })))
  expect(screen.getByText('À préparer')).toBeTruthy()
  expect(screen.queryByText('Erreur temporaire')).toBeNull()
  expect(screen.queryByRole('alert')).toBeNull()
})
it('refreshes an already opened nutrition tab after its own plan is saved', async () => {
  repo.read.mockReset().mockResolvedValue({ data: null, error: null })
  const query: any = { then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve) }
  for (const key of ['select','eq','gte','lte','order','limit']) query[key] = () => query
  const supabase: any = { from: () => query }
  const input: any = { supabase, userId: 'test-user', profile: {},
    capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
    coachRelation: { status: 'not_found', coachId: null, isAuthoritative: true } }
  const { result } = renderHook(() => useNutritionDashboardModel(input))
  await waitFor(() => expect(repo.read).toHaveBeenCalledOnce())
  await waitFor(() => expect(result.current.model.activePlan.state).toBe('empty'))
  const saved = { id: 'saved-plan', active: true, plan: { lundi: { meals: [] } } }
  repo.read.mockResolvedValue({ data: saved, error: null })
  const reads = repo.read.mock.calls.length
  act(() => window.dispatchEvent(new CustomEvent('moovx-meal-plan-saved', { detail: { userId: 'other-user' } })))
  expect(repo.read).toHaveBeenCalledTimes(reads)
  await act(async () => { window.dispatchEvent(new CustomEvent('moovx-meal-plan-saved', { detail: { userId: 'test-user' } })) })
  expect(repo.read).toHaveBeenCalledTimes(reads + 1)
  await waitFor(() => expect(result.current.personalPlan?.id).toBe('saved-plan'))
})
