import { createHmac, randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { readActivePersonalMealPlan } from '@/lib/meal-plan/personal-plan-repository'
import { getProfile, updateProfile } from '@/lib/profile-service'
import { getNutritionPreferencesInitialState } from '@/lib/nutrition/preferences-initial-state'
import { parseMealPlan } from '@/lib/meal-plan'
import { getNutritionPlanConsistency } from '@/lib/nutrition/plan-context'
import { loadActivationSnapshot } from '@/lib/meal-plan/activation-snapshot'
import { replacePersonalMealPlan } from '@/lib/meal-plan/replace-personal-plan'
import { draftFood, mealDraftRows, persistMealDraft } from '@/lib/nutrition/meal-draft'

// Opt-in suite. Requires a disposable PostgreSQL + PostgREST fixture on loopback.
// Authentication/provider/quota are simulated; persistence and row isolation are real.
const state = vi.hoisted(() => ({ client: null as SupabaseClient | null, userId: '' }))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => state.client }))
vi.mock('@/lib/api-guard', () => ({ guardCoachManagedCapabilities: async () => null }))
vi.mock('@/lib/athena/generation-context', () => ({ loadAthenaGenerationContext: async () => ({ ok: true, prompt: 'Synthetic integration profile' }) }))
vi.mock('@/lib/ai/heavy-reservation', () => ({ reserveHeavyAi: async () => ({ ok: true, settle: async () => true }) }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true }), checkAiRateLimit: async () => ({ allowed: true }),
  checkAiQuota: async () => ({ allowed: true }), logAiUsage: async () => {},
  aiRateLimitResponse: () => new Response(null, { status: 429 }),
  aiQuotaResponse: () => new Response(null, { status: 429 }),
}))
import { POST } from '@/app/api/generate-meal-plan/route'

const url = 'http://127.0.0.1:56431'
const jwtSecret = process.env.NUTRITION_TEST_JWT_SECRET
if (!jwtSecret) throw new Error('Disposable integration fixture secret is required')
function clientFor(userId: string, schema: string): SupabaseClient {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role: 'authenticated', sub: userId, exp: Math.floor(Date.now() / 1000) + 600 })}`
  const jwt = `${payload}.${createHmac('sha256', jwtSecret!).update(payload).digest('base64url')}`
  const client = createClient(url, 'synthetic-local-key', {
    db: { schema }, global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  vi.spyOn(client.auth, 'getUser').mockResolvedValue({ data: { user: { id: userId } }, error: null } as never)
  // The application repository accepts the default public schema type; this
  // fixture exercises the same table contract under a second PostgREST schema.
  return client as unknown as SupabaseClient
}
const entry = (aliment: string, quantite_g: number) => ({ aliment, quantite_g, kcal: 0, proteines: 0, glucides: 0, lipides: 0 })
const day = () => ({ repas: {
  petit_dejeuner: [entry("Flocons d'avoine secs", 100)],
  dejeuner: [entry('Blanc de poulet cuit', 200), entry('Riz basmati cuit', 300)],
  collation: [entry('Banane', 200), entry('Amandes', 50)],
  diner: [entry('Lentilles cuites', 300), entry("Huile d'olive", 10)],
} })
async function generate(overrides: Record<string, unknown> = {}) {
  const profileClient = state.client!.schema('public')
  const existing = await profileClient.from('profiles').select('id').eq('id', state.userId).maybeSingle()
  if (!existing.data) {
    const inserted = await profileClient.from('profiles').insert({ id: state.userId, calorie_goal: 2003, protein_goal: 123, carbs_goal: 268, fat_goal: 52 })
    expect(inserted.error).toBeNull()
  }
  const response = await POST(new Request(`${url}/api/generate-meal-plan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ calorie_goal: 2003, protein_goal: 123, carbs_goal: 268, fat_goal: 52, persist_generated_plan: true, ...overrides }),
  }) as NextRequest)
  const text = await response.text()
  const events = text.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)))
  return { response, events }
}
beforeEach(() => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'synthetic-provider-key')
  const realFetch = globalThis.fetch.bind(globalThis)
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    if (target.origin === 'https://api.anthropic.com') return Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(day()) }] })
    if (target.origin !== url) throw new Error('External network forbidden in integration test')
    target.pathname = target.pathname.replace(/^\/rest\/v1/, '') || '/'
    return realFetch(target, init)
  }))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('journal composer real persistence', () => {
  it('atomically inserts a meal, retries without duplicates and isolates owners', async () => {
    const owner = randomUUID(), other = randomUUID()
    const client = clientFor(owner, 'public')
    const food = {name:'Synthetic food',qty:100,kcal:100,prot:10,carb:10,fat:2}
    const rows = mealDraftRows([draftFood(food),draftFood(food)],owner,'2026-09-22','dejeuner')
    await persistMealDraft(client,rows)
    await persistMealDraft(client,rows)
    const read = await client.from('daily_food_logs').select('*').eq('user_id',owner)
    expect(read.error).toBeNull()
    expect(read.data).toHaveLength(2)
    const hidden = await clientFor(other,'public').from('daily_food_logs').select('*').eq('user_id',owner)
    expect(hidden.error).toBeNull()
    expect(hidden.data).toEqual([])
    const invalidBatch = mealDraftRows([draftFood(food),draftFood(food)],owner,'2026-09-22','diner')
    invalidBatch[1].user_id=other
    await expect(persistMealDraft(client,invalidBatch)).rejects.toThrow('MEAL_SAVE_FAILED')
    const unchanged=await client.from('daily_food_logs').select('id').eq('user_id',owner)
    expect(unchanged.data).toHaveLength(2)
  })
})

