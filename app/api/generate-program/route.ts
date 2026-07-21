import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, startAiUsage } from '../../../lib/ai/usage'
import { getPrefatigueInstructions } from '../../../lib/prefatigue-mapping'
import { buildLegacyCoachProgramInvocation } from '../../../lib/ai/prompts'
import { resolveAiModel } from '../../../lib/ai/models'
import { abortSignalToAiCancellation, createAnthropicProvider, promptInvocationToJsonRequest } from '../../../lib/ai/providers/anthropic'
import { createAiOutputValidator, legacyTrainingProgramOutputSchema } from '../../../lib/ai/schemas'
import { getAnthropicMessagesUrl } from '../../../lib/anthropic/chat-transport'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const SPLIT_GUIDE: Record<number, string> = {
  3: `Split Full Body (3 jours) :
- Jour 1 (Full Body A) : Squat, Développé couché, Rowing barre, Élévations latérales, Curl barre (composés + isolation)
- Jour 2 (Full Body B) : Soulevé de terre roumain, Développé militaire, Tractions, Presse à cuisses, Dips
- Jour 3 (Full Body C) : Hip thrust, Développé incliné haltères, Tirage horizontal, Fentes, Face pulls
Chaque séance travaille tout le corps. 4-5 exercices, 3 sets, 8-12 reps.`,

  4: `Split Upper/Lower (4 jours) :
- Jour 1 (Upper A) : Développé couché, Rowing barre, Développé militaire, Curl barre, Extensions triceps
- Jour 2 (Lower A) : Squat, Soulevé de terre roumain, Presse à cuisses, Leg curl, Mollets debout
- Jour 3 (Upper B) : Tractions, Développé incliné haltères, Tirage horizontal, Élévations latérales, Curl marteau
- Jour 4 (Lower B) : Hip thrust, Hack squat, Fentes marchées, Leg extension, Mollets assis
4-5 exercices par séance, 3-4 sets, 8-12 reps composés, 10-15 reps isolation.`,

  5: `Split Push/Pull/Legs + Upper/Lower (5 jours) :
- Jour 1 (Push) : Développé couché, Développé incliné, Élévations latérales, Dips, Extensions triceps poulie
- Jour 2 (Pull) : Tractions, Rowing barre, Tirage vertical, Curl barre, Face pulls
- Jour 3 (Legs) : Squat, Presse à cuisses, Leg curl, Fentes, Mollets debout
- Jour 4 (Upper) : Développé militaire, Rowing haltère, Développé couché haltères, Curl marteau, Triceps corde
- Jour 5 (Lower) : Soulevé de terre roumain, Hip thrust, Leg extension, Leg curl assis, Mollets assis
4-6 exercices par séance, 3-4 sets, 8-12 reps composés, 10-15 reps isolation.`,

  6: `Split Push/Pull/Legs x2 (6 jours, PPL hypertrophie) :
- Jour 1 (Push A) : Développé couché barre, Développé incliné haltères, Élévations latérales, Dips, Extensions triceps poulie
- Jour 2 (Pull A) : Tractions, Rowing barre, Tirage vertical prise serrée, Curl barre, Face pulls
- Jour 3 (Legs A) : Squat barre, Presse à cuisses, Leg curl allongé, Fentes marchées, Mollets debout
- Jour 4 (Push B) : Développé couché haltères, Développé militaire barre, Élévations latérales câble, Écartés poulie, Triceps corde
- Jour 5 (Pull B) : Rowing haltère unilatéral, Tirage horizontal câble, Pullover, Curl haltères incliné, Curl marteau
- Jour 6 (Legs B) : Soulevé de terre roumain, Hack squat, Leg extension, Hip thrust, Mollets assis
Chaque groupe musculaire 2x/semaine avec variations. 4-6 exercices, 3-4 sets, 8-12 composés, 10-15 isolation. Repos 60-90s isolation, 90-120s composés.`,
}

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`program:${ip}`, 5, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  const correlationId = aiUsageCorrelationId(req)
  const model = resolveAiModel('anthropic-haiku-4.5')
  if (!model.ok || model.model.status !== 'active') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  const usage = await startAiUsage({ client: supabase, feature: 'generate-program', principal: { kind: 'user', id: user.id }, correlationId, logicalModel: model.model.logicalId })
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })
  let outcome: 'succeeded' | 'failed' | 'cancelled' = 'failed'
  let providerModel: string | undefined
  let tokens: { inputTokens?: number; outputTokens?: number } | undefined

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 500 })
    }

    const { objective, weight, targetWeight, level, equipment, trainingDays } = await req.json()
    const days = Math.min(Math.max(trainingDays || 4, 3), 6)
    const splitGuide = SPLIT_GUIDE[days] || SPLIT_GUIDE[4]

    const invocation = buildLegacyCoachProgramInvocation({ objective, weight, targetWeight, level, equipment, days, splitGuide, prefatigueInstructions: getPrefatigueInstructions() })

    const provider = createAnthropicProvider({ apiKey, messagesUrl: getAnthropicMessagesUrl() })
    const generated = await provider.generate(promptInvocationToJsonRequest(invocation, model.model.providerModelId, createAiOutputValidator(legacyTrainingProgramOutputSchema)), {
      correlationId, timeoutMs: 300_000, cancellation: abortSignalToAiCancellation(req.signal),
    })
    if (!generated.ok) {
      if (generated.error.code === 'cancelled') outcome = 'cancelled'
      if (generated.error.code === 'invalid_output') return NextResponse.json({ error: 'Erreur inattendue', detail: 'No JSON found' }, { status: 500 })
      const status = generated.error.code === 'quota_exceeded' ? 429 : 500
      return NextResponse.json({ error: `Erreur API Anthropic (${status})` }, { status })
    }
    providerModel = generated.metadata.actualModel
    tokens = generated.metadata.usage
    const aiProgram: Partial<Record<string, { isRest: boolean; day_name?: string; exercises: unknown[] }>> = generated.value

    // Normalise: ensure all 7 days are present
    for (const d of DAYS) {
      if (!aiProgram[d]) aiProgram[d] = { isRest: true, day_name: 'Repos', exercises: [] }
    }

    outcome = 'succeeded'
    return NextResponse.json({ program: aiProgram })
  } catch {
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode: outcome === 'succeeded' ? 'completed' : outcome === 'cancelled' ? 'request_cancelled' : 'request_failed', providerModel, tokens })
  }
}
