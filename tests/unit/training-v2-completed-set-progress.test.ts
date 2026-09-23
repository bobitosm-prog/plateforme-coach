import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import CurrentSetEditor from '../../app/components/training-v2/CurrentSetEditor'
import ActiveExerciseFocus from '../../app/components/training-v2/ActiveExerciseFocus'
import messages from '../../messages/fr.json'

const noop = () => {}
function render(node: React.ReactNode) {
  return renderToStaticMarkup(React.createElement(NextIntlClientProvider, { locale: 'fr', messages, timeZone: 'Europe/Zurich', children: node }))
}
function editor(completedSets: number, setNumber: number, stepLabel?: string) {
  return render(React.createElement(CurrentSetEditor, {
    completedSets, setNumber, totalSets: 3, stepLabel, weight: '', reps: 10, rir: null,
    weightStep: 1, showRir: false, canValidate: true, suggestion: null, statusMessage: '',
    onWeightChange: noop, onWeightFocus: noop, onWeightBlur: noop, onAdjustWeight: noop,
    onRepsChange: noop, onAdjustReps: noop, onRirChange: noop, onUseSuggestion: noop, onValidate: noop,
  }))
}
describe('completed sets versus current set', () => {
  it('does not show 100% before the final set is validated', () => {
    const html = editor(2, 3)
    expect(html).toContain('Série 3 sur 3')
    expect(html).toContain('2 / 3 séries validées')
    expect(html).toContain('aria-valuenow="2"')
    expect(html).not.toContain('width:100%')
  })
  it('starts at zero and reaches 100% only on completion', () => {
    expect(editor(0, 1)).toContain('width:0%')
    expect(editor(3, 3)).toContain('width:100%')
  })
  it('retains technique step labels without confusing them with completed sets', () => {
    const html = editor(2, 3, 'Mini-série 1/2')
    expect(html).toContain('Mini-série 1/2')
    expect(html).toContain('aria-valuenow="2"')
  })
  it('renders current and completed counts separately in the focus header', () => {
    const html = render(React.createElement(ActiveExerciseFocus, {
      name: 'Fentes', exerciseIndex: 0, exerciseCount: 5, activeSet: 3,
      totalSets: 3, completedSets: 2, previous: null, previousError: false, target: '10 reps', children: null,
    }))
    expect(html).toContain('Série 3 sur 3')
    expect(html).toContain('2 / 3 séries validées')
  })
})
