// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WeeklyCompletionControls from '@/app/components/home/WeeklyCompletionControls'
import fr from '@/messages/fr.json'

vi.mock('next-intl', () => ({ useTranslations: () => (key: keyof typeof fr.weeklyCompletion) => fr.weeklyCompletion[key] }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const base = { weekStart: '2026-09-14', sunday: '2026-09-20', eligible: true, hasMeals: true, trainingState: 'rest', confirmed: false, canGenerate: false, diagnosticId: null }
function setup(overrides = {}) {
  let current = { ...base, ...overrides }
  const request = vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === 'POST') current = { ...current, confirmed: true, canGenerate: true }
    return new Response(JSON.stringify({ completion: current }))
  })
  vi.stubGlobal('fetch', request)
  const generate = vi.fn(async () => {})
  const view = vi.fn()
  render(React.createElement(WeeklyCompletionControls, { generating: false, onGenerate: generate, onViewDiagnostic: view }))
  return { request, generate, view }
}
describe('Sunday completion controls runtime', () => {
  it('opens the completed report when the dashboard has not loaded it', async () => {
    const f = setup({ diagnosticId: 'report-123' })
    fireEvent.click(await screen.findByRole('button', { name: fr.weeklyCompletion.view }))
    expect(f.view).toHaveBeenCalledWith('report-123')
  })
  it('requires the meal declaration even on rest days, then opens generation', async () => {
    const f = setup()
    const confirm = await screen.findByRole('button', { name: fr.weeklyCompletion.confirm }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    expect(screen.queryByRole('button', { name: fr.weeklyCompletion.generate })).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: fr.weeklyCompletion.meals }))
    expect(confirm.disabled).toBe(false)
    fireEvent.click(confirm)
    const generate = await screen.findByRole('button', { name: fr.weeklyCompletion.generate })
    expect(JSON.parse(String(f.request.mock.calls.find(call => call[1]?.method === 'POST')?.[1]?.body))).toMatchObject({ action: 'complete-week', mealsConfirmed: true, weekStart: base.weekStart })
    fireEvent.click(generate)
    await waitFor(() => expect(f.generate).toHaveBeenCalledOnce())
  })
  it('requires explicit skipping for an unfinished workout', async () => {
    setup({ trainingState: 'pending' })
    const confirm = await screen.findByRole('button', { name: fr.weeklyCompletion.confirm }) as HTMLButtonElement
    fireEvent.click(screen.getByRole('checkbox', { name: fr.weeklyCompletion.meals }))
    expect(confirm.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: fr.weeklyCompletion.skip }))
    expect(confirm.disabled).toBe(false)
  })
  it('cannot declare meals complete with an empty journal', async () => {
    setup({ hasMeals: false })
    const checkbox = await screen.findByRole('checkbox', { name: fr.weeklyCompletion.meals }) as HTMLInputElement
    expect(checkbox.disabled).toBe(true)
    expect((screen.getByRole('button', { name: fr.weeklyCompletion.confirm }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('fails closed when status loading fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))
    render(React.createElement(WeeklyCompletionControls, { generating: false, onGenerate: vi.fn(), onViewDiagnostic: vi.fn() }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('button', { name: fr.weeklyCompletion.generate })).toBeNull()
  })
})
