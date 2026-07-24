import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const directory = 'lib/nutrition/plan-envelope'
const sources = readdirSync(directory)
  .filter(file => file.endsWith('.ts'))
  .map(file => readFileSync(`${directory}/${file}`, 'utf8'))
  .join('\n')

function sourceFiles(root: string): readonly string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = `${root}/${entry.name}`
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

describe('Nutrition plan envelope architecture', () => {
  it('keeps the boundary pure and independent of application runtimes', () => {
    expect(sources).not.toMatch(/from ['"](?:react|next(?:\/|['"])|@supabase|.*app\/)/)
    expect(sources).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|process\.env/)
    expect(sources).not.toMatch(/\bcreateClient\b|service_role|select\(['"]\*['"]\)/)
  })

  it('introduces no any or nutrient fallback to zero', () => {
    expect(sources).not.toMatch(/:\s*any\b|as\s+any\b|<any>/)
    expect(sources).not.toMatch(/(?:kcal|protein|carbs|fat|fiber)[^\n]*\|\|\s*0/)
  })

  it('does not place SQL authority in the envelope schema', () => {
    const schema = readFileSync(`${directory}/schema.ts`, 'utf8')
    expect(schema).not.toMatch(/\buser_id\s*:|\bclient_id\s*:|\bcoach_id\s*:|\bowner\s*:|\bactive\s*:/)
  })

  it('does not migrate an application consumer', () => {
    const consumers = sourceFiles('app').map(file => readFileSync(file, 'utf8')).join('\n')
    expect(consumers).not.toMatch(/nutrition\/plan-envelope/)
  })
})
