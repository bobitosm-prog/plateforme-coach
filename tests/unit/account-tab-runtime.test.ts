// @vitest-environment jsdom
import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: { level?: number }) => key === 'level' ? `Niveau ${values?.level}` : key }))
vi.mock('@/app/hooks/useMyFeedbackBadge', () => ({ useMyFeedbackBadge: () => 2 }))
vi.mock('@/app/components/BugReport', () => ({ default: () => null }))
import AccountTab from '@/app/components/tabs/AccountTab'

afterEach(() => cleanup())

describe('Account tab', () => {
  it('shows the redesigned program, profile and support entries and preserves navigation', () => {
    const navigate = vi.fn()
    render(React.createElement(AccountTab, { firstName: 'Test', unreadCount: 3, supabase: null, session: null, onNavigate: navigate }))
    expect(screen.getByRole('heading', { name: 'programs' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /nutritionProgram/ }))
    fireEvent.click(screen.getByRole('button', { name: /trainingProgram/ }))
    fireEvent.click(screen.getByRole('button', { name: /messages/ }))
    expect(navigate.mock.calls.map(call => call[0])).toEqual(['nutrition_program', 'training_program', 'messages'])
    expect(screen.getByRole('progressbar', { name: 'xpProgress' })).toBeDefined()
  })
})
