import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const tabPath = path.join(root, 'app/components/tabs/ProgressTab.tsx')
const progressionDirectory = path.join(root, 'app/components/tabs/progression')
const tab = fs.readFileSync(tabPath, 'utf8')
const boundaryNames = [
  'ProgressPhotosSection.tsx',
  'ProgressBodyAnalysisSection.tsx',
  'ProgressWellnessSection.tsx',
  'ProgressEntryOverlays.tsx',
  'ProgressPhotoCompareOverlay.tsx',
  'ProgressExportButton.tsx',
  'useProgressTabController.ts',
]

describe('ProgressTab facade architecture', () => {
  it('keeps the facade and every new boundary below 500 lines', () => {
    expect(tab.split('\n').length).toBeLessThan(500)
    for (const name of boundaryNames) {
      const source = fs.readFileSync(path.join(progressionDirectory, name), 'utf8')
      expect(source.split('\n').length, name).toBeLessThan(500)
    }
  })

  it('delegates the remaining presentation and keeps the public export stable', () => {
    expect(tab).toContain('export default function ProgressTab(props: ProgressTabPublicProps)')
    for (const component of boundaryNames.filter(name => name.endsWith('Section.tsx') || name.endsWith('Overlay.tsx') || name.endsWith('Button.tsx')).map(name => name.replace('.tsx', ''))) {
      expect(tab).toContain(`<${component}`)
    }
    expect(tab).toContain('useProgressTabController(props, t)')
  })

  it('keeps data access out of presentation boundaries', () => {
    const views = boundaryNames
      .filter(name => name.endsWith('.tsx'))
      .map(name => fs.readFileSync(path.join(progressionDirectory, name), 'utf8'))
      .join('\n')
    for (const forbidden of ['supabase', 'createClient', 'service_role', "select('*')", '.insert(', '.update(', '.delete(', 'lib/repositories']) {
      expect(views).not.toContain(forbidden)
    }
    expect(views).not.toMatch(/\bany\b/)
  })

  it('does not introduce wildcard reads or untyped escape hatches', () => {
    const controller = fs.readFileSync(path.join(progressionDirectory, 'useProgressTabController.ts'), 'utf8')
    expect(controller).not.toMatch(/\bany\b/)
    expect(controller.match(/select\('\*'\)/g)?.length ?? 0).toBe(2)
  })
})
