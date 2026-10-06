// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it } from 'vitest'
import fr from '../../messages/fr.json'
import HomeWeekCalendar from '../../app/components/home-v2/HomeWeekCalendar'
import { buildHomeWeekCalendar } from '../../lib/home/home-week-calendar'

afterEach(cleanup)
const days = buildHomeWeekCalendar({todayKey:'2026-10-06',foodDates:['2026-10-05'],nutritionState:'ready',training:{scheduledSessions:[],workoutSessions:[],state:'ready'}})
const content = (todayKey = '2026-10-06') => React.createElement(NextIntlClientProvider, {locale:'fr',messages:fr,timeZone:'Europe/Zurich',children:React.createElement(HomeWeekCalendar,{todayKey,days})})
describe('week calendar interaction', () => {
  it('selects a day and announces its real nutrition/training state without modifying it', () => {
    render(content())
    const monday = screen.getByRole('button',{name:/lundi 5 octobre/})
    const tuesday = screen.getByRole('button',{name:/mardi 6 octobre/})
    expect(tuesday.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(monday)
    expect(monday.getAttribute('aria-pressed')).toBe('true')
    expect(tuesday.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('Nutrition renseignée · Aucune séance enregistrée')).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(7)
  })
  it('selects the new current day after midnight', () => {
    const view = render(content())
    fireEvent.click(screen.getByRole('button',{name:/lundi 5 octobre/}))
    view.rerender(content('2026-10-07'))
    expect(screen.getByRole('button',{name:/mercredi 7 octobre/}).getAttribute('aria-pressed')).toBe('true')
  })
})
