/**
 * Weekly Diagnostic Generator — shared business logic.
 * Called by both:
 *   - /api/weekly-diagnostic (session user, rate-limited)
 *   - /api/weekly-diagnostic/cron (service_role, scheduled)
 *
 * @see lib/anthropic/unwrap-tool-input.ts for the double-wrap 'input' fix
 */
import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildWeeklyDiagnosticInvocation } from '../ai/prompts'
import { resolveAiModel } from '../ai/models'
import { abortSignalToAiCancellation, createAnthropicProvider, promptInvocationToToolRequest } from '../ai/providers/anthropic'
import { createAiOutputValidator, weeklyDiagnosticOutputSchema } from '../ai/schemas'
import type { AiRecordedTokens } from '../ai/usage/types'
import { getAnthropicMessagesUrl } from '../anthropic/chat-transport'
import { legacyTonnage } from '../progression'
import {
  aggregateWeeklyDiagnosticNutrition,
  previousCompleteZurichWeek,
} from './nutrition-aggregation'
import {
  resolveWeeklyDiagnosticNutritionGoals,
  weeklyDiagnosticNutritionGoalFlags,
} from './nutrition-goals'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function writeWeeklyDiagnosticPerformanceEvent(event: {
  readonly request_id: string
  readonly result: 'success' | 'skipped' | 'rejected' | 'failed'
  readonly reason: string
  readonly server_total_ms: number
  readonly source_reads_ms: number
  readonly analysis_ms: number
  readonly ai_provider_ms: number
  readonly persistence_ms: number
  readonly application_overhead_ms: number
}): void {
  console.info(JSON.stringify(event))
}

export interface DiagnosticResult {
  diagnostic_id?: string
  diagnostic?: unknown
  already_exists?: boolean
  error?: string
  reasonCode?: string
  cancelled?: boolean
  providerModel?: string
  tokens?: AiRecordedTokens
}

export interface WeeklyDiagnosticGenerationContext {
  correlationId: string
  signal?: AbortSignal
  now?: () => Date
  performance?: {
    now?: () => number
    record(phases: {
      readonly source_reads_ms: number
      readonly analysis_ms: number
      readonly ai_provider_ms: number
      readonly persistence_ms: number
    }): void
  }
}

