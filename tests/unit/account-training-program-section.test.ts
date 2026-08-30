import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const account = read('app/components/tabs/AccountTab.tsx')
const page = read('app/(application)/page.tsx')
const section = read('app/components/tabs/profile/TrainingProgramSection.tsx')
const styles = read('app/components/tabs/profile/TrainingProgramSection.module.css')

describe('Account training program section', () => {
  it('adds the Training card while preserving the Nutrition card', () => {
    expect(account).toContain("onNavigate('nutrition_program')")
    expect(account).toContain("onNavigate('training_program')")
    expect(account).toContain("t('nutritionProgram')")
    expect(account).toContain("t('trainingProgram')")
    expect(account).toContain("t('open')")
  })

  it('extends Account internal navigation without creating a URL route', () => {
    expect(page).toContain("h.activeTab === 'training_program'")
    expect(page).toContain('<TrainingProgramSection')
    expect(page).toContain('activeProgram={h.activeTrainingProgram}')
    expect(page).toContain('profileObjective={h.profile?.objective}')
  })

  it('uses the resolved authority context without a second program authority', () => {
    expect(section).toContain('activeProgram: ActiveTrainingProgramContext')
    expect(section).toContain('resolveTrainingProgramAccess({ capabilities, activeProgramContext: activeProgram })')
    expect(section).toContain('resolveTrainingProgramFrequency(activeProgram)')
    expect(section).not.toMatch(/from\(['"](?:custom_programs|client_programs)['"]\)/)
    expect(section).not.toMatch(/createClient|\.from\(|fetch\(/i)
  })

  it('keeps manager, builder and quota behind the configuration interaction', () => {
    expect(section).toContain("dynamic(() => import('../../training/TrainingProgramManager')")
    expect(section).toContain('preparationOpen && access.canConfigure')
    expect(section).not.toMatch(/ProgramBuilder|useAiQuota|generate-program|custom_programs|client_programs/)
    expect(page).not.toMatch(/training_program['"][\s\S]{0,250}ProgramBuilder/)
  })

  it('presents explicit source, profile objective, frequency and distinct states', () => {
    expect(section).toContain("activeProgram.state === 'error'")
    expect(section).toContain("activeProgram.state === 'empty'")
    expect(section).toContain("activeProgram.state === 'partial'")
    expect(section).toContain("activeProgram.source === 'coach'")
    expect(section).toContain("activeProgram.source === 'personal'")
    expect(section).toContain("t('profileObjective')")
    expect(section).toContain("t('frequency')")
    expect(section).toContain("t('statusActive')")
    expect(section).toContain("t('summaryTitlePersonal')")
    expect(section).toContain("t('summaryTitleCoach')")
  })

  it('uses accessible controls and responsive, reduced-motion styles', () => {
    expect(section).toContain('<button')
    expect(section).toContain('aria-expanded=')
    expect(section).toContain('aria-live="polite"')
    expect(styles).toContain('min-height: 44px')
    expect(styles).toContain(':focus-visible')
    expect(styles).toContain('@media (max-width: 430px)')
    expect(styles).toContain('@media (min-width: 768px)')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toContain('width: min(100%, 680px)')
    expect(styles).toContain('max-width: 13ch')
    expect(styles).toContain('font-size: clamp(1.75rem, 9vw, 2.25rem)')
  })

  it('replaces the preparatory placeholder with the shared real manager', () => {
    expect(section).toContain('<TrainingProgramManager')
    expect(section).toContain('activeProgramContext={activeProgram}')
    expect(section).toContain('onRefresh={onRefresh}')
  })

  it('provides every Training Account message in French, English and German', () => {
    for (const locale of ['fr', 'en', 'de']) {
      const messages = JSON.parse(read(`messages/${locale}.json`))
      expect(messages.account.trainingProgram).toBeTruthy()
      expect(messages.account.trainingProgramDescription).toBeTruthy()
      expect(messages.account.open).toBeTruthy()
      expect(messages.accountPrograms.training.statusActive).toBeTruthy()
      expect(messages.accountPrograms.training.statusEmpty).toBeTruthy()
      expect(messages.accountPrograms.training.summaryTitleCoach).toBeTruthy()
      expect(messages.accountPrograms.training.summaryTitlePersonal).toBeTruthy()
      expect(messages.accountPrograms.training.sourcePersonal).toBeTruthy()
      expect(messages.accountPrograms.training.objectiveUndefined).toBeTruthy()
      expect(messages.accountPrograms.training.frequencyUnavailable).toBeTruthy()
      expect(messages.accountPrograms.training.relationUncertain).toBeTruthy()
      expect(messages.accountPrograms.training.statusActive).not.toBe(messages.accountPrograms.training.sourcePersonal)
    }
  })
})
