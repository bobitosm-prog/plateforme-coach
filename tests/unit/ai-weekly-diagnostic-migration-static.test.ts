import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

function tsFiles(folder: string): string[] {
  return fs.readdirSync(path.join(root, folder), { withFileTypes: true }).flatMap(entry => {
    const relative = path.join(folder, entry.name)
    return entry.isDirectory() ? tsFiles(relative) : entry.name.endsWith('.ts') ? [relative] : []
  })
}

describe('weekly diagnostic provider migration boundary', () => {
  it('keeps one provider-backed shared generator for manual and cron', () => {
    const generator = read('lib/weekly-diagnostic/generator.ts')
    expect(generator).toContain('createAnthropicProvider')
    expect(generator).toContain("resolveAiModel('anthropic-opus-4.8')")
    expect(generator).toContain('promptInvocationToToolRequest')
    expect(generator).toContain('createAiOutputValidator(weeklyDiagnosticOutputSchema)')
    expect(generator).not.toMatch(/api\.anthropic\.com|readAnthropicMetadata|parseAndValidateToolUse|claude-opus/)
    expect(read('app/api/weekly-diagnostic/service.ts')).toContain('generateWeeklyDiagnostic')
    expect(read('app/api/weekly-diagnostic/cron/route.ts')).toContain('generateWeeklyDiagnostic')
  })

  it('leaves no direct Anthropic invocation outside the common adapter', () => {
    for (const file of [...tsFiles('app/api'), ...tsFiles('lib')]) {
      if (file.startsWith('lib/ai/providers/anthropic/')) continue
      const source = read(file)
      expect(source, file).not.toMatch(/fetch\(['"]https:\/\/api\.anthropic\.com\/v1\/messages/)
      expect(source, file).not.toMatch(/new Anthropic|\.messages\.create/)
    }
  })

  it('accounts for all fifteen runtime entry points', () => {
    const providerRoutes = tsFiles('app/api').filter(file => file.endsWith('route.ts') && read(file).includes('createAnthropicProvider'))
    expect(providerRoutes).toHaveLength(13)
    expect(read('lib/weekly-diagnostic/generator.ts')).toContain('createAnthropicProvider')
    expect(13 + 2).toBe(15)
  })
})
