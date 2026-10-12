// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'

const mocks = vi.hoisted(() => ({ replace: vi.fn(), updateProfile: vi.fn() }))

vi.mock('next/navigation', () => {
  const router = { replace: mocks.replace }
  return { useRouter: () => router }
})
vi.mock('next-intl', () => {
  const translate = (key: string) => key
  return { useTranslations: () => translate }
})
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: 'test-user', user_metadata: {} } } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({
      data: {
        full_name: 'Test User', birth_date: '1990-01-01', gender: 'male', avatar_url: null,
        current_weight: 70, height: 175, target_weight: 68, objective: 'maintain',
        activity_level: 'Regulier 3-4x/sem', dietary_type: 'omnivore',
        training_location: 'gym', home_equipment: [], meal_preferences: {},
        onboarding_answers: { onboarding_v2_step: 4, experience_level: 'Debutant <6 mois' },
      }, error: null,
    }) }) }) }),
  }),
}))
vi.mock('@/lib/profile-service', () => ({
  updateProfile: mocks.updateProfile, invalidateProfileCache: vi.fn(),
}))
vi.mock('@/lib/entitlements/client-snapshot', () => ({ fetchEffectiveEntitlementSnapshot: async () => ({}) }))
vi.mock('@/lib/coach-relations/onboarding-reader', () => ({ resolveActiveCoachForOnboarding: async () => ({ kind: 'none' }) }))

import OnboardingV2Content from '@/app/(application)/onboarding-v2/OnboardingV2Content'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('onboarding document viewport', () => {
  it('returns to the top when loading nutrition and when navigating back to it', async () => {
    mocks.updateProfile.mockResolvedValue({ error: null })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 1 })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    render(createElement(OnboardingV2Content))
    await screen.findByRole('heading', { name: 'redesign.nutrition.title' })
    expect(scrollTo).toHaveBeenCalledWith(0, 0)

    scrollTo.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'redesign.back' }))
    await screen.findByRole('heading', { name: 'redesign.training.title' })
    expect(scrollTo).toHaveBeenCalledWith(0, 0)

    fireEvent.click(screen.getByRole('button', { name: 'solo.step8.options.beginner' }))
    fireEvent.click(screen.getByRole('button', { name: 'solo.step5.options.regular' }))
    fireEvent.click(screen.getByRole('button', { name: 'solo.stepEquipment.location.options.gym' }))
    scrollTo.mockClear()
    const next = screen.getByRole('button', { name: 'nav.continue' })
    expect(next).not.toHaveProperty('disabled', true)
    fireEvent.click(next)
    await screen.findByRole('heading', { name: 'redesign.nutrition.title' })
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0))
  })
})
