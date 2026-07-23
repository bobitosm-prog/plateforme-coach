import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

const serverBoundaries = [
  'app/page.tsx',
  'app/coach/page.tsx',
  'app/coach/components/CoachStyles.tsx',
  'app/components/dashboard/DashboardStyles.tsx',
  'app/client/[id]/page.tsx',
  'app/client/[id]/components/page/ClientDetailPageStyles.tsx',
]

describe('critical route client boundaries', () => {
  it('keeps the three route compositions and static styles on the server', () => {
    for (const path of serverBoundaries) {
      const source = read(path)
      expect(source, path).not.toMatch(/^['"]use client['"]/m)
      expect(source, path).not.toMatch(/use(State|Effect|Memo|Callback|Ref|Reducer|Context)|window\.|document\.|localStorage|navigator\.|createBrowserClient|createClient/)
    }
  })

  it('keeps interaction and data coordination in explicit client islands', () => {
    const dashboard = read('app/components/dashboard/DashboardClientIsland.tsx')
    const coach = read('app/coach/components/CoachPageContent.tsx')
    const detail = read('app/client/[id]/components/page/ClientDetailPageClient.tsx')
    expect(dashboard).toMatch(/^['"]use client['"]/)
    expect(coach).toMatch(/^['"]use client['"]/)
    expect(detail).toMatch(/^['"]use client['"]/)
    expect(detail).toContain('useClientDetail()')
  })

  it('does not pass data or callbacks through the new server compositions', () => {
    expect(read('app/page.tsx')).toContain('<DashboardClientIsland />')
    expect(read('app/coach/page.tsx')).toContain('<CoachPageContent />')
    expect(read('app/client/[id]/page.tsx')).toContain('<ClientDetailPageClient />')
    for (const path of serverBoundaries) {
      expect(read(path), path).not.toMatch(/service_role|on[A-Z][A-Za-z]+=/)
    }
  })

  it('keeps every new boundary below 500 lines and avoids client-only shortcuts', () => {
    const paths = [
      ...serverBoundaries,
      'app/client/[id]/components/page/ClientDetailPageClient.tsx',
    ]
    for (const path of paths) {
      const source = read(path)
      expect(source.split('\n').length, path).toBeLessThan(500)
      expect(source, path).not.toContain('ssr: false')
      expect(source, path).not.toMatch(/\bany\b/)
    }
  })

  it('removes static styles from the hydrated layout modules', () => {
    expect(read('app/components/dashboard/DashboardClientIsland.tsx')).not.toContain('<style>')
    expect(read('app/coach/components/sections/CoachDesktopLayout.tsx')).not.toContain('CoachStyles')
    expect(read('app/coach/components/sections/CoachMobileLayout.tsx')).not.toContain('CoachStyles')
    expect(read('app/client/[id]/components/page/ClientDetailPageView.tsx')).not.toContain('<style>')
  })
})
