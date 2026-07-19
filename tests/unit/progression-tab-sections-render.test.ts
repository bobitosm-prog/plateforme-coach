import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: () => (key: string, values?: Record<string, string | number | undefined>) => values ? `${key}:${JSON.stringify(values)}` : key,
}))
vi.mock('../../app/components/ui/SectionTitle', () => ({ default: ({ title, trailing }: { title: string; trailing?: string }) => createElement('div', null, title, trailing) }))

import { ProgressMeasurementsSection } from '../../app/components/tabs/progression/ProgressMeasurementsSection'
import { ProgressOverviewSection } from '../../app/components/tabs/progression/ProgressOverviewSection'
import { ProgressRecordsSection } from '../../app/components/tabs/progression/ProgressRecordsSection'
import { ProgressWeightSection } from '../../app/components/tabs/progression/ProgressWeightSection'
import { fr } from 'date-fns/locale/fr'

describe('ProgressTab extracted sections rendering', () => {
  it('renders the summary, legacy volume display and navigation in current order', () => {
    const html = renderToStaticMarkup(createElement(ProgressOverviewSection, { sessions: 4, records: 2, totalVolume: 1250, streak: 3, activeSection: 'records', onNavigate: vi.fn() }))
    expect(html).toContain('ANALYTICS')
    expect(html).toContain('1.3T')
    expect(html.indexOf('pills.poids')).toBeLessThan(html.indexOf('pills.records'))
    expect(html).toContain('headerSubtitle')
  })

  it('preserves empty, explicit zero and populated weight values', () => {
    const base = { period: '30' as const, min: 0, max: 1, goalWeight: null, delta: 0, deltaPositive: false, onPeriodChange: vi.fn(), onAddWeight: vi.fn() }
    expect(renderToStaticMarkup(createElement(ProgressWeightSection, { ...base, points: [] }))).toContain('—')
    const zero = renderToStaticMarkup(createElement(ProgressWeightSection, { ...base, currentWeight: 0, points: [{ date: '2026-01-01', poids: 0 }] }))
    expect(zero).toContain('—')
    const populated = renderToStaticMarkup(createElement(ProgressWeightSection, { ...base, currentWeight: 80, goalWeight: 75, delta: -1, deltaPositive: true, points: [{ date: '2026-01-01', poids: 81 }, { date: '2026-01-02', poids: 80 }], min: 79, max: 82 }))
    expect(populated).toContain('80')
    expect(populated).toContain('-1 kg')
    expect(populated).toContain('<polyline')
  })

  it('renders empty and populated record states with the current visible values', () => {
    const base = { limit: 10, dateLocale: fr, onLimitChange: vi.fn() }
    expect(renderToStaticMarkup(createElement(ProgressRecordsSection, { ...base, records: [] }))).toContain('tab.firstRecord')
    const html = renderToStaticMarkup(createElement(ProgressRecordsSection, { ...base, records: [{ name: 'Squat', maxWeight: 120, oneRm: 130, unit: 'kg', date: '2026-01-02' }] }))
    expect(html).toContain('Squat')
    expect(html).toContain('120')
    expect(html).toContain('estimated1rmValue')
  })

  it('preserves absent and explicit-zero measurement rendering', () => {
    const empty = renderToStaticMarkup(createElement(ProgressMeasurementsSection, { onAddMeasurement: vi.fn() }))
    expect(empty.match(/—/g)).toHaveLength(4)
    const zero = renderToStaticMarkup(createElement(ProgressMeasurementsSection, { measurement: { waist: 0, chest: 90 }, onAddMeasurement: vi.fn() }))
    expect(zero).toContain('>0</span>')
    expect(zero).toContain('>90</span><span')
  })
})
