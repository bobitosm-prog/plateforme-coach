import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listAiModels } from '../../lib/ai/models'

const root = join(process.cwd(), 'lib/ai/models')
const source = readdirSync(root).filter(file => file.endsWith('.ts')).map(file => readFileSync(join(root, file), 'utf8')).join('\n')

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? filesUnder(path) : path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : []
  })
}

describe('AI model registry architecture', () => {
  it('is pure and independent from vendor SDK, framework, persistence, browser and network', () => {
    expect(source).not.toMatch(/from ['"](?:react|next|@anthropic-ai\/sdk|@supabase|.*app\/)/)
    expect(source).not.toMatch(/\b(?:fetch|window|document|localStorage|sessionStorage|createClient|service_role)\b/)
  })

  it('contains no secrets, prompts, floating arithmetic or implicit fallback', () => {
    expect(source).not.toMatch(/apiKey|systemPrompt|userPrompt|fallbackModel|Math\.(?:floor|ceil)\s*\(/)
    expect(source).not.toMatch(/microsPerMillionTokens:\s*\d+\.\d+/)
  })

  it('registers every model literal used by runtime app and lib code', () => {
    const runtimeFiles = [...filesUnder(join(process.cwd(), 'app/api')), ...filesUnder(join(process.cwd(), 'lib'))]
      .filter(file => !file.startsWith(root))
    const runtimeModels = new Set<string>()
    for (const file of runtimeFiles) {
      for (const match of readFileSync(file, 'utf8').matchAll(/['"](claude-(?:haiku|sonnet|opus)-[A-Za-z0-9._-]+)['"]/g)) runtimeModels.add(match[1])
    }
    expect([...runtimeModels].sort()).toEqual(['claude-haiku-4-5-20251001', 'claude-opus-4-8', 'claude-sonnet-4-6'])
    const activeProviderIds = listAiModels().filter(model => model.status === 'active').map(model => model.providerModelId).sort()
    expect(activeProviderIds).toEqual([...runtimeModels].sort())
  })
})
