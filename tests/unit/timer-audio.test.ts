// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

class FakeAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running'
  currentTime = 0
  destination = {}
  oscillators: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = []

  constructor() { lastContext = this }

  createOscillator() {
    const oscillator = {
      connect: vi.fn(), disconnect: vi.fn(),
      frequency: { value: 0, setValueAtTime: vi.fn() },
      type: 'sine', start: vi.fn(), stop: vi.fn(),
    }
    this.oscillators.push(oscillator)
    return oscillator
  }

  createGain() {
    return {
      connect: vi.fn(), disconnect: vi.fn(),
      gain: {
        value: 0,
        setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
    }
  }

  resume() {
    this.state = 'running'
    return Promise.resolve()
  }
}

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  lastContext = null
  vi.stubGlobal('AudioContext', FakeAudioContext)
})

describe('rest timer audio', () => {
  it('sends a native completion deadline only when sound is enabled', async () => {
    const postMessage = vi.fn()
    vi.stubGlobal('webkit', { messageHandlers: { moovxRestTimer: { postMessage } } })
    const audio = await import('@/lib/timer-audio')
    const deadline = Date.now() + 20_000
    audio.scheduleNativeRestNotification(deadline)
    expect(postMessage).toHaveBeenCalledWith({ action: 'schedule', deadlineMs: deadline })
    audio.setTimerSoundEnabled(false)
    expect(postMessage).toHaveBeenCalledWith({ action: 'cancel' })
    postMessage.mockClear()
    audio.scheduleNativeRestNotification(deadline)
    expect(postMessage).toHaveBeenCalledOnce()
    expect(postMessage).toHaveBeenCalledWith({ action: 'cancel' })
    vi.unstubAllGlobals()
  })
  it('does not cancel or double-play an on-time scheduled finish cue', async () => {
    const audio = await import('@/lib/timer-audio')
    audio.initAudio()
    const ctx = lastContext!
    const sounds = audio.scheduleRestPeriodSounds(10)
    expect(sounds).toHaveLength(3)
    const originalCount = ctx.oscillators.length
    ctx.currentTime = 10
    audio.finishRestPeriodSounds(sounds)
    expect(ctx.oscillators).toHaveLength(originalCount)
    expect(ctx.oscillators.slice(-3).every(osc => osc.stop.mock.calls.length === 1)).toBe(true)
  })

  it('replaces a suspended scheduled cue with an immediate finish cue', async () => {
    const audio = await import('@/lib/timer-audio')
    audio.initAudio()
    const ctx = lastContext!
    const sounds = audio.scheduleRestPeriodSounds(10)
    const originalCount = ctx.oscillators.length
    ctx.state = 'suspended'
    ctx.currentTime = 1
    audio.finishRestPeriodSounds(sounds)
    await Promise.resolve()
    expect(ctx.oscillators).toHaveLength(originalCount + 3)
    expect(ctx.oscillators.slice(1, 4).every(osc => osc.stop.mock.calls.length === 2)).toBe(true)
  })

  it('replaces a cue delayed by an interrupted audio clock', async () => {
    const audio = await import('@/lib/timer-audio')
    audio.initAudio()
    const ctx = lastContext!
    const sounds = audio.scheduleRestPeriodSounds(10)
    const originalCount = ctx.oscillators.length
    ctx.currentTime = 1
    audio.finishRestPeriodSounds(sounds)
    expect(ctx.oscillators).toHaveLength(originalCount + 3)
  })

  it('does not play a second finish cue when the JS timer runs late', async () => {
    const audio = await import('@/lib/timer-audio')
    audio.initAudio()
    const ctx = lastContext!
    const sounds = audio.scheduleRestPeriodSounds(10)
    const originalCount = ctx.oscillators.length
    ctx.currentTime = 11
    audio.finishRestPeriodSounds(sounds)
    expect(ctx.oscillators).toHaveLength(originalCount)
  })

  it('respects the disabled sound preference before scheduling', async () => {
    localStorage.setItem('timerSound', 'false')
    const audio = await import('@/lib/timer-audio')
    audio.initAudio()
    expect(audio.scheduleRestPeriodSounds(10)).toEqual([])
    const count = lastContext!.oscillators.length
    audio.finishRestPeriodSounds([])
    expect(lastContext!.oscillators).toHaveLength(count)
  })

  it('mutes an already scheduled cue if sound is disabled mid-rest', async () => {
    const audio = await import('@/lib/timer-audio')
    audio.initAudio()
    const ctx = lastContext!
    const sounds = audio.scheduleRestPeriodSounds(10)
    const originalCount = ctx.oscillators.length
    localStorage.setItem('timerSound', 'false')
    ctx.currentTime = 10
    audio.finishRestPeriodSounds(sounds)
    expect(ctx.oscillators).toHaveLength(originalCount)
    expect(ctx.oscillators.slice(-3).every(osc => osc.stop.mock.calls.length === 2)).toBe(true)
  })
})

let lastContext: FakeAudioContext | null = null
