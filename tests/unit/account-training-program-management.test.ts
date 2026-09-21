import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const read = (path: string) => readFileSync(path, 'utf8')
const manager = read('app/components/training/TrainingProgramManager.tsx')
const builder = read('app/components/training/ProgramBuilder.tsx')
const section = read('app/components/tabs/profile/TrainingProgramSection.tsx')
const training = read('app/components/tabs/TrainingTab.tsx')
const sql = read('supabase/migrations/20260921160900_training_program_atomic_editor.sql')
describe('simplified training program management boundaries', () => {
  it('loads the manager and editor lazily without duplicating program authority', () => {
    expect(section).toContain("dynamic(() => import('../../training/TrainingProgramManager')")
    expect(manager).toContain("dynamic(() => import('./ProgramBuilder')")
    expect(training).not.toContain('TrainingProgramManager')
    expect(training).not.toMatch(/from\('custom_programs'\)/)
    expect(manager).not.toMatch(/setActiveProgram|resolveActiveTrainingProgram/)
  })
  it('checks access and quota before mutations and AI generation', () => {
    expect(manager).toContain('useAiQuota()')
    expect(manager).toContain('resolveTrainingProgramAccess')
    expect(manager).toContain('aiAllowed={access.canGenerateWithAI}')
    expect(manager).toMatch(/!access.canConfigure/)
    expect(builder).toContain('if (!canMutate || !aiAllowed)')
    expect(builder).toContain('if (!canMutate || !ceName.trim())')
    expect(builder).toContain('if (!canMutate || saving || !programName.trim())')
  })
  it('retains generation via the existing SSE endpoint', () => {
    expect(builder).toContain("fetch('/api/generate-custom-program'")
    expect(builder).toContain('consumeProgramStream(res)')
    expect(builder).toContain("equipment: aiEquipment === '__profile__'")
  })
  it('routes save, activation, import and archive through the same atomic API', () => {
    expect(builder).toContain('await mutateProgram')
    expect(builder.indexOf('await mutateProgram')).toBeLessThan(builder.indexOf("toast.success(t('toast.programSaved'))"))
    expect(manager).toContain('await mutateProgram')
    for (const source of [builder,manager]) {
      expect(source).not.toMatch(/from\('custom_programs'\)\.(insert|update|delete)/)
      expect(source).not.toMatch(/from\('scheduled_sessions'\)/)
    }
    expect(sql).toContain('false,false,(candidate')
    expect(sql).toContain("action='archive'")
    expect(sql).toContain("'ACTIVE_PROTECTED'")
  })
  it('refreshes the shared authority after a confirmed mutation', () => {
    expect(manager).toContain('await onRefresh(true)')
    expect(section).toContain('activeProgramContext={activeProgram}')
  })
  it('preserves provenance, phases, version history and inactive drafts', () => {
    expect(sql).toContain('previous_program')
    expect(sql).toContain('total_weeks,phases')
    expect(sql).toContain("set name=candidate->>'name',days=candidate->'days'")
    expect(sql).toContain("'RETRY_CHANGED'")
    expect(sql).toContain("'PROGRAM_CHANGED'")
  })
  it('provides translated review, recovery and error states in each locale', () => {
    for(const locale of ['fr','en','de']) {
      const messages=JSON.parse(read(`messages/${locale}.json`))
      for(const key of ['review','resume','discard','finishWorkout','conflict','parked'])expect(messages.programWorkspace[key]).toBeTruthy()
    }
  })
})
