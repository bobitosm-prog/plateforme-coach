import { describe, expect, it, vi } from 'vitest'
import {
  elapsedMilliseconds,
  remainingRestSeconds,
  WorkoutRuntimeController,
  type RuntimeAudioPort,
  type RuntimeScheduler,
  type RuntimeVisibilityPort,
  type RuntimeWakeLockPort,
} from '../../lib/training/workout-runtime'

class ManualScheduler implements RuntimeScheduler {
  private nextId = 1
  readonly callbacks = new Map<number, () => void>()

  every(callback: () => void): number {
    const id = this.nextId++
    this.callbacks.set(id, callback)
    return id
  }

  cancel(handle: unknown): void { this.callbacks.delete(handle as number) }
  run(): void { [...this.callbacks.values()].forEach(callback => callback()) }
}

function harness(options?: { audioThrows?: boolean; wakeRejects?: boolean }) {
  let now = 10_000
  let visible = true
  let visibilityCallback: (() => void) | null = null
  let visibilityCleanups = 0
  const scheduler = new ManualScheduler()
  const audio: RuntimeAudioPort = {
    initialize: vi.fn(() => { if (options?.audioThrows) throw new Error('redacted') }),
    scheduleRest: vi.fn(() => { if (options?.audioThrows) throw new Error('redacted'); return ['sound'] }),
    cancelScheduled: vi.fn(), warning: vi.fn(), complete: vi.fn(),
  }
  const wakeLock: RuntimeWakeLockPort = {
    acquire: vi.fn(() => options?.wakeRejects ? Promise.reject(new Error('denied')) : undefined),
    release: vi.fn(() => options?.wakeRejects ? Promise.reject(new Error('released')) : undefined),
  }
  const visibility: RuntimeVisibilityPort = {
    isVisible: () => visible,
    subscribe(callback) {
      visibilityCallback = callback
      return () => { visibilityCallback = null; visibilityCleanups += 1 }
    },
  }
  const callbacks = { onElapsed: vi.fn(), onRestTick: vi.fn(), onRestComplete: vi.fn() }
  const controller = new WorkoutRuntimeController({
    clock: { nowMs: () => now }, scheduler, audio,
    vibration: { pulse: vi.fn() }, wakeLock, visibility,
  }, callbacks)
  return {
    controller, scheduler, audio, wakeLock, callbacks,
    advance(ms: number) { now += ms; scheduler.run() },
    setVisible(value: boolean) { visible = value; visibilityCallback?.() },
    visibilityCleanups: () => visibilityCleanups,
  }
}

describe('workout runtime', () => {
  it('calculates elapsed and remaining time with controlled timestamps', () => {
    expect(elapsedMilliseconds(5_000, 8_250)).toBe(3_250)
    expect(elapsedMilliseconds(8_000, 5_000)).toBe(0)
    expect(remainingRestSeconds(11_001, 10_000)).toBe(2)
    expect(remainingRestSeconds(9_000, 10_000)).toBe(0)
  })

  it('mounts once, progresses elapsed time and prevents duplicate intervals', () => {
    const runtime = harness()
    runtime.controller.mount(8_000)
    runtime.controller.mount(7_000)
    expect(runtime.callbacks.onElapsed).toHaveBeenLastCalledWith(2_000)
    expect(runtime.scheduler.callbacks.size).toBe(1)
    runtime.advance(1_000)
    expect(runtime.callbacks.onElapsed).toHaveBeenLastCalledWith(3_000)
    expect(runtime.wakeLock.acquire).toHaveBeenCalledTimes(1)
  })

  it('starts, warns and completes one rest period exactly once', () => {
    const runtime = harness()
    runtime.controller.mount()
    expect(runtime.controller.startRest(6)).toBe(true)
    expect(runtime.callbacks.onRestTick).toHaveBeenLastCalledWith(6, 6)
    runtime.advance(1_000)
    expect(runtime.audio.warning).toHaveBeenCalledTimes(1)
    runtime.advance(5_000)
    expect(runtime.audio.complete).toHaveBeenCalledTimes(1)
    expect(runtime.callbacks.onRestComplete).toHaveBeenCalledTimes(1)
    runtime.advance(1_000)
    expect(runtime.callbacks.onRestComplete).toHaveBeenCalledTimes(1)
  })

  it('cancels and restarts without retaining intervals or scheduled audio', () => {
    const runtime = harness()
    runtime.controller.mount()
    runtime.controller.startRest(30)
    runtime.controller.startRest(60)
    expect(runtime.audio.cancelScheduled).toHaveBeenCalledWith(['sound'])
    expect(runtime.scheduler.callbacks.size).toBe(1)
    runtime.controller.extendRest(30)
    expect(runtime.callbacks.onRestTick).toHaveBeenLastCalledWith(90, 90)
    runtime.controller.cancelRest()
    expect(runtime.scheduler.callbacks.size).toBe(0)
  })

  it('recalculates and reacquires wake lock only when visibility returns', () => {
    const runtime = harness()
    runtime.controller.mount(9_000)
    runtime.controller.startRest(10)
    runtime.setVisible(false)
    expect(runtime.wakeLock.acquire).toHaveBeenCalledTimes(1)
    runtime.advance(2_000)
    runtime.setVisible(true)
    expect(runtime.wakeLock.acquire).toHaveBeenCalledTimes(2)
    expect(runtime.callbacks.onRestTick).toHaveBeenLastCalledWith(8, 10)
  })

  it('cleans resources idempotently across Strict Mode setup and cleanup', () => {
    const runtime = harness()
    runtime.controller.mount(10_000)
    runtime.controller.startRest(20)
    runtime.controller.unmount()
    runtime.controller.unmount()
    expect(runtime.scheduler.callbacks.size).toBe(0)
    expect(runtime.wakeLock.release).toHaveBeenCalledTimes(1)
    expect(runtime.visibilityCleanups()).toBe(1)
    runtime.controller.mount(10_000)
    expect(runtime.scheduler.callbacks.size).toBe(1)
    runtime.controller.unmount()
    expect(runtime.wakeLock.release).toHaveBeenCalledTimes(2)
    expect(runtime.visibilityCleanups()).toBe(2)
  })

  it('fails safely when audio and wake lock APIs are unavailable or rejected', async () => {
    const runtime = harness({ audioThrows: true, wakeRejects: true })
    expect(() => runtime.controller.mount()).not.toThrow()
    expect(() => runtime.controller.startRest(1)).not.toThrow()
    runtime.advance(1_000)
    expect(runtime.callbacks.onRestComplete).toHaveBeenCalledOnce()
    expect(() => runtime.controller.unmount()).not.toThrow()
    await Promise.resolve()
  })

  it('refuses invalid or unmounted rest starts', () => {
    const runtime = harness()
    expect(runtime.controller.startRest(30)).toBe(false)
    runtime.controller.mount()
    expect(runtime.controller.startRest(0)).toBe(false)
    expect(runtime.controller.startRest(Number.NaN)).toBe(false)
  })
})
