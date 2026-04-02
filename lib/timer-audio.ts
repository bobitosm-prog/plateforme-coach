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

export function vibrateDevice() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200])
  }
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
