// @vitest-environment jsdom

import React from 'react'
import { readFileSync } from 'node:fs'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import NextPlannedSessionCard from '@/app/components/training-v2/NextPlannedSessionCard'
import { findNextPlannedSession } from '@/lib/training/next-planned-session'
import fr from '../../messages/fr.json'

const sunday = new Date(2026, 8, 27, 12)
const personalProgram = {
  days: [
    { name: 'Jambes', exercises: [{ name: 'Squat', sets: 4, reps: '8-10' }, { name: 'Fentes', sets: 3, reps: 12 }] },
    { name: 'Repos', is_rest: true, exercises: [] },
  ],
}

describe('next planned Training session', () => {
  it('finds the next personal session across the week boundary in exercise order', () => {
    const next = findNextPlannedSession({ personalProgram, today: sunday })
    expect(next?.dayKey).toBe('lundi')
    expect(next?.date.getDate()).toBe(28)
    expect(next?.title).toBe('Jambes')
    expect(next?.exercises.map(exercise => exercise.name)).toEqual(['Squat', 'Fentes'])
  })

  it('skips a completed session today, and never fabricates a session from rest days', () => {
    const monday = new Date(2026, 8, 28, 12)
    expect(findNextPlannedSession({ personalProgram, today: monday, todaySessionDone: true })?.date.getDate()).toBe(5)
    expect(findNextPlannedSession({ coachProgram: { lundi: { repos: true, exercises: [{ name: 'Squat' }] } }, today: sunday })).toBeNull()
  })

  it('does not repeat the current workout as the next journey step', () => {
    const monday = new Date(2026, 8, 28, 12)
    expect(findNextPlannedSession({ personalProgram, today: monday, startTomorrow: true })?.date.getDate()).toBe(5)
  })

  it('shows a coach session read-only and sends personal edits to the editor action', () => {
    const session = findNextPlannedSession({ personalProgram, today: sunday })!
    const onView = vi.fn()
    const onEdit = vi.fn()
    const renderCard = (editable: boolean) => React.createElement(NextIntlClientProvider, {
      locale: 'fr', messages: fr, timeZone: 'Europe/Zurich',
      children: React.createElement(NextPlannedSessionCard, { session, editable, onView, onEdit }),
    })

    const view = render(renderCard(true))
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual([
      expect.stringContaining('Squat'), expect.stringContaining('Fentes'),
    ])
    fireEvent.click(screen.getByRole('button', { name: /Modifier la séance et l’ordre/ }))
    expect(onEdit).toHaveBeenCalledOnce()
    view.rerender(renderCard(false))
    expect(screen.queryByRole('button', { name: /Modifier la séance et l’ordre/ })).toBeNull()
    expect(screen.getByText(/lecture seule/)).toBeTruthy()
  })

  it('keeps a long upcoming session compact while leaving every exercise accessible', () => {
    const session = findNextPlannedSession({ personalProgram, today: sunday })!
    const longSession = { ...session, exercises: [
      ...session.exercises,
      { name: 'Développé couché' }, { name: 'Élévations latérales' },
      { name: 'Extension triceps' }, { name: 'Pompes' },
    ] }
    render(React.createElement(NextIntlClientProvider, {
      locale: 'fr', messages: fr, timeZone: 'Europe/Zurich',
      children: React.createElement(NextPlannedSessionCard, {
        session: longSession, editable: true, onView: vi.fn(), onEdit: vi.fn(),
    }),
    }))

    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: 'Voir les 6 exercices' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByText('Pompes')).toBeTruthy()
  })

  it('routes editing to the existing guarded program editor on the selected day', () => {
    const training = readFileSync('app/components/tabs/TrainingTab.tsx', 'utf8')
    const page = readFileSync('app/(application)/page.tsx', 'utf8')
    const section = readFileSync('app/components/tabs/profile/TrainingProgramSection.tsx', 'utf8')
    const manager = readFileSync('app/components/training/TrainingProgramManager.tsx', 'utf8')
    const builder = readFileSync('app/components/training/ProgramBuilder.tsx', 'utf8')
    expect(training).toContain("activeTrainingProgram.source === 'personal' && activeTrainingProgram.editable")
    expect(training).toContain('onEditPlannedSession(v2NextSession.dayIndex)')
    expect(page).toContain("mode: 'configure'")
    expect(section).toContain('openActiveEditor={configureOpen && initialEditorDayIndex != null}')
    expect(manager).toContain('readActiveWorkoutDraft(localStorage, userId)')
    expect(manager).toContain('setBuilder({ program: active })')
    expect(builder).toContain('Math.max(0, Math.min(6, initialDayIndex))')
  })
})
