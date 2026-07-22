import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ generate: vi.fn(), sendNotification: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: mocks.sendNotification } }))
vi.mock('@/lib/ai/providers/anthropic', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/providers/anthropic')>()),
  createAnthropicProvider: () => ({ generate: mocks.generate }),
}))

import { generateWeeklyDiagnostic } from '@/lib/weekly-diagnostic/generator'
import { validDiagnosticOutput } from '../fixtures/ai-output-schemas'

function success(tokens?: { inputTokens: number; outputTokens: number }) {
  return {
    ok: true as const, output: 'tool' as const, value: structuredClone(validDiagnosticOutput),
    metadata: { correlationId: 'diag-correlation', requestedModel: 'claude-opus-4-8', actualModel: 'claude-opus-4-8', stopReason: 'tool_use' as const, usage: tokens },
  }
}

function failure(code: 'provider_refused' | 'network_error' | 'invalid_output' | 'cancelled' | 'quota_exceeded') {
  return { ok: false as const, error: { code, retryable: code === 'network_error' || code === 'quota_exceeded' }, metadata: { correlationId: 'diag-correlation', requestedModel: 'claude-opus-4-8' } }
}

function createDatabase(options?: { insertError?: boolean; pushSubscriptions?: boolean }) {
  const events: string[] = []
  const inserted: Array<Record<string, unknown>> = []
  let weeklyReads = 0
  const from = vi.fn((table: string) => {
    let operation: 'read' | 'insert' | 'update' = 'read'
    let payload: Record<string, unknown> | undefined
    const result = () => {
      if (table === 'daily_food_logs') return { data: [{ date: '2026-07-13', calories: 1900, protein: 140, carbs: 200, fat: 60 }], error: null }
      if (table === 'weight_logs') return { data: [{ date: '2026-07-13', poids: 75 }, { date: '2026-07-19', poids: 74.5 }], error: null }
      if (table === 'workout_sessions') return { data: [], error: null }
      if (table === 'push_subscriptions') return { data: options?.pushSubscriptions ? [{ id: 'subscription-one', subscription: { endpoint: 'https://push.test' } }] : [], error: null }
      if (operation === 'update') return { data: null, error: null }
      return { data: null, error: null }
    }
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'gte', 'lt', 'order', 'limit', 'in']) builder[method] = vi.fn(() => builder)
    builder.or = vi.fn(() => Promise.resolve(result()))
    builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve)
    builder.maybeSingle = vi.fn(() => {
      if (table === 'weekly_diagnostics') weeklyReads++
      return Promise.resolve({ data: null, error: null })
    })
    builder.single = vi.fn(() => {
      if (table === 'profiles' && operation === 'read') return Promise.resolve({ data: { objective: 'perdre', calorie_goal: 1900, protein_goal: 140, onboarding_answers: { sessions_per_week: 4 } }, error: null })
      if (table === 'weekly_diagnostics' && operation === 'insert') {
        events.push('persist')
        if (options?.insertError) return Promise.resolve({ data: null, error: { message: 'private sql detail' } })
        inserted.push(payload ?? {})
        return Promise.resolve({ data: { id: 'diag-synthetic', score_semaine: validDiagnosticOutput.score_semaine }, error: null })
      }
      return Promise.resolve(result())
    })
    builder.insert = vi.fn((value: Record<string, unknown>) => { operation = 'insert'; payload = value; return builder })
    builder.update = vi.fn(() => { operation = 'update'; events.push('schedule'); return builder })
    builder.delete = vi.fn(() => builder)
    return builder
  })
  return { client: { from }, events, inserted, weeklyReads }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  delete process.env.VAPID_PRIVATE_KEY
  mocks.generate.mockResolvedValue(success({ inputTokens: 80, outputTokens: 20 }))
})

describe('weekly diagnostic shared generator', () => {
  it('preserves the prompt contract, validates once, persists, schedules and returns metadata', async () => {
    const database = createDatabase()
    const result = await generateWeeklyDiagnostic('synthetic-user', database.client as never, { correlationId: 'diag-correlation' })
    expect(result).toMatchObject({ diagnostic_id: 'diag-synthetic', providerModel: 'claude-opus-4-8', tokens: { inputTokens: 80, outputTokens: 20 } })
    const [request, context] = mocks.generate.mock.calls[0]
    expect(request).toMatchObject({ output: 'tool', model: 'claude-opus-4-8', maxTokens: 2048, forcedTool: 'weekly_diagnostic_output', temperature: undefined })
    expect(request.messages[0].content[0].text).toContain('Analyse cette semaine et produis un diagnostic complet')
    expect(context).toMatchObject({ correlationId: 'diag-correlation' })
    expect(database.inserted[0]).toMatchObject({ ai_model: 'claude-opus-4-8', ai_tokens_used: 100, score_semaine: validDiagnosticOutput.score_semaine })
    expect(database.events).toEqual(['persist', 'schedule'])
  })

  it('keeps unknown tokens distinct from zero in persistence', async () => {
    mocks.generate.mockResolvedValue(success())
    const database = createDatabase()
    await generateWeeklyDiagnostic('synthetic-user', database.client as never, { correlationId: 'diag-correlation' })
    expect(database.inserted[0]).toMatchObject({ ai_tokens_used: null })
  })

  it.each([
    ['provider_refused', 'Erreur IA', 'provider_error'],
    ['network_error', 'Erreur IA', 'provider_error'],
    ['invalid_output', 'Format IA invalide', 'invalid_output'],
    ['quota_exceeded', 'Erreur IA (429)', 'provider_quota'],
    ['cancelled', 'Erreur interne', 'request_cancelled'],
  ] as const)('fails closed after %s without persistence or notification', async (code, error, reasonCode) => {
    mocks.generate.mockResolvedValue(failure(code))
    const database = createDatabase()
    const result = await generateWeeklyDiagnostic('synthetic-user', database.client as never, { correlationId: 'diag-correlation' })
    expect(result).toMatchObject({ error, reasonCode })
    expect(database.inserted).toHaveLength(0)
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  it('expurgates persistence failures and never notifies', async () => {
    const database = createDatabase({ insertError: true })
    const result = await generateWeeklyDiagnostic('synthetic-user', database.client as never, { correlationId: 'diag-correlation' })
    expect(result).toMatchObject({ error: 'Erreur sauvegarde', reasonCode: 'persistence_failed' })
    expect(JSON.stringify(result)).not.toContain('private sql detail')
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  it('keeps push failure best-effort after successful persistence', async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-key'
    process.env.VAPID_PRIVATE_KEY = 'private-key'
    mocks.sendNotification.mockRejectedValue(new Error('private push detail'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const database = createDatabase({ pushSubscriptions: true })
    const result = await generateWeeklyDiagnostic('synthetic-user', database.client as never, { correlationId: 'diag-correlation' })
    expect(result).toMatchObject({ diagnostic_id: 'diag-synthetic' })
    await vi.waitFor(() => expect(mocks.sendNotification).toHaveBeenCalledOnce())
    expect(log.mock.calls.flat().join(' ')).not.toContain('private push detail')
    log.mockRestore()
  })
})
