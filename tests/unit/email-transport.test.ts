import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { smtpMock } from '../mocks/smtp'

vi.mock('server-only', () => ({}))
vi.mock('nodemailer', async () => ({ default: { createTransport: (await import('../mocks/smtp')).smtpMock.createTransport } }))
import { sendEmail } from '../../lib/email'

const original = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, local: process.env.MOOVX_E2E_LOCAL_SMTP, host: process.env.SMTP_HOST }
beforeEach(() => {
  process.env.SMTP_USER = 'synthetic-user'; process.env.SMTP_PASS = 'synthetic-password'
  delete process.env.MOOVX_E2E_LOCAL_SMTP; process.env.SMTP_HOST = 'smtp.invalid.test'
})
afterAll(() => {
  for (const [key, value] of Object.entries({ SMTP_USER: original.user, SMTP_PASS: original.pass, MOOVX_E2E_LOCAL_SMTP: original.local, SMTP_HOST: original.host })) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('email transport with reusable SMTP mock', () => {
  it('sends deterministic synthetic content through createTransport/sendMail', async () => {
    smtpMock.succeed()
    await expect(sendEmail({ to: 'recipient@example.test', subject: 'Sujet synthétique', html: '<p>Safe</p>' })).resolves.toEqual({ success: true, method: 'sent' })
    expect(smtpMock.messages[0]).toMatchObject({ to: 'recipient@example.test', subject: 'Sujet synthétique', html: '<p>Safe</p>' })
  })
  it('returns a sanitized provider error without opening a socket', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    smtpMock.unavailable()
    await expect(sendEmail({ to: 'recipient@example.test', subject: 'Sujet', html: 'Body' })).resolves.toMatchObject({ success: false, method: 'error', error: 'Synthetic SMTP unavailable' })
  })
})
