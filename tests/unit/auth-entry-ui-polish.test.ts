import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Wave 6F auth entry UI contracts', () => {
  const login = read('app/(application)/login/LoginPageContent.tsx')
  const register = read('app/(application)/register-client/RegisterClientContent.tsx')
  const join = read('app/(application)/join/JoinPageContent.tsx')
  const reset = read('app/(application)/reset-password/ResetPasswordContent.tsx')
  const document = read('app/components/layout/RootDocument.tsx')

  it('keeps the complete login and recovery entry points', () => {
    expect(login).toContain("provider: 'google'")
    expect(login).toContain("provider: 'apple'")
    expect(login).toContain('handleResetPassword')
    expect(login).toContain('resolveClientPostAuth')
  })

  it('keeps role selection and requires legal consent for signup', () => {
    expect(register).toContain("'client' | 'coach'")
    expect(register).toContain('acceptedTerms')
    expect(register).toContain("t('errors.termsRequired')")
    expect(register).toContain("href={`/${locale}/cgu`}")
    expect(register).toContain("href={`/${locale}/privacy`}")
  })

  it('keeps accessible password controls and compact dynamic viewport layouts', () => {
    expect(join).toContain("minHeight: '100dvh'")
    expect(join).toContain('aria-live="polite"')
    expect(reset).toContain("minHeight: '100dvh'")
    expect(reset).toContain('aria-label={t(showPassword')
  })

  it('allows browser zoom and does not log raw login email', () => {
    expect(document).not.toContain('maximum-scale=1')
    expect(document).not.toContain('user-scalable=no')
    expect(login).not.toContain('details: { email: email.trim()')
  })
})
