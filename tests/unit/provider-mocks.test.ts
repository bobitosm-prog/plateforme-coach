import { describe, expect, it } from 'vitest'
import { stripeMock } from '../mocks/stripe'
import { anthropicCalls, anthropicMock } from '../mocks/anthropic'
import { smtpMock } from '../mocks/smtp'
import { webPushMock } from '../mocks/web-push'

describe('reusable provider mocks', () => {
  it('records Stripe parameters/options, supports errors and refuses unconfigured operations', async () => {
    stripeMock.succeed('checkout.sessions.create', { id: 'cs_test_1' })
    const stripe = new stripeMock.constructor() as unknown as { checkout: { sessions: { create: (...args: unknown[]) => unknown } }; customers: { create: (...args: unknown[]) => unknown }; accounts: { retrieve: (...args: unknown[]) => unknown } }
    expect(stripe.checkout.sessions.create({ metadata: { userId: 'synthetic-user' } }, { idempotencyKey: 'idem_test_1' })).toEqual({ id: 'cs_test_1' })
    expect(stripeMock.calls['checkout.sessions.create']).toHaveBeenCalledWith(expect.any(Object), { idempotencyKey: 'idem_test_1' })
    stripeMock.fail('customers.create')
    expect(() => stripe.customers.create({ email: 'person@example.test' })).toThrow(/Synthetic Stripe/)
    expect(() => stripe.accounts.retrieve('acct_unconfigured')).toThrow(/Unexpected Stripe operation/)
  })

  it('supports Stripe webhook replay without hiding the received signature inputs', () => {
    const event = { id: 'evt_test_replay', type: 'checkout.session.completed' }
    stripeMock.replayWebhook(event)
    const stripe = new stripeMock.constructor() as unknown as { webhooks: { constructEvent: (...args: unknown[]) => unknown } }
    expect(stripe.webhooks.constructEvent('{}', 'sig_test', 'whsec_synthetic')).toEqual(event)
    expect(stripe.webhooks.constructEvent('{}', 'sig_test', 'whsec_synthetic')).toEqual(event)
    expect(stripeMock.calls['webhooks.constructEvent']).toHaveBeenCalledTimes(2)
  })

  it('records redacted Anthropic context for SDK and fetch responses', async () => {
    anthropicMock.text('Texte synthétique')
    const client = new anthropicMock.constructor() as unknown as { messages: { create: (body: Record<string, unknown>) => unknown } }
    expect(client.messages.create({ model: 'claude-test', system: 'private profile', messages: [{ role: 'user', content: 'hello' }] })).toMatchObject({ content: [{ text: 'Texte synthétique' }] })
    expect(anthropicCalls[0]).toMatchObject({ model: 'claude-test', system: '[REDACTED_SYSTEM_PROMPT]' })
    anthropicMock.fail(429)
    await expect(anthropicMock.fetch('https://api.anthropic.com/v1/messages', { method: 'POST', body: JSON.stringify({ model: 'claude-test' }) })).resolves.toMatchObject({ status: 429 })
    await expect(anthropicMock.fetch('https://evil.example/v1/messages')).rejects.toThrow(/Unexpected network access/)
  })

  it('records synthetic SMTP mail, redacts tokens and supports refusal', async () => {
    smtpMock.succeed()
    const transport = smtpMock.createTransport({ host: 'smtp.invalid.test' })
    await expect(transport.sendMail({ to: 'recipient@example.test', subject: 'Sujet', html: `token ${'a'.repeat(43)}` })).resolves.toMatchObject({ messageId: 'smtp_test_message_1' })
    expect(smtpMock.messages[0]).toMatchObject({ to: 'recipient@example.test', html: 'token [REDACTED_TOKEN]' })
    smtpMock.refuse()
    await expect(transport.sendMail({ to: 'refused@example.test' })).rejects.toMatchObject({ responseCode: 550 })
    await expect(transport.sendMail({ to: 'unconfigured@example.test' })).rejects.toThrow(/Unexpected SMTP/)
  })

  it.each([404, 410, 429, 500] as const)('models Web Push HTTP %s without delivery', async status => {
    webPushMock.fail(status)
    await expect(webPushMock.sendNotification({ endpoint: 'https://push.invalid.test/subscription' }, '{"safe":true}')).rejects.toMatchObject({ statusCode: status })
    expect(webPushMock.deliveries).toEqual([{ endpoint: 'https://push.invalid.test/subscription', payload: '{"safe":true}' }])
  })

  it('starts every test with isolated histories and configurations', () => {
    expect(stripeMock.calls['checkout.sessions.create']).not.toHaveBeenCalled()
    expect(anthropicCalls).toEqual([])
    expect(smtpMock.messages).toEqual([])
    expect(webPushMock.deliveries).toEqual([])
  })

  it('refuses an unconfigured Web Push delivery', async () => {
    await expect(webPushMock.sendNotification({ endpoint: 'https://push.invalid.test/unconfigured' }, '{}')).rejects.toThrow(/Unexpected Web Push/)
  })
})
