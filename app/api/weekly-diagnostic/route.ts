import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, checkAiRateLimit, logAiUsage, aiRateLimitResponse } from '../../../lib/rate-limit'

export async function POST(req: NextRequest) {
  // 1. AUTH
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // 2. RATE LIMIT (anti-abuse)
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`diag:${ip}`, 3, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  const aiRl = await checkAiRateLimit(supabase, user.id, 'weekly-diagnostic')
  if (!aiRl.allowed) return aiRateLimitResponse(aiRl.limit, aiRl.resetIn)
  await logAiUsage(supabase, user.id, 'weekly-diagnostic')

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    // 3. DETERMINE WEEK BOUNDARIES (lundi 00:00 → dimanche 23:59)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ... 6=Sat
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysSinceMonday)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = weekStart.toISOString().slice(0, 10)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    const weekEndStr = weekEnd.toISOString().slice(0, 10)

    // Idempotency: check if diagnostic already exists for this week
    const { data: existing } = await supabase
      .from('weekly_diagnostics')
      .select('id, score_semaine')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        already_exists: true,
        diagnostic_id: existing.id,
        message: 'Diagnostic déjà généré pour cette semaine',
      })
    }

    // 4. COLLECT DATA (parallel)
    const [profileRes, sessionsRes, foodLogsRes, weightLogsRes, workoutSessionsRes, prevDiagRes] = await Promise.all([
      supabase.from('profiles')
        .select('*')
        .eq('id', user.id)
        .single(),
      supabase.from('completed_sessions')
        .select('id, completed_at, session_name, duration_minutes')
        .eq('client_id', user.id)
        .gte('completed_at', weekStart.toISOString())
        .lt('completed_at', weekEnd.toISOString()),
      supabase.from('daily_food_logs')
        .select('date, calories, protein, carbs, fat')
        .eq('user_id', user.id)
        .gte('date', weekStartStr)
        .lt('date', weekEndStr),
      supabase.from('weight_logs')
        .select('date, poids')
        .eq('user_id', user.id)
        .gte('date', weekStartStr)
        .order('date', { ascending: true }),
      supabase.from('workout_sessions')
        .select('id, date, completed')
        .eq('user_id', user.id)
        .gte('date', weekStartStr)
        .lt('date', weekEndStr),
      supabase.from('weekly_diagnostics')
        .select('score_semaine, ajustements, objectif_semaine_prochaine, applied_changes')
        .eq('user_id', user.id)
        .lt('week_start', weekStartStr)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const profile = profileRes.data
    if (!profile) return NextResponse.json({ error: 'Profile introuvable' }, { status: 404 })

    // 5. TRAINING VOLUME (workout_sets tonnage)
    let trainingVolumeTotal = 0
    if (workoutSessionsRes.data && workoutSessionsRes.data.length > 0) {
      const sessionIds = workoutSessionsRes.data.map(s => s.id)
      const { data: sets } = await supabase
        .from('workout_sets')
        .select('weight, reps, completed')
        .in('session_id', sessionIds)
        .eq('completed', true)

      if (sets) {
        trainingVolumeTotal = sets.reduce((sum, s) =>
          sum + ((s.weight || 0) * (s.reps || 0)), 0)
      }
    }

    // 6. SERVER PRE-ANALYSIS (deterministic)
    const sessionsDone = sessionsRes.data?.length || 0
    const sessionsPlanned = (profile.onboarding_answers as any)?.sessions_per_week || 4
    const adherencePct = sessionsPlanned > 0
      ? Math.min(100, (sessionsDone / sessionsPlanned) * 100)
      : 0

    // Food averages (aggregate per day)
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
    const proteinCompliancePct = proteinGoal > 0
      ? (proteinAvgG / proteinGoal) * 100
      : 0

    // Weight delta
    const weightLogs = weightLogsRes.data || []
    const weightDeltaKg = weightLogs.length >= 2
      ? Number(weightLogs[weightLogs.length - 1].poids) - Number(weightLogs[0].poids)
      : 0

    // 7. COHERENCE FLAGS
    const coherenceFlags: string[] = []
    if (sessionsDone === 0) {
      coherenceFlags.push('Aucune séance complétée cette semaine')
    }
    if (daysLogged < 3) {
      coherenceFlags.push(`Seulement ${daysLogged}/7 jours de nutrition loggés — données IA incomplètes`)
    }
    if (profile.objective?.toLowerCase().includes('perdre') && weightDeltaKg > 0.5) {
      coherenceFlags.push(`Objectif perte de poids mais +${weightDeltaKg.toFixed(1)}kg cette semaine`)
    }
    if (profile.objective?.toLowerCase().includes('muscle') && calorieAvgReal < calorieAvgTarget * 0.9) {
      coherenceFlags.push('Objectif prise muscle mais déficit calorique moyen')
    }

    // 8. BUILD PROMPT
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

    // 9. CALL OPUS 4.7 WITH TOOL_USE (structured output)
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
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
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[weekly-diagnostic] Claude API error:', res.status, err.slice(0, 300))
      return NextResponse.json({ error: `Erreur IA (${res.status})` }, { status: res.status })
    }

    const aiData = await res.json()

    // Extract tool_use content
    const toolUseBlock = aiData.content?.find((c: any) => c.type === 'tool_use')
    if (!toolUseBlock) {
      console.error('[weekly-diagnostic] No tool_use in response:', JSON.stringify(aiData).slice(0, 500))
      return NextResponse.json({ error: 'Format IA invalide' }, { status: 500 })
    }

    const aiOutput = toolUseBlock.input
    const aiTokensUsed = (aiData.usage?.input_tokens || 0) + (aiData.usage?.output_tokens || 0)

    // 10. PERSIST
    const { data: saved, error: insertErr } = await supabase
      .from('weekly_diagnostics')
      .insert({
        user_id: user.id,
        week_start: weekStartStr,
        // Pre-analysis
        adherence_pct: adherencePct,
        weight_delta_kg: weightDeltaKg,
        calorie_avg_real: calorieAvgReal,
        calorie_avg_target: calorieAvgTarget,
        protein_avg_g: proteinAvgG,
        protein_compliance_pct: proteinCompliancePct,
        training_volume_total: trainingVolumeTotal,
        sessions_done: sessionsDone,
        sessions_planned: sessionsPlanned,
        // AI output
        score_semaine: aiOutput.score_semaine,
        points_forts: aiOutput.points_forts,
        points_alerte: aiOutput.points_alerte,
        ajustements: aiOutput.ajustements,
        exercice_a_ajouter: aiOutput.exercice_a_ajouter,
        objectif_semaine_prochaine: aiOutput.objectif_semaine_prochaine,
        raisonnement: aiOutput.raisonnement,
        ai_model: 'claude-opus-4-7',
        ai_tokens_used: aiTokensUsed,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[weekly-diagnostic] Insert error:', insertErr)
      return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 })
    }

    return NextResponse.json({
      diagnostic_id: saved.id,
      diagnostic: saved,
    })

  } catch (e: any) {
    console.error('[weekly-diagnostic] Unhandled:', e.message)
    return NextResponse.json({ error: e.message || 'Erreur interne' }, { status: 500 })
  }
}
