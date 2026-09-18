import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { assertLocalE2eUrl, assertTemporaryPortsClosed } from './e2e-local-contract.mjs'

/** @typedef {{ code: number | null, signal: NodeJS.Signals | null, spawnError: boolean }} ProcessOutcome */
/** @typedef {{ child: import('node:child_process').ChildProcess, outcome: ProcessOutcome | null, exited: Promise<ProcessOutcome> }} OwnedProcess */

// Register exit/error listeners at spawn time, including for children that fail
// before their caller starts waiting. Never include arguments or env in errors.
export function startOwnedProcess(command, args, options = {}) {
  const child = spawn(command, args, { ...options, detached: true })
  /** @type {OwnedProcess} */
  const owned = { child, outcome: null, exited: new Promise(() => {}) }
  owned.exited = new Promise(resolve => {
    const finish = outcome => {
      if (owned.outcome) return
      owned.outcome = outcome
      resolve(outcome)
    }
    child.once('error', () => finish({ code: null, signal: null, spawnError: true }))
    child.once('exit', (code, signal) => finish({ code, signal, spawnError: false }))
  })
  return owned
}

export async function readyOwnedService(owned, value, { timeoutMs = 60_000, pollMs = 100 } = {}) {
  const url = assertLocalE2eUrl(value)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const stopped = owned.exited.then(() => {
    throw new Error(`Local service exited before readiness: ${url.origin}`)
  })
  const probe = async () => {
    while (!controller.signal.aborted) {
      if (owned.outcome) throw new Error(`Local service exited before readiness: ${url.origin}`)
      try {
        const response = await fetch(url, {
          redirect: 'manual',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(1_000)]),
        })
        await response.body?.cancel()
        if (response.ok && !owned.outcome) return
      } catch { /* Retry readiness only; never retry a browser assertion. */ }
      await delay(pollMs, undefined, { signal: controller.signal }).catch(() => {})
    }
    throw new Error(`Local service unavailable: ${url.origin}`)
  }
  try {
    await Promise.race([probe(), stopped])
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}

export async function waitOwnedTest(test, services) {
  const assertServicesAlive = () => {
    if (services.some(service => service.outcome)) {
      throw new Error('Local E2E service exited while browser tests were running')
    }
  }
  assertServicesAlive()
  const result = await Promise.race([
    test.exited,
    ...services.map(service => service.exited.then(() => {
      throw new Error('Local E2E service exited while browser tests were running')
    })),
  ])
  assertServicesAlive()
  return result.code ?? 1
}

function groupExists(owned) {
  if (!owned.child.pid || owned.outcome?.spawnError) return false
  try { process.kill(-owned.child.pid, 0); return true } catch (error) {
    if (error.code === 'ESRCH') return false
    // EPERM proves existence, not disappearance (also seen during exit on macOS).
    if (error.code === 'EPERM') return true
    throw new Error(`E2E cleanup: unable to inspect owned process group (${error.code})`)
  }
}

function signalGroup(owned, signal) {
  if (!groupExists(owned)) return
  try { process.kill(-owned.child.pid, signal) } catch (error) {
    if (error.code !== 'ESRCH') throw new Error('E2E cleanup: unable to stop owned process group')
  }
}

async function waitForGroups(children, timeoutMs) {
  const deadline = performance.now() + timeoutMs
  while (children.some(groupExists) && performance.now() < deadline) await delay(50)
  return !children.some(groupExists)
}

export async function stopOwnedProcesses(children, ports, { graceMs = 5_000, killMs = 5_000 } = {}) {
  const reverse = [...children].reverse()
  for (const owned of reverse) signalGroup(owned, 'SIGTERM')
  if (!await waitForGroups(reverse, graceMs)) {
    for (const owned of reverse) signalGroup(owned, 'SIGKILL')
    if (!await waitForGroups(reverse, killMs)) throw new Error('E2E cleanup: owned process groups did not stop')
  }
  // A port held by an unrelated process causes a failure, never a kill.
  await assertTemporaryPortsClosed(ports)
}
