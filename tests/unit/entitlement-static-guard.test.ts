import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOTS = ['app', 'lib'] as const
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx'])

const CENTRAL_AUTHORITY = 'lib/entitlements/effective-entitlement.ts'
const ALLOWED_HISTORICAL_DISPLAY = new Set([
  'app/api/admin/stripe/stats/route.ts',
  'app/components/tabs/profile/AccountSection.tsx',
])

const SUBSCRIPTION_FIELD = String.raw`(?:subscription_type|subscriptionType|subscription_status|subscriptionStatus)`
const INVITED_LITERAL = String.raw`["']invited["']`

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return listSourceFiles(path)
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : []
  })
}

function directDecisionPatterns(): RegExp[] {
  return [
    new RegExp(String.raw`\b${SUBSCRIPTION_FIELD}\b\s*[!=]==?\s*${INVITED_LITERAL}`),
    new RegExp(String.raw`${INVITED_LITERAL}\s*[!=]==?\s*\b${SUBSCRIPTION_FIELD}\b`),
    new RegExp(
      String.raw`switch\s*\([^)]*\b${SUBSCRIPTION_FIELD}\b[^)]*\)[\s\S]{0,500}?case\s*${INVITED_LITERAL}`,
    ),
    new RegExp(
      String.raw`\[[^\]]*${INVITED_LITERAL}[^\]]*\]\.includes\([^)]*\b${SUBSCRIPTION_FIELD}\b[^)]*\)`,
    ),
    new RegExp(
      String.raw`new\s+Set\s*\([^)]*${INVITED_LITERAL}[^)]*\)\.has\([^)]*\b${SUBSCRIPTION_FIELD}\b[^)]*\)`,
    ),
  ]
}

function aliasDecisionPatterns(source: string): RegExp[] {
  const aliases = [...source.matchAll(new RegExp(
    String.raw`\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*\b${SUBSCRIPTION_FIELD}\b`,
    'g',
  ))].map(match => match[1])

  return aliases.flatMap(alias => [
    new RegExp(String.raw`\b${alias}\b\s*[!=]==?\s*${INVITED_LITERAL}`),
    new RegExp(String.raw`${INVITED_LITERAL}\s*[!=]==?\s*\b${alias}\b`),
    new RegExp(
      String.raw`switch\s*\(\s*${alias}\s*\)[\s\S]{0,500}?case\s*${INVITED_LITERAL}`,
    ),
  ])
}

function hasInvitedRuntimeDecision(source: string): boolean {
  return [...directDecisionPatterns(), ...aliasDecisionPatterns(source)]
    .some(pattern => pattern.test(source))
}

describe('entitlement invited static guard', () => {
  it.each([
    "if (profile.subscription_type === 'invited') deny()",
    "if ('invited' !== subscriptionStatus) allow()",
    "const status = profile.subscription_status\nif (status === 'invited') deny()",
    "switch (subscriptionType) { case 'invited': deny() }",
    "if (['invited'].includes(profile.subscription_type)) deny()",
    "if (new Set(['invited']).has(subscriptionType)) deny()",
  ])('recognizes a forbidden runtime decision: %s', source => {
    expect(hasInvitedRuntimeDecision(source)).toBe(true)
  })

  it('does not reject capability-derived or display-only invited naming', () => {
    expect(hasInvitedRuntimeDecision(
      "const isInvited = capabilities.coachManaged\nrenderLabel('invited')",
    )).toBe(false)
  })

  it('blocks direct invited product decisions outside the central authority', () => {
    const violations = ROOTS
      .flatMap(root => listSourceFiles(root))
      .map(path => relative('.', path))
      .filter(path => (
        path !== CENTRAL_AUTHORITY
        && !ALLOWED_HISTORICAL_DISPLAY.has(path)
        && hasInvitedRuntimeDecision(readFileSync(path, 'utf8'))
      ))

    expect(violations).toEqual([])
  })

  it('keeps the transitional invited fallback in the central resolver', () => {
    const authority = readFileSync(CENTRAL_AUTHORITY, 'utf8')

    expect(authority).toContain('resolveEffectiveEntitlement')
    expect(authority).toMatch(/subscriptionType\s*===\s*['"]invited['"]/)
  })

  it('keeps historical display exceptions explicit and bounded', () => {
    for (const path of ALLOWED_HISTORICAL_DISPLAY) {
      expect(hasInvitedRuntimeDecision(readFileSync(path, 'utf8')), path).toBe(true)
    }
  })

  it('does not scan migrations or tests as runtime consumers', () => {
    expect(ROOTS).not.toContain('supabase')
    expect(ROOTS).not.toContain('tests')
  })
})
