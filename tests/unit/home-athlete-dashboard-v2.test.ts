// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import fr from '../../messages/fr.json'
import DailyStatus from '@/app/components/home-v2/DailyStatus'
import HomeV2Header from '@/app/components/home-v2/HomeV2Header'
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
        React.createElement(DailyStatus, {
          key: 'status',
          training: model.training,
          nutrition: model.nutrition,
          recovery: model.recovery,
          onOpenProgram,
          onOpenRecovery: vi.fn(),
        }),
      ],
    }),
  )
}

describe('athlete dashboard home', () => {
  it('opens Athena from the header and displays real XP without inventing a value', () => {
    const onOpenAthena = vi.fn()
    const onOpenProgression = vi.fn()
    const identity = { ...model.identity, xp: 1250 }
    render(React.createElement(NextIntlClientProvider, {
      locale: 'fr', messages: fr, timeZone: 'Europe/Zurich',
      children: React.createElement(HomeV2Header, {
        identity, today: model.today, onOpenAthena, onOpenProgression,
    }),
    }))

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir Athena' }))
    expect(onOpenAthena).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Voir mes 1250 points XP' }))
    expect(onOpenProgression).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Voir mes 1250 points XP' }).textContent?.replace(/\s/g, '')).toContain('1250XP')
  })

  it('keeps the real rest-day action and the three status domains', () => {
    const openProgram = vi.fn()
    renderDashboard(openProgram)

    expect(screen.getByRole('heading', { name: 'Aujourd’hui' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /points XP/ })).toBeNull()
    expect(screen.getAllByRole('heading', { name: 'Jour de repos' })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Statut du jour' })).toBeTruthy()
    expect(screen.getByText('Aucun repas enregistré')).toBeTruthy()
    expect(screen.getByText('Aucune estimation disponible')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voir le programme' }))
    expect(openProgram).toHaveBeenCalledOnce()
  })

  it('shows details inside the tiles without opening a separate panel', () => {
    renderDashboard()
    expect(document.getElementById('daily-status-panel')).toBeNull()
    expect(screen.getByText('Aucun repas enregistré')).toBeTruthy()
    expect(screen.getByText('Aucune estimation disponible')).toBeTruthy()
  })

  it('keeps all direct actions on a scheduled training day', () => {
    const session = { id: 'session-1', title: 'LEGS QUADS', exercises: [{ name: 'Squat' }], scheduledAt: null, isRest: false }
    const onStartSession = vi.fn()
    const onOpenNutrition = vi.fn()
    const onNutritionPhoto = vi.fn()
    const onNutritionBarcode = vi.fn()
    const onOpenRecovery = vi.fn()
    render(React.createElement(NextIntlClientProvider, {
      locale: 'fr', messages: fr, timeZone: 'Europe/Zurich',
      children: React.createElement(DailyStatus, {
        training: { ...model.training, dayStatus: 'scheduled', session },
        nutrition: model.nutrition,
        recovery: model.recovery,
        onStartSession,
        onOpenNutrition,
        onNutritionPhoto,
        onNutritionBarcode,
        onOpenRecovery,
    }),
    }))

    expect(screen.getAllByText('LEGS QUADS')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir Nutrition' }))
    fireEvent.click(screen.getByRole('button', { name: 'Analyser un repas avec une photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Scanner le code-barres d’un aliment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Voir la carte' }))
    expect(onStartSession).toHaveBeenCalledWith(session)
    expect(onOpenNutrition).toHaveBeenCalledOnce()
    expect(onNutritionPhoto).toHaveBeenCalledOnce()
    expect(onNutritionBarcode).toHaveBeenCalledOnce()
    expect(onOpenRecovery).toHaveBeenCalledOnce()
  })

  it('opens the completed session from the featured tile', () => {
    const session = { id: 'session-2', title: 'LEGS QUADS', exercises: [{ name: 'Squat' }], scheduledAt: null, isRest: false }
    const onOpenSession = vi.fn()
    render(React.createElement(NextIntlClientProvider, {
      locale: 'fr', messages: fr, timeZone: 'Europe/Zurich',
      children: React.createElement(DailyStatus, {
        training: { ...model.training, dayStatus: 'completed', session },
        nutrition: model.nutrition,
        recovery: model.recovery,
        onOpenSession,
        onOpenRecovery: vi.fn(),
    }),
    }))

    expect(screen.getAllByText(/LEGS QUADS/)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Voir la séance' }))
    expect(onOpenSession).toHaveBeenCalledWith(session)
  })
})
