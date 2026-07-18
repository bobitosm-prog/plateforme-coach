import {
  cancelScheduledSounds, initAudio, playBeep, playWarningTick,
  scheduleRestPeriodSounds, vibrateDevice, type ScheduledSound,
} from '../timer-audio'
import type {
  RuntimeAudioPort, RuntimeClock, RuntimeScheduler, RuntimeVibrationPort,
  RuntimeVisibilityPort, RuntimeWakeLockPort,
} from './workout-runtime'

export const browserClock: RuntimeClock = { nowMs: () => Date.now() }

export const browserScheduler: RuntimeScheduler = {
  every: (callback, intervalMs) => window.setInterval(callback, intervalMs),
  cancel: handle => window.clearInterval(handle as number),
}

export const browserAudioPort: RuntimeAudioPort = {
  initialize: initAudio,
  scheduleRest: duration => scheduleRestPeriodSounds(duration),
  cancelScheduled: handles => cancelScheduledSounds(handles as ScheduledSound[]),
  warning: playWarningTick,
  complete: playBeep,
}

export const browserVibrationPort: RuntimeVibrationPort = {
  pulse: kind => {
    if (kind === 'start') {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
      return
    }
    vibrateDevice()
  },
}

export const browserVisibilityPort: RuntimeVisibilityPort = {
  isVisible: () => document.visibilityState === 'visible',
  subscribe(callback) {
    document.addEventListener('visibilitychange', callback)
    window.addEventListener('focus', callback)
    return () => {
      document.removeEventListener('visibilitychange', callback)
      window.removeEventListener('focus', callback)
    }
  },
}

export function createBrowserWakeLockPort(): RuntimeWakeLockPort {
  let sentinel: WakeLockSentinel | null = null
  let fallbackVideo: HTMLVideoElement | null = null

  async function release(): Promise<void> {
    const current = sentinel
    sentinel = null
    if (current) await current.release().catch(() => undefined)
    if (fallbackVideo) {
      fallbackVideo.pause()
      fallbackVideo.remove()
      fallbackVideo = null
    }
  }

  return {
    async acquire() {
      await release()
      try {
        if ('wakeLock' in navigator) {
          sentinel = await navigator.wakeLock.request('screen')
          return
        }
      } catch {}
      try {
        const video = document.createElement('video')
        video.setAttribute('playsinline', '')
        video.setAttribute('muted', '')
        video.muted = true
        video.loop = true
        video.style.cssText = 'position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0.01'
        video.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhmcmVlAAAAGm1kYXQAAABhBgX//13QRNi9VAV2iu1ciRckAAACMm1vb3YAAABsbXZoZAAAAADcFAAN3BQADQAAu4AAAEAAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAABWG10cmFrAAAAXHRraGQAAAAD3BQADdwUAA0AAAABAAAAAAAAu4AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAA'
        document.body.appendChild(video)
        await video.play().catch(() => undefined)
        fallbackVideo = video
      } catch {}
    },
    release,
  }
}
