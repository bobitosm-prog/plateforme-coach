import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(process.cwd(), 'lib/ai/provider')
const source = readdirSync(root)
  .filter(file => file.endsWith('.ts'))
  .map(file => readFileSync(join(root, file), 'utf8'))
  .join('\n')

describe('AI resilience architecture', () => {
  it('remains vendor, framework, persistence and browser independent', () => {
    expect(source).not.toMatch(/from ['"](?:react|next|@anthropic-ai\/sdk|@supabase|.*app\/)/)
    expect(source).not.toMatch(/\b(?:fetch|window|document|localStorage|sessionStorage|createClient|service_role)\b/)
  })

  it('does not contain implicit retry loops, raw error fields or model fallback', () => {
    expect(source).not.toMatch(/while\s*\([^)]*retry|setTimeout|Retry-After/i)
    expect(readFileSync(join(root, 'errors.ts'), 'utf8')).not.toMatch(/\bmessage\s*:/)
    expect(source).not.toMatch(/fallbackModel|raw(?:Response|Body|Prompt)|apiKey|email\s*:/i)
  })

  it('exports policy, decisions, attempts, parser and orchestrator', () => {
    for (const name of ['AiRetryPolicy', 'AiRetryDecision', 'AiAttemptMetadata', 'AiOperationResult', 'parseAiRetryAfter', 'decideAiRetry', 'executeAiWithResilience']) {
      expect(source).toContain(name)
    }
  })
})
