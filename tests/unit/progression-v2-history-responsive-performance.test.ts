import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { shouldLoadSignedPhotoUrls } from '@/app/components/progression-v2/TransformationPhotos'
import { getWellbeingState } from '@/app/components/progression-v2/WellbeingCompact'
import { buildProgressionViewModel } from '@/lib/progression/progression-dashboard-model'

const progressTab = readFileSync('app/components/tabs/ProgressTab.tsx', 'utf8')
const photos = readFileSync('app/components/progression-v2/TransformationPhotos.tsx', 'utf8')
const wellbeing = readFileSync('app/components/progression-v2/WellbeingCompact.tsx', 'utf8')
const exportsComponent = readFileSync('app/components/progression-v2/ProgressionExports.tsx', 'utf8')
const analytics = readFileSync('app/components/AnalyticsSection.tsx', 'utf8')
const css = readFileSync('app/components/progression-v2/ProgressionV2.module.css', 'utf8')

function messages(locale: string): Record<string, unknown> {
  return JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as Record<string, unknown>
}

function atPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => (
    current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
  ), value)
}

describe('Progression V2 lazy history sections', () => {
  it('requests zero signed URLs before the photos section opens', () => {
    expect(shouldLoadSignedPhotoUrls(false, 12)).toBe(false)
    expect(shouldLoadSignedPhotoUrls(true, 0)).toBe(false)
    expect(shouldLoadSignedPhotoUrls(true, 2)).toBe(true)
    expect(progressTab).toContain("const [photosOpen, setPhotosOpen] = useState(false)")
    expect(progressTab).toContain('shouldLoadSignedPhotoUrls(photosOpen, progressPhotos.length)')
  })

  it('keeps the photos component visual-only and preserves comparison', () => {
    expect(photos).not.toMatch(/supabase|createSignedUrl|\.from\(|fetch\(/i)
    expect(photos).toContain('aria-expanded={open}')
    expect(photos).toContain("state === 'loading'")
    expect(photos).toContain("state === 'error'")
    expect(photos).toContain("state === 'empty'")
    expect(progressTab).toContain('computeAlignment(beforeUrl, afterUrl)')
    expect(progressTab).toContain('aria-modal="true"')
  })

  it('renders wellbeing from the unified model without medical interpretation', () => {
    const model = buildProgressionViewModel({
      period: '30d',
      now: new Date('2026-08-26T12:00:00.000Z'),
      weight: { logs: [] },
      sessions: { rows: [] },
      records: { rows: [] },
      measurements: { rows: [] },
      photos: { rows: [] },
      wellbeing: { rows: [], state: 'error', errorCode: 'FAILED' },
    })
    expect(getWellbeingState(model.wellbeing)).toBe('error')
    expect(wellbeing).toContain("wellbeing.state === 'partial'")
    expect(wellbeing).not.toMatch(/diagnos|medical|patholog|treatment/i)
    expect(wellbeing).not.toMatch(/supabase|\.from\(|fetch\(/i)
  })

  it('mounts advanced analytics only after explicit expansion', () => {
    expect(progressTab).toContain("const [advancedOpen, setAdvancedOpen] = useState(false)")
    expect(progressTab).toContain('advancedOpen &&')
    expect(progressTab).toContain('aria-expanded={advancedOpen}')
    expect(progressTab).toContain(".from('exercises_db').select('id, muscle_group').in('id', requestedExerciseIds)")
    expect(progressTab).not.toMatch(/from\('exercises_db'\)\.select\('id, muscle_group'\)(?!\.in)/)
    expect(analytics).not.toMatch(/supabase|\.from\(|fetch\(/i)
    expect(analytics).toContain('RIR_MIN_SETS_FOR_AVG = 5')
  })

  it('preserves grouped CSV and XLSX exports', () => {
    expect(progressTab).toContain('downloadCsv(`moovx_analytics_${today}.csv`')
    expect(progressTab).toContain("XLSX.writeFile(workbook, 'MoovX_Mes_Donnees.xlsx')")
    expect(exportsComponent).toContain('onCsv')
    expect(exportsComponent).toContain('onXlsx')
  })
})

describe('Progression V2 responsive and accessibility closure', () => {
  it('keeps one responsive shell and reduced-motion support', () => {
    expect(css).toContain('@media (max-width: 767px)')
    expect(css).toContain('@media (min-width: 768px)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain(':focus-visible')
  })

  it('provides textual summaries for advanced charts', () => {
    expect(analytics).toContain('styles.chartSummary')
    expect(analytics).toContain("tV2('history.advanced.volumeSummary'")
    expect(analytics).toContain("tV2('history.advanced.rirSummary'")
  })

  it('removes the last dead legacy Progression components', () => {
    for (const path of [
      'app/components/progress/AbsCalculator.tsx',
      'app/components/progress/BodyAssessment.tsx',
      'app/components/tabs/progress/ActionBtn.tsx',
      'app/components/tabs/progress/AnalysisDisplay.tsx',
    ]) expect(existsSync(path), path).toBe(false)
    expect(progressTab).not.toMatch(/BodyAssessment|AbsCalculator|AnalysisDisplay|ActionBtn/)
  })

  it.each(['fr', 'en', 'de'])('contains complete %s history messages', locale => {
    const value = messages(locale)
    for (const path of [
      'progress.v2.history.photos.title',
      'progress.v2.history.photos.compare',
      'progress.v2.history.wellbeing.title',
      'progress.v2.history.advanced.title',
      'progress.v2.history.exports.csv',
      'progress.v2.history.exports.xlsx',
    ]) expect(atPath(value, path), `${locale}:${path}`).toEqual(expect.any(String))
  })
})
