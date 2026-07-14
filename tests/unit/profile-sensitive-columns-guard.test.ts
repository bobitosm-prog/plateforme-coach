import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260714233000_fix_profile_sensitive_columns_guard.sql'),
  'utf8',
)
const bootstrap = readFileSync(
  resolve(process.cwd(), 'tests/integration/coach-invitations-bootstrap.sql'),
  'utf8',
)

describe('profile sensitive columns guard migration', () => {
  it('uses optional-key JSONB comparisons without static legacy-column access', () => {
    expect(migration).toContain('v_old jsonb := to_jsonb(OLD)')
    expect(migration).toContain('v_new jsonb := to_jsonb(NEW)')
    expect(migration).not.toMatch(/NEW\.subscription_price|OLD\.subscription_price/i)
    expect(migration).toContain("'subscription_price'")
  })

  it('keeps every current authority field and historical optional key protected', () => {
    for (const column of [
      'role', 'status', 'subscription_type', 'subscription_status',
      'subscription_end_date', 'trial_ends_at', 'stripe_customer_id',
      'stripe_subscription_id', 'stripe_account_id', 'beta_campaign_id',
      'subscription_price', 'stripe_onboarding_complete',
    ]) {
      expect(migration).toContain(`'${column}'`)
    }
    expect(migration).toContain("ERRCODE = '42501'")
    expect(migration).toContain('SET search_path TO pg_catalog, public')
  })

  it('keeps the invitation bootstrap aligned with the canonical absent column', () => {
    const profileTable = bootstrap.slice(
      bootstrap.indexOf('CREATE TABLE public.profiles'),
      bootstrap.indexOf('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY'),
    )
    expect(profileTable).not.toContain('subscription_price')
    expect(bootstrap).not.toMatch(/NEW\.subscription_price|OLD\.subscription_price/i)
  })
})
