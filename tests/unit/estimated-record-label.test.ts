import { expect, it } from 'vitest'
import { normalizeHomeProgressionRecord } from '@/lib/home/home-dashboard-model'
import fr from '../../messages/fr.json'
import en from '../../messages/en.json'
import de from '../../messages/de.json'

it('preserves the kind of record, without labelling a measured max as estimated', () => {
  expect(normalizeHomeProgressionRecord({ exercise_name: 'Rowing', value: 28, record_type: '1rm' })?.recordType).toBe('1rm')
  expect(normalizeHomeProgressionRecord({ exercise_name: 'Rowing', value: 20, record_type: 'max_weight' })?.recordType).toBe('max_weight')
})

it('labels completion estimates in every supported language', () => {
  for (const messages of [fr, en, de]) expect(messages.training_tab.ws.done.estimated1rm).toMatch(/estim|schätz/i)
})
