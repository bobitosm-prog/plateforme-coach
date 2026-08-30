import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const manager = read('app/components/training/TrainingProgramManager.tsx')
const builder = read('app/components/training/ProgramBuilder.tsx')
const accountSection = read('app/components/tabs/profile/TrainingProgramSection.tsx')
const trainingTab = read('app/components/tabs/TrainingTab.tsx')
const api = read('app/api/generate-custom-program/route.ts')

describe('Account training program management', () => {
  it('loads the shared manager and ProgramBuilder lazily', () => {
    expect(accountSection).toContain("dynamic(() => import('../../training/TrainingProgramManager')")
    expect(trainingTab).toContain("dynamic(() => import('../training/TrainingProgramManager')")
    expect(manager).toContain("dynamic(() => import('./ProgramBuilder')")
    expect(trainingTab).not.toMatch(/import ProgramBuilder/)
    expect(trainingTab).not.toMatch(/from\('custom_programs'\)/)
  })

  it('mounts quota only with the lazy manager and fails safe before generation', () => {
    expect(manager).toContain('const quota = useAiQuota()')
    expect(manager).toContain("quotaState === 'available'")
    expect(manager).toContain('aiAllowed={canGenerate}')
    expect(accountSection).not.toContain('useAiQuota')
    expect(trainingTab).not.toContain('useAiQuota')
  })

  it('uses the Wave 5B access contract for all personal mutations', () => {
    expect(manager).toContain('resolveTrainingProgramAccess({ capabilities, activeProgramContext })')
    expect(manager).toContain('if (access.canConfigure) return false')
    expect(manager.match(/mutationBlocked\(\)/g)?.length).toBeGreaterThanOrEqual(7)
    expect(builder).toContain('if (!canMutate || !aiAllowed)')
    expect(builder).toContain('if (!canMutate || !ceName.trim())')
    expect(builder).toContain('if (!canMutate || !programName.trim()')
  })

  it('keeps the generation endpoint, payload and SSE consumer unchanged', () => {
    expect(builder).toContain("fetch('/api/generate-custom-program'")
    expect(builder).toContain('objective: aiObjective, level: aiLevel, daysPerWeek: aiDays')
    expect(builder).toContain('duration: aiDuration, equipment: aiEquipment, priorities: aiPriorities')
    expect(builder).toContain('notes: aiNotes, gender: userGender')
    expect(builder).toContain('consumeProgramStream(res)')
    expect(builder).not.toMatch(/durationWeeks|mesocycle|deload/)
    expect(api).not.toMatch(/durationWeeks|mesocycle|deload/)
  })

  it('does not report persistence success after a failed save', () => {
    expect(builder).toContain('if (saveError)')
    expect(builder).toMatch(/if \(saveError\)[\s\S]*toast\.error[\s\S]*return/)
    expect(builder.indexOf('if (saveError)')).toBeLessThan(builder.indexOf("toast.success(t('toast.programSaved'))"))
    expect(builder).toMatch(/const \{ data, error \} = await supabase\.from\('custom_exercises'\)\.insert/)
  })

  it('never schedules a newly-created inactive program', () => {
    expect(builder).toContain("insert({ ...payload, is_active: false })")
    expect(builder).toContain('if (editProgram?.id && editProgram.is_active) try')
  })

  it('inserts imports inactive before any activation can disable the old program', () => {
    const insert = manager.indexOf(".insert({ ...importData, user_id: userId, is_active: false, scheduled: false })")
    const activate = manager.indexOf("if (option === 'now') await activateProgram(data.id")
    expect(insert).toBeGreaterThan(-1)
    expect(activate).toBeGreaterThan(insert)
  })

  it('checks activation, scheduling and deletion errors explicitly', () => {
    expect(manager).toContain('if (disableError)')
    expect(manager).toContain('if (activateError)')
    expect(manager).toContain('if (previousActive.length === 1)')
    expect(manager).toContain("toast.error(t('scheduleError'))")
    expect(manager).toContain("toast.error(t('deleteError'))")
  })

  it('refreshes central authority after mutations instead of creating another active authority', () => {
    expect(manager).toContain('activeProgramContext: ActiveTrainingProgramContext')
    expect(manager).toContain('await onRefresh(true)')
    expect(accountSection).toContain('activeProgramContext={activeProgram}')
    expect(manager).not.toMatch(/setActiveProgram|resolveActiveTrainingProgram/)
  })

  it('provides translated manager and error states in every locale', () => {
    for (const locale of ['fr', 'en', 'de']) {
      const messages = JSON.parse(read(`messages/${locale}.json`))
      const management = messages.accountPrograms.training.management
      expect(management.title).toBeTruthy()
      expect(management.listError).toBeTruthy()
      expect(management.relationBlocked).toBeTruthy()
      expect(management.activationError).toBeTruthy()
      expect(management.importError).toBeTruthy()
      expect(messages.training_tab.builder.search.loadError).toBeTruthy()
      expect(messages.training_tab.builder.toast.persistenceError).toBeTruthy()
    }
  })
})
