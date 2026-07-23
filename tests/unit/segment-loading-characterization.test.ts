import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rootPage = readFileSync('app/page.tsx', 'utf8')
const coachPage = readFileSync('app/coach/components/CoachPageContent.tsx', 'utf8')
const clientPage = readFileSync('app/client/[id]/page.tsx', 'utf8')
const performanceSpec = readFileSync('e2e/performance-baseline.spec.ts', 'utf8')

describe('important segment loading boundaries before extraction', () => {
  it('identifies the production reference segments', () => {
    expect(performanceSpec).toContain("page.goto('/')")
    expect(performanceSpec).toContain("page.goto('/coach')")
    expect(performanceSpec).toContain("toBe(`/client/${fixture.client.id}`)")
  })

  it('keeps the root dashboard behind its existing server fallback', () => {
    expect(rootPage).toContain('<Suspense fallback={<DashboardServerFallback />}>')
    expect(existsSync('app/loading.tsx')).toBe(false)
  })

  it('records the existing client-only states that segment boundaries must not replace', () => {
    expect(coachPage).toContain('CoachSectionFallback')
    expect(coachPage).toContain("if (!h.mounted || h.loading")
    expect(clientPage).toContain('ClientDetailLoadingView')
  })
})
