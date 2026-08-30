import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const account = readFileSync('app/components/tabs/AccountTab.tsx', 'utf8')
const program = readFileSync('app/components/tabs/profile/NutritionProgramSection.tsx', 'utf8')
const access = readFileSync('lib/nutrition/nutrition-program-access.ts', 'utf8')
const programStyles = readFileSync('app/components/tabs/profile/NutritionProgramSection.module.css', 'utf8')
const nutrition = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')
const preferences = readFileSync('app/components/NutritionPreferences.tsx', 'utf8')
const page = readFileSync('app/(application)/page.tsx', 'utf8')
const tabs = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')
const generationContract = readFileSync('lib/nutrition/nutrition-plan-generation.ts', 'utf8')
const generationRoute = readFileSync('app/api/generate-meal-plan/route.ts', 'utf8')
const messages = readFileSync('messages/fr.json', 'utf8')

describe('Account nutrition program architecture', () => {
  it('adds a compact Programs entry and a dedicated Nutrition program sub-screen', () => {
    expect(account).toContain("t('programs')")
    expect(account).toContain("onNavigate('nutrition_program')")
    expect(account).toContain("t('nutritionProgram')")
    expect(tabs).toContain("'nutrition_program'")
    expect(page).toContain("h.activeTab === 'nutrition_program'")
    expect(page).toContain('<NutritionProgramSection')
  })

  it('keeps the heavy preference form lazy until configuration is opened', () => {
    expect(program).toContain("dynamic(() => import('../../NutritionPreferences')")
    expect(program).toContain('settingsOpen && <NutritionPlanConfiguration')
    expect(program).toContain('aria-expanded={settingsOpen}')
    expect(program).toContain('aria-controls="nutrition-program-configuration"')
  })

  it('shows one explicit plan status, source and objective summary', () => {
    expect(program).toContain("resolveActiveNutritionPlan({")
    expect(program).toContain("activePlan.source === 'coach'")
    expect(program).toContain("activePlan.source === 'personal'")
    expect(program).toContain("t('objective')")
    expect(messages).toContain('"coachSource": "Coach"')
    expect(messages).toContain('"personalSource": "Personnel"')
  })
})

describe('Nutrition generation relocation', () => {
  it('removes preferences and generation entry points from Nutrition', () => {
    expect(nutrition).not.toContain("id: 'prefs' as SubTab")
    expect(nutrition).not.toContain("subTab === 'prefs'")
    expect(nutrition).not.toContain("import NutritionPreferences")
    expect(nutrition).not.toContain('generate-meal-plan')
  })

  it('routes the empty-plan action directly to Account Programs', () => {
    expect(nutrition).toContain('onConfigurePlan={capabilities.nutrition ? onOpenProgramSettings : undefined}')
    expect(page).toContain("onOpenProgramSettings={() => navigateTo('nutrition_program')}")
    expect(messages).toContain('"configure": "Configurer mon programme"')
  })

  it('reuses the exact API and seven-day payload flow without a multi-week control', () => {
    expect(preferences).toContain("fetch('/api/generate-meal-plan'")
    for (const field of [
      'calorie_goal',
      'protein_goal',
      'carbs_goal',
      'fat_goal',
      'dietary_type',
      'allergies',
      'disliked_foods',
      'objective_mode',
      'caloric_adjustment',
      'activity_level',
      'meal_food_names',
    ]) expect(preferences).toContain(field)
    expect(preferences).toContain("parsed.index}/7")
    expect(program).not.toContain('durationWeeks')
    expect(generationContract).toContain('durationWeeks: NutritionPlanDurationWeeks')
    expect(generationRoute).toContain("const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']")
  })
})

describe('Plan authority and safety', () => {
  it('loads only the two plan sources when the dedicated Account screen mounts', () => {
    expect(program.match(/\.from\('meal_plans'\)/g)).toHaveLength(1)
    expect(program.match(/\.from\('client_meal_plans'\)/g)).toHaveLength(1)
    expect(program).not.toMatch(/daily_food_logs|meal_tracking|water_intake/)
    expect(account).not.toMatch(/meal_plans|client_meal_plans/)
  })

  it('accepts a coach plan only for the active relation and matching coach', () => {
    expect(program).toContain("coachRelationStatus === 'active' && coachId")
    expect(program).toContain(".eq('coach_id', coachId)")
    expect(program).toContain("const coachPlanActive = activePlan.source === 'coach'")
    expect(access).toContain("if (coachPlanActive) generationBlockReason = 'coach_plan'")
    expect(messages).toContain('"coachPlanNotice": "Votre plan alimentaire est actuellement fourni par votre coach."')
  })

  it('fails closed for uncertain relation, denied AI capability and exhausted quota', () => {
    expect(access).toContain("coachRelationStatus === 'error'")
    expect(access).toContain("coachRelationStatus === 'multiple_active'")
    expect(access).toContain('!capabilities.nutrition || !capabilities.ai')
    expect(access).toContain('quota.remaining <= 0')
    expect(access).toContain('quota.error')
    expect(preferences).toContain('if (generationEnabled) setShowRegenCard(true)')
  })

  it('requires an explicit confirmation before generation or regeneration', () => {
    expect(preferences).toContain('showRegenCard &&')
    expect(preferences).toContain("t(hasPersonalPlan ? 'save.regenPrompt' : 'save.generatePrompt')")
    expect(preferences).toContain('onClick={regeneratePlan}')
    expect(preferences).not.toContain('durationWeeks')
  })
})

describe('Accessibility, responsive layout and domain isolation', () => {
  it('provides keyboard focus, minimum targets, compact breakpoints and reduced motion', () => {
    expect(programStyles).toContain('min-height: 44px')
    expect(programStyles).toContain(':focus-visible')
    expect(programStyles).toContain('@media (max-width: 430px)')
    expect(programStyles).toContain('@media (min-width: 768px)')
    expect(programStyles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(program).toContain('role="status"')
  })

  it('does not move Training generation or add backend, SQL or direct visual database access', () => {
    expect(program).not.toMatch(/generate-custom-program|training_program|workout/)
    expect(program).not.toMatch(/api\/generate-meal-plan/)
    expect(program).not.toMatch(/\.insert\(|\.update\(|\.delete\(/)
    expect(page).not.toContain('NutritionPlanDurationWeeks')
  })
})
