import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { POST } from '../../app/api/assign-coach/route'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('legacy assign-coach cutover', () => {
  it('returns Gone for every legacy assignment payload without performing a write', async () => {
    const response = POST(new Request('http://localhost/api/assign-coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        coachId: '00000000-0000-4000-8000-000000000099',
        autoAssign: true,
      }),
    }))

    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toEqual({
      error: 'Legacy coach assignment is no longer supported.',
      code: 'LEGACY_ASSIGN_COACH_DISABLED',
    })

    const route = read('app/api/assign-coach/route.ts')
    expect(route).not.toContain('coachId')
    expect(route).not.toContain('service_role')
    expect(route).not.toContain("from('coach_clients')")
    expect(route).not.toContain("from('profiles')")
    expect(route).not.toContain('subscription_type')
    expect(route).not.toContain('subscription_status')
    expect(route).not.toContain('trial_ends_at')
    expect(route).not.toContain('onConflict')
  })

  it('keeps client registration functional without the legacy auto-assign call', () => {
    const registration = read('app/(application)/register-client/RegisterClientContent.tsx')

    expect(registration).toContain('supabase.auth.signUp')
    expect(registration).toContain('setEmailSent(true)')
    expect(registration).not.toContain('/api/assign-coach')
    expect(registration).not.toContain('autoAssign')
  })

  it('rejects legacy coach UUID links while allowing only Invitation V2', () => {
    const join = read('app/(application)/join/JoinPageContent.tsx')

    expect(join).toContain("params.get('coach')")
    expect(join).toContain("setState('legacy')")
    expect(join).toContain('/api/coach/invitations/consume')
    expect(join).toContain('auth.signUp')
    expect(join).not.toContain('/api/assign-coach')
    expect(join).not.toContain('invited_coach_id')
  })

  it('does not treat the legacy coach callback parameter as relation authority', () => {
    const callback = read('app/auth/callback/route.ts')

    expect(callback).not.toContain('/api/assign-coach')
    expect(callback).not.toContain("searchParams.get('coach')")
  })

  it('keeps the canonical relation lifecycle function as the mutation authority', () => {
    const migration = read('supabase/migrations/20260823100000_add_canonical_coach_relation_writer.sql')

    expect(migration).toContain('public.transition_coach_client_relation')
  })
})
