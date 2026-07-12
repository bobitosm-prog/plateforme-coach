import { createHash } from 'node:crypto'
import { z } from 'zod'

export const coachInvitationTokenSchema = z
  .string()
  .length(43)
  .regex(/^[A-Za-z0-9_-]{43}$/)
  .refine((token) => Buffer.from(token, 'base64url').length === 32)

export const coachInvitationBodySchema = z
  .object({ token: coachInvitationTokenSchema })
  .strict()

export function hashCoachInvitationToken(token: string): string {
  const tokenBytes = Buffer.from(token, 'base64url')
  return `\\x${createHash('sha256').update(tokenBytes).digest('hex')}`
}
