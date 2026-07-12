import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

type WorkerEvent = { notificationclick?: (event: ClickEvent) => void }
type ClickEvent = {
  notification: { data: { url: unknown }; close: () => void }
  waitUntil: (promise: Promise<unknown>) => void
}

function workerHarness() {
  const listeners: WorkerEvent = {}
  const opened: string[] = []
  const self = {
    location: { origin: 'https://app.moovx.test' },
    skipWaiting: () => undefined,
    registration: { showNotification: () => Promise.resolve() },
    clients: {
      claim: () => Promise.resolve(),
      matchAll: () => Promise.resolve([]),
      openWindow: (url: string) => { opened.push(url); return Promise.resolve() },
    },
    addEventListener: (name: keyof WorkerEvent, listener: WorkerEvent[keyof WorkerEvent]) => {
      listeners[name] = listener
    },
  }
  const caches = { keys: () => Promise.resolve([]), delete: () => Promise.resolve(true) }
  const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')
  runInNewContext(source, { self, caches, Promise, decodeURIComponent })
  return { listeners, opened }
}

async function click(url: unknown) {
  const { listeners, opened } = workerHarness()
  let completion = Promise.resolve()
  listeners.notificationclick?.({
    notification: { data: { url }, close: () => undefined },
    waitUntil: promise => { completion = promise.then(() => undefined) },
  })
  await completion
  return opened[0]
}

describe('service worker notificationclick destination defense', () => {
  it('opens a legitimate internal destination', async () => {
    await expect(click('/coach?tab=messages#latest')).resolves.toBe('/coach?tab=messages#latest')
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    'javascript:alert(1)',
    '/%252F%252Fevil.example',
    '/safe\\evil',
    '/safe\nexternal',
  ])('falls back to / for an old hostile notification destination %s', async value => {
    await expect(click(value)).resolves.toBe('/')
  })
})
