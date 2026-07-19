import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pagePath = 'app/client/[id]/page.tsx'
const boundaryPaths = [
  'app/client/[id]/components/page/ClientDetailPageView.tsx',
  'app/client/[id]/components/page/ClientDetailPageOverlays.tsx',
  'app/client/[id]/components/page/ClientDetailPageStates.tsx',
  'app/client/[id]/components/page/client-detail-page-types.ts',
]

describe('client detail page architecture', () => {
  it('keeps the route facade thin and every extracted boundary below 500 lines', () => {
    expect(readFileSync(pagePath, 'utf8').split('\n').length).toBeLessThan(250)
    for (const path of boundaryPaths) expect(readFileSync(path, 'utf8').split('\n').length, path).toBeLessThan(500)
  })

  it('keeps authentication data coordination in the existing hook and composes typed views', () => {
    const page = readFileSync(pagePath, 'utf8')
    expect(page).toContain('useClientDetail()')
    expect(page).toContain('<ClientDetailPageView')
    expect(page).toContain('<ClientDetailPageOverlays')
    expect(page).toContain('detail.error || !detail.profile')
  })

  it('preserves the six tab order and the three existing overlay responsibilities', () => {
    const view = readFileSync(boundaryPaths[0], 'utf8')
    const overlays = readFileSync(boundaryPaths[1], 'utf8')
    expect(view).toContain("['apercu','programme','progression','nutrition','messages','notes']")
    for (const component of ['ClientOverview', 'ClientProgram', 'ClientProgress', 'ClientNutrition', 'ClientMessages', 'ClientNotes']) expect(view).toContain(`<${component}`)
    for (const contract of ['Modifier le profil', "BASE D&apos;EXERCICES", "GÉNÉRER AVEC L&apos;IA", 'ConfirmDialog']) expect(overlays).toContain(contract)
  })

  it('keeps presentation boundaries free of data clients and unsafe shortcuts', () => {
    for (const path of boundaryPaths) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).not.toMatch(/createClient|service_role|select\(['"]\*['"]\)|from\(['"]|\bany\b/)
      expect(source, path).not.toMatch(/from ['"](?:@\/lib\/supabase|@\/lib\/repositories)/)
    }
  })
})
