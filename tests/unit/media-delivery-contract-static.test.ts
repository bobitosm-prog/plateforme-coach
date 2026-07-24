import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const files = [
  'lib/media/delivery/types.ts',
  'lib/media/delivery/manifest.ts',
  'lib/media/delivery/naming.ts',
  'lib/media/delivery/resolver.ts',
  'lib/media/delivery/policy.ts',
  'lib/media/delivery/migration.ts',
]

describe('media delivery architecture', () => {
  it('is additive, provider-neutral and free of runtime/network/secrets', () => {
    const source = files.map(file => readFileSync(join(root, file), 'utf8')).join('\n')
    expect(source).not.toMatch(/from ['"](?:react|next|@supabase|@aws-sdk|cloudflare)/)
    expect(source).not.toMatch(/\b(?:fetch|createClient|service_role)\b/)
    expect(source).not.toContain('developpe-couche-barre')
  })

  it('does not migrate an application consumer', () => {
    const changed = readFileSync(join(root, 'app/components/media/DeferredVideo.tsx'), 'utf8')
    expect(changed).not.toContain('media/delivery')
  })
})
