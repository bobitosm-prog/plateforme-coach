import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { POST } from '@/app/api/coach/default-assignment/route'

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap(entry => {
    const path = join(root, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(?:ts|tsx)$/.test(entry) ? [path] : []
  })
}

function readSources(...roots: string[]): string {
  return roots.flatMap(sourceFiles).map(path => readFileSync(path, 'utf8')).join('\n')
}

const dashboard = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')
const retiredRoute = readFileSync('app/api/coach/default-assignment/route.ts', 'utf8')
const invitationMigration = readFileSync(
  'supabase/migrations/20260823120000_add_coach_invitation_v2_lifecycle.sql',
  'utf8',
)
const disconnectRoute = readFileSync('app/api/coach/disconnect/route.ts', 'utf8')
const coachEndRoute = readFileSync('app/api/coach/clients/end/route.ts', 'utf8')
const accountDeletion = readFileSync('app/api/delete-account/route.ts', 'utf8')
const runtimeSources = readSources('app', 'lib')

describe('default coach assignment retirement', () => {
  it('never posts a default assignment during dashboard mount or refresh', () => {
    expect(dashboard).not.toContain('/api/coach/default-assignment')
    expect(dashboard).not.toMatch(/assignConfiguredDefaultCoach|DEFAULT_COACH_EMAIL/)
  })

  it('keeps the historical endpoint callable but permanently non-mutating', async () => {
    const response = await POST()

    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toEqual({
      error: 'DEFAULT_COACH_ASSIGNMENT_DEPRECATED',
    })
    expect(retiredRoute).not.toMatch(/supabase|createCoachClientRelation|transition_coach_client_relation|DEFAULT_COACH_EMAIL/)
  })

  it('removes the assignment service and every runtime consumer', () => {
    expect(existsSync('lib/coach-relations/default-assignment.ts')).toBe(false)
    expect(runtimeSources).not.toContain('assignConfiguredDefaultCoach')
    expect(runtimeSources).not.toMatch(/source:\s*['"]default['"]|p_source:\s*['"]default['"]/)
  })

  it('preserves explicit invitation creation and relation-ending workflows', () => {
    expect(invitationMigration).toMatch(/'create',\s*'invitation'/)
    expect(disconnectRoute).toContain('endCoachClientRelation({')
    expect(disconnectRoute).toContain("reason: 'client_request'")
    expect(coachEndRoute).toContain('endCoachClientRelation({')
    expect(coachEndRoute).toContain("reason: 'coach_request'")
  })

  it('leaves account deletion on its existing atomic cleanup RPC', () => {
    expect(accountDeletion).toContain("supabaseAuth.rpc(\n      'delete_user_account'")
    expect(accountDeletion).toContain('supabase.auth.admin.deleteUser(userId)')
  })

  it('introduces no alternate or direct coach relation writer', () => {
    expect(runtimeSources).not.toMatch(/auto.?assign|assign.?default/i)
    expect(runtimeSources).not.toMatch(
      /\.from\(['"]coach_clients['"]\)[\s\S]{0,300}\.(?:insert|upsert|update|delete)\(/,
    )
    expect(readFileSync('app/api/assign-coach/route.ts', 'utf8')).toContain(
      'LEGACY_ASSIGN_COACH_DISABLED',
    )
  })
})
