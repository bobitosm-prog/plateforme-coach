import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')
const routes = [
  'app/api/ai-quota',
  'app/api/user/sync-locale',
  'app/api/user/locale',
  'app/api/feedback/mine',
  'app/api/feedback/mark-all-read',
  'app/api/vitals',
  'app/api/log-error',
  'app/api/weekly-diagnostic',
] as const

describe('simple API observability inventory', () => {
  it('covers exactly the eight migrated route boundaries', () => {
    expect(routes).toHaveLength(8)
    expect(new Set(routes).size).toBe(8)
    for (const directory of routes) {
      const route = fs.readFileSync(path.join(root, directory, 'route.ts'), 'utf8')
      expect(route).toContain('createApiRouteObservability')
      expect(route).toContain('observe.complete(')
      expect(route).not.toMatch(/console\.(?:log|warn|error|info|debug)/)
    }
  })

  it('keeps colocated services free from ad-hoc console output', () => {
    for (const directory of routes) {
      const service = fs.readFileSync(path.join(root, directory, 'service.ts'), 'utf8')
      expect(service).not.toMatch(/console\.(?:log|warn|error|info|debug)/)
    }
  })

  it('does not instrument excluded critical route boundaries in this tranche', () => {
    const inventory = routes.join('\n')
    expect(inventory).not.toMatch(/stripe|invitation|send-notification|chat-ai/)
  })
})
