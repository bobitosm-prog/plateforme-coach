import { beforeEach, vi } from 'vitest'

type Outcome = { kind: 'return'; value: unknown } | { kind: 'throw'; error: unknown }
type Operation = keyof typeof operations

const operations = {
  'checkout.sessions.create': vi.fn(), 'checkout.sessions.retrieve': vi.fn(),
  'accounts.create': vi.fn(), 'accounts.retrieve': vi.fn(), 'accountLinks.create': vi.fn(),
  'products.create': vi.fn(), 'prices.create': vi.fn(), 'customers.create': vi.fn(),
  'webhooks.constructEvent': vi.fn(),
}
const outcomes = new Map<Operation, Outcome[]>()
const unexpected = (name: Operation) => { throw new Error(`Unexpected Stripe operation: ${name}`) }

function invoke(name: Operation, args: unknown[]) {
  operations[name](...args)
  const queue = outcomes.get(name)
  const outcome = queue?.shift()
  if (!outcome) return unexpected(name)
  if (outcome.kind === 'throw') throw outcome.error
  return outcome.value
}

export const stripeMock = {
  calls: operations,
  constructor: vi.fn(function StripeMock() {
    return {
      checkout: { sessions: { create: (...a: unknown[]) => invoke('checkout.sessions.create', a), retrieve: (...a: unknown[]) => invoke('checkout.sessions.retrieve', a) } },
      accounts: { create: (...a: unknown[]) => invoke('accounts.create', a), retrieve: (...a: unknown[]) => invoke('accounts.retrieve', a) },
      accountLinks: { create: (...a: unknown[]) => invoke('accountLinks.create', a) },
      products: { create: (...a: unknown[]) => invoke('products.create', a) }, prices: { create: (...a: unknown[]) => invoke('prices.create', a) },
      customers: { create: (...a: unknown[]) => invoke('customers.create', a) },
      webhooks: { constructEvent: (...a: unknown[]) => invoke('webhooks.constructEvent', a) },
    }
  }),
  succeed(name: Operation, value: unknown) { outcomes.set(name, [...(outcomes.get(name) || []), { kind: 'return', value }]) },
  fail(name: Operation, error: unknown = new Error('Synthetic Stripe provider failure')) { outcomes.set(name, [...(outcomes.get(name) || []), { kind: 'throw', error }]) },
  replayWebhook(event: unknown, count = 2) { for (let i = 0; i < count; i++) this.succeed('webhooks.constructEvent', event) },
  reset() { outcomes.clear(); this.constructor.mockClear(); Object.values(operations).forEach(mock => mock.mockClear()) },
}

beforeEach(() => stripeMock.reset())
