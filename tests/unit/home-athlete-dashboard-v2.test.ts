// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import fr from '../../messages/fr.json'
import DailyStatus from '@/app/components/home-v2/DailyStatus'
import HomeV2Header from '@/app/components/home-v2/HomeV2Header'
import TodayHero from '@/app/components/home-v2/TodayHero'
import { buildHomeViewModel } from '@/lib/home/home-dashboard-model'
import { getHomeDayWindow } from '@/lib/home/home-date'

const model = buildHomeViewModel({
  today: getHomeDayWindow(new Date('2026-09-26T12:00:00Z')),
  identity: { firstName: 'Audit', avatar: null, xp: null, streak: 0 },
  training: {
    state: 'ready',
    session: { id: 'rest', title: 'Repos', exercises: [], scheduledAt: null, isRest: true },
    hasProgram: true,
  },
  nutrition: { state: 'empty' },
  recovery: { state: 'empty', sourceDataAvailable: false },
  coach: { relationStatus: 'not_found' },
  capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
})

function renderDashboard(onOpenProgram = vi.fn()) {
  return render(
    React.createElement(NextIntlClientProvider, {
      locale: 'fr', messages: fr, timeZone: 'Europe/Zurich',
      children: [
        React.createElement(HomeV2Header, { key: 'header', identity: model.identity, today: model.today }),
        React.createElement(TodayHero, { key: 'hero', training: model.training, onOpenProgram }),
        React.createElement(DailyStatus, {
          key: 'status',
          training: model.training,
          nutrition: model.nutrition,
          recovery: model.recovery,
          onOpenRecovery: vi.fn(),
        }),
      ],
    }),
  )
}

describe('athlete dashboard home', () => {
  it('keeps the real rest-day action and the three status domains', () => {
    const openProgram = vi.fn()
    renderDashboard(openProgram)

    expect(screen.getByRole('heading', { name: 'Aujourd’hui' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Jour de repos' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Entraînement/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Nutrition/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Récupération/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voir le programme' }))
    expect(openProgram).toHaveBeenCalledOnce()
  })

  it('starts with compact tiles and reveals detail only on selection', () => {
    renderDashboard()
    const nutrition = screen.getByRole('button', { name: /Nutrition/ })
    const panel = document.getElementById('daily-status-panel')

    expect(nutrition.getAttribute('aria-expanded')).toBe('false')
    expect(panel?.hasAttribute('hidden')).toBe(true)
    fireEvent.click(nutrition)
    expect(nutrition.getAttribute('aria-expanded')).toBe('true')
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })
})
