import { describe, expect, it, vi } from 'vitest'
import {
  abandonWorkout,
  createWorkoutSession,
  prepareWorkoutFinalization,
  startWorkout,
  updateWorkoutSet,
  type WorkoutSessionState,
} from '../../lib/training/workout-session-model'
import {
  ACTIVE_WORKOUT_STORAGE_KEY,
  WORKOUT_DRAFT_MAX_AGE_MS,
  WORKOUT_DRAFT_STORAGE_KEY,
  clearActiveWorkout,
  clearWorkoutDraft,
  readActiveWorkout,
  readWorkoutDraft,
  writeActiveWorkout,
  writeWorkoutDraft,
  type WorkoutStorage,
} from '../../lib/training/workout-session-storage'
import {
  WorkoutRuntimeController,
  type RuntimeAudioPort,
  type RuntimeScheduler,
  type RuntimeVisibilityPort,
  type RuntimeWakeLockPort,
} from '../../lib/training/workout-runtime'

function memoryStorage(seed: Record<string, string> = {}): WorkoutStorage & { entries: Map<string, string> } {
  const entries = new Map(Object.entries(seed))
  return {
    entries,
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value) },
    removeItem: key => { entries.delete(key) },
  }
}

class ManualScheduler implements RuntimeScheduler {
  private nextId = 1
  readonly callbacks = new Map<number, () => void>()
  every(callback: () => void): number {
    const id = this.nextId++
    this.callbacks.set(id, callback)
    return id
  }
  cancel(handle: unknown): void { this.callbacks.delete(handle as number) }
  flush(): void { [...this.callbacks.values()].forEach(callback => callback()) }
}

function runtimeHarness(options?: { wakeRejected?: boolean; audioRejected?: boolean }) {
  let now = 100_000
  let visible = true
  let visibilityCallback: (() => void) | null = null
  let cleanupCount = 0
  const scheduler = new ManualScheduler()
  const audio: RuntimeAudioPort = {
    initialize: vi.fn(() => options?.audioRejected ? Promise.reject(new Error('redacted')) : undefined),
    scheduleRest: vi.fn(() => options?.audioRejected ? (() => { throw new Error('redacted') })() : ['scheduled']),
    cancelScheduled: vi.fn(),
    warning: vi.fn(() => options?.audioRejected ? Promise.reject(new Error('redacted')) : undefined),
    complete: vi.fn(() => options?.audioRejected ? Promise.reject(new Error('redacted')) : undefined),
  }
  const vibration = { pulse: vi.fn() }
  const wakeLock: RuntimeWakeLockPort = {
    acquire: vi.fn(() => options?.wakeRejected ? Promise.reject(new Error('redacted')) : undefined),
    release: vi.fn(() => options?.wakeRejected ? Promise.reject(new Error('redacted')) : undefined),
  }
  const visibility: RuntimeVisibilityPort = {
    isVisible: () => visible,
    subscribe(callback) {
      visibilityCallback = callback
      return () => { visibilityCallback = null; cleanupCount += 1 }
    },
  }
  const callbacks = { onElapsed: vi.fn(), onRestTick: vi.fn(), onRestComplete: vi.fn() }
  const controller = new WorkoutRuntimeController({ clock: { nowMs: () => now }, scheduler, audio, vibration, wakeLock, visibility }, callbacks)
  return {
    controller, scheduler, audio, vibration, wakeLock, callbacks,
    advanceWhileSuspended(ms: number) { now += ms },
    tick(ms: number) { now += ms; scheduler.flush() },
    setVisible(value: boolean) { visible = value; visibilityCallback?.() },
    cleanupCount: () => cleanupCount,
  }
}

function runningState(): WorkoutSessionState {
  const created = createWorkoutSession({
    name: 'Jambes', source: { kind: 'free' },
    exercises: [{
      id: 'squat', index: 0, name: 'Squat', muscle: 'Jambes', exerciseId: null,
      targetSets: 1, targetRepetitions: '8', restSeconds: 90, legacy: null,
      sets: [{ id: 'set-1', index: 0, weight: 80, repetitions: 8, completed: false, rir: null }],
    }],
  }, { now: () => new Date('2026-07-18T10:00:00.000Z') })
  if (!created.ok) throw new Error(created.reason)
  const started = startWorkout(created.state)
  if (!started.ok) throw new Error(started.reason)
  return started.state
}

