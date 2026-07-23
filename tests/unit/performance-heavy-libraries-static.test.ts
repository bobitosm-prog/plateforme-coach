import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

const RECHARTS_CONSUMERS = [
  'app/(dashboard)/page-desktop.tsx',
  'app/admin/_components/RevenueChart.tsx',
  'app/client/[id]/components/ClientProgress.tsx',
  'app/components/AnalyticsSection.tsx',
  'app/components/tabs/progression/ProgressWellnessSection.tsx',
  'app/components/ui/SizedChart.tsx',
  'app/nutrition/NutritionDashboard.tsx',
] as const

describe('heavy runtime library boundaries', () => {
  it('keeps the exhaustive Recharts inventory explicit', () => {
    for (const path of RECHARTS_CONSUMERS) expect(read(path)).toContain("from 'recharts'")
    expect(read('app/components/dashboard/dashboard-deferred-components.tsx')).toContain(
      "dynamic(() => import('../tabs/ProgressTab')",
    )
    expect(read('app/client/[id]/components/page/ClientDetailPageView.tsx')).toContain(
      "dynamic(() => import('../ClientProgress')",
    )
    expect(read('app/coach/components/sections/CoachDesktopLayout.tsx')).toContain(
      "dynamic(() => import('../CoachAnalytics')",
    )
  })

  it('loads MediaPipe only from the explicit alignment action', () => {
    const controller = read('app/components/tabs/progression/useProgressTabController.ts')
    const alignment = read('lib/photo-align.ts')
    expect(controller).toContain("import type { Alignment } from '../../../../lib/photo-align'")
    expect(controller).not.toContain("import { computeAlignment")
    expect(controller).toContain("await import('../../../../lib/photo-align')")
    expect(alignment).not.toContain("from '@mediapipe/tasks-vision'")
    expect(alignment).toContain("await import('@mediapipe/tasks-vision')")
    expect(controller).toContain('disposePhotoAlignment()')
    expect(alignment).toContain('created.close()')
    expect(alignment).toContain('poseLandmarker?.close()')
  })

  it('loads QR only after the scanner boundary mounts and cleans stale setup', () => {
    const scanner = read('app/components/BarcodeScanner.tsx')
    const dashboard = read('app/components/dashboard/dashboard-deferred-components.tsx')
    expect(scanner).not.toContain("from 'html5-qrcode'")
    expect(scanner).toContain("await import('html5-qrcode')")
    expect(scanner).toContain("qrbox: { width: 280, height: 150 }")
    expect(scanner).toContain('fps: 10')
    expect(scanner).toContain("facingMode: 'environment'")
    expect(scanner).toContain('scannerGenerationRef.current += 1')
    expect(scanner).toContain('startingRef.current')
    expect(dashboard).toContain("dynamic(() => import('../BarcodeScanner')")
  })

  it('loads XLSX only inside explicit import/export handlers', () => {
    const programExcel = read('lib/program-excel.ts')
    const progress = read('app/components/tabs/progression/useProgressTabController.ts')
    for (const source of [programExcel, progress]) {
      expect(source).not.toContain("from 'xlsx'")
      expect(source).toContain("import('xlsx')")
    }
    expect(progress).toContain('exportRunningRef.current')
    expect(read('app/components/tabs/training/TrainingTabOverlays.tsx')).toContain(
      "spreadsheetActionRef.current = 'import'",
    )
  })

  it('preserves the documented chart, QR, and workbook options', () => {
    const programExcel = read('lib/program-excel.ts')
    expect(programExcel).toContain("'Programme'")
    expect(programExcel).toContain("`Jour ${i}`")
    expect(programExcel).toContain("const header = ['Exercice', 'Sets', 'Reps', 'Repos', 'Tempo', 'Technique', 'Détails']")
    expect(read('app/components/AnalyticsSection.tsx')).toContain('<CartesianGrid')
    expect(read('app/components/AnalyticsSection.tsx')).toContain('<Tooltip')
  })

  it('keeps every changed runtime boundary below 500 lines and adds no any', () => {
    for (const path of [
      'lib/photo-align.ts',
      'lib/program-excel.ts',
      'app/components/BarcodeScanner.tsx',
      'app/components/tabs/progression/useProgressTabController.ts',
      'app/components/tabs/training/TrainingTabOverlays.tsx',
    ]) {
      const source = read(path)
      expect(source.split('\n').length, path).toBeLessThan(500)
    }
    expect(read('lib/photo-align.ts')).not.toMatch(/\bany\b/)
  })
})
