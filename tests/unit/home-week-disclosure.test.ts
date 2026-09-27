// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import HomeV2LowerSections from '@/app/components/home-v2/HomeV2LowerSections'
import ProgressionSnapshot from '@/app/components/home-v2/ProgressionSnapshot'
import { buildHomeViewModel } from '@/lib/home/home-dashboard-model'
import { getHomeDayWindow } from '@/lib/home/home-date'
import fr from '../../messages/fr.json'

const model = buildHomeViewModel({
  today: getHomeDayWindow(new Date('2026-09-27T12:00:00Z')),
  identity: { firstName: 'Audit' },
  training: { state: 'empty' },
  nutrition: { state: 'empty' },
  progression: { state: 'empty' },
  coach: { relationStatus: 'not_found' },
  capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
})

describe('Home weekly disclosure', () => {
  it('shows one weekly title and keeps diagnostic controls available on expansion', () => {
    render(React.createElement(NextIntlClientProvider, {
      locale: 'fr', messages: fr, timeZone: 'Europe/Zurich',
    }, [
      React.createElement(ProgressionSnapshot, { key: 'progression', progression: model.progression }),
      React.createElement(HomeV2LowerSections, {
        key: 'lower',
        model,
        waterToday: 0,
        waterTarget: 3000,
        diagnostic: null,
        diagnosticControls: React.createElement('button', { type: 'button' }, 'Diagnostic controls'),
        generatingDiagnostic: false,
        diagnosticGenerationError: false,
        coachProgram: null,
        nextSession: null,
        todayKey: 'dimanche',
        onSaveCheckIn: vi.fn().mockResolvedValue(true),
        onAddWater: vi.fn().mockResolvedValue(true),
        onGenerateDiagnostic: vi.fn(),
        onViewDiagnostic: vi.fn(),
        onOpenTraining: vi.fn(),
      }),
    ]))

    expect(screen.getAllByText('Cette semaine')).toHaveLength(1)
    const toggle = screen.getByRole('button', { name: /Cette semaine/ })
    const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(panel?.hidden).toBe(true)

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(panel?.hidden).toBe(false)
    expect(screen.getByRole('button', { name: 'Diagnostic controls' })).toBeTruthy()

    fireEvent.click(toggle)
    expect(panel?.hidden).toBe(true)
  })
})
