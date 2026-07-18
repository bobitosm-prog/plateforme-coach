import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (file: string) => readFileSync(resolve(root, file), 'utf8')
const lines = (file: string) => read(file).trimEnd().split('\n').length

const ARCHITECTURE_FILES = [
  'app/components/tabs/TrainingTab.tsx',
  'app/components/tabs/TrainingTabController.tsx',
  'app/components/tabs/TrainingTabView.tsx',
  'app/components/tabs/TrainingTabOverview.tsx',
  'app/components/tabs/training/TrainingTabOverlays.tsx',
  'app/components/tabs/training/TrainingProgramDayEditor.tsx',
  'app/components/tabs/training/TrainingSessionExerciseList.tsx',
  'app/components/tabs/training/useTrainingWorkoutTimer.ts',
  'app/components/tabs/training/useTrainingSessionHistory.ts',
  'app/components/tabs/training/useTrainingProgramEditor.ts',
  'app/components/tabs/training/useTrainingExerciseCatalog.ts',
] as const

describe('TrainingTab facade architecture', () => {
  it('keeps the public facade and every extracted responsibility below 500 lines', () => {
    expect(lines('app/components/tabs/TrainingTab.tsx')).toBeLessThan(500)
    for (const file of ARCHITECTURE_FILES) expect(lines(file), file).toBeLessThan(500)
  })

  it('preserves the public default export and delegates once to the typed controller', () => {
    const facade = read('app/components/tabs/TrainingTab.tsx')
    expect(facade).toContain('export default function TrainingTab(props: TrainingTabProps)')
    expect(facade).toContain('<TrainingTabController {...props} />')
    expect(facade).not.toMatch(/useState|useEffect|\.from\(/)
  })

  it('keeps the major responsibilities in distinct boundaries', () => {
    const controller = read('app/components/tabs/TrainingTabController.tsx')
    expect(controller).toContain('useTrainingWorkoutTimer')
    expect(controller).toContain('useTrainingSessionHistory')
    expect(controller).toContain('useTrainingProgramEditor')
    expect(controller).toContain('useTrainingExerciseCatalog')
    expect(read('app/components/tabs/TrainingTabView.tsx')).toContain('<TrainingTabOverview runtime={runtime} />')
    expect(read('app/components/tabs/TrainingTabView.tsx')).toContain('<TrainingTabOverlays runtime={runtime} />')
  })

  it('does not duplicate the extracted modal, editor or exercise-list render blocks', () => {
    const sources = ARCHITECTURE_FILES.map(read).join('\n')
    expect(sources.match(/<TrainingProgramDayEditor/g)).toHaveLength(1)
    expect(sources.match(/<TrainingSessionExerciseList/g)).toHaveLength(1)
    expect(sources.match(/<TrainingTabOverlays/g)).toHaveLength(1)
  })

  it('introduces no explicit any in the new typed boundaries', () => {
    const typedBoundaries = ARCHITECTURE_FILES
      .filter(file => !file.endsWith('TrainingTabController.tsx'))
      .map(read)
      .join('\n')
    expect(typedBoundaries).not.toMatch(/\bany\b/)
  })

  it('preserves the single legacy exercise catalogue wildcard query without adding another', () => {
    const sources = ARCHITECTURE_FILES.map(read).join('\n')
    expect(sources.match(/\.select\('\*'\)/g) || []).toHaveLength(3)
    expect(read('app/components/tabs/training/useTrainingExerciseCatalog.ts').match(/\.select\('\*'\)/g) || []).toHaveLength(1)
  })
})
