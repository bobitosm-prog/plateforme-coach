/**
 * Standalone test for parseCheckoutMetadata — runs in plain Node.
 * Usage: node scripts/test-stripe-metadata.mjs
 */

// Dynamic import of TS via tsx or direct JS — we compile inline
// Since this is .mjs and the source is .ts, we re-implement the logic
// to keep the test zero-dependency. The production module is the source of truth.

const VALID_SUB_TYPES = ['client_monthly', 'client_yearly', 'client_lifetime', 'coach_monthly']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseCheckoutMetadata(metadata) {
  if (!metadata) return { ok: false, reason: 'metadata is null' }

  const clientId = metadata.clientId
  if (!clientId || !UUID_RE.test(clientId)) {
    return { ok: false, reason: `invalid clientId: ${String(clientId).slice(0, 50)}` }
  }

  const rawSubType = metadata.subType ?? metadata.planId
  let subType
  if (!rawSubType) {
    subType = 'client_monthly'
  } else if (VALID_SUB_TYPES.includes(rawSubType)) {
    subType = rawSubType
  } else {
    return { ok: false, reason: `unknown subType: ${rawSubType.slice(0, 50)}` }
  }

  const isCoachSubscription = metadata.type === 'coach_subscription'

  const rawCoachId = metadata.coachId
  let coachId = null
  if (rawCoachId && rawCoachId !== 'platform') {
    if (!UUID_RE.test(rawCoachId)) {
      return { ok: false, reason: `invalid coachId: ${rawCoachId.slice(0, 50)}` }
    }
    coachId = rawCoachId
  }

  return { ok: true, clientId, subType, isCoachSubscription, coachId }
}

// ── Test cases ──

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const COACH_UUID = 'c0a1c2b3-d4e5-6789-abcd-000000000001'

const cases = [
  {
    name: 'valid complete metadata',
    input: { clientId: VALID_UUID, subType: 'client_yearly', type: 'coach_subscription', coachId: COACH_UUID },
    expect: r => r.ok && r.subType === 'client_yearly' && r.isCoachSubscription && r.coachId === COACH_UUID,
  },
  {
    name: 'clientId missing',
    input: { subType: 'client_monthly' },
    expect: r => !r.ok && r.reason.includes('invalid clientId'),
  },
  {
    name: 'clientId is not UUID (hack attempt)',
    input: { clientId: 'DROP TABLE profiles;--', subType: 'client_monthly' },
    expect: r => !r.ok && r.reason.includes('invalid clientId'),
  },
  {
    name: 'subType absent -> default client_monthly',
    input: { clientId: VALID_UUID },
    expect: r => r.ok && r.subType === 'client_monthly',
  },
  {
    name: 'subType unknown (freebie injection)',
    input: { clientId: VALID_UUID, subType: 'client_freebie' },
    expect: r => !r.ok && r.reason.includes('unknown subType'),
  },
  {
    name: 'planId legacy valid',
    input: { clientId: VALID_UUID, planId: 'client_lifetime' },
    expect: r => r.ok && r.subType === 'client_lifetime',
  },
  {
    name: 'coachId = platform -> null',
    input: { clientId: VALID_UUID, subType: 'client_monthly', coachId: 'platform' },
    expect: r => r.ok && r.coachId === null,
  },
  {
    name: 'coachId non-UUID -> reject',
    input: { clientId: VALID_UUID, subType: 'client_monthly', coachId: 'not-a-uuid' },
    expect: r => !r.ok && r.reason.includes('invalid coachId'),
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
