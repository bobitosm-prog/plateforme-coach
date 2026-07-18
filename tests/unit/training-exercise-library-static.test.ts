import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function source(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('Training exercise library integration inventory', () => {
  it('delegates library filtering, alternatives, legacy names, and free-session selection', () => {
    const component = source('app/components/training/ExerciseLibrarySection.tsx')
    expect(component).toContain('searchExerciseLibrary(exercisesCache')
    expect(component).toContain('findExerciseAlternatives(exercisesCache')
    expect(component).toContain('collectProgramExerciseNames(activeCustomProgram.days)')
    expect(component).toContain('resolveFreeSessionExercise(libDetail)')
    expect(component).not.toContain("e.name?.toLowerCase().includes(altSearch.toLowerCase())")
  })

  it('keeps server search in the modal while delegating exact muscle filtering and selection', () => {
    const modal = source('app/components/modals/ExerciseSearchModal.tsx')
    expect(modal).toContain(".ilike('name', `%${exSearch}%`)")
    expect(modal).toContain("muscleMatch: 'exact'")
    expect(modal).toContain('resolveAddedExercise(selectedExDb')
  })

  it('combines catalog then custom exercises and delegates ProgramBuilder filtering', () => {
    const builder = source('app/components/training/ProgramBuilder.tsx')
    expect(builder).toContain('combineExerciseLibraries(catalog, customExercises)')
    expect(builder).toContain("muscleMatch: 'case-insensitive'")
    expect(builder).not.toContain('...customExercises.map(e => ({ ...e, _custom: true }))')
  })

  it('does not add a new Supabase read or mutation to the extracted pure boundary', () => {
    const boundary = source('lib/training/exercise-library.ts')
    expect(boundary).not.toMatch(/\.(?:from|insert|update|delete|upsert)\(/)
    expect(boundary).not.toContain('select(')
  })
})
