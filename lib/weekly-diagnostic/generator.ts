/**
 * Weekly Diagnostic Generator — shared business logic.
 * Called by both:
 *   - /api/weekly-diagnostic (session user, rate-limited)
 *   - /api/weekly-diagnostic/cron (service_role, scheduled)
 *
 * @see lib/anthropic/unwrap-tool-input.ts for the double-wrap 'input' fix
 */
import webpush from 'web-push'
import { unwrapToolInput } from '../anthropic/unwrap-tool-input'
import { buildAthenaScientificPolicyPrompt } from '../athena/scientific-policy'
import { validateAthenaWeeklyOutput } from '../athena/weekly-output'
import { normalizeNutritionObjective } from '../nutrition/calorie-macro-targets'
import { readWeeklyCompletion } from './completion'

export interface DiagnosticResult {
  diagnostic_id?: string
  diagnostic?: any
  already_exists?: boolean
  error?: string
  blocked?: boolean
}

export async function generateWeeklyDiagnostic(
  userId: string,
  supabase: any
): Promise<DiagnosticResult> {
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) return { error: 'Diagnostic temporairement indisponible' }

  try {
    // Sunday becomes eligible only after explicit closure. Cron uses this same gate.
    const { status: completion, snapshot } = await readWeeklyCompletion(supabase, userId)
    const weekStartStr = completion.weekStart
    const weekEndStr = completion.endExclusive

    // 2. IDEMPOTENCY
    const { data: existing, error: existingError } = await supabase
      .from('weekly_diagnostics')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStartStr)
      .maybeSingle()

    if (existingError) return { error: 'Diagnostic temporairement indisponible' }
    if (existing) {
      return { already_exists: true, diagnostic_id: existing.id, diagnostic: existing }
    }
    if (!completion.canGenerate) return { blocked: true, error: 'Termine et confirme ta journée du dimanche avant de générer le bilan.' }

    // 3. COLLECT DATA (parallel)
    const [profileRes, foodLogsRes, weightLogsRes, workoutSessionsRes, prevDiagRes] = await Promise.all([
      supabase.from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      supabase.from('daily_food_logs')
        .select('date, calories, protein, carbs, fat')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lt('date', weekEndStr),
      supabase.from('weight_logs')
        .select('date, poids')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lt('date', weekEndStr)
        .order('date', { ascending: true }),
      supabase.from('workout_sessions')
        .select('id, date, completed')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('date', weekStartStr)
        .lt('date', weekEndStr),
      supabase.from('weekly_diagnostics')
        .select('score_semaine, ajustements, objectif_semaine_prochaine, applied_changes')
        .eq('user_id', userId)
        .lt('week_start', weekStartStr)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if ([profileRes, foodLogsRes, weightLogsRes, workoutSessionsRes, prevDiagRes].some(r => r.error)) {
      return { error: 'Données du bilan temporairement indisponibles. Réessaie.' }
    }
    const profile = profileRes.data
    if (!profile) return { error: 'Profile introuvable' }

    // 4. TRAINING VOLUME (workout_sets tonnage)
    let trainingVolumeTotal = 0
    if (workoutSessionsRes.data && workoutSessionsRes.data.length > 0) {
      const sessionIds = workoutSessionsRes.data.map((s: any) => s.id)
      const { data: sets, error: setsError } = await supabase
        .from('workout_sets')
        .select('weight, reps, completed')
        .in('session_id', sessionIds)
        .eq('completed', true)

      if (setsError) return { error: 'Données des séances temporairement indisponibles' }
      if (sets) {
        trainingVolumeTotal = sets.reduce((sum: number, s: any) =>
          sum + ((s.weight || 0) * (s.reps || 0)), 0)
      }
    }

    // 5. SERVER PRE-ANALYSIS (deterministic)
    const sessionsDone = workoutSessionsRes.data?.length || 0
    const sessionsPlanned = (profile.onboarding_answers as any)?.sessions_per_week || 4
    const adherencePct = sessionsPlanned > 0
      ? Math.min(100, (sessionsDone / sessionsPlanned) * 100)
      : 0

    const foodByDate: Record<string, { kcal: number; prot: number }> = {}
    for (const log of (foodLogsRes.data || [])) {
      const d = log.date
      if (!foodByDate[d]) foodByDate[d] = { kcal: 0, prot: 0 }
      foodByDate[d].kcal += Number(log.calories || 0)
      foodByDate[d].prot += Number(log.protein || 0)
    }
    const daysLogged = Object.keys(foodByDate).length
    const totalKcal = Object.values(foodByDate).reduce((s, d) => s + d.kcal, 0)
    const totalProt = Object.values(foodByDate).reduce((s, d) => s + d.prot, 0)
    const calorieAvgReal = daysLogged > 0 ? totalKcal / daysLogged : 0
    const proteinAvgG = daysLogged > 0 ? totalProt / daysLogged : 0
    const calorieAvgTarget = Number(profile.calorie_goal || 0)
    const proteinGoal = Number(profile.protein_goal || 0)
    const calorieCompliancePct = calorieAvgTarget > 0
      ? (calorieAvgReal / calorieAvgTarget) * 100
      : null
    const proteinCompliancePct = proteinGoal > 0
      ? (proteinAvgG / proteinGoal) * 100
      : null

    const weightLogs = weightLogsRes.data || []
    const weightDeltaKg = weightLogs.length >= 2
      ? Number(weightLogs[weightLogs.length - 1].poids) - Number(weightLogs[0].poids)
      : 0

    // 6. COHERENCE FLAGS
    const coherenceFlags: string[] = []
    if (sessionsDone === 0) {
      coherenceFlags.push('Aucune séance complétée cette semaine')
    }
    if (daysLogged < 3) {
      coherenceFlags.push(`Seulement ${daysLogged}/7 jours de nutrition loggés — données IA incomplètes`)
    }
    const objective = normalizeNutritionObjective(profile.objective)
    if (objective === 'cut' && weightDeltaKg > 0.5) {
      coherenceFlags.push(`Objectif perte de poids mais +${weightDeltaKg.toFixed(1)}kg cette semaine`)
    }
    if (objective === 'mass' && daysLogged >= 3 && calorieAvgReal < calorieAvgTarget * 0.9) {
      coherenceFlags.push('Objectif prise muscle mais déficit calorique moyen')
    }

    // 7. BUILD PROMPT
    const systemPrompt = `Tu es Athena, le coach numérique MoovX.
Tu analyses sa semaine d'entrainement et de nutrition pour produire un diagnostic hebdomadaire actionnable.

${buildAthenaScientificPolicyPrompt()}

<regles_absolues>
1. Tu te bases UNIQUEMENT sur les données fournies — pas d'invention
2. Si une donnée manque, dis-le explicitement dans raisonnement
3. Propose le plus petit ajustement observable. Aucun changement calorique sans 7 jours nutritionnels, 3 mesures de poids et un diagnostic hebdomadaire antérieur.
4. Tu compares à la semaine précédente si elle existe
5. Ne produis aucun score de santé : score_semaine est calculé par le serveur à partir de l'adhérence et de la couverture.
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
Protéines moyennes: ${proteinAvgG.toFixed(0)}g (compliance: ${proteinCompliancePct?.toFixed(0) ?? '?'}%)
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

Analyse cette semaine et produis un diagnostic via l'outil weekly_diagnostic_output. Retourne seulement un résumé factuel, les limites de couverture et au maximum deux actions observables. N'expose aucun raisonnement interne.`

    // 8. CALL OPUS 4.7 WITH TOOL_USE
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        system: systemPrompt,
        tool_choice: { type: 'tool', name: 'weekly_diagnostic_output' },
        tools: [{
          name: 'weekly_diagnostic_output',
          description: 'Structure le diagnostic hebdomadaire en JSON exploitable',
          input_schema: {
            type: 'object',
            required: ['points_forts', 'points_alerte', 'ajustements', 'exercice_a_ajouter', 'objectif_semaine_prochaine', 'raisonnement'],
            properties: {
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
              exercice_a_ajouter: { type: 'string', description: 'Toujours une chaîne vide : les agrégats ne justifient aucun nouvel exercice' },
              objectif_semaine_prochaine: { type: 'string', description: '1 objectif chiffré et SMART' },
              raisonnement: { type: 'string', description: 'Résumé factuel des données et limites, sans raisonnement interne, 60-120 mots' },
            },
          },
        }],
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[generateWeeklyDiagnostic] Claude API error:', res.status, err.slice(0, 300))
      return { error: 'Diagnostic temporairement indisponible' }
    }

    const aiData = await res.json()

    const toolUseBlock = aiData.content?.find((c: any) => c.type === 'tool_use')
    if (!toolUseBlock) {
      console.error('[generateWeeklyDiagnostic] No tool_use in response:', JSON.stringify(aiData).slice(0, 500))
      return { error: 'Format IA invalide' }
    }

    const aiOutput = validateAthenaWeeklyOutput(unwrapToolInput(toolUseBlock.input), {
      adherencePct, nutritionDays: daysLogged, weightMeasurements: weightLogs.length,
      calorieCompliancePct, proteinCompliancePct,
      completedSessions: sessionsDone, plannedSessions: sessionsPlanned,
      currentCalorieGoal: calorieAvgTarget,
      tdeeKcal: Number(profile.tdee || 0),
      currentWeightKg: Number(profile.current_weight || 0),
      objective: profile.objective,
      dietaryType: profile.dietary_type,
      hasPreviousDiagnostic: Boolean(prevDiagRes.data),
    })
    const aiTokensUsed = (aiData.usage?.input_tokens || 0) + (aiData.usage?.output_tokens || 0)

    // Do not publish a report if Sunday changed while the provider was working.
    const latestCompletion = await readWeeklyCompletion(supabase, userId)
    if (latestCompletion.status.weekStart !== weekStartStr || !latestCompletion.status.confirmed || latestCompletion.snapshot !== snapshot) {
      return { blocked: true, error: 'Les données du dimanche ont changé. Confirme à nouveau la journée.' }
    }
    // 9. PERSIST
    const { data: saved, error: insertErr } = await supabase
      .from('weekly_diagnostics')
      .insert({
        user_id: userId,
        week_start: weekStartStr,
        adherence_pct: adherencePct,
        weight_delta_kg: weightDeltaKg,
        calorie_avg_real: calorieAvgReal,
        calorie_avg_target: calorieAvgTarget,
        protein_avg_g: proteinAvgG,
        protein_compliance_pct: proteinCompliancePct ?? 0,
        training_volume_total: trainingVolumeTotal,
        sessions_done: sessionsDone,
        sessions_planned: sessionsPlanned,
        score_semaine: aiOutput.score_semaine,
        points_forts: aiOutput.points_forts,
        points_alerte: aiOutput.points_alerte,
        ajustements: aiOutput.ajustements,
        exercice_a_ajouter: aiOutput.exercice_a_ajouter,
        objectif_semaine_prochaine: aiOutput.objectif_semaine_prochaine,
        raisonnement: aiOutput.raisonnement,
        ai_model: 'claude-opus-4-8',
        ai_tokens_used: aiTokensUsed,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[generateWeeklyDiagnostic] Insert error:', insertErr)
      return { error: 'Erreur sauvegarde' }
    }

    // A late Monday confirmation must not postpone the following Sunday review.
    const nextSunday = new Date(`${completion.sunday}T00:00:00Z`)
    nextSunday.setUTCDate(nextSunday.getUTCDate() + 7)
    const nextDiagAt = nextSunday.toISOString()
    const { error: nextErr } = await supabase
      .from('profiles')
      .update({ next_diagnostic_at: nextDiagAt })
      .eq('id', userId)
    if (nextErr) console.warn('[generator] next_diagnostic_at update failed:', nextErr.message)

    // Push notification (non-blocking, best effort)
    sendDiagnosticPush(userId, saved.id, saved.score_semaine, supabase)
      .catch(err => console.error('[generator] push failed:', err.message))

    return { diagnostic_id: saved.id, diagnostic: saved }

  } catch {
    console.error('[generateWeeklyDiagnostic] unexpected failure')
    return { error: 'Diagnostic temporairement indisponible' }
  }
}

