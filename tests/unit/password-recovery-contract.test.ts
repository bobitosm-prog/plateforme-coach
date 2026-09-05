import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('password recovery contract', () => {
  const login = read('app/(application)/login/LoginPageContent.tsx')
  const callback = read('app/auth/callback/route.ts')
  const page = read('app/(application)/reset-password/page.tsx')
  const reset = read('app/(application)/reset-password/ResetPasswordContent.tsx')

  it('routes recovery callbacks to a marker-protected reset page', () => {
    expect(login).toContain('/auth/callback?type=recovery')
    expect(callback).toContain("type === 'recovery'")
    expect(callback).toContain("/reset-password")
    expect(callback).toContain("httpOnly: true")
    expect(page).toContain("moovx_recovery_session")
  })

  it('keeps normal callbacks outside the reset route', () => {
    expect(callback).toContain('`${origin}${next}`')
    expect(callback).toContain('callback_invalid')
  })

  it('validates confirmation and updates the authenticated user without logging secrets', () => {
    expect(reset).toContain('password.length < 8')
    expect(reset).toContain('password !== confirmation')
    expect(reset).toContain('supabase.auth.updateUser({ password })')
    expect(reset).toContain('autoComplete="new-password"')
    expect(reset).not.toMatch(/console\.(?:log|error).*password/i)
    expect(callback).not.toMatch(/error_description.*console|console.*error_description/i)
  })

  it('fails invalid recovery sessions safely and uses terminal replace navigation', () => {
    expect(page).toContain("redirect('/login?auth_error=recovery_error')")
    expect(reset).toContain("router.replace('/login?auth_error=recovery_error')")
    expect(reset).toContain("router.replace('/login?reset=success')")
  })
})
