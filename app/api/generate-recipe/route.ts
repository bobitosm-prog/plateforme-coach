import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, readAnthropicMetadata, startAiUsage } from '../../../lib/ai/usage'
import { buildRecipeInvocation } from '../../../lib/ai/prompts'
import { parseAndValidateAiOutput } from '../../../lib/ai/parsing'
import { recipeOutputSchema } from '../../../lib/ai/schemas'

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
  const rl = checkRateLimit(`recipe:${ip}`, 10, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  const usage = await startAiUsage({ client: supabase, feature: 'generate-recipe', principal: { kind: 'user', id: user.id }, correlationId: aiUsageCorrelationId(req), logicalModel: 'claude-haiku-4-5-20251001' })
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })
  let outcome: 'succeeded' | 'failed' = 'failed'
  let providerModel: string | undefined
  let tokens: { inputTokens?: number; outputTokens?: number } | undefined

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { category, profile, foodsList, includeIngredients, excludeIngredients } = await req.json()

    // Guard: invited clients cannot generate AI recipes
    if (profile?.subscription_type === 'invited') {
      return NextResponse.json({ error: 'Fonctionnalité gérée par ton coach.' }, { status: 403 })
    }

    const invocation = buildRecipeInvocation({ category, calorieGoal: profile?.calorie_goal, proteinGoal: profile?.protein_goal, dietaryType: profile?.dietary_type, foodsList, includeIngredients, excludeIngredients })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(invocation),
    })

    if (!res.ok) return NextResponse.json({ error: `Erreur serveur (${res.status})` }, { status: res.status })

    const data = await res.json()
    ;({ providerModel, tokens } = readAnthropicMetadata(data))
    const raw = data.content?.[0]?.text || ''
    const parsed = parseAndValidateAiOutput(raw, recipeOutputSchema, { allowMarkdownFence: true, allowLegacySurroundingText: true })
    if (!parsed.ok) return NextResponse.json({ error: 'Pas de JSON dans la réponse' }, { status: 500 })
    const recipe = parsed.value
    // Round numeric values
    recipe.calories_per_serving = Math.round(recipe.calories_per_serving || 0)
    recipe.proteins_per_serving = Math.round((recipe.proteins_per_serving || 0) * 10) / 10
    recipe.carbs_per_serving = Math.round((recipe.carbs_per_serving || 0) * 10) / 10
    recipe.fat_per_serving = Math.round((recipe.fat_per_serving || 0) * 10) / 10

    outcome = 'succeeded'
    return NextResponse.json({ recipe })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur inattendue' }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode: outcome === 'succeeded' ? 'completed' : 'request_failed', providerModel, tokens })
  }
}
