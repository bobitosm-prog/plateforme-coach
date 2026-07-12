import { createHash, randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'

/**
 * Temporary executable fixture for docs/COACH_INVITATION_CONTRACT.md.
 *
 * This is deliberately test-only: it records normative values without
 * pretending that the future routes, table, RPC or RLS already exist.
 * Replace each corresponding expectation with production imports as the
 * implementation lands, then activate the relevant `todo` cases below.
 */
const contract = {
  defaultExpirationDays: 7,
  tokenBytes: 32,
  tokenEntropyBits: 256,
  tokenEncodedLength: 43,
  tokenPattern: /^[A-Za-z0-9_-]{43}$/,
  hashAlgorithm: 'sha256',
  hashBytes: 32,
  persistedStatuses: ['pending', 'consumed', 'revoked'] as const,
  allowedTransitions: [
    ['pending', 'consumed'],
    ['pending', 'revoked'],
  ] as const,
  creationRateLimit: { perCoachPerHour: 10, perRecipientPerDay: 3 },
  creationInputKeys: ['recipientEmail', 'locale'] as const,
  consumptionInputKeys: ['token'] as const,
  forbiddenAuthorityKeys: [
    'coachId',
    'clientId',
    'autoAssign',
    'subscription_status',
    'subscription_type',
    'trial_ends_at',
  ] as const,
  finalProfile: {
    role: 'client',
    subscription_status: 'active',
    subscription_type: 'invited',
    trial_ends_at: null,
  } as const,
  errorCodes: [
    'INVITATION_INVALID',
    'INVITATION_EXPIRED',
    'INVITATION_ALREADY_USED',
    'INVITATION_REVOKED',
    'INVITATION_EMAIL_MISMATCH',
    'INVITATION_EMAIL_UNVERIFIED',
    'INVITATION_COACH_INVALID',
    'INVITATION_RECIPIENT_INELIGIBLE',
    'INVITATION_ALREADY_LINKED',
    'INVITATION_ALREADY_PENDING',
    'INVITATION_RATE_LIMITED',
    'INVITATION_DELIVERY_FAILED',
    'INVITATION_CONSUMPTION_FAILED',
    'LEGACY_INVITATION_DISABLED',
  ] as const,
} as const

function normalizeContractEmail(email: string): string {
  return email.trim().normalize('NFKC').toLowerCase()
}

function contractTokenFrom(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url')
}

function contractTokenHash(token: string): Buffer {
  const tokenBytes = Buffer.from(token, 'base64url')
  return createHash(contract.hashAlgorithm).update(tokenBytes).digest()
}

function contractJoinKind(url: string): 'invitation' | 'legacy' | 'invalid' {
  const parsed = new URL(url, 'https://moovx.test')
  if (parsed.pathname !== '/join') return 'invalid'
  if (parsed.searchParams.has('invitation')) return 'invitation'
  if (parsed.searchParams.has('coach')) return 'legacy'
  return 'invalid'
}

describe('one-time coach invitation contract', () => {
  describe('creation', () => {
    describe('active contract rules', () => {
      it('normalizes recipient emails with trim, NFKC and lowercase only', () => {
        expect(normalizeContractEmail('  CLIENT@Example.COM  ')).toBe('client@example.com')
        expect(normalizeContractEmail('ｕｓｅｒ@example.com')).toBe('user@example.com')
        expect(normalizeContractEmail('first.last+tag@gmail.com')).toBe('first.last+tag@gmail.com')
      })

      it('sets the normative default expiration to exactly seven days', () => {
        const createdAt = Date.UTC(2026, 6, 11, 12)
        const expiresAt = createdAt + contract.defaultExpirationDays * 24 * 60 * 60 * 1000

        expect(contract.defaultExpirationDays).toBe(7)
        expect(expiresAt - createdAt).toBe(604_800_000)
      })

      it('defines a 32-byte token encoded as 43 Base64URL characters', () => {
        const token = contractTokenFrom(randomBytes(contract.tokenBytes))

        expect(contract.tokenBytes * 8).toBe(contract.tokenEntropyBits)
        expect(token).toHaveLength(contract.tokenEncodedLength)
        expect(token).toMatch(contract.tokenPattern)
        expect(token).not.toMatch(/[+/=]/)
      })

      it('derives a 32-byte SHA-256 hash that differs from the raw token', () => {
        const token = contractTokenFrom(Buffer.alloc(contract.tokenBytes, 0x5a))
        const hash = contractTokenHash(token)

        expect(contract.hashAlgorithm).toBe('sha256')
        expect(hash).toHaveLength(contract.hashBytes)
        expect(hash.toString('base64url')).not.toBe(token)
      })

      it('accepts only recipientEmail and locale as browser creation fields', () => {
        expect(contract.creationInputKeys).toEqual(['recipientEmail', 'locale'])
        expect(contract.creationInputKeys).not.toContain('coachId')
      })

      it('records the creation rate limits required by the contract', () => {
        expect(contract.creationRateLimit).toEqual({
          perCoachPerHour: 10,
          perRecipientPerDay: 3,
        })
      })
    })

    // Creation permissions, normalization, hashing, delivery, duplicates and
    // rate limits are covered by coach-invitation-creation.test.ts.
  })

  describe('validation', () => {
    describe('active contract rules', () => {
      it('recognizes only the tokenized invitation join link as the future flow', () => {
        const token = contractTokenFrom(Buffer.alloc(contract.tokenBytes, 0x01))

        expect(contractJoinKind(`/join?invitation=${token}`)).toBe('invitation')
        expect(contractJoinKind('/join?coach=00000000-0000-4000-8000-000000000003')).toBe('legacy')
        expect(contractJoinKind('/join')).toBe('invalid')
      })

      it('rejects UUID-only legacy links as invitation proof by contract', () => {
        const kind = contractJoinKind('/join?coach=00000000-0000-4000-8000-000000000003')

        expect(kind).toBe('legacy')
        expect('LEGACY_INVITATION_DISABLED').toBe(contract.errorCodes.at(-1))
      })
    })

    // Validation route and legacy cutover are covered by
    // coach-invitation-routes.test.ts and coach-invitation-join-cutover.test.ts.
  })

  describe('consumption', () => {
    describe('active contract rules', () => {
      it('accepts only token as browser consumption input', () => {
        expect(contract.consumptionInputKeys).toEqual(['token'])
        for (const key of contract.forbiddenAuthorityKeys) {
          expect(contract.consumptionInputKeys).not.toContain(key)
        }
      })

      it('defines the exact final invited profile mutation', () => {
        expect(contract.finalProfile).toEqual({
          role: 'client',
          subscription_status: 'active',
          subscription_type: 'invited',
          trial_ends_at: null,
        })
      })
    })

    // The authenticated route boundary is covered by coach-invitation-routes.test.ts;
    // atomic business cases remain covered by the PostgreSQL integration suite.
  })

  describe('atomicity', () => {
    describe('active contract rules', () => {
      it('allows only pending to consumed or pending to revoked transitions', () => {
        expect(contract.persistedStatuses).toEqual(['pending', 'consumed', 'revoked'])
        expect(contract.allowedTransitions).toEqual([
          ['pending', 'consumed'],
          ['pending', 'revoked'],
        ])
        expect(contract.allowedTransitions).not.toContainEqual(['consumed', 'pending'])
        expect(contract.allowedTransitions).not.toContainEqual(['revoked', 'pending'])
      })

      it('keeps expired as a calculated state rather than a persisted status', () => {
        expect(contract.persistedStatuses).not.toContain('expired')
      })
    })

    describe('remaining PostgreSQL failure injection cases', () => {
      it.todo('rolls back relation and invitation when the profile update fails')
      it.todo('rolls back profile and invitation when coach_clients upsert fails')
    })
  })

  describe('revocation', () => {
    describe('remaining administrative revocation case', () => {
      it.todo('allows a super_admin only through a separate audited endpoint with a reason')
    })
  })

  describe('compatibility', () => {
    describe('active contract rules', () => {
      it('keeps default coach assignment outside the invitation contract', () => {
        expect(contract.creationInputKeys).not.toContain('autoAssign')
        expect(contract.consumptionInputKeys).not.toContain('autoAssign')
      })
    })

    // Browser persistence, callback resumption, legacy refusal and default-coach
    // non-regression are covered by coach-invitation-join-cutover.test.ts.
  })

  describe('stable business errors', () => {
    it('defines the complete non-duplicated error-code vocabulary', () => {
      expect(contract.errorCodes).toHaveLength(14)
      expect(new Set(contract.errorCodes).size).toBe(contract.errorCodes.length)
      expect(contract.errorCodes).toContain('INVITATION_CONSUMPTION_FAILED')
      expect(contract.errorCodes).toContain('LEGACY_INVITATION_DISABLED')
    })
  })
})
