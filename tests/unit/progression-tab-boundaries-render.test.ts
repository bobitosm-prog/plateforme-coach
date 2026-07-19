import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { fr } from 'date-fns/locale/fr'

vi.mock('../../app/components/ui/SectionTitle', () => ({
  default: ({ title, trailing }: { title: string; trailing?: string }) => createElement('div', null, title, trailing),
}))
vi.mock('../../app/components/ui/RailOverlay', () => ({ RailOverlay: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-overlay': true }, children) }))

import { ProgressBodyAnalysisSection } from '../../app/components/tabs/progression/ProgressBodyAnalysisSection'
import { ProgressEntryOverlays } from '../../app/components/tabs/progression/ProgressEntryOverlays'
import { ProgressExportButton } from '../../app/components/tabs/progression/ProgressExportButton'
import { ProgressPhotosSection } from '../../app/components/tabs/progression/ProgressPhotosSection'

const t = (key: string) => key

describe('ProgressTab extracted boundary rendering', () => {
  it('preserves empty and populated transformation states', () => {
    const empty = renderToStaticMarkup(createElement(ProgressPhotosSection, { photos: [], signedUrls: {}, onAdd: vi.fn(), onCompare: vi.fn(), t }))
    expect(empty).toContain('photos.addPhoto')
    expect(empty).toContain('AVANT')
    const populated = renderToStaticMarkup(createElement(ProgressPhotosSection, { photos: [{ id: 'before', photo_url: 'before.jpg', date: '2026-01-01' }, { id: 'after', photo_url: 'after.jpg', date: '2026-02-01' }], signedUrls: { before: '/before', after: '/after' }, onAdd: vi.fn(), onCompare: vi.fn(), t }))
    expect(populated).toContain('COMPARER AVANT / APRÈS')
    expect(populated).toContain('/before')
    expect(populated).toContain('/after')
  })

  it('renders body analysis empty, result and upload states', () => {
    const common = { loading: false, stepLabel: 'step', photos: {}, uploadRef: { current: null }, onChooseAngle: vi.fn(), onUpload: vi.fn(), onAnalyze: vi.fn(), onCloseUpload: vi.fn(), onOpenUpload: vi.fn(), onContactCoach: vi.fn(), t, dateLocale: fr }
    expect(renderToStaticMarkup(createElement(ProgressBodyAnalysisSection, { ...common, analysis: null, uploadOpen: false }))).toContain('photos.noAnalysis')
    const result = renderToStaticMarkup(createElement(ProgressBodyAnalysisSection, { ...common, uploadOpen: false, analysis: { body_fat_estimate: 12, lean_mass_estimate: 70, strengths: ['Force'], improvements: ['Mobilité'], symmetry_score: 88, photos_used: 3, created_at: '2026-01-01T00:00:00Z' } }))
    expect(result).toContain('~12%')
    expect(result).toContain('Force')
    expect(result).toContain('88%')
    expect(renderToStaticMarkup(createElement(ProgressBodyAnalysisSection, { ...common, analysis: null, uploadOpen: true }))).toContain('data-overlay="true"')
  })

  it('preserves overlay callbacks and explicit empty/visible export states', () => {
    expect(renderToStaticMarkup(createElement(ProgressExportButton, { visible: false, onExport: vi.fn(), t }))).toBe('')
    expect(renderToStaticMarkup(createElement(ProgressExportButton, { visible: true, onExport: vi.fn(), t }))).toContain('tab.exportData')
    const overlays = renderToStaticMarkup(createElement(ProgressEntryOverlays, { showWeight: true, weight: '80', weightDate: '2026-01-01', previousWeight: 79, savingWeight: false, onWeightChange: vi.fn(), onWeightDateChange: vi.fn(), onCloseWeight: vi.fn(), onSaveWeight: vi.fn(), showMeasure: false, measureForm: {}, measureDate: '2026-01-01', savingMeasure: false, onMeasureChange: vi.fn(), onMeasureDateChange: vi.fn(), onCloseMeasure: vi.fn(), onSaveMeasure: vi.fn(), t }))
    expect(overlays).toContain('ENREGISTRER MON POIDS')
    expect(overlays).toContain('tab.previous')
  })
})
