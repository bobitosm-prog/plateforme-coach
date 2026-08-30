import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('ProgramBuilder navigation context contract', () => {
  const builder = read('app/components/training/ProgramBuilder.tsx')
  const manager = read('app/components/training/TrainingProgramManager.tsx')
  const account = read('app/components/tabs/profile/TrainingProgramSection.tsx')
  const training = read('app/components/tabs/TrainingTab.tsx')
  const initialGeneration = read('app/hooks/useInitialGeneration.ts')

  it('keeps builder back and close controlled locally or by its caller', () => {
    expect(builder).not.toMatch(/useRouter|router\.(push|replace)|window\.location|\/onboarding/)
    expect(builder).toContain("onClick={() => setMode('select')}")
    expect(builder).toContain('onClose()')
  })

  it('returns Account builder success and close to the Account manager', () => {
    expect(account).toContain('onClose={() => setPreparationOpen(false)}')
    expect(manager).toContain('onSave={() => { quota.refresh(); void refreshAuthorities() }}')
    expect(manager).toContain('onClose={() => { setBuilderOpen(false); setEditingProgram(null) }}')
    expect(manager).not.toContain('/onboarding')
  })

  it('removes the legacy Training entry and routes management to Account', () => {
    expect(training).not.toContain('TrainingProgramManager')
    expect(training).toContain('onOpenProgramSettings={onOpenProgramSettings}')
    expect(training).not.toContain('<ProgramBuilder')
  })

  it('keeps onboarding generation on the app flow without ProgramBuilder navigation', () => {
    expect(initialGeneration).toContain("if (!profile.needs_initial_generation) return")
    expect(initialGeneration).not.toMatch(/router\.(push|replace)|window\.location|<ProgramBuilder/)
    expect(initialGeneration).toContain('needs_initial_generation: false')
  })
})
