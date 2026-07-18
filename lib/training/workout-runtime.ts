export interface RuntimeClock { nowMs(): number }
export interface RuntimeScheduler {
  every(callback: () => void, intervalMs: number): unknown
  cancel(handle: unknown): void
}
export interface RuntimeAudioPort {
  initialize(): void | Promise<void>
  scheduleRest(durationSeconds: number): unknown[]
  cancelScheduled(handles: unknown[]): void
  warning(): void | Promise<void>
  complete(): void | Promise<void>
}
export interface RuntimeVibrationPort { pulse(kind: 'start' | 'warning' | 'complete'): void }
export interface RuntimeWakeLockPort { acquire(): void | Promise<void>; release(): void | Promise<void> }
export interface RuntimeVisibilityPort { isVisible(): boolean; subscribe(callback: () => void): () => void }

export interface WorkoutRuntimeCallbacks {
  onElapsed(elapsedMs: number): void
  onRestTick(remainingSeconds: number, durationSeconds: number): void
  onRestComplete(): void
}

export const elapsedMilliseconds = (startedAtMs: number, nowMs: number): number => Math.max(0, nowMs - startedAtMs)
export const remainingRestSeconds = (endsAtMs: number, nowMs: number): number => Math.max(0, Math.ceil((endsAtMs - nowMs) / 1_000))

export class WorkoutRuntimeController {
  private elapsedHandle: unknown = null
  private restHandle: unknown = null
  private visibilityCleanup: (() => void) | null = null
  private scheduledSounds: unknown[] = []
  private startedAtMs: number | null = null
  private restEndsAtMs: number | null = null
  private restDurationSeconds = 0
  private previousRemaining = Infinity
  private mounted = false
  private completedRest = false

  constructor(
    private readonly ports: {
      clock: RuntimeClock
      scheduler: RuntimeScheduler
      audio: RuntimeAudioPort
      vibration: RuntimeVibrationPort
      wakeLock: RuntimeWakeLockPort
      visibility: RuntimeVisibilityPort
    },
    private readonly callbacks: WorkoutRuntimeCallbacks,
  ) {}

  mount(startedAtMs?: number): void {
    if (this.mounted) return
    this.mounted = true
    this.visibilityCleanup = this.ports.visibility.subscribe(() => this.onVisible())
    void this.safely(() => this.ports.wakeLock.acquire())
    if (startedAtMs !== undefined) this.startElapsed(startedAtMs)
  }

  startElapsed(startedAtMs: number): void {
    this.startedAtMs = startedAtMs
    if (this.elapsedHandle !== null) return
    this.emitElapsed()
    this.elapsedHandle = this.ports.scheduler.every(() => this.emitElapsed(), 1_000)
  }

  startRest(durationSeconds: number): boolean {
    if (!this.mounted || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return false
    const period = createWorkoutRestPeriod(
      { exerciseId: '', setId: '', durationSeconds },
      { now: () => new Date(this.ports.clock.nowMs()) },
    )
    if (!period.ok) return false
    this.cancelRest()
    this.restDurationSeconds = period.rest.durationSeconds
    this.restEndsAtMs = new Date(period.rest.endsAt).getTime()
    this.previousRemaining = Infinity
    this.completedRest = false
    void this.safely(() => this.ports.audio.initialize())
    try { this.scheduledSounds = this.ports.audio.scheduleRest(period.rest.durationSeconds) } catch { this.scheduledSounds = [] }
    this.emitRest()
    this.restHandle = this.ports.scheduler.every(() => this.emitRest(), 200)
    return true
  }

  extendRest(seconds: number): void {
    if (this.restEndsAtMs === null || !Number.isFinite(seconds)) return
    this.restEndsAtMs += seconds * 1_000
    this.restDurationSeconds += seconds
    this.emitRest()
  }

  cancelRest(): void {
    if (this.restHandle !== null) this.ports.scheduler.cancel(this.restHandle)
    this.restHandle = null
    if (this.scheduledSounds.length > 0) {
      try { this.ports.audio.cancelScheduled(this.scheduledSounds) } catch {}
    }
    this.scheduledSounds = []
    this.restEndsAtMs = null
    this.restDurationSeconds = 0
    this.previousRemaining = Infinity
    this.completedRest = false
  }

  stop(): void {
    if (this.elapsedHandle !== null) this.ports.scheduler.cancel(this.elapsedHandle)
    this.elapsedHandle = null
    this.startedAtMs = null
    this.cancelRest()
    void this.safely(() => this.ports.wakeLock.release())
  }

  unmount(): void {
    if (!this.mounted) return
    this.mounted = false
    this.stop()
    this.visibilityCleanup?.()
    this.visibilityCleanup = null
  }

  private emitElapsed(): void {
    if (!this.mounted || this.startedAtMs === null) return
    this.callbacks.onElapsed(elapsedMilliseconds(this.startedAtMs, this.ports.clock.nowMs()))
  }

  private emitRest(): void {
    if (!this.mounted || this.restEndsAtMs === null || this.completedRest) return
    const remaining = remainingRestSeconds(this.restEndsAtMs, this.ports.clock.nowMs())
    this.callbacks.onRestTick(remaining, this.restDurationSeconds)
    if (remaining === 5 && this.previousRemaining > 5) {
      void this.safely(() => this.ports.audio.warning())
      try { this.ports.vibration.pulse('warning') } catch {}
    }
    this.previousRemaining = remaining
    if (remaining !== 0) return
    this.completedRest = true
    if (this.restHandle !== null) this.ports.scheduler.cancel(this.restHandle)
    this.restHandle = null
    void this.safely(() => this.ports.audio.complete())
    try { this.ports.vibration.pulse('complete') } catch {}
    this.callbacks.onRestComplete()
  }

  private onVisible(): void {
    if (!this.mounted || !this.ports.visibility.isVisible()) return
    void this.safely(() => this.ports.wakeLock.acquire())
    this.emitElapsed()
    this.emitRest()
  }

  private async safely(effect: () => void | Promise<void>): Promise<void> {
    try { await effect() } catch {}
  }
}
import { createWorkoutRestPeriod } from './workout-session-model'
