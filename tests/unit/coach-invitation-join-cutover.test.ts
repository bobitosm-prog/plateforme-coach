import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const join = read('app/join/JoinPageContent.tsx')
const joinPage = read('app/join/page.tsx')
const callback = read('app/auth/callback/route.ts')
const login = read('app/login/LoginPageContent.tsx')
const registerClient = read('app/register-client/RegisterClientContent.tsx')
const clientDashboard = read('app/hooks/useClientDashboard.ts')
const validateRoute = read('app/api/coach/invitations/validate/route.ts')
const consumeRoute = read('app/api/coach/invitations/consume/route.ts')

describe('/join verified invitation cutover', () => {
  it('captures tokenized links, removes the URL secret and keeps it only for the tab lifetime', () => {
    expect(join).toContain("params.get('token')")
    expect(join).toContain("params.get('invitation')")
    expect(join).toContain("sessionStorage.setItem(STORAGE_KEY, urlToken)")
    expect(join).toContain("window.history.replaceState({}, '', '/join')")
    expect(join).toContain('sessionStorage.removeItem(STORAGE_KEY)')
    expect(join).not.toContain('localStorage')
  })

  it('validates and consumes only through the new server routes', () => {
    expect(join).toContain("fetch('/api/coach/invitations/validate'")
    expect(join).toContain("fetch('/api/coach/invitations/consume'")
    expect(join).not.toContain('/api/assign-coach')
    expect(join).not.toContain('invited_coach_id')
    expect(join).not.toContain('clientId')
  })

  it('refuses coach UUID links without mutation or silent migration', () => {
    expect(join).toContain("params.get('coach')")
    expect(join).toContain("setState('legacy')")
    expect(callback).not.toContain("searchParams.get('coach')")
    expect(callback).not.toContain('/api/assign-coach')
  })

  it('resumes password and OAuth authentication through the safe /join target', () => {
    expect(join).toContain('/auth/callback?next=/join')
    expect(join).toContain('/login?next=/join')
    expect(login).toContain("searchParams.get('next')")
    expect(login).toContain("!rawNext.startsWith('//')")
    expect(callback).toContain("!requestedNext.startsWith('//')")
  })

  it('sets no-referrer while preserving default-coach assignment as a separate server flow', () => {
    expect(joinPage).toContain("referrer: 'no-referrer'")
    expect(clientDashboard).toContain("fetch('/api/coach/default-assignment', { method: 'POST' })")
    expect(clientDashboard).not.toContain("supabase.rpc('get_default_coach_id'")
    expect(registerClient).not.toContain('/api/assign-coach')
    expect(registerClient).not.toContain('autoAssign')
    expect(registerClient).not.toContain('coachId')
  })

  it('never logs invitation secrets from either route or the browser flow', () => {
    expect(join).not.toMatch(/console\.(?:log|info|warn|error)/)
    expect(validateRoute).not.toMatch(/console\.(?:log|info|warn|error)/)
    expect(consumeRoute).not.toMatch(/console\.(?:log|info|warn|error)/)
  })
})
