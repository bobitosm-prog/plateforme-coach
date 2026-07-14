import { beforeEach, vi } from 'vitest'

type Delivery = { endpoint: string; payload: string }
let outcomes: Array<{ status: number }> = []
export const webPushMock = {
  vapid: [] as Array<{ subject: string; publicKey: string; privateKey: '[REDACTED]' }>, deliveries: [] as Delivery[],
  setVapidDetails: vi.fn((subject: string, publicKey: string, privateKey: string) => { void privateKey; webPushMock.vapid.push({ subject, publicKey, privateKey: '[REDACTED]' }) }),
  sendNotification: vi.fn(async (subscription: { endpoint: string }, payload: string) => {
    webPushMock.deliveries.push({ endpoint: subscription.endpoint, payload })
    const outcome = outcomes.shift()
    if (!outcome) throw new Error('Unexpected Web Push delivery: configure a response first')
    if (outcome.status >= 400) throw Object.assign(new Error(`Synthetic Web Push ${outcome.status}`), { statusCode: outcome.status })
    return { statusCode: outcome.status }
  }),
  succeed() { outcomes.push({ status: 201 }) },
  fail(status: 404 | 410 | 429 | 500) { outcomes.push({ status }) },
  reset() { outcomes = []; this.vapid.length = 0; this.deliveries.length = 0; this.setVapidDetails.mockClear(); this.sendNotification.mockClear() },
}
beforeEach(() => webPushMock.reset())