export async function generateWeeklyDiagnostic(
  userId: string,
  supabase: SupabaseClient,
  context: WeeklyDiagnosticGenerationContext,
): Promise<DiagnosticResult> {
  const phases = {
    source_reads_ms: 0,
    analysis_ms: 0,
    ai_provider_ms: 0,
    persistence_ms: 0,
  }
  const performanceInstrumentation = context.performance
  const monotonicNow = performanceInstrumentation?.now ?? (() => globalThis.performance.now())
  const boundedDuration = (value: number) => Math.min(86_400_000, Math.max(0, Math.round(value)))
  const phaseStartedAt = () => performanceInstrumentation ? monotonicNow() : 0
  const finishPhase = (phase: keyof typeof phases, startedAt: number) => {
    if (performanceInstrumentation) phases[phase] = boundedDuration(monotonicNow() - startedAt)
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) return { error: 'API key manquante' }
  const model = resolveAiModel('anthropic-opus-4.8')
  if (!model.ok || model.model.status !== 'active') return { error: 'Service temporairement indisponible' }

  try {
    // 1. WEEK BOUNDARIES — calcul en TZ Europe/Zurich (lundi 00:00 → dimanche 23:59)
    // Fix bug : les anciens calculs getDay()/setHours() + toISOString() ramenaient au dimanche
    // car minuit local en TZ positive = 22h/23h UTC du jour précédent.
    const week = previousCompleteZurichWeek(context.now?.() ?? new Date())
    const weekStartStr = week.startInclusive
    const weekEndStr = week.endExclusive

    // 2. IDEMPOTENCY
    const { data: existing } = await supabase
      .from('weekly_diagnostics')
      .select('id, score_semaine')
      .eq('user_id', userId)
      .eq('week_start', weekStartStr)
      .maybeSingle()

    if (existing) {
      return { already_exists: true, diagnostic_id: existing.id }
    }

    // 3. COLLECT DATA (parallel)
    const sourceReadsStartedAt = phaseStartedAt()
    const profileRead = Promise.resolve(
      supabase.from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
    ).catch(error => ({ data: null, error }))
    const [profileRes, foodLogsRes, weightLogsRes, workoutSessionsRes, prevDiagRes] = await Promise.all([
      profileRead,
      supabase.from('daily_food_logs')
        .select('date, calories, protein, carbs, fat')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .lt('date', weekEndStr),
      supabase.from('weight_logs')
        .select('date, poids')
        .eq('user_id', userId)
        .gte('date', weekStartStr)
        .order('date', { ascending: true }),
      supabase.from('workout_sessions')
        .select('id, date, completed')
        .eq('user_id', userId)
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
    finishPhase('source_reads_ms', sourceReadsStartedAt)

    if (profileRes.error) {
      return { error: 'Erreur lecture profil', reasonCode: 'profile_read_failed' }
    }
    const profile = profileRes.data
    if (!profile) return { error: 'Profile introuvable' }

    // 4. TRAINING VOLUME (workout_sets tonnage)
    let trainingVolumeTotal = 0
    if (workoutSessionsRes.data && workoutSessionsRes.data.length > 0) {
      const sessionIds = workoutSessionsRes.data.map((session: { id: string }) => session.id)
      const { data: sets } = await supabase
        .from('workout_sets')
        .select('weight, reps, completed')
        .in('session_id', sessionIds)
        .eq('completed', true)

      if (sets) {
        trainingVolumeTotal = legacyTonnage(sets)
      }
    }

    // 5. SERVER PRE-ANALYSIS (deterministic)
    const analysisStartedAt = phaseStartedAt()
    const sessionsDone = workoutSessionsRes.data?.length || 0
    const onboardingAnswers = isRecord(profile.onboarding_answers) ? profile.onboarding_answers : null
    const sessionsPlanned = Number(onboardingAnswers?.sessions_per_week) || 4
    const adherencePct = sessionsPlanned > 0
      ? Math.min(100, (sessionsDone / sessionsPlanned) * 100)
      : 0

    const nutrition = aggregateWeeklyDiagnosticNutrition(foodLogsRes.data ?? [], week)
    const daysLogged = nutrition.daysLogged
    const calorieAvgReal = nutrition.calories.average
    const proteinAvgG = nutrition.protein.average
    const goals = resolveWeeklyDiagnosticNutritionGoals(profile)
    const calorieGoal = goals.goals.calories
    const proteinGoal = goals.goals.protein
    const calorieAvgTarget = calorieGoal.status === 'known' ? calorieGoal.value : null
    const proteinGoalValue = proteinGoal.status === 'known' ? proteinGoal.value : null
    const proteinCompliancePct = proteinAvgG !== null && proteinGoalValue !== null
      ? (proteinAvgG / proteinGoalValue) * 100
      : null

    const weightLogs = weightLogsRes.data || []
    const weightDeltaKg = weightLogs.length >= 2
      ? Number(weightLogs[weightLogs.length - 1].poids) - Number(weightLogs[0].poids)
      : 0

    // 6. COHERENCE FLAGS
    const coherenceFlags: string[] = weeklyDiagnosticNutritionGoalFlags(goals)
    if (sessionsDone === 0) {
      coherenceFlags.push('Aucune séance complétée cette semaine')
    }
    if (daysLogged < 3) {
      coherenceFlags.push(`Seulement ${daysLogged}/7 jours de nutrition loggés — données IA incomplètes`)
    }
    if (nutrition.calories.average === null) {
      coherenceFlags.push('Calories moyennes indisponibles — valeurs absentes ou invalides')
    }
    if (nutrition.protein.average === null) {
      coherenceFlags.push('Protéines moyennes indisponibles — valeurs absentes ou invalides')
    }
    if (nutrition.issues.some(issue => issue.code.startsWith('invalid_'))) {
      coherenceFlags.push('Certaines lignes nutrition invalides ont été exclues des moyennes')
    }
    if (profile.objective?.toLowerCase().includes('perdre') && weightDeltaKg > 0.5) {
      coherenceFlags.push(`Objectif perte de poids mais +${weightDeltaKg.toFixed(1)}kg cette semaine`)
    }
    if (
      profile.objective?.toLowerCase().includes('muscle') &&
      calorieAvgReal !== null &&
      calorieAvgTarget !== null &&
      calorieAvgReal < calorieAvgTarget * 0.9
    ) {
      coherenceFlags.push('Objectif prise muscle mais déficit calorique moyen')
    }

    // 7. BUILD PROMPT
    const invocation = buildWeeklyDiagnosticInvocation({
      profile, sessionsPlanned, sessionsDone, adherencePct, trainingVolumeTotal,
      calorieAvgReal, calorieAvgTarget, proteinGoal: proteinGoalValue,
      proteinAvgG, proteinCompliancePct,
      daysLogged, weightDeltaKg, coherenceFlags, previousDiagnostic: prevDiagRes.data,
    })
    finishPhase('analysis_ms', analysisStartedAt)
    const provider = createAnthropicProvider({ apiKey, messagesUrl: getAnthropicMessagesUrl() })
    const aiProviderStartedAt = phaseStartedAt()
    const generated = await provider.generate(
      promptInvocationToToolRequest(
        invocation,
        model.model.providerModelId,
        createAiOutputValidator(weeklyDiagnosticOutputSchema),
      ),
      {
        correlationId: context.correlationId,
        timeoutMs: 300_000,
        cancellation: context.signal ? abortSignalToAiCancellation(context.signal) : undefined,
      },
    )
    finishPhase('ai_provider_ms', aiProviderStartedAt)
    const providerModel = generated.metadata.actualModel
    const tokens = generated.metadata.usage
    if (!generated.ok) {
      if (generated.error.code === 'cancelled') {
        return { error: 'Erreur interne', reasonCode: 'request_cancelled', cancelled: true, providerModel, tokens }
      }
      if (generated.error.code === 'quota_exceeded') {
        return { error: 'Erreur IA (429)', reasonCode: 'provider_quota', providerModel, tokens }
      }
      if (generated.error.code === 'invalid_output') {
        return { error: 'Format IA invalide', reasonCode: 'invalid_output', providerModel, tokens }
      }
      return { error: 'Erreur IA', reasonCode: 'provider_error', providerModel, tokens }
    }
    const aiOutput = generated.value
    const aiTokensUsed = tokens && (tokens.inputTokens !== undefined || tokens.outputTokens !== undefined)
      ? (tokens.inputTokens ?? 0) + (tokens.outputTokens ?? 0)
      : null

    // 9. PERSIST — only the authoritative insert and scheduling update.
    const persistenceStartedAt = phaseStartedAt()
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
        protein_compliance_pct: proteinCompliancePct,
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
        ai_model: generated.metadata.actualModel,
        ai_tokens_used: aiTokensUsed,
      })
      .select()
      .single()

    if (insertErr) {
      finishPhase('persistence_ms', persistenceStartedAt)
      return { error: 'Erreur sauvegarde', reasonCode: 'persistence_failed', providerModel, tokens }
    }

    // Schedule next diagnostic in 7 days (Architecture B: strict per-user rhythm)
    const nextDiagAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { error: nextErr } = await supabase
      .from('profiles')
      .update({ next_diagnostic_at: nextDiagAt })
      .eq('id', userId)
    finishPhase('persistence_ms', persistenceStartedAt)
    if (nextErr) console.warn('[generator] next_diagnostic_at update failed')

    // Push notification (non-blocking, best effort)
    sendDiagnosticPush(userId, saved.id, saved.score_semaine, supabase)
      .catch(() => console.error('[generator] push failed'))

    return { diagnostic_id: saved.id, diagnostic: saved, providerModel, tokens }

  } catch {
    return { error: 'Erreur interne', reasonCode: 'unexpected_error' }
  } finally {
    if (performanceInstrumentation) {
      try {
        performanceInstrumentation.record(Object.freeze({ ...phases }))
      } catch {
        // Performance instrumentation must never alter diagnostic generation.
      }
    }
  }
}

// ─── Push notification helper (private) ───

async function sendDiagnosticPush(
  userId: string,
  diagnosticId: string,
  score: number,
  supabase: SupabaseClient,
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

    await Promise.all(subs.map(async (sub: { id: string; subscription: Parameters<typeof webpush.sendNotification>[0] }) => {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        sent++
      } catch (err: unknown) {
        const statusCode = isRecord(err) ? err.statusCode : undefined
        if (statusCode === 410 || statusCode === 404) {
          toDelete.push(sub.id)
        } else {
          console.error('[push diagnostic] failed')
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

    return { sent, cleaned }
  } catch {
    console.error('[push diagnostic] unhandled')
    return { sent: 0, cleaned: 0 }
  }
}
