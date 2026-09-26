// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import MeasureModal from '@/app/components/modals/MeasureModal'
import fr from '@/messages/fr.json'
import en from '@/messages/en.json'
import de from '@/messages/de.json'

beforeEach(() => vi.stubGlobal('React', React))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function setup(locale = 'fr', messages = fr) {
  const onSave = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  const view = render(React.createElement(NextIntlClientProvider, { locale, messages, timeZone: 'Europe/Zurich',
    children: React.createElement(MeasureModal, { measurements: [], onSave, onClose }),
  }))
  return { ...view, onSave, onClose }
}

it.each([['fr', fr], ['en', en], ['de', de]] as const)('bounds the native date input and associates its label in %s', (locale, messages) => {
  const view = setup(locale, messages)
  const input = view.getByLabelText(messages.progress.measureModal.date) as HTMLInputElement
  expect(input.type).toBe('date')
  const style = getComputedStyle(input)
  expect(style.display).toBe('block')
  expect(style.width).toBe('100%')
  expect(style.minWidth).toBe('0px')
  expect(style.maxWidth).toBe('100%')
  expect(style.boxSizing).toBe('border-box')
  expect((view.getByText(messages.progress.measureModal.save) as HTMLButtonElement).disabled).toBe(true)
})

it('keeps date changes local and cancellation never saves', () => {
  const view = setup()
  fireEvent.change(view.getByLabelText('Date'), { target: { value: '2026-09-19' } })
  expect(view.onSave).not.toHaveBeenCalled()
  fireEvent.click(view.getByText('Annuler'))
  expect(view.onClose).toHaveBeenCalledOnce()
  expect(view.onSave).not.toHaveBeenCalled()
})

it('preserves all six measurements and selected date on explicit save', async () => {
  const view = setup()
  const values = ['100', '110', '97', '37', '56', '44']
  view.getAllByRole('spinbutton').forEach((input, index) => fireEvent.change(input, { target: { value: values[index] } }))
  fireEvent.change(view.getByLabelText('Date'), { target: { value: '2026-09-19' } })
  expect(view.onSave).not.toHaveBeenCalled()
  fireEvent.click(view.getByText('Sauvegarder'))
  await waitFor(() => expect(view.onSave).toHaveBeenCalledExactlyOnceWith({ waist: 100, hips: 110, chest: 97, biceps: 37, thighs: 56, calves: 44 }, '2026-09-19'))
})
