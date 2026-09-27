// @vitest-environment jsdom

import React from 'react'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import NoActiveSession from '@/app/components/training-v2/NoActiveSession'
import fr from '../../messages/fr.json'

describe('Training overview for a completed day', () => {
  it('shows the completed workout even when another calendar day is selected', () => {
    render(React.createElement(NextIntlClientProvider, {
      locale: 'fr', messages: fr, timeZone: 'Europe/Zurich',
    } as React.ComponentProps<typeof NextIntlClientProvider>,
    React.createElement(NoActiveSession, {
      programState: 'ready',
      programSource: 'personal',
      programName: 'Masse Avancée',
      sessionName: 'Repos',
      exerciseCount: 0,
      totalSets: 0,
      estimatedMinutes: 0,
      muscles: [],
      isToday: false,
      todayState: 'completed',
      completedSessionName: 'LEGS QUADS',
      canStart: false,
      canViewNext: true,
      onStart: vi.fn(),
      onViewNext: vi.fn(),
      onOpenProgramSettings: vi.fn(),
      onFreeSession: vi.fn(),
    })))

    expect(screen.getByRole('heading', { name: 'Séance terminée aujourd’hui' })).toBeTruthy()
    expect(screen.getByText('LEGS QUADS')).toBeTruthy()
    expect(screen.queryByText('Pas de séance aujourd’hui')).toBeNull()
    expect(screen.queryByText('MOOVX / TRAINING')).toBeNull()
  })

  it('passes the actual daily state regardless of the calendar selection', () => {
    const source = readFileSync('app/components/tabs/TrainingTab.tsx', 'utf8')
    expect(source).toContain('todayState={todayTrainingState.kind}')
    expect(source).not.toContain('todayState={trainingIsToday ? todayTrainingState.kind : null}')
  })
})
