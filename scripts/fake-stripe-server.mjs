import { createServer } from 'node:http'

const host = '127.0.0.1'
const port = 55326
const requests = []
const checkoutSessions = new Map()
const subscriptions = new Map()
let failure = false

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}

const server = createServer((request, response) => {
  if (request.socket.remoteAddress && !['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress)) {
    return json(response, 403, { error: 'local only' })
  }
  if (request.method === 'GET' && request.url === '/__requests') return json(response, 200, requests)
  if (request.method === 'DELETE' && request.url === '/__requests') { requests.length = 0; checkoutSessions.clear(); subscriptions.clear(); failure = false; return json(response, 200, { ok: true }) }
  if (request.method === 'POST' && request.url === '/__fail') { failure = true; return json(response, 200, { ok: true }) }
  if (request.method === 'GET' && request.url?.startsWith('/checkout/')) {
    response.writeHead(200, { 'content-type': 'text/html' }); return response.end('<h1>Local Stripe checkout</h1>')
  }
  const checkoutSessionMatch = request.url?.match(/^\/v1\/checkout\/sessions\/([^/?]+)(?:\?.*)?$/)
  if (request.method === 'GET' && checkoutSessionMatch) {
    const session = checkoutSessions.get(decodeURIComponent(checkoutSessionMatch[1]))
    return session
      ? json(response, 200, session)
      : json(response, 404, { error: { type: 'invalid_request_error', code: 'resource_missing', message: 'No such checkout.session' } })
  }
  const subscriptionMatch = request.url?.match(/^\/v1\/subscriptions\/([^/?]+)(?:\?.*)?$/)
  if (request.method === 'GET' && subscriptionMatch) {
    const subscription = subscriptions.get(decodeURIComponent(subscriptionMatch[1]))
    return subscription
      ? json(response, 200, subscription)
      : json(response, 404, { error: { type: 'invalid_request_error', code: 'resource_missing', message: 'No such subscription' } })
  }
  if (request.method !== 'POST' || !['/v1/checkout/sessions', '/v1/customers'].includes(request.url)) return json(response, 404, { error: 'unsupported fake Stripe operation' })

  let body = ''
  request.on('data', chunk => { body += chunk })
  request.on('end', () => {
    const params = Object.fromEntries(new URLSearchParams(body))
    requests.push({
      method: request.method,
      path: request.url,
      params,
      idempotencyKey: request.headers['idempotency-key'] || null,
    })
    if (failure) return json(response, 500, { error: { type: 'api_error', message: 'Local Stripe failure' } })
    if (request.url === '/v1/customers') return json(response, 200, { id: `cus_test_local_${requests.length}`, object: 'customer' })
    const id = `cs_test_local_${requests.length}`
    const metadata = Object.fromEntries(
      Object.entries(params)
        .filter(([key]) => /^metadata\[[^\]]+\]$/.test(key))
        .map(([key, value]) => [key.slice(9, -1), value]),
    )
    const subscriptionId = params.mode === 'subscription' ? `sub_test_local_${requests.length}` : null
    if (subscriptionId) {
      subscriptions.set(subscriptionId, {
        id: subscriptionId,
        object: 'subscription',
        customer: `cus_test_local_${requests.length}`,
        livemode: false,
        metadata,
        status: 'active',
      })
    }
    checkoutSessions.set(id, {
      id,
      object: 'checkout.session',
      amount_total: null,
      currency: 'chf',
      customer: `cus_test_local_${requests.length}`,
      livemode: false,
      metadata,
      mode: params.mode || null,
      payment_status: 'paid',
      status: 'complete',
      subscription: subscriptionId,
      success_url: params.success_url || null,
      cancel_url: params.cancel_url || null,
      url: `http://${host}:${port}/checkout/${id}`,
    })
    return json(response, 200, { id, object: 'checkout.session', url: `http://${host}:${port}/checkout/${id}` })
  })
})

server.listen(port, host, () => console.log(`Fake Stripe local ready on ${host}:${port}`))
