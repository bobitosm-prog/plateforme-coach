import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function filesRecursively(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? filesRecursively(path) : [path]
  })
}

describe('Training adapter architecture', () => {
  it('does not import UI, framework, Supabase, browser or application modules', () => {
    const files = [join(process.cwd(), 'lib/training/model.ts'), ...filesRecursively(join(process.cwd(), 'lib/training/adapters'))]
    const forbidden = [
      /from\s+['"]react(?:\/|['"])/,
      /from\s+['"]next(?:\/|['"])/,
      /@supabase\//,
      /lib\/supabase/,
      /from\s+['"][^'"]*app\//,
      /\bwindow\b/,
      /\bdocument\b/,
      /localStorage|sessionStorage/,
    ]
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const pattern of forbidden) expect(source, `${file} must not match ${pattern}`).not.toMatch(pattern)
    }
  })

  it('contains no database writes or network calls', () => {
    const source = [join(process.cwd(), 'lib/training/model.ts'), ...filesRecursively(join(process.cwd(), 'lib/training/adapters'))]
      .map(file => readFileSync(file, 'utf8'))
      .join('\n')
    expect(source).not.toMatch(/createClient|createServerClient|createBrowserClient/)
    expect(source).not.toMatch(/\.(insert|update|upsert|delete)\s*\(/)
    expect(source).not.toMatch(/\bfetch\s*\(/)
  })
})
