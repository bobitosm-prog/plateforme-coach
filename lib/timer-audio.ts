// Timer audio utilities — persistent AudioContext for iOS compatibility

let audioCtx: AudioContext | null = null

/** Initialize/unlock AudioContext — MUST be called during a user interaction (click/tap) */
export function initAudio() {
  if (typeof window === 'undefined') return
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    audioCtx = new AC()
  }
  // Resume if suspended (iOS suspends on background)
  if (audioCtx.state === 'suspended') audioCtx.resume()
  // Play silent oscillator to unlock audio on iOS
  if (audioCtx.state === 'running') {
    try {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      gain.gain.value = 0
      osc.start()
      osc.stop(audioCtx.currentTime + 0.01)
    } catch {}
  }
}

export function isTimerSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem('timerSound') !== 'false'
}

export function setTimerSoundEnabled(enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('timerSound', enabled ? 'true' : 'false')
  }
}

export function playBeep() {
  if (!isTimerSoundEnabled()) return
  try {
    if (!audioCtx) initAudio()
    const ctx = audioCtx
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    const times = [0, 0.15, 0.3]
    times.forEach(delay => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.value = 0.4
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.12)
    })
  } catch {}
}

export function playWarningTick() {
  if (!isTimerSoundEnabled()) return
  try {
    if (!audioCtx) initAudio()
    const ctx = audioCtx
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 440
    osc.type = 'sine'
    gain.gain.value = 0.2
    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  } catch {}
}

/**
 * Original vibration pattern (kept for backward compat).
 * Used by rest timer when set is validated.
 */
export function vibrateDevice() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200])
  }
}

/**
 * Short pulse — signals start of eccentric phase (downward movement).
 * Single subtle tap to say "go down".
 */
export function vibrateEccentric() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(80)
  }
}

/**
 * Double short pulse — signals start of bottom pause.
 * "Hold" feel — two quick taps.
 */
export function vibratePause() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([60, 80, 60])
  }
}

/**
 * Longer pulse — signals start of concentric phase (upward / explosive).
 * Single longer tap to say "push up".
 */
export function vibrateConcentric() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(150)
  }
}

/**
 * Distinctive pattern — signals end of a complete rep.
 * Three-burst pattern to feel different from phase transitions.
 */
export function vibrateRepComplete() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([120, 60, 120, 60, 200])
  }
}

/**
 * A scheduled sound that can be cancelled before it plays.
 */
export interface ScheduledSound {
  oscillator: OscillatorNode
  gain: GainNode
}

/**
 * Schedule a beep at a future point in audio context time.
 * Works even when the JS event loop is suspended (iOS lock screen),
 * as long as the AudioContext stays 'running'.
 * Returns the oscillator + gain so the caller can cancel it via
 * cancelScheduledSounds().
 */
export function scheduleBeep(
  whenSeconds: number,
  freq: number = 880,
  volume: number = 0.4,
  durationMs: number = 80
): ScheduledSound | null {
  if (!audioCtx) return null
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }

  const startAt = audioCtx.currentTime + whenSeconds
  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(freq, startAt)

  // Envelope douce (attack + decay) pour éviter clicks
  gainNode.gain.setValueAtTime(0, startAt)
  gainNode.gain.linearRampToValueAtTime(volume, startAt + 0.005)
  gainNode.gain.linearRampToValueAtTime(0, startAt + durationMs / 1000)

  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  oscillator.start(startAt)
  oscillator.stop(startAt + durationMs / 1000 + 0.01)

  return { oscillator, gain: gainNode }
}

/**
 * Cancel scheduled sounds that haven't played yet (or are playing).
 * Forces the gain to 0 immediately and disconnects to free resources.
 */
export function cancelScheduledSounds(sounds: ScheduledSound[]): void {
  if (!audioCtx) return
  const now = audioCtx.currentTime
  sounds.forEach(({ oscillator, gain }) => {
    try {
      // Mute immediately by cancelling future gain ramps and forcing 0
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(0, now)
      // Stop the oscillator early if it hasn't already
      try { oscillator.stop(now) } catch {}
      // Disconnect to free resources
      try { oscillator.disconnect() } catch {}
      try { gain.disconnect() } catch {}
    } catch {}
  })
}

/**
 * Schedule the full sequence of rest period sounds at once.
 * Returns the list of scheduled sounds so they can be cancelled
 * via cancelScheduledSounds() if rest is skipped.
 */
export function scheduleRestPeriodSounds(restDurationSeconds: number): ScheduledSound[] {
  if (!audioCtx) return []

  const scheduled: ScheduledSound[] = []

  // Warning tick à T-5s (440Hz, volume 0.2)
  if (restDurationSeconds > 5) {
    const s = scheduleBeep(restDurationSeconds - 5, 440, 0.2, 60)
    if (s) scheduled.push(s)
  }

  // Beep final : 3 ticks rapides à T=0 (880Hz, volume 0.4)
  const s1 = scheduleBeep(restDurationSeconds, 880, 0.4, 80)
  if (s1) scheduled.push(s1)
  const s2 = scheduleBeep(restDurationSeconds + 0.15, 880, 0.4, 80)
  if (s2) scheduled.push(s2)
  const s3 = scheduleBeep(restDurationSeconds + 0.30, 880, 0.4, 80)
  if (s3) scheduled.push(s3)

  return scheduled
}

export const MOTIVATIONAL_MESSAGES = [
  "C'EST REPARTI !",
  "ATTAQUE LA SÉRIE !",
  "DONNE TOUT !",
  "ON LÂCHE RIEN !",
  "C'EST MAINTENANT !",
  "MONTRE CE QUE TU VAUX !",
  "ENCORE UNE SÉRIE !",
  "PUSH IT !",
  "LE MUSCLE SE CONSTRUIT ICI !",
  "PAS DE REPOS POUR LES GUERRIERS !",
]

export function getRandomMessage(): string {
  return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]
}
