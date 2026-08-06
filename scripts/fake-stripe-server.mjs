import { createServer } from 'node:http'

const host = '127.0.0.1'
const port = 55326
const requests = []
const customers = new Map()
const checkoutSessions = new Map()
const subscriptions = new Map()
const invoices = new Map()
const targetedFailures = new Map()
let customerSequence = 0
let checkoutSequence = 0
let failure = false

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}

function missing(response, resource) {
  return json(response, 404, {
    error: {
      type: 'invalid_request_error',
      code: 'resource_missing',
      message: `No such ${resource}`,
    },
  })
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', chunk => { body += chunk })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

function resetState() {
  requests.length = 0
  customers.clear()
  checkoutSessions.clear()
  subscriptions.clear()
  invoices.clear()
  targetedFailures.clear()
  customerSequence = 0
  checkoutSequence = 0
  failure = false
}

function stripePath(request) {
  return new URL(request.url || '/', `http://${host}:${port}`)
}

function recordStripeRequest(request, url, params = {}) {
  requests.push({
    method: request.method,
    path: url.pathname,
    params,
    idempotencyKey: request.headers['idempotency-key'] || null,
  })
}

function consumeTargetedFailure(request, url) {
  const key = `${request.method} ${url.pathname}`
  const status = targetedFailures.get(key)
  if (!status) return null
  targetedFailures.delete(key)
  return status
}

function resourceMap(name) {
  if (name === 'customers') return customers
  if (name === 'checkout-sessions') return checkoutSessions
  if (name === 'subscriptions') return subscriptions
  if (name === 'invoices') return invoices
  return null
}

function subscriptionFromInput(input, current = {}) {
  return {
    id: input.id,
    object: 'subscription',
    customer: input.customer,
    livemode: false,
    metadata: input.metadata || current.metadata || {},
    status: input.status || current.status || 'active',
    current_period_end: input.current_period_end || current.current_period_end || 1_798_761_600,
  }
}

function invoiceFromInput(input) {
  return {
    id: input.id,
    object: 'invoice',
    amount_paid: input.amount_paid,
    billing_reason: input.billing_reason,
    currency: input.currency,
    customer: input.customer,
    livemode: false,
    parent: {
      type: 'subscription_details',
      subscription_details: { subscription: input.subscription },
    },
    status: input.status,
    status_transitions: { paid_at: input.paid_at || 1_796_169_600 },
  }
}

const server = createServer(async (request, response) => {
  if (request.socket.remoteAddress && !['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress)) {
    return json(response, 403, { error: 'local only' })
  }

  const url = stripePath(request)
  if (request.method === 'GET' && url.pathname === '/__requests') return json(response, 200, requests)
  if (request.method === 'GET' && url.pathname === '/__state') {
    return json(response, 200, {
      customers: [...customers.values()],
      checkoutSessions: [...checkoutSessions.values()],
      subscriptions: [...subscriptions.values()],
      invoices: [...invoices.values()],
    })
  }
  if (request.method === 'DELETE' && url.pathname === '/__requests') {
    resetState()
    return json(response, 200, { ok: true })
  }
  if (request.method === 'POST' && url.pathname === '/__fail') {
    failure = true
    return json(response, 200, { ok: true })
  }
  if (request.method === 'POST' && url.pathname === '/__fail-next') {
    const input = JSON.parse(await readBody(request))
    if (!['GET', 'POST'].includes(input.method) || typeof input.path !== 'string' || !input.path.startsWith('/v1/')) {
      return json(response, 400, { error: 'invalid targeted failure' })
    }
    targetedFailures.set(`${input.method} ${input.path}`, input.status || 500)
    return json(response, 200, { ok: true })
  }
  if (request.method === 'POST' && url.pathname === '/__invoices') {
    const input = JSON.parse(await readBody(request))
    if (!input.id || !input.customer || !input.subscription || input.billing_reason !== 'subscription_cycle') {
      return json(response, 400, { error: 'invalid invoice fixture' })
    }
    const invoice = invoiceFromInput({
      amount_paid: 1000,
      currency: 'chf',
      status: 'paid',
      ...input,
    })
    invoices.set(invoice.id, invoice)
    return json(response, 200, invoice)
  }
  const subscriptionControl = url.pathname.match(/^\/__subscriptions\/([^/]+)$/)
  if (request.method === 'POST' && subscriptionControl) {
    const id = decodeURIComponent(subscriptionControl[1])
    const current = subscriptions.get(id)
    if (!current) return missing(response, 'subscription')
    const input = JSON.parse(await readBody(request))
    const subscription = subscriptionFromInput({ ...current, ...input, id }, current)
    subscriptions.set(id, subscription)
    return json(response, 200, subscription)
  }
  const resourceControl = url.pathname.match(/^\/__resources\/([^/]+)\/([^/]+)$/)
  if (request.method === 'DELETE' && resourceControl) {
    const map = resourceMap(resourceControl[1])
    if (!map) return json(response, 400, { error: 'unknown resource type' })
    return json(response, 200, { deleted: map.delete(decodeURIComponent(resourceControl[2])) })
  }
  if (request.method === 'GET' && url.pathname.startsWith('/checkout/')) {
    response.writeHead(200, { 'content-type': 'text/html' })
    return response.end('<h1>Local Stripe checkout</h1>')
  }

  if (!url.pathname.startsWith('/v1/')) return json(response, 404, { error: 'unsupported fake Stripe operation' })
  const body = request.method === 'POST' ? await readBody(request) : ''
  const params = body ? Object.fromEntries(new URLSearchParams(body)) : Object.fromEntries(url.searchParams)
  recordStripeRequest(request, url, params)

  const targetedFailure = consumeTargetedFailure(request, url)
  if (targetedFailure) return json(response, targetedFailure, { error: { type: 'api_error', message: 'Targeted local Stripe failure' } })
  if (failure) return json(response, 500, { error: { type: 'api_error', message: 'Local Stripe failure' } })

  const customerMatch = url.pathname.match(/^\/v1\/customers\/([^/]+)$/)
  if (request.method === 'GET' && customerMatch) {
    const customer = customers.get(decodeURIComponent(customerMatch[1]))
    return customer ? json(response, 200, customer) : missing(response, 'customer')
  }
  if (request.method === 'POST' && url.pathname === '/v1/customers') {
    customerSequence += 1
    const customer = {
      id: `cus_test_local_${customerSequence}`,
      object: 'customer',
      deleted: false,
      livemode: false,
      metadata: {},
    }
    customers.set(customer.id, customer)
    return json(response, 200, customer)
  }

  if (request.method === 'GET' && url.pathname === '/v1/checkout/sessions') {
    const limit = Math.max(1, Number(params.limit) || 10)
    return json(response, 200, {
      object: 'list',
      data: [...checkoutSessions.values()].slice(-limit).reverse(),
      has_more: false,
      url: '/v1/checkout/sessions',
    })
  }
  const checkoutSessionMatch = url.pathname.match(/^\/v1\/checkout\/sessions\/([^/]+)$/)
  if (request.method === 'GET' && checkoutSessionMatch) {
    const session = checkoutSessions.get(decodeURIComponent(checkoutSessionMatch[1]))
    return session ? json(response, 200, session) : missing(response, 'checkout.session')
  }
  if (request.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
    checkoutSequence += 1
    const id = `cs_test_local_${checkoutSequence}`
    const metadata = Object.fromEntries(
      Object.entries(params)
        .filter(([key]) => /^metadata\[[^\]]+\]$/.test(key))
        .map(([key, value]) => [key.slice(9, -1), value]),
    )
    const customerId = params.customer || `cus_test_local_checkout_${checkoutSequence}`
    if (!customers.has(customerId)) {
      customers.set(customerId, {
        id: customerId,
        object: 'customer',
        deleted: false,
        livemode: false,
        metadata: {},
      })
    }
    const subscriptionId = params.mode === 'subscription' ? `sub_test_local_${checkoutSequence}` : null
    if (subscriptionId) {
      subscriptions.set(subscriptionId, subscriptionFromInput({
        id: subscriptionId,
        customer: customerId,
        metadata,
        status: 'active',
      }))
    }
    const session = {
      id,
      object: 'checkout.session',
      amount_total: 1000,
      currency: 'chf',
      customer: customerId,
      livemode: false,
      metadata,
      mode: params.mode || null,
      payment_status: 'paid',
      status: 'complete',
      subscription: subscriptionId,
      success_url: params.success_url || null,
      cancel_url: params.cancel_url || null,
      url: `http://${host}:${port}/checkout/${id}`,
    }
    checkoutSessions.set(id, session)
    return json(response, 200, session)
  }

  const subscriptionMatch = url.pathname.match(/^\/v1\/subscriptions\/([^/]+)$/)
  if (request.method === 'GET' && subscriptionMatch) {
    const subscription = subscriptions.get(decodeURIComponent(subscriptionMatch[1]))
    return subscription ? json(response, 200, subscription) : missing(response, 'subscription')
  }

  const invoiceMatch = url.pathname.match(/^\/v1\/invoices\/([^/]+)$/)
  if (request.method === 'GET' && invoiceMatch) {
    const invoice = invoices.get(decodeURIComponent(invoiceMatch[1]))
    return invoice ? json(response, 200, invoice) : missing(response, 'invoice')
  }

  return json(response, 404, { error: 'unsupported fake Stripe operation' })
})

server.listen(port, host, () => console.log(`Fake Stripe local ready on ${host}:${port}`))
