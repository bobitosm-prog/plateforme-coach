import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

const migratedSites = [
  { file: 'app/login/LoginPageContent.tsx', boundary: 'getSupabaseBrowserClient' },
  { file: 'app/register-client/RegisterClientContent.tsx', boundary: 'getSupabaseBrowserClient' },
  { file: 'app/components/BugReport.tsx', boundary: 'getSupabaseBrowserClient' },
  { file: 'app/join/JoinPageContent.tsx', boundary: 'getSupabaseBrowserClient' },
  { file: 'app/api/user/sync-locale/service.ts', boundary: 'createSupabaseServerClient' },
  { file: 'app/api/user/locale/service.ts', boundary: 'createSupabaseServerClient' },
  { file: 'app/api/log-error/service.ts', boundary: 'createSupabaseServerClient' },
  { file: 'app/api/ai-quota/service.ts', boundary: 'createSupabaseServerClient' },
  { file: 'app/api/coach/default-assignment/route.ts', boundary: 'createSupabaseAdminClient' },
  { file: 'app/api/coach/disconnect/route.ts', boundary: 'createSupabaseAdminClient' },
] as const

const legacyConstructor = /\b(?:createBrowserClient|createServerClient|createClient)\s*\(/

describe('representative Supabase access migration inventory', () => {
  it('contains exactly ten application sites, not tests or imports', () => {
    expect(migratedSites).toHaveLength(10)
    expect(new Set(migratedSites.map(site => site.file)).size).toBe(10)
    expect(migratedSites.every(site => site.file.startsWith('app/'))).toBe(true)
  })

  it.each(migratedSites)('$file uses $boundary without a legacy constructor', ({ file, boundary }) => {
    const source = read(file)
    expect(source).toContain(`${boundary}(`)
    expect(source).not.toMatch(legacyConstructor)
  })

  it('keeps server-only and service-role boundaries out of selected browser files', () => {
    for (const { file } of migratedSites.slice(0, 4)) {
      const source = read(file)
      expect(source).not.toContain("@/lib/supabase/server")
      expect(source).not.toContain("@/lib/supabase/admin")
      expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
      expect(source).not.toContain("server-only")
    }
  })

  it('keeps the current legacy application constructor count at 53', () => {
    const files = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'lib'))]
      .filter(file => /\.(?:ts|tsx)$/.test(file))
      .filter(file => !/lib\/supabase\/(?:browser|server|admin)\.ts$/.test(file))
    const count = files.reduce((total, file) => total + (fs.readFileSync(file, 'utf8').match(new RegExp(legacyConstructor.source, 'g'))?.length ?? 0), 0)
    expect(count).toBe(53)
  })
})

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}
