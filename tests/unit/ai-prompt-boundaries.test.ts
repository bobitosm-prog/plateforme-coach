import { describe, expect, it } from 'vitest'
import {
  buildAdaptWorkoutInvocation,
  buildAthenaInvocation,
  buildBodyAnalysisInvocation,
  buildExerciseInstructionsInvocation,
  buildExerciseSwapInvocation,
  buildMealPhotoInvocation,
  buildLegacyCoachProgramInvocation,
  buildOverloadInvocation,
  buildRecipeInvocation,
  buildSequentialMealDayInvocation,
  buildTrainingProgramInvocation,
  buildWeeklyDiagnosticInvocation,
  buildProgressPhotoAssessmentInvocation,
  buildProgressPhotoInvocation,
} from '../../lib/ai/prompts'

describe('AI prompt boundaries', () => {
  it('preserves Athena profile, history, accents and invocation parameters', () => {
    const history = [{ role: 'assistant' as const, content: 'Historique\nmultiligne' }]
    const invocation = buildAthenaInvocation({ full_name: 'Élodie', current_weight: 62, onboarding_answers: { experience: 'avancée' } }, history, 'Ça va ?')
    expect(invocation).toMatchObject({ model: 'claude-sonnet-4-6', max_tokens: 1024 })
    expect(invocation.system).toContain('- Nom : Élodie\n- Poids : 62kg')
    expect(invocation.messages).toEqual([...history, { role: 'user', content: 'Ça va ?' }])
    expect(Object.isFrozen(invocation)).toBe(true)
    expect(Object.isFrozen(history[0])).toBe(false)
    expect(history).toEqual([{ role: 'assistant', content: 'Historique\nmultiligne' }])
  })

  it('preserves recipe defaults, lists and exact model parameters', () => {
    const input = Object.freeze({ includeIngredients: Object.freeze(['œufs', 'riz']), excludeIngredients: Object.freeze(['lait']) })
    const invocation = buildRecipeInvocation(input)
    expect(invocation).toMatchObject({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500 })
    expect(invocation.system).toContain('5. INCLURE : œufs, riz\n6. ÉVITER : lait')
    expect(invocation.messages[0].content).toBe('Génère une recette dejeuner fitness. Avec : œufs, riz')
    expect(input.includeIngredients).toEqual(['œufs', 'riz'])
  })

  it('preserves meal image encoding and multimodal block order', () => {
    const invocation = buildMealPhotoInvocation('base64-synthétique')
    expect(invocation).toMatchObject({ model: 'claude-sonnet-4-6', max_tokens: 1000 })
    expect(invocation.messages[0].content).toMatchObject([
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'base64-synthétique' } },
      { type: 'text' },
    ])
  })

  it('preserves exercise alternative isolation hints and empty values', () => {
    const isolation = buildExerciseSwapInvocation({ exerciseName: 'Curl incliné', isIsolation: true })
    expect(isolation).toMatchObject({ model: 'claude-haiku-4-5-20251001', max_tokens: 500 })
    expect(isolation.messages[0].content).toContain('exercice d\'ISOLATION')
    expect(isolation.messages[0].content).toContain('Raison : non specifiee\n\nIMPORTANT')
  })

  it('preserves adaptation exercise order and JSON representation', () => {
    const exercises = Object.freeze([{ name: 'Squat', sets: 4, reps: 8 }, { exercise_name: 'Curl', sets: 3, reps: '12' }])
    const invocation = buildAdaptWorkoutInvocation({ exercises, availableMinutes: 30 })
    expect(invocation).toMatchObject({ model: 'claude-sonnet-4-6', max_tokens: 800 })
    expect(invocation.messages[0].content).toContain('Programme complet prévu : [{"name":"Squat","sets":4,"reps":8},{"name":"Curl","sets":3,"reps":"12"}]')
    expect(exercises[0].name).toBe('Squat')
  })

  it('preserves exercise instruction and overload contracts', () => {
    const instructions = buildExerciseInstructionsInvocation({ name: 'Développé couché', muscleGroup: null, equipment: 'barre' })
    expect(instructions).toMatchObject({ model: 'claude-haiku-4-5-20251001', max_tokens: 500 })
    expect(instructions.messages[0].content).toContain('(groupe: ?, équipement: barre)')
    const overload = buildOverloadInvocation({ exerciseName: 'Squat', currentWeight: 100, currentReps: 5, setsCompleted: 4, historyLines: '2026-07-20 : 4x5@100kg (4/4 réussies)' })
    expect(overload).toMatchObject({ model: 'claude-haiku-4-5-20251001', max_tokens: 300, temperature: 0.3 })
    expect(overload.messages[0].content).toContain('récent → ancien')
  })

  it('preserves body analysis image order, media types and tool contract', () => {
    const invocation = buildBodyAnalysisInvocation({
      front: { base64: 'front', mediaType: 'image/jpeg' }, back: { base64: 'back', mediaType: 'image/png' }, side: { base64: 'side', mediaType: 'image/webp' }, weight: 70, height: 175,
    })
    expect(invocation).toMatchObject({ model: 'claude-opus-4-8', max_tokens: 1024, tool_choice: { type: 'tool', name: 'body_analysis_output' } })
    expect(invocation.tools?.[0]).toMatchObject({ name: 'body_analysis_output', input_schema: { required: ['body_fat_estimate', 'lean_mass_estimate', 'strengths', 'improvements', 'symmetry_score', 'summary'] } })
    expect(invocation.messages[0].content).toMatchObject([
      { type: 'image', source: { media_type: 'image/jpeg', data: 'front' } },
      { type: 'image', source: { media_type: 'image/png', data: 'back' } },
      { type: 'image', source: { media_type: 'image/webp', data: 'side' } },
      { type: 'text', text: expect.stringContaining('poids 70 kg, taille 175 cm') },
    ])
  })

  it('preserves the separate legacy coach program vocabulary and output shape', () => {
    const invocation = buildLegacyCoachProgramInvocation({ objective: 'prise de masse', weight: 80, targetWeight: 85, level: 'avancé', equipment: ['barre', 'haltères'], days: 4, splitGuide: 'SPLIT\nA → B', prefatigueInstructions: 'PRÉFATIGUE\nExacte' })
    expect(invocation).toMatchObject({ model: 'claude-haiku-4-5-20251001', max_tokens: 3000 })
    expect(invocation.system).toBeUndefined()
    expect(invocation.messages).toHaveLength(1)
    expect(invocation.messages[0].content).toContain('PRÉFATIGUE\nExacte\n\nClient: objectif=prise de masse, poids=80kg, cible=85kg, niveau=avancé, equipement=barre,haltères, 4 jours/semaine')
    expect(invocation.messages[0].content).toContain('SPLIT RECOMMANDE :\nSPLIT\nA → B')
    expect(invocation.messages[0].content).toContain('Génère exactement 4 jours d\'entraînement et 3 jours de repos')
  })

  it('preserves sequential Nutrition day context and provider contract', () => {
    const params = { calorie_goal: 2400, protein_goal: 160, carbs_goal: 260, fat_goal: 70, objective_mode: 'bulk', caloric_adjustment: 250, allergies: ['œuf'], available_foods: [{ nom: 'Riz cuit', kcal: 130, p: 3, g: 28, l: 0 }], meal_food_names: { morning: ['Skyr'] }, scanned_foods: [{ name: 'Banane' }] }
    const invocation = buildSequentialMealDayInvocation('mardi', params, ['Poulet'])
    expect(invocation).toMatchObject({ maxTokens: 1500 })
    expect(invocation).not.toHaveProperty('model')
    expect(invocation.user).toContain('Génère le plan pour MARDI.\n\nRappel objectif : BULK')
    expect(invocation.user).toContain('Protéines déjà utilisées les jours précédents (VARIE !) : Poulet')
    expect(invocation.user).toContain('Aliments prioritaires du client : Banane')
    expect(invocation.system).toContain('OBJECTIF CALORIQUE DU CLIENT : 2400 KCAL/JOUR')
  })

  it('uses one exact Training contract for route and cron callers', () => {
    const input = { objective: 'force', level: 'intermediaire', daysPerWeek: 3, duration: 60, equipment: 'salle', priorities: ['dos'], notes: 'Multiligne\nexact', gender: 'male' }
    const catalog = [{ id: 'ex-1', name: 'Développé couché' }]
    const routeInvocation = buildTrainingProgramInvocation(input, catalog)
    const cronInvocation = buildTrainingProgramInvocation(input, catalog)
    expect(routeInvocation).toEqual(cronInvocation)
    expect(routeInvocation).toMatchObject({ model: 'claude-opus-4-8', max_tokens: 8000, tool_choice: { type: 'tool', name: 'generate_program' } })
    expect(routeInvocation.system).toContain('RÉFÉRENTIEL D\'EXERCICES (1 exercices)')
    expect(routeInvocation.system).toContain('Notes supplementaires : Multiligne\nexact')
    expect(routeInvocation.messages[0].content).toContain('Exactement 3 jours')
  })

  it('uses one exact weekly diagnostic contract for manual and cron triggers', () => {
    const input = { profile: { objective: 'perdre', tdee: 2200, calorie_goal: 1900, protein_goal: 140, fitness_level: 'intermédiaire', fitness_score: 70, current_weight: 75 }, sessionsPlanned: 4, sessionsDone: 3, adherencePct: 75, trainingVolumeTotal: 12345, calorieAvgReal: 1850, calorieAvgTarget: 1900, proteinAvgG: 130, proteinCompliancePct: 92.5, daysLogged: 6, weightDeltaKg: -0.4, coherenceFlags: ['Donnée synthétique'], previousDiagnostic: { score_semaine: 68, applied_changes: true, objectif_semaine_prochaine: '4 séances' } }
    const manual = buildWeeklyDiagnosticInvocation(input)
    const cron = buildWeeklyDiagnosticInvocation(input)
    expect(manual).toEqual(cron)
    expect(manual).toMatchObject({ model: 'claude-opus-4-8', max_tokens: 2048, tool_choice: { type: 'tool', name: 'weekly_diagnostic_output' } })
    expect(manual.messages[0].content).toContain('Adhérence: 75%\nVolume total (tonnage): 12345 kg')
    expect(manual.messages[0].content).toContain('<coherence_flags>\nDonnée synthétique\n</coherence_flags>')
    expect(manual.messages[0].content).toContain('Score S-1: 68')
  })

  it('preserves both progress-photo multimodal branches and image order', () => {
    const profileData = { full_name: 'Élodie', gender: 'femme', current_weight: 60, height: 165, objective: 'cut', fitness_score: 80 }
    const assessment = buildProgressPhotoAssessmentInvocation({ profileData, frontImg: { base64: 'front', mediaType: 'image/jpeg' }, backImg: { base64: 'back', mediaType: 'image/png' }, sideImg: { base64: 'side', mediaType: 'image/webp' } })
    expect(assessment).toMatchObject({ model: 'claude-opus-4-8', max_tokens: 2048 })
    expect(assessment.messages[0].content).toMatchObject([{ source: { data: 'front' } }, { source: { data: 'back' } }, { source: { data: 'side' } }, { type: 'text' }])
    const comparison = buildProgressPhotoInvocation({ profileData, mainImage: { base64: 'after', mediaType: 'image/jpeg' }, previousImage: { base64: 'before', mediaType: 'image/png' } })
    expect(comparison).toMatchObject({ model: 'claude-opus-4-8', max_tokens: 1024 })
    expect(comparison.messages[0].content).toMatchObject([{ source: { data: 'before' } }, { source: { data: 'after' } }, { text: expect.stringContaining('Compare ces deux photos de progression (avant → après)') }])
    const single = buildProgressPhotoInvocation({ profileData, mainImage: { base64: 'only', mediaType: 'image/jpeg' } })
    expect(single.messages[0].content).toMatchObject([{ source: { data: 'only' } }, { text: expect.stringContaining('Analyse cette photo de progression') }])
  })
})
