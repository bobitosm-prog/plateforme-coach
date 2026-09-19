// @vitest-environment jsdom
import * as React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ updateProfile: vi.fn() }))
vi.mock('@/lib/profile-service', () => ({ updateProfile: mocks.updateProfile }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'fr' }))
import NutritionPreferences from '@/app/components/NutritionPreferences'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })
describe('nutrition preferences runtime validation', () => {
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
