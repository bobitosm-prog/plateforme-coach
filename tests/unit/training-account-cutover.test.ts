import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const training = read('app/components/tabs/TrainingTab.tsx')
const noSession = read('app/components/training-v2/NoActiveSession.tsx')
const application = read('app/(application)/page.tsx')
const accountSection = read('app/components/tabs/profile/TrainingProgramSection.tsx')
const manager = read('app/components/training/TrainingProgramManager.tsx')
const workout = read('app/components/WorkoutSession.tsx')
const initialGeneration = read('app/hooks/useInitialGeneration.ts')

describe('Training to Account program-management cutover', () => {
  it('removes every durable program-management entry from Training', () => {
    expect(training).not.toMatch(/TrainingProgramManager|ProgramBuilder|program-excel|useAiQuota|capabilities/)
    expect(training).not.toMatch(/showProgramManager|setShowProgramManager/)
    expect(training).not.toMatch(/activateProgram|deleteProgram|importProgram|exportProgram/)
    expect(training).not.toMatch(/from\(['"]custom_programs['"]\)/)
  })

  it('routes active, coach, personal and empty states to the Account sub-screen', () => {
    expect(training).toContain('onOpenProgramSettings={onOpenProgramSettings}')
    expect(application).toContain("onOpenProgramSettings={() => h.setActiveTab('training_program')}")
    expect(noSession).toContain("programSource === 'personal'")
    expect(noSession).toContain("t('manageInAccount')")
    expect(noSession).toContain("programSource === 'coach'")
    expect(noSession).toContain("t('viewInAccount')")
    expect(noSession).toContain("t('configureProgram')")
    expect(noSession).toContain('onClick={onOpenProgramSettings}')
  })

  it('does not turn authority errors into a configure-program state', () => {
    expect(noSession).toContain("programState === 'loading' || programState === 'error'")
    expect(noSession).toContain("? t('viewInAccount')")
    expect(noSession).toContain("programState === 'error'")
    expect(noSession).toContain("t('programError')")
  })

  it('keeps the shared manager and ProgramBuilder available only through Account', () => {
    expect(accountSection).toContain("dynamic(() => import('../../training/TrainingProgramManager')")
    expect(accountSection).toContain('<TrainingProgramManager')
    expect(manager).toContain("dynamic(() => import('./ProgramBuilder')")
    expect(accountSection).toContain("onBack")
    expect(application).toContain("onBack={() => h.setActiveTab('compte')}")
  })

  it('preserves session-only workout modifications', () => {
    expect(workout).toContain('replacementSessionOnly')
    expect(workout).toContain('setSessionModified(true)')
    expect(workout).toContain("t('endModal.sessionOnly')")
    expect(workout).not.toMatch(/from\('custom_programs'\)[\s\S]{0,160}update\(/)
  })

  it('keeps onboarding generation navigation unchanged', () => {
    expect(initialGeneration).toContain("if (!profile.needs_initial_generation) return")
    expect(initialGeneration).toContain('needs_initial_generation: false')
    expect(initialGeneration).not.toMatch(/router\.(push|replace)|window\.location|<ProgramBuilder/)
  })

  it('adds no new read or data authority to Training', () => {
    expect(training).not.toMatch(/custom_programs|client_programs|useAiQuota|generate-custom-program/)
    expect(noSession).not.toMatch(/supabase|createBrowserClient|\.from\(|\.rpc\(|fetch\(/i)
  })
})
