import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CANONICAL_SUPABASE_CONSTRUCTIONS,
  LEGACY_SUPABASE_CONSTRUCTIONS,
} from '../../lib/supabase/construction-baseline'

describe('Supabase construction guard architecture', () => {
  it('uses exact occurrence keys without directory or wildcard allowlists', () => {
    const all = [...CANONICAL_SUPABASE_CONSTRUCTIONS, ...LEGACY_SUPABASE_CONSTRUCTIONS]
    expect(new Set(all).size).toBe(all.length)
    expect(CANONICAL_SUPABASE_CONSTRUCTIONS).toHaveLength(4)
    expect(LEGACY_SUPABASE_CONSTRUCTIONS).toHaveLength(53)
    const exactKey = new RegExp(
      '^(?:app|lib)/.+\\.tsx?:\\d+:\\d+:(?:createClient|createBrowserClient|createServerClient)$'
      + '|^proxy\\.ts:\\d+:\\d+:createServerClient$',
    )
    for (const key of all) {
      expect(key).toMatch(exactKey)
      expect(key).not.toMatch(/[?*]/)
    }
  })

  it('does not depend on Git state or a local diff', () => {
    const source = readFileSync('scripts/check-supabase-client-constructions.ts', 'utf8')
    expect(source).not.toMatch(/git|diff|staged|HEAD/)
    expect(source).toContain("const roots = ['app', 'lib']")
  })
})
