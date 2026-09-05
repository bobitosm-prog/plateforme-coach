import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'
import { isCoachManagedClient } from '@/lib/permissions'
import { deriveClientPermissions } from '@/lib/use-client-permissions'

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx'])

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return listSourceFiles(path)
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : []
  })
}

describe('coach-managed terminology', () => {
  it('removes ambiguous invited names from runtime capability consumers', () => {
    const ambiguousNames = /\b(?:isInvited|isInvitedClient|guardInvitedClient)\b/
    const violations = ['app', 'lib']
      .flatMap(root => listSourceFiles(root))
      .map(path => relative('.', path))
      .filter(path => ambiguousNames.test(readFileSync(path, 'utf8')))

    expect(violations).toEqual([])
  })

  it('preserves the historical fallback as coach-managed capabilities', () => {
    const capabilities = resolveUserCapabilities({
      subscriptionType: 'invited',
    })

    expect(capabilities).toEqual({
      ai: false,
      training: false,
      nutrition: false,
      coachManaged: true,
    })
    expect(isCoachManagedClient({ subscription_type: 'invited' })).toBe(true)
    expect(deriveClientPermissions('invited', { kind: 'not_found' }))
      .toMatchObject({
        canCreatePrograms: false,
        canUseAI: false,
        canModifyNutrition: false,
        isCoachManaged: false,
        coachRelationStatus: 'not_found',
      })
  })

  it('keeps legacy entitlement authority separate from coach relations', () => {
    const entitlementAuthority = [
      'lib/entitlements/effective-entitlement.ts',
      'lib/entitlements/capabilities.ts',
      'lib/entitlements/admin-legacy-entitlement-writer.ts',
    ].map(path => readFileSync(path, 'utf8')).join('\n')
    const relationReader = readFileSync(
      'lib/coach-relations/repository.ts',
      'utf8',
    )

    expect(entitlementAuthority).not.toMatch(
      /coach_clients|invited_by_coach|relation\.status/,
    )
    expect(relationReader).not.toMatch(
      /legacy_entitlements|legacy_invited_access|subscription_status/,
    )
  })

  it('keeps subscription writes outside the legacy entitlement writer', () => {
    const writer = readFileSync(
      'lib/entitlements/admin-legacy-entitlement-writer.ts',
      'utf8',
    )

    expect(writer).not.toMatch(
      /profiles|subscription_type|subscription_status|stripe/i,
    )
  })
})
