import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')
const migrated = [
  { route: 'app/api/ai-quota', method: 'GET', schema: false },
  { route: 'app/api/user/sync-locale', method: 'POST', schema: false },
  { route: 'app/api/user/locale', method: 'POST', schema: true },
  { route: 'app/api/feedback/mine', method: 'GET', schema: false },
  { route: 'app/api/feedback/mark-all-read', method: 'POST', schema: false },
  { route: 'app/api/vitals', method: 'POST', schema: true },
  { route: 'app/api/log-error', method: 'POST', schema: true },
  { route: 'app/api/weekly-diagnostic', method: 'POST', schema: false },
] as const

describe('simple route migration inventory', () => {
  it('contains exactly eight unique routes', () => {
    expect(migrated).toHaveLength(8)
    expect(new Set(migrated.map(({ route }) => route)).size).toBe(8)
  })

  it.each(migrated)('$route delegates $method to a colocated service', ({ route, method, schema }) => {
    const routeSource = fs.readFileSync(path.join(root, route, 'route.ts'), 'utf8')
    expect(routeSource).toMatch(new RegExp(`export async function ${method}\\b`))
    expect(routeSource).toContain("from './service'")
    expect(fs.existsSync(path.join(root, route, 'service.ts'))).toBe(true)
    expect(fs.existsSync(path.join(root, route, 'schema.ts'))).toBe(schema)
  })

  it('keeps forbidden complex boundaries outside the migration inventory', () => {
    const routes = migrated.map(({ route }) => route).join('\n')
    expect(routes).not.toMatch(/stripe|invitation|send-notification|chat-ai/)
  })

  it('keeps session identity server-derived in every authenticated service', () => {
    for (const item of migrated.filter(({ route }) => !route.endsWith('/vitals'))) {
      const service = fs.readFileSync(path.join(root, item.route, 'service.ts'), 'utf8')
      if (item.route.endsWith('/log-error')) {
        expect(service).toContain('createIdentityRepository')
        expect(service).not.toMatch(/body\.user_id|body\.user_email/)
      } else {
        expect(service).toContain('createIdentityRepository')
      }
    }
  })
})
