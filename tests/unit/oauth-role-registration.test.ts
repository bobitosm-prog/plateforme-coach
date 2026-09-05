import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('OAuth role registration', () => {
  const register = read('app/(application)/register-client/RegisterClientContent.tsx')
  const intent = read('app/auth/oauth-role-intent/route.ts')
  const callback = read('app/auth/callback/route.ts')
  const roleRpc = read('supabase/migrations/20260630101000_set_role_rpc.sql')

  it('preserves client and coach selection through a validated HttpOnly intent', () => {
    expect(register).toContain("body: JSON.stringify({ role: selectedRole })")
    expect(register).toContain("handleOAuth('google')")
    expect(register).toContain("handleOAuth('apple')")
    expect(intent).toContain("role !== 'client' && role !== 'coach'")
    expect(intent).toContain('httpOnly: true')
    expect(callback).toContain("cookieStore.get('moovx_oauth_role_intent')")
  })

  it('uses set_role and cannot escalate or downgrade an existing role', () => {
    expect(callback).toContain("if (prof && !prof.role)")
    expect(callback).toContain("supabase.rpc('set_role'")
    expect(roleRpc).toContain('IF v_current IS NOT NULL')
    expect(roleRpc).toContain("p_role NOT IN ('client', 'coach')")
  })

  it('preserves next=/join through registration and confirmation login', () => {
    expect(register).toContain("searchParams.get('next') === '/join'")
    expect(register).toContain("?type=signup&next=%2Fjoin")
    expect(callback).toContain("next === '/join'")
    expect(callback).toContain("&next=%2Fjoin")
  })

  it('stores coach signup fields in metadata instead of relying on an anonymous profile write', () => {
    expect(register).toContain('coach_speciality: speciality')
    expect(register).toContain('coach_experience_years: experience')
    expect(register).not.toContain("supabase.from('profiles').upsert")
  })
})
