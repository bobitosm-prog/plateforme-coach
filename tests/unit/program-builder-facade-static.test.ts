import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const facade = read('app/components/training/ProgramBuilder.tsx')
const views = [
  'ProgramBuilderDayNavigation.tsx', 'ProgramBuilderExerciseEditor.tsx',
  'ProgramBuilderModeViews.tsx', 'ProgramBuilderOverlays.tsx',
].map(file => read(`app/components/training/program-builder/${file}`))

describe('ProgramBuilder reduced facade', () => {
  it('stays below 500 physical lines while preserving its public contract', () => {
    expect(facade.split(/\r?\n/).length - 1).toBeLessThan(500)
    expect(facade).toContain('export default function ProgramBuilder(')
    expect(facade).toContain('export { padTo7Days }')
  })

  it('delegates modes, day/exercise editing, search and variants', () => {
    for (const name of [
      'ProgramBuilderSelectView', 'ProgramBuilderAiView', 'ProgramBuilderManualView',
      'ProgramBuilderCustomExerciseView', 'ProgramBuilderExerciseEditor',
      'ProgramBuilderExerciseSearchOverlay', 'ProgramBuilderVariantOverlay',
    ]) expect(facade).toContain(name)
  })

  it('keeps presentation components free of Supabase and direct persistence', () => {
    for (const source of views) {
      expect(source).not.toMatch(/supabase|\.from\(|\.insert\(|\.update\(|\.delete\(|select\('\*'\)/i)
      expect(source).not.toMatch(/\bany\b/)
    }
  })

  it('keeps exact model and persistence boundaries in the orchestrator', () => {
    for (const operation of [
      'prepareLegacyProgramPayload', 'saveProgramAndSynchronizeCalendar',
      'addProgramExercise', 'removeProgramExercise', 'updateProgramExercise',
      'moveProgramExercise', 'swapProgramDays', 'setProgramDayRest',
    ]) expect(facade).toContain(operation)
    expect(facade).not.toMatch(/\.from\(|select\('\*'\)/)
  })
})
