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

    describe('future API — activate after creation route/service exists', () => {
      it.todo('rejects an anonymous creator with 401 before persistence or SMTP')
      it.todo('rejects an authenticated non-coach creator with 403')
      it.todo('allows a valid authenticated coach to create a pending invitation')
      it.todo('derives coach_id exclusively from the authenticated server session')
      it.todo('rejects a body containing coachId instead of treating it as authority')
      it.todo('requires recipientEmail')
      it.todo('persists the normalized recipient email')
      it.todo('rejects a malformed or overlong recipient email')
      it.todo('does not require the recipient to own a verified account at creation time')
      it.todo('uses the server-side default expiration and rejects client-controlled expiration')
      it.todo('returns the raw token only to the internal delivery step and never in list responses')
      it.todo('stores only the SHA-256 token hash and never the raw token')
      it.todo('returns 409 INVITATION_ALREADY_PENDING for a non-expired duplicate')
      it.todo('returns 429 with Retry-After when coach or recipient rate limits are exceeded')
      it.todo('keeps the invitation pending with delivery_status failed when SMTP fails')
      it.todo('returns 502 INVITATION_DELIVERY_FAILED without logging token or email')
    })
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

    describe('future validation endpoint — activate after validate route exists', () => {
      it.todo('returns valid true for a well-formed pending non-expired token')
      it.todo('returns the same valid false envelope for an unknown token')
      it.todo('returns the same valid false envelope for a malformed token')
      it.todo('returns the same valid false envelope for an expired invitation')
      it.todo('returns the same valid false envelope for a revoked invitation')
      it.todo('returns the same valid false envelope for a consumed invitation')
      it.todo('never returns recipient_email, coach_id, token_hash or internal status')
      it.todo('does not reveal whether the recipient email belongs to an existing account')
      it.todo('derives the coach only from the invitation record')
      it.todo('returns 410 LEGACY_INVITATION_DISABLED for a UUID-only link after cutover')
    })
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

    describe('future consume route — PostgreSQL RPC cases live in integration tests', () => {
      it.todo('rejects an unauthenticated consumer with 401')
      it.todo('ignores or rejects a forged clientId without changing the RPC target')
      it.todo('ignores or rejects a forged coachId and uses invitation.coach_id')
      it.todo('ignores or rejects legacy autoAssign')
      it.todo('ignores or rejects browser-controlled subscription_status')
      it.todo('ignores or rejects browser-controlled subscription_type and trial_ends_at')
      it.todo('returns INVITATION_ALREADY_LINKED without mutation for an existing relation')
    })
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
    describe('future revoke route — PostgreSQL ownership cases live in integration tests', () => {
      it.todo('rejects another coach with 403 without revealing invitation details')
      it.todo('allows a super_admin only through a separate audited endpoint with a reason')
      it.todo('rejects revocation of a consumed invitation with 409')
      it.todo('rejects a second revocation because revoked is terminal')
    })
  })

  describe('rls', () => {
    describe('remaining application-level RLS usage', () => {
      it.todo('does not require service_role in frontend or consumption route code')
    })
  })

  describe('compatibility', () => {
    describe('active contract rules', () => {
      it('keeps default coach assignment outside the invitation contract', () => {
        expect(contract.creationInputKeys).not.toContain('autoAssign')
        expect(contract.consumptionInputKeys).not.toContain('autoAssign')
      })
    })

    describe('future frontend/callback — activate after tokenized join flow exists', () => {
      it.todo('refuses /join?coach=<UUID> with a clear renewal message after cutover')
      it.todo('recognizes /join?invitation=<token> as the tokenized flow')
      it.todo('redirects an unauthenticated recipient to authentication and resumes afterward')
      it.todo('lets an already authenticated recipient continue directly to consumption')
      it.todo('preserves the token through email/password and OAuth callback without logging it')
      it.todo('keeps default coach auto-assignment in a separate non-invited flow')
      it.todo('does not change existing users who are already marked invited')
      it.todo('returns 410 LEGACY_INVITATION_DISABLED for non-migratable old links')
      it.todo('removes the token from browser history after successful consumption')
    })
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
