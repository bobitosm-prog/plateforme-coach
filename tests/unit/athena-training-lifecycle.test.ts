import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const cron = readFileSync('app/api/training-regen/cron/route.ts', 'utf8')
const initial = readFileSync('app/hooks/useInitialGeneration.ts', 'utf8')
const weekly = readFileSync('app/(application)/weekly-diagnostic/[id]/WeeklyDiagnosticDetailContent.tsx', 'utf8')
const replacement = readFileSync('lib/training/replace-personal-program.ts', 'utf8')

describe('Athena training lifecycle', () => {
  it('never replaces a program only because fourteen days elapsed', () => {
    expect(cron).not.toContain(".lte('next_program_regen_at'")
    expect(cron).not.toMatch(/stagnation/i)
    expect(cron).toContain(".not('onboarding_answers->plan_regeneration_request', 'is', null)")
    expect(cron).toContain('readPlanRegenerationRequest(profile.onboarding_answers)')
    expect(initial).toContain('next_program_regen_at: null')
    expect(weekly).toContain('next_program_regen_at: null')
  })

  it('uses profile and onboarding context for explicit objective replacement', () => {
    expect(cron).toContain('buildAthenaClientContext(profile)')
    expect(cron).toContain('clientContext }, apiKey, catalog)')
    expect(cron).toContain('clearPlanRegenerationRequest(profile.onboarding_answers)')
  })

  it('shares one insert-first replacement policy across training flows', () => {
    expect(initial).toContain('replacePersonalTrainingProgram(supabase, userId')
    expect(weekly).toContain('replacePersonalTrainingProgram(supabase, userId')
    expect(cron).toContain('replacePersonalTrainingProgram(supabaseAdmin, profile.id')
    expect(replacement.indexOf('.insert(')).toBeLessThan(replacement.indexOf('.update({ is_active: false })'))
    expect(replacement).toContain("stage: rollbackError ? 'rollback' : 'deactivate'")
  })

  it('does not return provider errors or secrets from the cron', () => {
    expect(cron).not.toContain('error: e.message')
    expect(cron).not.toContain('details.push({ user_id: profile.id, status: \'error\', error:')
  })
})
