import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const consumers = [
  'app/coach/hooks/useCoachDashboard.ts',
  'app/coach/hooks/useCoachAnalytics.ts',
  'lib/client-dashboard/use-client-dashboard-data.ts',
  'lib/repositories/nutrition/plans.ts',
]

const intentionalLegacyReaders = [
  'app/components/VideoFeedbackModal.tsx',
  'app/onboarding-v2/OnboardingV2Content.tsx',
  'lib/billing/checkout/repository.ts',
  'lib/billing/webhook/repository.ts',
  'lib/notifications/authorize-user-push.ts',
  'lib/use-client-permissions.ts',
]

describe('coach/client relation repository migration', () => {
  it('routes representative dashboard and repository reads through the central repository', () => {
    for (const file of consumers) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).toContain('createCoachClientRelationRepository')
      expect(source, file).not.toContain("from('coach_clients')")
    }
  })

  it('keeps the remaining legacy readers explicit and bounded as migration debt', () => {
    for (const file of intentionalLegacyReaders) {
      expect(readFileSync(file, 'utf8'), file).toContain("from('coach_clients')")
    }
  })

  it('keeps the disconnect mutation outside the read-only repository', () => {
    const disconnect = readFileSync('app/api/coach/disconnect/route.ts', 'utf8')
    const repository = readFileSync('lib/repositories/coach-client-relations/index.ts', 'utf8')
    expect(disconnect).toContain("from('coach_clients').delete()")
    expect(repository).not.toMatch(/\.(?:insert|update|upsert|delete)\(/)
  })
})
