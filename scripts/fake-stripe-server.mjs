import { createServer } from 'node:http'

const host = '127.0.0.1'
const port = 55326
const requests = []
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
  if (request.method === 'DELETE' && request.url === '/__requests') { requests.length = 0; failure = false; return json(response, 200, { ok: true }) }
  if (request.method === 'POST' && request.url === '/__fail') { failure = true; return json(response, 200, { ok: true }) }
  if (request.method === 'GET' && request.url?.startsWith('/checkout/')) {
    response.writeHead(200, { 'content-type': 'text/html' }); return response.end('<h1>Local Stripe checkout</h1>')
  }
  if (request.method !== 'POST' || !['/v1/checkout/sessions', '/v1/customers'].includes(request.url)) return json(response, 404, { error: 'unsupported fake Stripe operation' })

  let body = ''
  request.on('data', chunk => { body += chunk })
  request.on('end', () => {
    const params = Object.fromEntries(new URLSearchParams(body))
    requests.push({ method: request.method, path: request.url, params })
    if (failure) return json(response, 500, { error: { type: 'api_error', message: 'Local Stripe failure' } })
    if (request.url === '/v1/customers') return json(response, 200, { id: `cus_test_local_${requests.length}`, object: 'customer' })
    const id = `cs_test_local_${requests.length}`
    return json(response, 200, { id, object: 'checkout.session', url: `http://${host}:${port}/checkout/${id}` })
  })
})

server.listen(port, host, () => console.log(`Fake Stripe local ready on ${host}:${port}`))