// ─── Push notification helper (private) ───

async function sendDiagnosticPush(
  userId: string,
  diagnosticId: string,
  score: number,
  supabase: any
): Promise<{ sent: number; cleaned: number }> {
  try {
    const vapidPublic = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').replace(/=/g, '').trim()
    const vapidPrivate = (process.env.VAPID_PRIVATE_KEY || '').replace(/=/g, '').trim()
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@moovx.ch'

    if (!vapidPublic || !vapidPrivate) {
      console.warn('[push diagnostic] VAPID keys missing — skip')
      return { sent: 0, cleaned: 0 }
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', userId)
      .limit(10)

    if (!subs || subs.length === 0) {
      return { sent: 0, cleaned: 0 }
    }

    const payload = JSON.stringify({
      title: 'Ton diagnostic hebdomadaire est prêt',
      body: `Score : ${score}/100 — découvre tes ajustements pour cette semaine`,
      url: `/weekly-diagnostic/${diagnosticId}`,
      tag: 'moovx-weekly-diagnostic',
    })

    let sent = 0
    const toDelete: string[] = []

    await Promise.all(subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        sent++
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          toDelete.push(sub.id)
        } else {
          console.error('[push diagnostic] failed:', err.statusCode, err.message)
        }
      }
    }))

    let cleaned = 0
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', toDelete)
      if (!error) cleaned = toDelete.length
    }

    console.log(`[push diagnostic] user=${userId.slice(0, 8)} sent=${sent} cleaned=${cleaned}`)
    return { sent, cleaned }
  } catch (e: any) {
    console.error('[push diagnostic] unhandled:', e.message)
    return { sent: 0, cleaned: 0 }
  }
}
