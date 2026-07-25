import { describe, expect, it } from 'vitest'
import { checkAndUnlockBadges, type Badge } from '@/lib/check-badges'

const owner = 'owner-1'
const macrosBadge: Badge = {
  id: 'macros_perfect',
  name: 'Macros Parfaits',
  description: 'Macros cible 3j',
  category: 'nutrition',
  xp_reward: 35,
  icon: 'target',
  condition_type: 'macros_on_target',
  condition_value: 3,
  sort_order: 5,
}

interface StubOptions {
  badges?: Badge[]
  goal?: unknown
  goalError?: unknown
  logs?: unknown
  logsError?: unknown
  count?: number
}

function createSupabaseStub(options: StubOptions = {}) {
  const writes: Array<{ table: string; payload: unknown }> = []
  const reads: string[] = []

  class Query implements PromiseLike<unknown> {
    private operation = 'select'

    constructor(private readonly table: string) {}

    select() {
      reads.push(this.table)
      return this
    }

    eq() {
      return this
    }

    order() {
      return this
    }

    limit() {
      return this
    }

    single() {
      return this
    }

    maybeSingle() {
      return this
    }

    not() {
      return this
    }

    upsert(payload: unknown) {
      this.operation = 'upsert'
      writes.push({ table: this.table, payload })
      return Promise.resolve({ error: null })
    }

    then<TResult1 = unknown, TResult2 = never>(
      onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      let value: unknown
      if (this.operation === 'upsert') {
        value = { error: null }
      } else if (this.table === 'badges') {
        value = { data: options.badges ?? [macrosBadge], error: null }
      } else if (this.table === 'user_badges') {
        value = { data: [], error: null }
      } else if (this.table === 'profiles') {
        value = {
          data: {
            calorie_goal: Object.prototype.hasOwnProperty.call(options, 'goal')
              ? options.goal
              : 100,
          },
          error: options.goalError ?? null,
        }
      } else if (this.table === 'daily_food_logs') {
        value = {
          data: options.logs ?? [],
          error: options.logsError ?? null,
          count: options.count ?? null,
        }
      } else {
        value = { data: null, error: null, count: options.count ?? 0 }
      }
      return Promise.resolve(value).then(onfulfilled, onrejected)
    }
  }

  return {
    client: {
      from(table: string) {
        return new Query(table)
      },
    },
    reads,
    writes,
  }
}

describe('C07 badge-service integration', () => {
  it('keeps the historical valid result and unlocks at three matching days', async () => {
    const stub = createSupabaseStub({
      logs: [
        { date: '2026-07-25', calories: 90 },
        { date: '2026-07-24', calories: 100 },
        { date: '2026-07-23', calories: 110 },
      ],
    })
    const result = await checkAndUnlockBadges(owner, stub.client)
    expect(result).toEqual({
      newlyUnlockedIds: ['macros_perfect'],
      currentValues: { macros_on_target: 3 },
    })
    expect(stub.writes.filter(write => write.table === 'user_badges')).toEqual([
      {
        table: 'user_badges',
        payload: {
          user_id: owner,
          badge_id: 'macros_perfect',
          celebrated: false,
        },
      },
    ])
  })

  it.each([
    ['absent goal', { goal: null }],
    ['invalid goal', { goal: -1 }],
    ['unknown consumption', {
      logs: [{ date: '2026-07-25', calories: null }],
    }],
    ['profile error', { goalError: new Error('profiles down') }],
    ['logs error', { logsError: new Error('logs down') }],
  ] as const)('keeps %s unavailable and never rewards it', async (_, options) => {
    const stub = createSupabaseStub(options)
    const result = await checkAndUnlockBadges(owner, stub.client)
    expect(result.currentValues).not.toHaveProperty('macros_on_target')
    expect(result.newlyUnlockedIds).toEqual([])
    expect(stub.writes.filter(write => write.table === 'user_badges')).toEqual([])
  })

  it('does not alter the calculation or unlock of another badge type', async () => {
    const workoutBadge: Badge = {
      ...macrosBadge,
      id: 'first_workout',
      condition_type: 'workout_count',
      condition_value: 1,
    }
    const stub = createSupabaseStub({ badges: [workoutBadge], count: 1 })
    const result = await checkAndUnlockBadges(owner, stub.client)
    expect(result).toEqual({
      newlyUnlockedIds: ['first_workout'],
      currentValues: { workout_count: 1 },
    })
  })
})
