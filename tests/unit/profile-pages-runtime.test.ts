// @vitest-environment jsdom
import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('next-intl', () => ({ useLocale: () => 'fr', useTranslations: () => (key: string) => key }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@supabase/ssr', () => ({ createBrowserClient: () => ({}) }))
vi.mock('@/lib/profile-service', () => ({ updateProfile: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/app/components/AiConsentPreferences', () => ({ default: () => null }))
vi.mock('@/app/components/training/FollowupPreferences', () => ({ default: () => null }))
import GoalsSection from '@/app/components/tabs/profile/GoalsSection'
import PreferencesSection from '@/app/components/tabs/profile/PreferencesSection'
import ProfileTab from '@/app/components/tabs/ProfileTab'
import { updateProfile } from '@/lib/profile-service'
afterEach(() => { cleanup(); vi.clearAllMocks() })
const profile = { calorie_goal: 2200, water_goal: 2500, current_weight: 70, rir_tracking_enabled: true }
const base = { supabase: {}, session: { user: { email: 'fixture@example.invalid' } }, profile, onBack: vi.fn() }
it('goals keeps objective navigation, editable targets, saving and back', async () => {
 const setModal = vi.fn(), fetchAll = vi.fn()
 render(React.createElement(GoalsSection, { ...base, goalWeight: 68, setModal, fetchAll }))
 fireEvent.click(screen.getByRole('button', { name: /fields.objective/ }))
 expect(setModal).toHaveBeenCalledWith('objective')
 fireEvent.click(screen.getByRole('button', { name: /2500 ml/ }))
 fireEvent.change(screen.getByRole('spinbutton', { name: 'waterGoal' }), { target: { value: '2800' } })
 await React.act(async () => { fireEvent.click(screen.getByRole('button', { name: 'OK' })) })
 expect(updateProfile).toHaveBeenCalledWith(undefined, { water_goal: 2800 }, base.supabase)
 expect(fetchAll).toHaveBeenCalledWith(true)
 fireEvent.click(screen.getByRole('button', { name: 'badges.backToAccount' }))
 expect(base.onBack).toHaveBeenCalled()
})
it('preferences exposes named switches and preserves RIR and time callbacks', () => {
 const updateRirSettings = vi.fn(), updateReminderSettings = vi.fn()
 render(React.createElement(PreferencesSection, { ...base, updateRirSettings, updateReminderSettings }))
 const rir = screen.getByRole('switch', { name: 'rir.tracking' })
 expect(rir.getAttribute('aria-checked')).toBe('true')
 fireEvent.click(rir)
 expect(updateRirSettings).toHaveBeenCalledWith({ rir_tracking_enabled: false })
 fireEvent.click(screen.getByRole('button', { name: '17:00' }))
 expect(updateReminderSettings).toHaveBeenCalledWith({ preferred_training_time: '17:00' })
 fireEvent.click(screen.getByRole('button', { name: 'badges.backToAccount' }))
 expect(base.onBack).toHaveBeenCalled()
})
it('profile keeps phone editor, tools, and return', () => {
 const setModal = vi.fn()
 render(React.createElement(ProfileTab, { ...base, displayAvatar: undefined, fullName: 'Compte test', firstName: 'Test', avatarRef: React.createRef<HTMLInputElement>(), uploadAvatar: vi.fn(), currentWeight: 70, goalWeight: 68, calorieGoal: 2200, coachProgram: null, coachId: null, setModal, fetchAll: vi.fn(), regenerateWeekSchedule: vi.fn() }))
 expect(screen.getByRole('heading', { name: 'sections.myProfile.' })).toBeDefined()
 fireEvent.click(screen.getByRole('button', { name: 'phone.edit' }))
 expect(screen.getByRole('textbox', { name: 'sections.phone' })).toBeDefined()
 fireEvent.click(screen.getByText('tools.bmrCalculator'))
 expect(setModal).toHaveBeenCalledWith('bmr')
 fireEvent.click(screen.getByRole('button', { name: 'badges.backToAccount' }))
 expect(base.onBack).toHaveBeenCalled()
})
