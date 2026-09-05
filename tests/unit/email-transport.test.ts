import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('nodemailer', () => ({
  default: { createTransport: mocks.createTransport },
}))

import { sendEmail } from '@/lib/email'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SMTP_HOST = 'smtp.example.test'
  process.env.SMTP_USER = 'sandbox-user'
  process.env.SMTP_PASS = 'sandbox-pass'
  mocks.sendMail.mockResolvedValue({ messageId: 'synthetic-message' })
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail })
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

async function sendSyntheticEmail() {
  return sendEmail({
    to: 'sandbox@example.test',
    subject: 'Synthetic transport test',
    html: '<p>Sandbox only</p>',
  })
}

describe('application SMTP transport', () => {
  it('preserves implicit TLS for port 465', async () => {
    process.env.SMTP_PORT = '465'

    await sendSyntheticEmail()

    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.example.test',
      port: 465,
      secure: true,
      auth: { user: 'sandbox-user', pass: 'sandbox-pass' },
    }))
  })

  it('uses STARTTLS-compatible settings for port 587', async () => {
    process.env.SMTP_PORT = '587'

    await sendSyntheticEmail()

    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.example.test',
      port: 587,
      secure: false,
      auth: { user: 'sandbox-user', pass: 'sandbox-pass' },
    }))
  })

  it('parses another numeric SMTP port without changing credentials', async () => {
    process.env.SMTP_PORT = '2525'

    await sendSyntheticEmail()

    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      port: 2525,
      secure: false,
      auth: { user: 'sandbox-user', pass: 'sandbox-pass' },
    }))
  })

  it('falls back safely to implicit TLS on an invalid port', async () => {
    process.env.SMTP_PORT = 'invalid'

    await sendSyntheticEmail()

    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.example.test',
      port: 465,
      secure: true,
    }))
  })

  it('skips delivery instead of falling back to a production SMTP host', async () => {
    delete process.env.SMTP_HOST

    await expect(sendSyntheticEmail()).resolves.toEqual({
      success: true,
      method: 'skipped',
    })
    expect(mocks.createTransport).not.toHaveBeenCalled()
  })
})
