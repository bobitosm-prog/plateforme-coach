import { describe, expect, it } from 'vitest'
import {
  auditSupabaseConstructions,
  compareSupabaseConstructionBaseline,
  constructionKey,
} from '../../lib/supabase/construction-guard'
import { checkSupabaseConstructionPolicy } from '../../scripts/check-supabase-client-constructions'

const audit = (source: string) => auditSupabaseConstructions('fixture.ts', source)

describe('Supabase construction guard', () => {
  it('rejects direct, renamed and namespace constructors', () => {
    const direct = audit("import { createClient } from '@supabase/supabase-js'\ncreateClient('u', 'k')")
    const renamed = audit("import { createClient as build } from '@supabase/supabase-js'\nbuild('u', 'k')")
    const namespace = audit("import * as supabase from '@supabase/supabase-js'\nsupabase.createClient('u', 'k')")
    expect(direct.constructions).toHaveLength(1)
    expect(renamed.constructions).toHaveLength(1)
    expect(namespace.constructions).toHaveLength(1)
  })

  it('rejects require aliases and direct wrappers', () => {
    const required = audit("const { createClient: build } = require('@supabase/supabase-js')\nbuild('u', 'k')")
    const wrapper = audit("import { createBrowserClient } from '@supabase/ssr'\nexport const makeDb = () => createBrowserClient('u', 'k')")
    expect(required.constructions).toHaveLength(1)
    expect(wrapper.constructions).toHaveLength(1)
  })

  it('rejects dynamic constructors and unused runtime constructor imports', () => {
    const dynamic = audit("import('@supabase/ssr').then(({ createBrowserClient }) => createBrowserClient('u', 'k'))")
    const unused = audit("import { createClient } from '@supabase/supabase-js'")
    expect(dynamic.constructions).toHaveLength(1)
    expect(unused.uncalledRuntimeImports).toEqual([
      '@supabase/supabase-js:createClient:createClient',
    ])
  })

  it('rejects deprecated auth-helper constructors', () => {
    const helper = audit(
      "import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'\n"
      + 'createRouteHandlerClient({ cookies: () => ({}) })',
    )
    expect(helper.constructions[0]?.constructor).toBe('createRouteHandlerClient')
  })

  it('allows type-only imports and injected repositories', () => {
    const typeOnly = audit("import type { SupabaseClient } from '@supabase/supabase-js'\ntype Db = SupabaseClient")
    const injected = audit('export const repository = (client: { from(name: string): unknown }) => client.from(\"profiles\")')
    expect(typeOnly).toEqual({ constructions: [], uncalledRuntimeImports: [] })
    expect(injected).toEqual({ constructions: [], uncalledRuntimeImports: [] })
  })

  it('accepts an exact canonical occurrence and rejects additions or moved debt', () => {
    const found = audit("import { createClient } from '@supabase/supabase-js'\ncreateClient('u', 'k')").constructions
    const expected = found.map(constructionKey)
    expect(compareSupabaseConstructionBaseline(found, expected).ok).toBe(true)
    expect(compareSupabaseConstructionBaseline(
      [...found, { ...found[0], line: 3 }],
      expected,
    ).added).toHaveLength(1)
    expect(compareSupabaseConstructionBaseline([], expected).missing).toEqual(expected)
  })

  it('matches the complete repository baseline', () => {
    const result = checkSupabaseConstructionPolicy()
    expect(result.uncalledRuntimeImports).toEqual([])
    expect(result.comparison).toEqual({ ok: true, added: [], missing: [] })
  })
})
