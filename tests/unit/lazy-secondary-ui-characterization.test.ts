import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

// Immutable parent of the lazy-secondary-UI migration. Using HEAD here makes
// this historical characterization change meaning after the migration commit.
const BASELINE_COMMIT = '1af24af872b3699adacbbfdd5e50356c28504fdb'
const read = (path: string) => execFileSync('git', ['show', `${BASELINE_COMMIT}:${path}`], { encoding: 'utf8' })

describe('secondary UI before lazy migration', () => {
  it('keeps the real initial client and detail views eager', () => {
    expect(read('app/components/dashboard/DashboardClientIsland.tsx')).toContain(
      "import HomeTab from '../tabs/HomeTab'",
    )
    expect(read('app/client/[id]/components/page/ClientDetailPageView.tsx')).toContain(
      "import ClientOverview from '../ClientOverview'",
    )
  })

  it('characterizes the secondary client tabs that were static at HEAD', () => {
    const source = read('app/components/dashboard/DashboardClientIsland.tsx')
    for (const component of ['TrainingTab', 'NutritionTab', 'ProgressTab', 'AccountTab']) {
      expect(source).toMatch(new RegExp(`import ${component} from`))
    }
  })

  it('characterizes the secondary detail tabs and always-mounted overlay at HEAD', () => {
    const view = read('app/client/[id]/components/page/ClientDetailPageView.tsx')
    for (const component of ['ClientProgram', 'ClientProgress', 'ClientNutrition', 'ClientMessages', 'ClientNotes']) {
      expect(view).toMatch(new RegExp(`import ${component} from`))
    }
    expect(read('app/client/[id]/page.tsx')).toContain('<ClientDetailPageOverlays')
  })

  it('characterizes the already dynamic coach sections', () => {
    for (const path of [
      'app/coach/components/sections/CoachDesktopLayout.tsx',
      'app/coach/components/sections/CoachMobileLayout.tsx',
    ]) {
      const source = read(path)
      expect(source).toContain("dynamic(() => import('../ClientsList')")
      expect(source).toContain("dynamic(() => import('../CoachMessages')")
      expect(source).toContain("dynamic(() => import('../SessionDetailModal')")
    }
  })
})
