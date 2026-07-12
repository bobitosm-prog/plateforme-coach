import { createServer } from 'node:http'

const host = '127.0.0.1'
const port = 55330
const requests = []
let mode = 'normal'

const responses = {
  normal: 'Réponse locale déterministe. Ton coach MoovX',
  markdown: '## Plan local\n### Priorité\n- Garde **une bonne technique**\nHydrate-toi.\n\nTon coach MoovX',
  hostile: '## <script>alert(1)</script> Plan **sûr**\n### <svg onload=alert(1)> Priorité\n- <img src=x onerror=alert(1)> **technique**\n<iframe src="https://evil.example">\n<div onclick="alert(1)" onmouseover="alert(1)">clic</div>\n[clic](javascript:alert(1)) [data](data:text/html,boom)\n<div><strong>mal fermé\nMarkdown **légitime** restant.',
}

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(value))
}

const server = createServer((req, res) => {
  if (req.socket.remoteAddress && !['127.0.0.1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return json(res, 403, { error: 'local only' })
  if (req.method === 'GET' && req.url === '/__requests') return json(res, 200, requests)
  if (req.method === 'DELETE' && req.url === '/__requests') { requests.length = 0; mode = 'normal'; return json(res, 200, { ok: true }) }
  if (req.method === 'POST' && req.url?.startsWith('/__mode/')) {
    mode = decodeURIComponent(req.url.slice('/__mode/'.length))
    return json(res, 200, { ok: true })
  }
  if (req.method !== 'POST' || req.url !== '/v1/messages') return json(res, 404, { error: 'unsupported local Anthropic operation' })

  let raw = ''
  req.on('data', chunk => { raw += chunk })
  req.on('end', () => {
    let body
    try { body = JSON.parse(raw) } catch { return json(res, 400, { error: 'invalid request json' }) }
    requests.push({ method: req.method, path: req.url, body })
    if (mode === '429') return json(res, 429, { type: 'error', error: { type: 'rate_limit_error', message: 'local rate limit' } })
    if (mode === '500') return json(res, 500, { type: 'error', error: { type: 'api_error', message: 'local failure' } })
    if (mode === 'malformed') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{malformed') }
    const text = responses[mode] || responses.normal
    return json(res, 200, { id: `msg_local_${requests.length}`, type: 'message', role: 'assistant', content: [{ type: 'text', text }] })
  })
})

server.listen(port, host, () => console.log(`Fake Anthropic local ready on ${host}:${port}`))
