import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

describe('lazy secondary UI architecture', () => {
  it('keeps initial Home and Aperçu eager', () => {
    const dashboard = read('app/components/dashboard/DashboardClientIsland.tsx')
    const detail = read('app/client/[id]/components/page/ClientDetailPageView.tsx')
    expect(dashboard).toContain("import HomeTab from '../tabs/HomeTab'")
    expect(detail).toContain("import ClientOverview from '../ClientOverview'")
    expect(dashboard).not.toContain("dynamic(() => import('../tabs/HomeTab')")
    expect(detail).not.toContain("dynamic(() => import('../ClientOverview')")
  })

  it('loads only selected secondary client tabs dynamically at module scope', () => {
    const dashboard = read('app/components/dashboard/DashboardClientIsland.tsx')
    const deferred = read('app/components/dashboard/dashboard-deferred-components.tsx')
    for (const component of ['TrainingTab', 'NutritionTab', 'ProgressTab', 'AccountTab']) {
      expect(deferred).toMatch(new RegExp(`export const ${component} = dynamic\\(\\(\\) => import\\(`))
      expect(dashboard).not.toMatch(new RegExp(`import ${component} from`))
    }
  })

  it('loads detail tabs and overlays dynamically', () => {
    const view = read('app/client/[id]/components/page/ClientDetailPageView.tsx')
    const client = read('app/client/[id]/components/page/ClientDetailPageClient.tsx')
    for (const component of ['ClientProgram', 'ClientProgress', 'ClientNutrition', 'ClientMessages', 'ClientNotes']) {
      expect(view).toMatch(new RegExp(`const ${component} = dynamic\\(\\(\\) => import\\(`))
      expect(view).not.toMatch(new RegExp(`import ${component} from`))
    }
    expect(client).toContain("dynamic(() => import('./ClientDetailPageOverlays')")
    expect(client).toContain('hasOpenClientDetailOverlay(detail, pendingTemplate)')
  })

  it('does not introduce unsupported client-only dynamic boundaries', () => {
    const files = [
      'app/components/dashboard/DashboardClientIsland.tsx',
      'app/client/[id]/page.tsx',
      'app/client/[id]/components/page/ClientDetailPageClient.tsx',
      'app/client/[id]/components/page/ClientDetailPageView.tsx',
    ]
    for (const path of files) {
      const source = read(path)
      expect(source.match(/ssr:\s*false/g) ?? []).toHaveLength(
        path.endsWith('DashboardClientIsland.tsx') ? 1 : 0,
      )
    }
  })

  it('keeps presentation boundaries free of data access and browser effects', () => {
    const fallback = read('app/components/loading/DeferredContentFallback.tsx')
    const overlayState = read('app/client/[id]/components/page/client-detail-overlay-state.ts')
    const deferred = read('app/components/dashboard/dashboard-deferred-components.tsx')
    for (const source of [fallback, overlayState, deferred]) {
      for (const forbidden of ['supabase', 'repository', 'createClient', 'service_role', 'fetch(', 'localStorage', 'window.']) {
        expect(source).not.toContain(forbidden)
      }
      expect(source).not.toMatch(/\\bany\\b/)
    }
  })

  it('does not preload neighboring tabs globally after an idle timeout', () => {
    const runtime = read('app/components/dashboard/useDashboardClientRuntime.ts')
    expect(runtime).not.toContain('requestIdleCallback')
    expect(runtime).not.toContain('const neighbors =')
  })

  it('keeps every new boundary below 500 lines', () => {
    for (const path of [
      'app/components/loading/DeferredContentFallback.tsx',
      'app/components/dashboard/dashboard-deferred-components.tsx',
      'app/client/[id]/components/page/client-detail-overlay-state.ts',
    ]) {
      expect(read(path).split('\n').length).toBeLessThan(500)
    }
  })
})
