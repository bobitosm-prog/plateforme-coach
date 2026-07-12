import manifest from './personas.json' with { type: 'json' }

export type TestPersonaName = keyof typeof manifest
export type TestRole = 'client' | 'coach'
export type TestPersona = {
  id: string
  email: string
  role: TestRole
  subscriptionType: string | null
  subscriptionStatus: string | null
  onboardingCompleted: boolean
  admin: boolean
}

export const TEST_PERSONAS = manifest as Record<TestPersonaName, TestPersona>

export function createRunSuffix(): string {
  return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`
}

export function personaForRun(name: TestPersonaName, suffix: string): TestPersona {
  if (!/^[a-z0-9-]+$/i.test(suffix)) throw new Error('Fixture suffix must be alphanumeric with hyphens')
  const persona = TEST_PERSONAS[name]
  const [local, domain] = persona.email.split('@')
  return { ...persona, id: crypto.randomUUID(), email: `${local}+${suffix}@${domain}` }
}

export function isConfiguredAdmin(persona: TestPersona, adminEmail: string | undefined): boolean {
  return Boolean(adminEmail) && persona.email === adminEmail
}
