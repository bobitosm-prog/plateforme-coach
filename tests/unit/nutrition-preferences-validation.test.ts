// @vitest-environment jsdom
import * as React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ updateProfile: vi.fn() }))
vi.mock('@/lib/profile-service', () => ({ updateProfile: mocks.updateProfile }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: unknown) => values ? `${key} ${JSON.stringify(values)}` : key, useLocale: () => 'fr' }))
import NutritionPreferences from '@/app/components/NutritionPreferences'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })
describe('nutrition preferences runtime validation', () => {
  it('renders preparation, completed-day count and saving without declaring success early', async () => {
    vi.stubGlobal('React', React)
    mocks.updateProfile.mockResolvedValue({ data: {}, error: null })
    let controller!: ReadableStreamDefaultController<Uint8Array>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(value) { controller = value } }))))
    const regenerated = vi.fn()
    render(React.createElement(NutritionPreferences, {
      profile: { current_weight: 80, height: 180, gender: 'male', birth_date: '1996-01-01', activity_level: 'moderate', objective: 'maintain' },
      userId: 'synthetic-user', supabase: {}, onSaved: vi.fn(), onPlanRegenerated: regenerated,
    }))
    fireEvent.click(screen.getByRole('button', { name: /save\.save/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'save.generate' }))
    expect(screen.getByText('generation.preparing')).toBeDefined()
    const emit = async (event: unknown) => act(async () => {
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
    })
    await emit({ type: 'progress', day: 'mercredi', index: 1, total: 7 })
    expect(screen.getByText('generation.progress {"count":1,"total":7}')).toBeDefined()
    expect(screen.queryByText(/mercredi/)).toBeNull()
    await emit({ type: 'status', phase: 'saving' })
    expect(screen.getByText('generation.saving')).toBeDefined()
    expect(regenerated).not.toHaveBeenCalled()
    await emit({ type: 'done', plan: { lundi: {} } })
    await act(async () => controller.close())
    expect(regenerated).toHaveBeenCalledOnce()
  })
  it('blocks invalid targets before writing the profile', async () => {
    vi.stubGlobal('React', React)
    render(React.createElement(NutritionPreferences, {
      profile: { current_weight: 300, height: 140, gender: 'male', birth_date: '1936-01-01', activity_level: 'sedentary', objective: 'cut' },
      userId: 'synthetic-user', supabase: {}, onSaved: vi.fn(),
    }))
    fireEvent.click(screen.getByRole('button', { name: /save\.save/ }))
    expect(screen.getByText(/Objectifs calories\/macros incompatibles/)).toBeDefined()
    expect(mocks.updateProfile).not.toHaveBeenCalled()
  })
  it('still saves coherent targets and offers plan regeneration', async () => {
    vi.stubGlobal('React', React)
    mocks.updateProfile.mockResolvedValue({ data: {}, error: null })
    const saved = vi.fn()
    render(React.createElement(NutritionPreferences, {
      profile: { current_weight: 80, height: 180, gender: 'male', birth_date: '1996-01-01', activity_level: 'moderate', objective: 'maintain' },
      userId: 'synthetic-user', supabase: {}, onSaved: saved,
    }))
    fireEvent.click(screen.getByRole('button', { name: /save\.save/ }))
    await waitFor(() => expect(saved).toHaveBeenCalledOnce())
    expect(mocks.updateProfile).toHaveBeenCalledOnce()
  })
})
