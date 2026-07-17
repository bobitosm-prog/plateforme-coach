/**
 * Standalone test for parseCheckoutMetadata — runs in plain Node.
 * Usage: node scripts/test-stripe-metadata.mjs
 */

import {
  buildCoachCheckoutMetadata,
  buildPlatformCheckoutMetadata,
  parseCheckoutMetadata,
} from '../lib/stripe/metadata.ts'

// ── Test cases ──

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const COACH_UUID = 'c0a1c2b3-d4e5-6789-abcd-000000000001'

const cases = [
  {
    name: 'valid coach metadata',
    input: buildCoachCheckoutMetadata(VALID_UUID, COACH_UUID),
    expect: r => r.ok && r.subType === 'coach_monthly' && r.isCoachSubscription && r.coachId === COACH_UUID,
  },
  {
    name: 'clientId missing',
    input: { planId: 'client_monthly', coachId: 'platform', subType: 'client_monthly' },
    expect: r => !r.ok && r.reason.includes('invalid clientId'),
  },
  {
    name: 'clientId is not UUID (hack attempt)',
    input: { clientId: 'DROP TABLE profiles;--', planId: 'client_monthly', coachId: 'platform', subType: 'client_monthly' },
    expect: r => !r.ok && r.reason.includes('invalid clientId'),
  },
  {
    name: 'subType absent is rejected',
    input: { clientId: VALID_UUID, planId: 'client_monthly', coachId: 'platform' },
    expect: r => !r.ok,
  },
  {
    name: 'subType unknown (freebie injection)',
    input: { clientId: VALID_UUID, planId: 'client_freebie', coachId: 'platform', subType: 'client_freebie' },
    expect: r => !r.ok && r.reason.includes('unknown subType'),
  },
  {
    name: 'canonical platform metadata valid',
    input: buildPlatformCheckoutMetadata(VALID_UUID, 'client_lifetime'),
    expect: r => r.ok && r.subType === 'client_lifetime',
  },
  {
    name: 'platform authority parses to null coach',
    input: buildPlatformCheckoutMetadata(VALID_UUID, 'client_monthly'),
    expect: r => r.ok && r.coachId === null,
  },
  {
    name: 'coachId non-UUID -> reject',
    input: { clientId: VALID_UUID, coachId: 'not-a-uuid', subType: 'coach_monthly', type: 'coach_subscription' },
    expect: r => !r.ok && r.reason.includes('invalid coachId'),
  },
  {
    name: 'unknown key is rejected',
    input: { ...buildPlatformCheckoutMetadata(VALID_UUID, 'client_monthly'), extra: 'forbidden' },
    expect: r => !r.ok && r.reason.includes('keys mismatch'),
  },
]

let passed = 0
let failed = 0

for (const { name, input, expect: check } of cases) {
  const result = parseCheckoutMetadata(input)
  const ok = check(result)
  if (ok) {
    console.log(`  PASS  ${name}`)
    passed++
  } else {
    console.log(`  FAIL  ${name}`)
    console.log(`        got: ${JSON.stringify(result)}`)
    failed++
  }
}

console.log(`\n${passed}/${cases.length} passed${failed ? ` — ${failed} FAILED` : ''}`)
process.exit(failed > 0 ? 1 : 0)