describe('real isolated preference persistence', () => {
  it('writes JSON settings with the profile service and restores exact goals on a fresh read', async () => {
    const userId = randomUUID()
    const client = clientFor(userId, 'public')
    const seed = await client.from('profiles').insert({ id: userId, current_weight: 80, height: 180, birth_date: '1996-01-01',
      gender: 'male', objective: 'cut', activity_level: 'moderate', calorie_goal: 2359,
      meal_preferences: { breakfast: ['Banane'], dietary_restrictions: 'synthetic existing preference' },
    }).select().single()
    expect(seed.error).toBeNull()
    const settings = { version: 1, macro_mode: 'ratio', ratios: { protein: 25, carbs: 50, fat: 25 } }
    const saved = await updateProfile(userId, { calorie_goal: 2200, protein_goal: 138, carbs_goal: 275, fat_goal: 61,
      meal_preferences: { ...seed.data.meal_preferences, nutrition_settings: settings },
    }, client)
    expect(saved.error).toBeNull()
    const reloaded = await getProfile(userId, clientFor(userId, 'public'), true)
    expect(reloaded).toMatchObject({ calorie_goal: 2200, protein_goal: 138, carbs_goal: 275, fat_goal: 61,
      meal_preferences: { ...seed.data.meal_preferences, nutrition_settings: settings },
    })
    expect(getNutritionPreferencesInitialState(reloaded!, Date.parse('2026-09-19T12:00:00Z'))).toMatchObject({
      adjustment: -559, macroMode: 'ratio', ratios: settings.ratios,
    })
    const stranger = clientFor(randomUUID(), 'public')
    expect((await stranger.from('profiles').select().eq('id', userId).maybeSingle()).data).toBeNull()
    const forbidden = await updateProfile(userId, { calorie_goal: 1000 }, stranger)
    expect(forbidden.error).not.toBeNull()
    expect((await getProfile(userId, clientFor(userId, 'public'), true))?.calorie_goal).toBe(2200)
  })
})

