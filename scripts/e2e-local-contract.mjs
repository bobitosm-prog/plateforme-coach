import net from 'node:net'
import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])

export const E2E_TEMPORARY_PORTS = [3210, 55326, 55328, 55329, 55330]

export function acquireE2eLock(lockPath, label = 'E2E suite', pid = process.pid) {
  try {
    const fd = openSync(lockPath, 'wx', 0o600)
    writeFileSync(fd, `${pid}\n`)
    closeSync(fd)
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    const owner = readFileSync(lockPath, 'utf8').trim() || 'unknown'
    throw new Error(`Another ${label} is already running (pid ${owner})`)
  }
  return () => { try { unlinkSync(lockPath) } catch (error) { if (error.code !== 'ENOENT') throw error } }
}

export function assertLocalE2eUrl(value, label = 'E2E URL') {
  const url = new URL(value)
  if (!LOCAL_HOSTS.has(url.hostname)) throw new Error(`Refusing non-local ${label}: ${url.origin}`)
  return url
}

export function redactE2eOutput(value) {
  return String(value)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]')
    .replace(/[A-Za-z0-9_-]{43}/g, '[REDACTED_TOKEN]')
    .replace(/(authorization|cookie|set-cookie|service[_-]?role[_-]?key|anon[_-]?key|api[_-]?key|private[_-]?key|invitation[_-]?token)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/("(?:system|prompt|messages|profile|payload)"\s*:\s*)("(?:\\.|[^"\\])*"|\[[\s\S]*?\]|\{[\s\S]*?\})/gi, '$1"[REDACTED]"')
}

export async function isPortOpen(port, host = '127.0.0.1', timeoutMs = 350) {
  return await new Promise(resolve => {
    const socket = net.createConnection({ port, host })
    const finish = open => { socket.destroy(); resolve(open) }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

export async function assertTemporaryPortsClosed(ports = E2E_TEMPORARY_PORTS) {
  const states = await Promise.all(ports.map(async port => [port, await isPortOpen(port)]))
  const open = states.filter(([, active]) => active).map(([port]) => port)
  if (open.length) throw new Error(`Temporary E2E ports still open: ${open.join(', ')}`)
}
