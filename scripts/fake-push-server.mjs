import { createServer as createHttpsServer } from 'node:https'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const dir = mkdtempSync(join(tmpdir(), 'moovx-push-'))
const key = join(dir, 'key.pem'); const cert = join(dir, 'cert.pem')
const generated = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-subj', '/CN=127.0.0.1', '-days', '1'], { stdio: 'ignore' })
if (generated.status !== 0) throw new Error('Unable to generate local push TLS certificate')
const deliveries = []
let status = 201
const json = (res, code, value) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)) }

createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/__deliveries') return json(res, 200, deliveries)
  if (req.method === 'DELETE' && req.url === '/__deliveries') { deliveries.length = 0; status = 201; return json(res, 200, { ok: true }) }
  if (req.method === 'POST' && req.url?.startsWith('/__status/')) { status = Number(req.url.split('/').pop()); return json(res, 200, { ok: true }) }
  return json(res, 404, {})
}).listen(55329, '127.0.0.1')

createHttpsServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
  if (req.method !== 'POST' || !req.url?.startsWith('/push/')) return json(res, 404, {})
  let bytes = 0; req.on('data', chunk => { bytes += chunk.length })
  req.on('end', () => { deliveries.push({ path: req.url, bytes, encoding: req.headers['content-encoding'] || null, ttl: req.headers.ttl || null }); res.writeHead(status); res.end() })
}).listen(55328, '127.0.0.1')

console.log('Fake Web Push local ready on 127.0.0.1:55328')