describe.each(['public', 'canonical'])('real isolated persistence (%s schema)', schema => {
  it('rejects one of two concurrent activations from the same snapshot', async () => {
    state.userId = randomUUID(); state.client = clientFor(state.userId, schema)
    const generated = await generate()
    const plan = generated.events.at(-1).plan
    const snapshot = await loadActivationSnapshot(state.client, state.userId)
    expect(snapshot).not.toBeNull()
    const results = await Promise.all([
      replacePersonalMealPlan(state.client, state.userId, plan, snapshot!),
      replacePersonalMealPlan(clientFor(state.userId, schema), state.userId, plan, { ...snapshot!, operationId: randomUUID() }),
    ])
    expect(results.filter(result => result.ok)).toHaveLength(1)
    expect(results.filter(result => !result.ok)).toEqual([{ ok: false, stage: 'conflict' }])
    const activeKey = schema === 'public' ? 'is_active' : 'active'
    const rows = await state.client.from('meal_plans').select('*').eq(activeKey, true)
    expect(rows.data).toHaveLength(1)
  })
  it('generates seven days, replaces the plan and reloads exactly the persisted result', async () => {
    state.userId = randomUUID(); state.client = clientFor(state.userId, schema)
    const first = await generate()
    expect(first.events.at(-1)?.type).toBe('done')
    const loaded = await readActivePersonalMealPlan(clientFor(state.userId, schema), state.userId)
    expect(loaded.error).toBeNull()
    expect(loaded.data?.plan).toEqual(first.events.at(-1).plan)
    expect(Object.keys(parseMealPlan(loaded.data!.plan))).toHaveLength(7)
    const profile = { calorie_goal: 2003, protein_goal: 123, carbs_goal: 268, fat_goal: 52 }
    expect(getNutritionPlanConsistency(loaded.data!.plan, profile)).toBe('aligned')
    expect(getNutritionPlanConsistency(loaded.data!.plan, { ...profile, calorie_goal: 2400 })).toBe('outdated')
    const second = await generate()
    expect(second.events.at(-1)?.type).toBe('done')
    const reloaded = await readActivePersonalMealPlan(clientFor(state.userId, schema), state.userId)
    expect(reloaded.data?.id).not.toBe(loaded.data?.id)
    const rows = await state.client.from('meal_plans').select('*')
    expect(rows.error).toBeNull()
    expect(rows.data).toHaveLength(2)
    const activeKey = schema === 'public' ? 'is_active' : 'active'
    expect(rows.data!.filter(row => row[activeKey])).toHaveLength(1)
  })
  it('preserves the old plan after allergen validation fails', async () => {
    state.userId = randomUUID(); state.client = clientFor(state.userId, schema)
    await generate()
    const before = await readActivePersonalMealPlan(state.client, state.userId)
    const rejected = await generate({ allergies: ['tree_nuts'] })
    expect(rejected.events.at(-1)?.type).toBe('error')
    const after = await readActivePersonalMealPlan(clientFor(state.userId, schema), state.userId)
    expect(after.data).toEqual(before.data)
    expect(getNutritionPlanConsistency(after.data!.plan, { calorie_goal: 2003, protein_goal: 123, carbs_goal: 268, fat_goal: 52, allergies: ['tree_nuts'] })).toBe('outdated')
  })
  it('cannot read, replace or deactivate another user’s plan', async () => {
    state.userId = randomUUID(); state.client = clientFor(state.userId, schema)
    await generate()
    const stranger = clientFor(randomUUID(), schema)
    const hidden = await readActivePersonalMealPlan(stranger, state.userId)
    expect(hidden.error).toBeNull(); expect(hidden.data).toBeNull()
    const activeKey = schema === 'public' ? 'is_active' : 'active'
    const planKey = schema === 'public' ? 'plan_data' : 'plan'
    const forged = await stranger.from('meal_plans').insert({ user_id: state.userId, [activeKey]: true, [planKey]: {} })
    expect(forged.error?.code).toBe('42501')
    const changed = await stranger.from('meal_plans').update({ [activeKey]: false }).eq('user_id', state.userId).select('id')
    expect(changed.error).toBeNull(); expect(changed.data).toEqual([])
    expect((await readActivePersonalMealPlan(state.client, state.userId)).data?.active).toBe(true)
  })
})
