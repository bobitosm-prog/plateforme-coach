import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const repository = readFileSync('lib/repositories/training/program.ts', 'utf8')
const hook = readFileSync('app/coach/hooks/useCoachProgramPagination.ts', 'utf8')
const view = readFileSync('app/coach/components/CoachPrograms.tsx', 'utf8')

describe('coach list pagination architecture', () => {
  it('keeps server pagination in the repository and accumulation in its controller', () => {
    expect(repository).toContain('listCoachProgramPage')
    expect(repository).toContain("order('created_at', { ascending: false, nullsFirst: false }).order('id', { ascending: true })")
    expect(repository).toContain('.limit(pageSize + 1)')
    expect(hook).toContain('mergeCoachProgramPage')
    expect(hook).toContain('generation.current')
    expect(hook).toContain('inFlight.current')
  })

  it('keeps the UI additive and preserves loaded items on next-page failure', () => {
    expect(view).toContain('Charger plus')
    expect(view).toContain('Les programmes affichés sont conservés')
    expect(view).toContain('programPages.nextPageError')
    expect(view).not.toMatch(/training_programs'[\s\S]{0,120}select\(['"]\*['"]\)/)
  })

  it('does not introduce privileged or application data access in pure boundaries', () => {
    for (const source of [repository, hook]) {
      expect(source).not.toMatch(/service_role|select\(['"]\*['"]\)|createClient|from ['"]@\/app/)
    }
  })
})
