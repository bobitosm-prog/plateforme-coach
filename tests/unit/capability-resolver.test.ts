import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'
import { canUseAI, isInvitedClient } from '@/lib/permissions'

const unrestricted = {
  ai: true,
  training: true,
  nutrition: true,
  coachManaged: false,
}

describe('resolveUserCapabilities', () => {
  it.each([
    'client_monthly',
    'client_yearly',
    'lifetime',
    'beta',
    'trial',
  ])('preserves unrestricted legacy capabilities for %s', subscriptionType => {
    expect(resolveUserCapabilities({ subscriptionType })).toEqual(unrestricted)
  })

  it('preserves the coach-managed restrictions for invited clients', () => {
    expect(resolveUserCapabilities({ subscriptionType: 'invited' })).toEqual({
      ai: false,
      training: false,
      nutrition: false,
      coachManaged: true,
    })
  })

  it.each([null, undefined, 'unknown'])('does not change legacy fallback rights for %s', subscriptionType => {
    expect(resolveUserCapabilities({ subscriptionType })).toEqual(unrestricted)
  })

  it('preserves the legacy permission wrapper behavior', () => {
    expect(canUseAI(null)).toBe(false)
    expect(canUseAI({ subscription_type: 'invited' })).toBe(false)
    expect(canUseAI({ subscription_type: 'client_monthly' })).toBe(true)
    expect(isInvitedClient(null)).toBe(false)
    expect(isInvitedClient({ subscription_type: 'invited' })).toBe(true)
  })

  it('routes client permissions and server consumers through their contexts', () => {
    const clientConsumers = [
      'lib/permissions.ts',
      'lib/use-client-permissions.ts',
    ].map(path => readFileSync(path, 'utf8'))
    const serverConsumers = [
      'lib/api-guard.ts',
      'app/api/chat-ai/route.ts',
    ].map(path => readFileSync(path, 'utf8'))

    for (const source of clientConsumers) {
      expect(source).toContain('resolveUserCapabilities')
      expect(source).not.toMatch(/subscription_type\s*={2,3}\s*['"]invited['"]/)
    }
    for (const source of serverConsumers) {
      expect(source).toContain('loadEffectiveEntitlementContext')
      expect(source).not.toMatch(/subscription_type\s*={2,3}\s*['"]invited['"]/)
    }
  })

  it('does not couple product capabilities to coach relations or mutate entitlements', () => {
    const source = readFileSync('lib/entitlements/capabilities.ts', 'utf8')

    expect(source).not.toMatch(/coach_clients|invited_by_coach|relation\.status/)
    expect(source).not.toMatch(/subscription_status|trial_ends_at|stripe/i)
    expect(source).not.toMatch(/\.(?:insert|update|upsert|delete)\(/)
  })
})
