import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

const EXTRACTED_MODAL_FILES = [
  'TrainingTimerAlertModal.tsx',
  'TrainingProgramManagerModal.tsx',
  'TrainingImportPreviewModal.tsx',
  'TrainingVariantModal.tsx',
  'TrainingWorkoutHistoryModal.tsx',
] as const

describe('TrainingTab modal extraction inventory', () => {
  it('keeps every extracted modal free of Supabase and business mutations', () => {
    for (const file of EXTRACTED_MODAL_FILES) {
      const source = read(`../../app/components/tabs/training/modals/${file}`)
      expect(source, file).not.toMatch(/\.from\(|\.insert\(|\.update\(|\.delete\(|createClient|createBrowserClient/)
      expect(source, file).not.toMatch(/@\/lib\/repositories|@\/app\/api/)
    }
  })

  it('mounts extracted views only under their existing opening conditions', () => {
    const tab = read('../../app/components/tabs/TrainingTab.tsx')
    expect(tab).toContain('{showTimerAlert && (')
    expect(tab).toContain('{showProgramManager && (')
    expect(tab).toContain('{importPreview && (')
    expect(tab).toContain('{variantPopup && (')
    expect(tab).toContain('{selectedWorkout && (')
    for (const component of EXTRACTED_MODAL_FILES.map(file => file.replace('.tsx', ''))) {
      expect(tab).toContain(`<${component}`)
    }
  })

  it('preserves already dedicated modal contracts and optional user gates', () => {
    const tab = read('../../app/components/tabs/TrainingTab.tsx')
    for (const component of [
      'ExerciseSearchModal', 'ExerciseDetailModal', 'VideoFeedbackModal', 'ProgramBuilder',
      'AddExercisePopup', 'SaveChoicePopup', 'ExerciseInfoPopup', 'TechniqueTooltip',
      'StartProgramModal', 'SessionDoneModal', 'SessionDetailModal',
    ]) expect(tab).toContain(`<${component}`)
    expect(tab).toContain('videoExercise && session?.user?.id')
    expect(tab).toContain('session?.user?.id && (')
  })

  it('closes incompatible source modals before opening their successors', () => {
    const tab = read('../../app/components/tabs/TrainingTab.tsx')
    expect(tab).toMatch(/setShowProgramBuilder\(true\); setShowProgramManager\(false\)/)
    expect(tab).toMatch(/setStartModalProgram\([^;]+\)\s+setImportPreview\(null\)/)
    expect(tab).toContain('setStartModalImportData(null)')
  })

  it('keeps context-owning state and Supabase operations in TrainingTab', () => {
    const tab = read('../../app/components/tabs/TrainingTab.tsx')
    expect(tab).toContain('const [trainingDay, setTrainingDay]')
    expect(tab).toContain('const [workoutStarted, setWorkoutStarted]')
    expect(tab).toContain('const [activeCustomProgram, setActiveCustomProgram]')
    expect(tab).toMatch(/supabase\s*\.from\('workout_sets'\)/)
    expect(tab).toContain('parseProgramFromXlsx(file)')
  })
})
