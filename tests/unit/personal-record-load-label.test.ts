// @vitest-environment jsdom
import React from 'react'
import { readFileSync } from 'node:fs'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import PersonalRecordsV2 from '@/app/components/progression-v2/PersonalRecordsV2'
import styles from '@/app/components/progression-v2/ProgressionV2.module.css'
import fr from '@/messages/fr.json'
import en from '@/messages/en.json'
import de from '@/messages/de.json'

beforeEach(() => vi.stubGlobal('React', React))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.head.innerHTML = '' })

it.each([['fr', fr], ['en', en], ['de', de]] as const)('separates the load label from record metadata in %s', (locale, messages) => {
  // Apply the actual scoped rule: Vitest stubs CSS modules rather than loading their CSS.
  const css = readFileSync('app/components/progression-v2/ProgressionV2.module.css', 'utf8')
  const rule = css.match(/\.recordRowMain small\s*\{[^}]+\}/)?.[0]
  expect(rule).toBeTruthy()
  const sheet = document.createElement('style')
  sheet.textContent = rule!.replace('.recordRowMain', `.${styles.recordRowMain}`)
  document.head.append(sheet)
  const view = render(React.createElement(NextIntlClientProvider, {
    locale, messages, timeZone: 'Europe/Zurich',
    children: React.createElement(PersonalRecordsV2, { records: {
      state: 'ready', hasEventHistory: false, items: [{
        exerciseId: null, exerciseName: 'Fentes arrière au poids du corps',
        loadMode: 'external_only', recordType: 'max_weight', value: 10, unit: 'kg',
        estimated: false, recordedAt: '2026-09-23', muscleGroup: null,
        previousValue: null, delta: null,
      }],
    }}),
  }))
  fireEvent.click(view.getByRole('button'))
  const label = view.getByText(messages.trainingLoad.external_only)
  expect(getComputedStyle(label).display).toBe('block')
  expect(getComputedStyle(label).marginBottom).toBe('4px')
  expect(getComputedStyle(label).color).toBe('rgb(185, 177, 163)')
  expect(view.getByText(messages.progress.v2.records.types.maxWeight)).toBeTruthy()
  expect(view.container.querySelector('time')?.dateTime).toBe('2026-09-23')
  expect(view.getByText('10 kg', { selector: 'strong' })).toBeTruthy()
})
