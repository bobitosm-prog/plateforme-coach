import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const builder = source('app/components/training/ProgramBuilder.tsx')
const views = source('app/components/training/program-builder/ProgramBuilderOverlays.tsx')
const dayNavigation = source('app/components/training/program-builder/ProgramBuilderDayNavigation.tsx')
const service = source('lib/training/program-builder-persistence/service.ts')
const adapter = source('lib/training/program-builder-persistence/supabase-port.ts')

describe('ProgramBuilder persistence and view boundaries', () => {
  it('keeps all Supabase table access in the injected adapter', () => {
    expect(builder).not.toMatch(/\.from\(['"](?:exercises_db|custom_exercises|profiles|custom_programs|scheduled_sessions)/)
    for (const table of ['exercises_db', 'custom_exercises', 'profiles', 'custom_programs', 'scheduled_sessions']) expect(adapter).toContain(`from('${table}')`)
    expect(service).not.toMatch(/supabase|\.from\(/i)
  })

  it('keeps extracted presentation free of Supabase and persistence side effects', () => {
    expect(views).not.toMatch(/supabase|localStorage|\.from\(|\.insert\(|\.update\(|\.delete\(/i)
    expect(views).toContain('ProgramBuilderExerciseSearchOverlay')
    expect(views).toContain('ProgramBuilderVariantOverlay')
    expect(dayNavigation).not.toMatch(/supabase|localStorage|\.from\(|\.insert\(|\.update\(|\.delete\(/i)
    expect(dayNavigation).toContain('ProgramBuilderDayNavigation')
  })

  it('delegates loading, saving, variants and overlays from the public builder', () => {
    for (const contract of ['loadProgramBuilderData', 'createProgramBuilderCustomExercise', 'saveProgramAndSynchronizeCalendar', 'loadProgramExerciseVariants', 'ProgramBuilderExerciseEditor', 'ProgramBuilderExerciseSearchOverlay', 'ProgramBuilderVariantOverlay']) expect(builder).toContain(contract)
    expect(builder).toContain('export default function ProgramBuilder(')
    expect(builder).toContain('export { padTo7Days }')
  })

  it('does not duplicate calendar construction or overlay markup in the builder', () => {
    expect(builder).not.toContain("scheduled_time: '08:00'")
    expect(builder).not.toContain('EXERCISE SEARCH — FULLSCREEN')
    expect(builder).not.toContain('VARIANT POPUP')
  })
})
