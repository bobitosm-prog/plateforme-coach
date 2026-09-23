// @vitest-environment jsdom
import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import WorkoutDetailList from '@/app/components/training/WorkoutDetailList'
import messages from '@/messages/fr.json'
import { colors } from '@/lib/design-tokens'

afterEach(cleanup)

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(value => {
    const s = parseInt(value, 16) / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

it.each(['external_only', 'two_dumbbells', 'barbell_total', 'legacy'] as const)('renders readable load guidance for %s without inheriting black text', mode => {
  const { getByText } = render(React.createElement('div', {style: {color: '#000'}},
    React.createElement(NextIntlClientProvider, {locale: 'fr', messages, timeZone: 'Europe/Zurich',
      children: React.createElement(WorkoutDetailList, {loading: false, detail: [{name: 'Exercice synthétique', sets: [{weight: 10, reps: 10, load_mode: mode}]}]}),
    }),
  ))
  const label = getByText(messages.trainingLoad[mode])
  expect(getComputedStyle(label).color).toBe('rgb(208, 197, 178)')
  expect(getComputedStyle(label).display).toBe('block')
  expect(getComputedStyle(label).fontSize).toBe('13px')
  expect(getComputedStyle(label).marginBottom).toBe('8px')
  expect((luminance(colors.textMuted) + 0.05) / (luminance(colors.surface2) + 0.05)).toBeGreaterThanOrEqual(4.5)
  expect(getByText(mode === 'two_dumbbells' ? '200 kg' : '100 kg')).toBeTruthy()
})
