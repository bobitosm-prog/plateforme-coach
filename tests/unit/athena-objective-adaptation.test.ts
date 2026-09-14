import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import {
  buildObjectiveTransitionAnswers,
  clearPlanRegenerationRequest,
  readPlanRegenerationRequest,
} from '@/lib/athena/objective-transition'
import { loadAthenaGenerationContext } from '@/lib/athena/generation-context'
import { buildProgramParams } from '@/lib/training/build-program-params'
import type { Profile } from '@/lib/profile-service'

describe('Athena objective adaptation', () => {
  it('synchronizes a mass objective with onboarding and requests plan replacement', () => {
    const requestedAt = '2026-09-13T08:00:00.000Z'
    const answers = buildObjectiveTransitionAnswers({
      primary_goal_id: 'lose_weight',
      experience_level: 'Intermediaire 6m-2ans',
    }, 'mass', requestedAt)

    expect(answers).toMatchObject({
      athena_contract_version: 1,
      primary_goal_id: 'gain_muscle',
      experience_level: 'Intermediaire 6m-2ans',
      plan_regeneration_request: {
        version: 1,
        reason: 'objective_change',
        objective: 'mass',
        requested_at: requestedAt,
      },
    })
    expect(readPlanRegenerationRequest(answers)?.objective).toBe('mass')
    expect(clearPlanRegenerationRequest(answers)).not.toHaveProperty('plan_regeneration_request')
  })

  it('updates goal semantics without replacing coach-managed plans', () => {
    const answers = buildObjectiveTransitionAnswers(
      { primary_goal_id: 'lose_weight', plan_regeneration_request: { stale: true } },
      'mass',
      '2026-09-13T08:00:00.000Z',
      false,
    )
    expect(answers.primary_goal_id).toBe('gain_muscle')
    expect(answers).not.toHaveProperty('plan_regeneration_request')
  })

  it('builds training defaults from the current objective and onboarding answers', () => {
    const params = buildProgramParams({
      id: 'client',
      objective: 'mass',
      gender: 'female',
      training_location: 'home',
      home_equipment: ['dumbbell', 'band'],
      onboarding_answers: {
        experience_level: 'Débutant <6m',
        sessions_per_week: 5,
        session_duration_minutes: 45,
        training_priorities: ['back', 'glutes'],
      },
    } as Profile)

    expect(params).toMatchObject({
      objective: 'prise de muscle',
      level: 'debutant',
      daysPerWeek: 5,
      duration: 45,
      priorities: ['back', 'glutes'],
      gender: 'female',
    })
    expect(params.equipment).toContain('haltères')
    expect(params.equipment).toContain('bandes élastiques')
  })

  it('loads profile and onboarding server-side for both generation prompts', async () => {
    const single = vi.fn(async () => ({
      data: {
        objective: 'mass',
        onboarding_answers: { primary_goal_id: 'gain_muscle', sessions_per_week: 4 },
      },
      error: null,
    }))
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single })),
        })),
      })),
    }

    const result = await loadAthenaGenerationContext(supabase as never, 'client')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.prompt).toContain('profile_and_onboarding')
      expect(result.prompt).toContain('gain_muscle')
    }
    expect(single).toHaveBeenCalledOnce()

    for (const route of ['app/api/generate-custom-program/route.ts', 'app/api/generate-meal-plan/route.ts']) {
      expect(readFileSync(route, 'utf8')).toContain('loadAthenaGenerationContext(supabaseAuth, userId)')
    }
  })

  it('connects the profile objective flow and account generators to the adaptation contract', () => {
    const modal = readFileSync('app/components/modals/ObjectiveModal.tsx', 'utf8')
    const page = readFileSync('app/(application)/page.tsx', 'utf8')
    const builder = readFileSync('app/components/training/ProgramBuilder.tsx', 'utf8')
    const nutrition = readFileSync('app/components/NutritionPreferences.tsx', 'utf8')
    const generationHook = readFileSync('app/hooks/useInitialGeneration.ts', 'utf8')

    expect(modal).toContain('buildObjectiveTransitionAnswers(')
    expect(modal).toContain('calculateAutomaticCalorieMacroTargets({')
    expect(modal).not.toContain('tdee - 500')
    expect(modal).toContain('needs_initial_generation: true')
    expect(modal).toContain('current_weight: parseFloat(weight)')
    expect(modal).toContain('tdee: newMacros.tdee')
    expect(page).toContain('planRegenerationEnabled={objectivePlanRegenerationEnabled}')
    expect(builder).toContain('profileProgramParams ?')
    expect(builder).toContain("aiEquipment === '__profile__'")
    expect(nutrition).toContain('buildMealPlanParams(generationProfile)')
    expect(nutrition).toContain('DEFAULT_CALORIE_ADJUSTMENTS')
    expect(nutrition).toContain('buildObjectiveTransitionAnswers(')
    expect(generationHook).toContain("if (next.finalization === 'ready') void onCompletedRef.current?.()")

    for (const locale of ['fr', 'en', 'de']) {
      const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'))
      expect(messages.objectiveModal.disclaimerManaged).toBeTruthy()
      expect(messages.objectiveModal.saveError).toBeTruthy()
      expect(messages.training_tab.builder.config.eqProfile).toBeTruthy()
      expect(messages.training_tab.builder.config.objMaintain).toBeTruthy()
    }
  })
})
