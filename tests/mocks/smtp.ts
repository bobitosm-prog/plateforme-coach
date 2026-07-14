import { beforeEach, vi } from 'vitest'

type Mail = { to?: string; subject?: string; html?: string; [key: string]: unknown }
let outcomes: Array<{ ok: true; value: unknown } | { ok: false; error: unknown }> = []
export const smtpMock = {
  transportOptions: [] as unknown[], messages: [] as Mail[],
  createTransport: vi.fn((options: unknown) => {
    smtpMock.transportOptions.push(options)
    return { sendMail: vi.fn(async (mail: Mail) => {
      smtpMock.messages.push({ ...mail, html: mail.html?.replace(/[A-Za-z0-9_-]{43}/g, '[REDACTED_TOKEN]') })
      const outcome = outcomes.shift()
      if (!outcome) throw new Error('Unexpected SMTP sendMail: configure a response first')
      if (!outcome.ok) throw outcome.error
      return outcome.value
    }) }
  }),
  succeed(value: unknown = { messageId: 'smtp_test_message_1', accepted: ['recipient@example.test'] }) { outcomes.push({ ok: true, value }) },
  refuse() { outcomes.push({ ok: false, error: Object.assign(new Error('Synthetic SMTP refusal'), { responseCode: 550 }) }) },
  unavailable() { outcomes.push({ ok: false, error: Object.assign(new Error('Synthetic SMTP unavailable'), { code: 'ECONNREFUSED' }) }) },
  reset() { outcomes = []; this.transportOptions.length = 0; this.messages.length = 0; this.createTransport.mockClear() },
}
beforeEach(() => smtpMock.reset())
