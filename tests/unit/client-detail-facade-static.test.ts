import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const directory = 'app/client/[id]/hooks/'
const files = ['useClientDetail.ts', 'client-detail-contract.ts', 'useClientDetailController.ts', 'useClientDetailAi.ts', 'useClientDetailResources.ts']
const sources = Object.fromEntries(files.map(file => [file, readFileSync(`${directory}${file}`, 'utf8')]))

describe('useClientDetail facade architecture', () => {
  it('keeps the facade below 250 lines and every boundary below 500', () => {
    expect(sources['useClientDetail.ts'].split('\n').length).toBeLessThan(250)
    for (const file of files.slice(1)) expect(sources[file].split('\n').length, file).toBeLessThan(500)
  })

  it('keeps contract, AI and resource boundaries free of forbidden authority', () => {
    for (const file of ['client-detail-contract.ts', 'useClientDetailAi.ts', 'useClientDetailResources.ts']) {
      expect(sources[file], file).not.toContain('service_role')
      expect(sources[file], file).not.toContain('createBrowserClient')
      expect(sources[file], file).not.toContain("select('*')")
      expect(sources[file], file).not.toMatch(/\bany\b/)
    }
  })

  it('keeps the facade as a compatibility export and isolates responsibilities', () => {
    expect(sources['useClientDetail.ts']).toContain("export { default } from './useClientDetailController'")
    expect(sources['useClientDetailController.ts']).toContain('useClientDetailAi(')
    expect(sources['useClientDetailController.ts']).toContain('useClientDetailResources(')
    expect(sources['useClientDetailResources.ts']).toContain('return () => { messageGeneration.current += 1; stop() }')
    expect(sources['useClientDetailController.ts']).toContain('detailLoadGenerationRef.current += 1')
  })
})
