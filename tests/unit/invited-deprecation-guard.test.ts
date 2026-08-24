import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveEffectiveEntitlement } from '@/lib/entitlements/effective-entitlement'
import type { ProfileUpdate } from '@/lib/profile-service'

const forbiddenProfileUpdate: ProfileUpdate = {
  // @ts-expect-error Subscription authority must use a dedicated server writer.
  subscription_type: 'invited',
}
void forbiddenProfileUpdate

const RUNTIME_ROOTS = ['app', 'lib'] as const
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx'])
const CENTRAL_FALLBACK = 'lib/entitlements/effective-entitlement.ts'
const HISTORICAL_MIGRATION = 'supabase/migrations/20260327_subscription_fields.sql'

const SUBSCRIPTION_FIELD = String.raw`(?:subscription_type|subscriptionType|p_subscription_type)`
const INVITED_LITERAL = String.raw`['\"]invited['\"]`

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return listSourceFiles(path)
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : []
  })
}

function invitedWriterPatterns(): RegExp[] {
  return [
    new RegExp(String.raw`\b${SUBSCRIPTION_FIELD}\b\s*:\s*${INVITED_LITERAL}`),
    new RegExp(String.raw`['\"]${SUBSCRIPTION_FIELD}['\"]\s*:\s*${INVITED_LITERAL}`),
    new RegExp(String.raw`\bSET\s+subscription_type\s*=\s*${INVITED_LITERAL}`, 'i'),
  ]
}

function hasInvitedWriter(source: string): boolean {
  return invitedWriterPatterns().some(pattern => pattern.test(source))
}

describe('legacy invited deprecation guard', () => {
  it.each([
    "update({ subscription_type: 'invited' })",
    "insert({ subscriptionType: 'invited' })",
    "upsert({ p_subscription_type: 'invited' })",
    "UPDATE profiles SET subscription_type = 'invited' WHERE id = user_id",
  ])('recognizes a forbidden invited writer: %s', source => {
    expect(hasInvitedWriter(source)).toBe(true)
  })

  it('blocks invited subscription writers from application runtime code', () => {
    const violations = RUNTIME_ROOTS
      .flatMap(root => listSourceFiles(root))
      .map(path => relative('.', path))
      .filter(path => hasInvitedWriter(readFileSync(path, 'utf8')))

    expect(violations).toEqual([])
  })

  it('prevents generic profile updates from mutating subscription authority', () => {
    const profileService = readFileSync('lib/profile-service.ts', 'utf8')

    expect(profileService).toContain('export type ProfileUpdate')
    expect(profileService).toMatch(/\[Field in SubscriptionAuthorityField\]\?: never/)
    expect(profileService).toMatch(/updates:\s*ProfileUpdate/)
  })

  it('keeps invited out of the writable admin subscription contract', () => {
    const route = readFileSync(
      'app/api/admin/users/[id]/subscription/route.ts',
      'utf8',
    )
    const dialog = readFileSync(
      'app/(application)/admin/users/_components/SubscriptionDialog.tsx',
      'utf8',
    )

    expect(route).not.toMatch(/z\.enum\(\[[\s\S]*?['\"]invited['\"][\s\S]*?\]\)\.nullable\(\)/)
    expect(dialog).not.toMatch(/value:\s*['\"]invited['\"]/)
    expect(route).toContain("'client_monthly'")
    expect(route).toContain("'lifetime'")
    expect(route).toContain("'trial'")
  })

  it('preserves historical invited reads only through the central fallback', () => {
    const authority = readFileSync(CENTRAL_FALLBACK, 'utf8')

    expect(authority).toMatch(/subscriptionType\s*===\s*['\"]invited['\"]/)
    expect(resolveEffectiveEntitlement({
      subscriptionType: 'invited',
      legacyEntitlements: [],
    })).toEqual({ type: 'legacy_invited', source: 'subscription' })
  })

  it('keeps the replacement path on legacy entitlements instead of subscriptions', () => {
    const writer = readFileSync(
      'lib/entitlements/admin-legacy-entitlement-writer.ts',
      'utf8',
    )

    expect(writer).toContain("from('legacy_entitlements')")
    expect(writer).toContain("type: 'legacy_invited_access'")
    expect(writer).not.toMatch(/profiles|subscription_type|subscription_status|stripe/i)
  })

  it('allows the historical migration without treating it as runtime authority', () => {
    const migration = readFileSync(HISTORICAL_MIGRATION, 'utf8')

    expect(hasInvitedWriter(migration)).toBe(true)
    expect(RUNTIME_ROOTS).not.toContain('supabase')
    expect(RUNTIME_ROOTS).not.toContain('tests')
  })
})