describe('mobile workout interruption and recovery characterization', () => {
  it('keeps an active launch envelope across interruption and reload', () => {
    const storage = memoryStorage()
    const active = { name: 'Jambes', exercises: [{ name: 'Squat' }], startedAt: '2026-07-18T10:00:00.000Z', weekdayKey: 'samedi' }
    writeActiveWorkout(storage, active)
    const reloaded = readActiveWorkout<typeof active>(storage)
    expect(reloaded).toEqual(active)
    expect(storage.entries.get(ACTIVE_WORKOUT_STORAGE_KEY)).toBe(JSON.stringify(active))
  })

  it('restores a matching draft and isolates absent, incomplete, unreadable and expired caches', () => {
    const now = Date.UTC(2026, 6, 18, 12)
    const valid = { sessionName: 'Jambes', startedAt: '2026-07-18T10:00:00.000Z', savedAt: new Date(now - 1_000).toISOString(), exos: [{ id: 'squat', sets: [{ done: true }] }] }
    const storage = memoryStorage()
    writeWorkoutDraft(storage, valid)
    expect(readWorkoutDraft(storage, 'Jambes', now)).toEqual(valid)
    expect(readWorkoutDraft(memoryStorage(), 'Jambes', now)).toBeNull()
    expect(readWorkoutDraft(memoryStorage({ [WORKOUT_DRAFT_STORAGE_KEY]: '{' }), 'Jambes', now)).toBeNull()
    expect(readWorkoutDraft(memoryStorage({ [WORKOUT_DRAFT_STORAGE_KEY]: JSON.stringify({ sessionName: 'Jambes', savedAt: valid.savedAt }) }), 'Jambes', now)).toBeNull()
    const expired = { ...valid, savedAt: new Date(now - WORKOUT_DRAFT_MAX_AGE_MS - 1).toISOString() }
    expect(readWorkoutDraft(memoryStorage({ [WORKOUT_DRAFT_STORAGE_KEY]: JSON.stringify(expired) }), 'Jambes', now)).toBeNull()
  })

  it('characterizes owner-less caches and the current acceptance of invalid savedAt', () => {
    const storage = memoryStorage()
    writeActiveWorkout(storage, { name: 'Jambes', exercises: [] })
    writeWorkoutDraft(storage, { sessionName: 'Jambes', startedAt: '2026-07-18T10:00:00.000Z', savedAt: 'invalid', exos: [] })
    expect(storage.entries.get(ACTIVE_WORKOUT_STORAGE_KEY)).not.toContain('userId')
    expect(storage.entries.get(WORKOUT_DRAFT_STORAGE_KEY)).not.toContain('userId')
    expect(readWorkoutDraft(storage, 'Jambes', Date.UTC(2026, 6, 18, 12))?.savedAt).toBe('invalid')
  })

  it('recalculates rest from the absolute deadline after background suspension', () => {
    const runtime = runtimeHarness()
    runtime.controller.mount(90_000)
    runtime.controller.startRest(10)
    runtime.setVisible(false)
    runtime.advanceWhileSuspended(4_200)
    expect(runtime.callbacks.onRestTick).toHaveBeenLastCalledWith(10, 10)
    runtime.setVisible(true)
    expect(runtime.callbacks.onRestTick).toHaveBeenLastCalledWith(6, 10)
    expect(runtime.callbacks.onRestComplete).not.toHaveBeenCalled()
  })

  it('completes once when returning visible after the absolute deadline', () => {
    const runtime = runtimeHarness()
    runtime.controller.mount()
    runtime.controller.startRest(10)
    runtime.setVisible(false)
    runtime.advanceWhileSuspended(12_000)
    runtime.setVisible(true)
    expect(runtime.callbacks.onRestTick).toHaveBeenLastCalledWith(0, 10)
    expect(runtime.callbacks.onRestComplete).toHaveBeenCalledOnce()
    expect(runtime.audio.complete).toHaveBeenCalledOnce()
    expect(runtime.vibration.pulse).toHaveBeenCalledTimes(1)
    runtime.scheduler.flush()
    runtime.setVisible(true)
    expect(runtime.callbacks.onRestComplete).toHaveBeenCalledOnce()
    expect(runtime.audio.complete).toHaveBeenCalledOnce()
  })

  it('characterizes wake-lock loss as browser-owned and reacquires on return', () => {
    const runtime = runtimeHarness()
    runtime.controller.mount()
    expect(runtime.wakeLock.acquire).toHaveBeenCalledOnce()
    runtime.setVisible(false)
    expect(runtime.wakeLock.release).not.toHaveBeenCalled()
    runtime.setVisible(true)
    expect(runtime.wakeLock.acquire).toHaveBeenCalledTimes(2)
    runtime.controller.unmount()
    expect(runtime.wakeLock.release).toHaveBeenCalledOnce()
  })

  it('fails closed when wake lock and audio are unavailable without duplicate effects', async () => {
    const runtime = runtimeHarness({ wakeRejected: true, audioRejected: true })
    expect(() => runtime.controller.mount()).not.toThrow()
    expect(runtime.controller.startRest(1)).toBe(true)
    runtime.setVisible(false)
    runtime.advanceWhileSuspended(2_000)
    expect(() => runtime.setVisible(true)).not.toThrow()
    expect(runtime.callbacks.onRestComplete).toHaveBeenCalledOnce()
    expect(runtime.audio.complete).toHaveBeenCalledOnce()
    expect(runtime.vibration.pulse).toHaveBeenCalledOnce()
    await Promise.resolve()
  })

  it('cleans timers, sounds, visibility and wake lock after abandonment or unmount', () => {
    const runtime = runtimeHarness()
    runtime.controller.mount()
    runtime.controller.startRest(30)
    runtime.controller.stop()
    expect(runtime.scheduler.callbacks.size).toBe(0)
    expect(runtime.audio.cancelScheduled).toHaveBeenCalledOnce()
    expect(runtime.wakeLock.release).toHaveBeenCalledOnce()
    runtime.controller.unmount()
    expect(runtime.cleanupCount()).toBe(1)
    expect(runtime.wakeLock.release).toHaveBeenCalledTimes(2)
  })

  it('supports Strict Mode double setup and cleanup without resource leaks', () => {
    const runtime = runtimeHarness()
    runtime.controller.mount()
    runtime.controller.mount()
    expect(runtime.scheduler.callbacks.size).toBe(0)
    expect(runtime.wakeLock.acquire).toHaveBeenCalledOnce()
    runtime.controller.unmount()
    runtime.controller.unmount()
    expect(runtime.cleanupCount()).toBe(1)
    runtime.controller.mount()
    expect(runtime.wakeLock.acquire).toHaveBeenCalledTimes(2)
    runtime.controller.unmount()
    expect(runtime.cleanupCount()).toBe(2)
  })

  it('characterizes abandonment and finalization after a restored interruption', () => {
    const storage = memoryStorage({ [ACTIVE_WORKOUT_STORAGE_KEY]: JSON.stringify({ name: 'Jambes' }), [WORKOUT_DRAFT_STORAGE_KEY]: '{}' })
    const running = runningState()
    const completedSet = updateWorkoutSet(running, 'squat', 'set-1', { completed: true })
    if (!completedSet.ok) throw new Error(completedSet.reason)
    expect(prepareWorkoutFinalization(completedSet.state, 60_000)).toMatchObject({ ok: true, snapshot: { completedSets: 1 } })
    clearWorkoutDraft(storage)
    clearActiveWorkout(storage)
    expect(storage.entries.size).toBe(0)

    const abandoned = abandonWorkout(running, { now: () => new Date('2026-07-18T10:05:00.000Z') })
    expect(abandoned).toMatchObject({ ok: true, state: { phase: 'abandoned' } })
  })
})
