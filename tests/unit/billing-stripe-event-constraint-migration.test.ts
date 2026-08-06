import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260806100000_enforce_payments_stripe_event_unique_constraint.sql',
  ),
  'utf8',
)

describe('payments stripe_event_id unique constraint migration', () => {
  it('refuses existing non-null duplicates before replacing the partial index', () => {
    expect(migration).toMatch(/stripe_event_id\s+IS\s+NOT\s+NULL[\s\S]*HAVING\s+count\(\*\)\s*>\s*1/i)
    expect(migration).toMatch(/RAISE\s+EXCEPTION\s+'duplicate stripe_event_id values exist'/i)
    expect(migration.indexOf('duplicate stripe_event_id values exist'))
      .toBeLessThan(migration.indexOf('DROP INDEX public.payments_stripe_event_id_key'))
  })

  it('creates an inferable UNIQUE constraint without making stripe_event_id required', () => {
    expect(migration).toMatch(/ADD\s+CONSTRAINT\s+payments_stripe_event_id_key\s+UNIQUE\s*\(stripe_event_id\)/i)
    expect(migration).not.toMatch(/stripe_event_id\s+SET\s+NOT\s+NULL/i)
    expect(migration).not.toMatch(/UPDATE\s+public\.payments|DELETE\s+FROM\s+public\.payments/i)
  })

  it('fails closed when a same-named constraint or index has an incompatible structure', () => {
    expect(migration).toMatch(/existing_constraint\s*<>\s*'UNIQUE \(stripe_event_id\)'/i)
    expect(migration).toMatch(/index has an incompatible definition/i)
  })
})
