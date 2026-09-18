import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { assertTemporaryPortsClosed } from '../../scripts/e2e-local-contract.mjs'
import { readyOwnedService, startOwnedProcess, stopOwnedProcesses, waitOwnedTest } from '../../scripts/e2e-process-lifecycle.mjs'

const owned: ReturnType<typeof startOwnedProcess>[] = []
const servers: Server[] = []

function start(source: string) {
  const process = startOwnedProcess(globalThis.process.execPath, ['-e', source], { stdio: ['ignore', 'pipe', 'pipe'] })
  owned.push(process)
  return process
}

async function server(hang = false) {
  const instance = createServer((_request, response) => { if (!hang) response.end('ok') })
  servers.push(instance)
  instance.listen(0, '127.0.0.1')
  await once(instance, 'listening')
  const port = (instance.address() as AddressInfo).port
  return { instance, port, url: `http://127.0.0.1:${port}` }
}

afterEach(async () => {
  await stopOwnedProcesses(owned.splice(0), [], { graceMs: 200, killMs: 2_000 })
  await Promise.all(servers.splice(0).map(instance => new Promise<void>(resolve => {
    instance.closeAllConnections()
    instance.close(() => resolve())
  })))
})

describe('E2E lifecycle with real local processes', () => {
  it('refuses an occupied port and does not terminate its unrelated owner', async () => {
    const foreign = await server()
    await expect(assertTemporaryPortsClosed([foreign.port])).rejects.toThrow('Temporary E2E ports still open')
    await expect(stopOwnedProcesses([], [foreign.port])).rejects.toThrow('Temporary E2E ports still open')
    expect(await (await fetch(foreign.url)).text()).toBe('ok')
  })

  it('detects an exit that happened before readiness was called', async () => {
    const child = start('process.exit(7)')
    await child.exited
    const foreign = await server()
    await expect(readyOwnedService(child, foreign.url)).rejects.toThrow('exited before readiness')
  })

  it('fails promptly on an executable spawn error without exposing its arguments', async () => {
    const child = startOwnedProcess('/nonexistent/moovx-test-command', ['synthetic-sensitive-argument'])
    owned.push(child)
    await expect(readyOwnedService(child, 'http://127.0.0.1:1')).rejects.toThrow('exited before readiness')
    expect(child.outcome?.spawnError).toBe(true)
  })

  it('bounds a hanging HTTP readiness probe', async () => {
    const hanging = await server(true)
    const child = start('setInterval(() => {}, 1000)')
    const started = performance.now()
    await expect(readyOwnedService(child, hanging.url, { timeoutMs: 200 })).rejects.toThrow('Local service unavailable')
    expect(performance.now() - started).toBeLessThan(2_000)
  })

  it('follows the app redirect to login on the same origin', async () => {
    const child = start(`
      const server = require('node:http').createServer((req, res) => {
        if (req.url === '/') { res.writeHead(307, { Location: '/login' }); res.end(); }
        else res.end('login');
      });
      server.listen(0, '127.0.0.1', () => console.log(server.address().port));
    `)
    const [message] = await once(child.child.stdout!, 'data')
    await expect(readyOwnedService(child, `http://127.0.0.1:${Number(String(message).trim())}`)).resolves.toBeUndefined()
  })

  it('rejects cross-origin redirects without contacting the destination', async () => {
    const destination = await server()
    let contacted = false
    destination.instance.on('request', () => { contacted = true })
    const child = start(`
      const server = require('node:http').createServer((req, res) => {
        res.writeHead(302, { Location: ${JSON.stringify(destination.url)} }); res.end();
      });
      server.listen(0, '127.0.0.1', () => console.log(server.address().port));
    `)
    const [message] = await once(child.child.stdout!, 'data')
    await expect(readyOwnedService(child, `http://127.0.0.1:${Number(String(message).trim())}`)).rejects.toThrow('leaves the configured origin')
    expect(contacted).toBe(false)
  })

  it('rejects a same-origin redirect loop instead of probing indefinitely', async () => {
    const child = start(`
      const server = require('node:http').createServer((req, res) => {
        res.writeHead(307, { Location: '/' }); res.end();
      });
      server.listen(0, '127.0.0.1', () => console.log(server.address().port));
    `)
    const [message] = await once(child.child.stdout!, 'data')
    await expect(readyOwnedService(child, `http://127.0.0.1:${Number(String(message).trim())}`)).rejects.toThrow('redirect loop')
  })

  it('stops waiting when a provider dies during the browser test', async () => {
    const provider = start('setInterval(() => {}, 1000)')
    const browser = start('setInterval(() => {}, 1000)')
    const waiting = waitOwnedTest(browser, [provider])
    provider.child.kill('SIGTERM')
    await expect(waiting).rejects.toThrow('service exited while browser tests were running')
  })

  it('preserves browser assertion failures without retrying', async () => {
    const provider = start('setInterval(() => {}, 1000)')
    const browser = start('process.exit(3)')
    expect(await waitOwnedTest(browser, [provider])).toBe(3)
  })

  it('does not accept a completed test when its provider has already exited', async () => {
    const provider = start('process.exit(1)')
    const browser = start('process.exit(0)')
    await Promise.all([provider.exited, browser.exited])
    await expect(waitOwnedTest(browser, [provider])).rejects.toThrow('service exited while browser tests were running')
  })

  it('waits for graceful shutdown and verifies that the provider port is released', async () => {
    const child = start(`
      const server = require('node:http').createServer((req, res) => res.end('ok'));
      server.listen(0, '127.0.0.1', () => console.log(server.address().port));
      process.on('SIGTERM', () => setTimeout(() => server.close(() => process.exit(0)), 150));
    `)
    const [message] = await once(child.child.stdout!, 'data')
    const port = Number(String(message).trim())
    await readyOwnedService(child, `http://127.0.0.1:${port}`)
    await stopOwnedProcesses([child], [port], { graceMs: 2_000 })
    expect(child.outcome?.code).toBe(0)
  })

  it('escalates only its own unresponsive process after the grace period', async () => {
    const child = start("process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000)")
    await once(child.child.stdout!, 'data')
    await stopOwnedProcesses([child], [], { graceMs: 100, killMs: 2_000 })
    expect(child.outcome?.signal).toBe('SIGKILL')
  })
})
