import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(process.cwd(), 'lib/ai/provider')
const files = readdirSync(root).filter(file => file.endsWith('.ts'))
const source = files.map(file => readFileSync(join(root, file), 'utf8')).join('\n')
const errorsSource = readFileSync(join(root, 'errors.ts'), 'utf8')

describe('AI provider architecture', () => {
  it('stays independent from framework, vendor, data and browser runtimes', () => {
    expect(source).not.toMatch(/from ['"](?:react|next|@anthropic-ai\/sdk|@supabase|.*app\/)/)
    expect(source).not.toMatch(/\b(?:fetch|window|document|localStorage|sessionStorage|createClient|service_role)\b/)
  })

  it('does not carry raw error messages, prompts or provider-level retry logic', () => {
    expect(errorsSource).not.toMatch(/\bmessage\s*:/)
    expect(source).not.toMatch(/raw(?:Response|Body|Prompt)|apiKey|email|token\s*:/i)
    const providerContract = readFileSync(join(root, 'types.ts'), 'utf8')
    expect(providerContract).not.toMatch(/retry\s*\(|for\s*\([^)]*attempt/i)
  })

  it('exports the complete provider surface', () => {
    for (const name of ['AiProvider', 'AiGenerateRequest', 'AiResult', 'AiErrorCode', 'AiStopReason', 'AiStreamEvent', 'runAiOperation', 'validateStructuredOutput']) {
      expect(source).toContain(name)
    }
  })
})
