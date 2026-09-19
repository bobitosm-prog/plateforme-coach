// @vitest-environment jsdom
import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import CurrentSetEditor from '@/app/components/training-v2/CurrentSetEditor'
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('runs the timed editor with a seconds field, no weight input, and working controls', () => {
  vi.stubGlobal('React', React)
  const change = vi.fn(), adjust = vi.fn(), validate = vi.fn()
  render(React.createElement(CurrentSetEditor, {
    timed: true, setNumber: 1, totalSets: 3, weight: '', reps: 30, rir: null,
    weightStep: 1, showRir: false, canValidate: true, suggestion: null, statusMessage: '',
    onWeightChange: vi.fn(), onWeightFocus: vi.fn(), onWeightBlur: vi.fn(), onAdjustWeight: vi.fn(),
    onRepsChange: change, onAdjustReps: adjust, onRirChange: vi.fn(), onUseSuggestion: vi.fn(), onValidate: validate,
  }))
  expect(screen.queryByLabelText('weight')).toBeNull()
  expect(screen.queryByLabelText('repetitions')).toBeNull()
  fireEvent.change(screen.getByLabelText('durationSeconds'), { target: { value: '45' } })
  expect(change).toHaveBeenCalledWith('45')
  fireEvent.click(screen.getByRole('button', { name: 'increaseDuration' }))
  expect(adjust).toHaveBeenCalledWith(1)
  fireEvent.click(screen.getByRole('button', { name: 'validateSet' }))
  expect(validate).toHaveBeenCalledOnce()
})
