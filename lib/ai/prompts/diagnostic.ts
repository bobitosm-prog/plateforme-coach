import { immutableInvocation, type AiPromptInvocation } from './types'

export interface WeeklyDiagnosticPromptInput {
  profile: { objective?: string | null; tdee?: number | null; calorie_goal?: number | null; protein_goal?: number | null; fitness_level?: string | null; fitness_score?: number | null; current_weight?: number | null }
  sessionsPlanned: number; sessionsDone: number; adherencePct: number; trainingVolumeTotal: number
  calorieAvgReal: number; calorieAvgTarget: number; proteinAvgG: number; proteinCompliancePct: number
  daysLogged: number; weightDeltaKg: number; coherenceFlags: readonly string[]
  previousDiagnostic?: { score_semaine?: number | null; applied_changes?: boolean | null; objectif_semaine_prochaine?: string | null } | null
}

export function buildWeeklyDiagnosticInvocation(input: WeeklyDiagnosticPromptInput): AiPromptInvocation {
  const { profile, sessionsPlanned, sessionsDone, adherencePct, trainingVolumeTotal, calorieAvgReal, calorieAvgTarget, proteinAvgG, proteinCompliancePct, daysLogged, weightDeltaKg, coherenceFlags } = input
  const prevDiagRes = { data: input.previousDiagnostic }
    const systemPrompt = `Tu es le coach IA personnel de l'utilisateur MoovX.
Tu analyses sa semaine d'entrainement et de nutrition pour produire un diagnostic hebdomadaire actionnable.

<expertise>
- 20 ans d'expérience en musculation, powerlifting, nutrition sportive
- Connaissance principes scientifiques modernes (progressive overload, périodisation, distribution macros)
- Approche pragmatique : ce qui marche en pratique, pas juste en théorie
</expertise>

<regles_absolues>
1. Tu te bases UNIQUEMENT sur les données fournies — pas d'invention
2. Si une donnée manque, dis-le explicitement dans raisonnement
3. Tes ajustements doivent être CHIFFRÉS et ACTIONNABLES (pas "mange mieux")
4. Tu compares à la semaine précédente si elle existe
5. Score 0-100 calibré : 100 = perfection inhumaine, 80 = excellent, 60 = bien, 40 = à corriger
6. Maximum 3 points forts + 2 alertes (focus, pas de liste à rallonge)
7. Ajustements alignés sur l'objectif déclaré (perte/maintien/prise)
8. Bienveillant mais direct — pas de complaisance
9. Réponds UNIQUEMENT en français
10. Utilise l'outil weekly_diagnostic_output pour ta réponse
</regles_absolues>`

    const userPrompt = `<weekly_data>
<profile>
Objectif: ${profile.objective || 'non défini'}
TDEE: ${profile.tdee || '?'} kcal
Calorie goal: ${profile.calorie_goal || '?'} kcal
Protein goal: ${profile.protein_goal || '?'} g
Niveau fitness: ${profile.fitness_level || '?'} (score ${profile.fitness_score || '?'}/100)
Poids actuel: ${profile.current_weight || '?'} kg
</profile>

<training_week>
Séances planifiées: ${sessionsPlanned}/sem
Séances faites: ${sessionsDone}
Adhérence: ${adherencePct.toFixed(0)}%
Volume total (tonnage): ${trainingVolumeTotal.toFixed(0)} kg
</training_week>

<nutrition_week>
Calories moyennes réelles: ${calorieAvgReal.toFixed(0)} kcal/jour
Target: ${calorieAvgTarget} kcal/jour
Écart moyen: ${(calorieAvgReal - calorieAvgTarget).toFixed(0)} kcal/jour
Protéines moyennes: ${proteinAvgG.toFixed(0)}g (compliance: ${proteinCompliancePct.toFixed(0)}%)
Jours loggés: ${daysLogged}/7
</nutrition_week>

<body_metrics>
Variation poids cette semaine: ${weightDeltaKg > 0 ? '+' : ''}${weightDeltaKg.toFixed(1)} kg
</body_metrics>

${coherenceFlags.length > 0 ? `<coherence_flags>\n${coherenceFlags.join('\n')}\n</coherence_flags>` : ''}

${prevDiagRes.data ? `<previous_diagnostic>
Score S-1: ${prevDiagRes.data.score_semaine}
Ajustements appliqués: ${prevDiagRes.data.applied_changes ? 'Oui' : 'Non'}
Objectif S-1: ${prevDiagRes.data.objectif_semaine_prochaine}
</previous_diagnostic>` : ''}
</weekly_data>

Analyse cette semaine et produis un diagnostic complet via l'outil weekly_diagnostic_output.

Pense étape par étape avant de répondre :
1. Quel est le PATTERN dominant cette semaine ?
2. L'utilisateur progresse-t-il vers son objectif ?
3. Quelles sont les 2 actions prioritaires pour la semaine prochaine ?`

    // 8. CALL OPUS 4.7 WITH TOOL_USE
  return immutableInvocation({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        system: systemPrompt,
        tool_choice: { type: 'tool', name: 'weekly_diagnostic_output' },
        tools: [{
          name: 'weekly_diagnostic_output',
          description: 'Structure le diagnostic hebdomadaire en JSON exploitable',
          input_schema: {
            type: 'object',
            required: ['score_semaine', 'points_forts', 'points_alerte', 'ajustements', 'exercice_a_ajouter', 'objectif_semaine_prochaine', 'raisonnement'],
            properties: {
              score_semaine: { type: 'integer', minimum: 0, maximum: 100, description: 'Score global de la semaine' },
              points_forts: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
              points_alerte: { type: 'array', items: { type: 'string' }, maxItems: 2 },
              ajustements: {
                type: 'object',
                properties: {
                  calorie_goal_new: { type: 'integer', description: 'Nouvelle cible calorique recommandée' },
                  protein_goal_new: { type: 'integer' },
                  carbs_goal_new: { type: 'integer' },
                  fat_goal_new: { type: 'integer' },
                  training_volume_delta_pct: { type: 'integer', description: 'Variation volume conseillée en %' },
                },
              },
              exercice_a_ajouter: { type: 'string', description: 'Un exo précis avec sets x reps' },
              objectif_semaine_prochaine: { type: 'string', description: '1 objectif chiffré et SMART' },
              raisonnement: { type: 'string', description: 'Chain-of-thought IA, 100-200 mots' },
            },
          },
        }],
        messages: [{ role: 'user', content: userPrompt }],
  })
}
