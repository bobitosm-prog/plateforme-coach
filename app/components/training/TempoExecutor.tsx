'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Volume2, VolumeX, Pause, Play, ArrowDown, ArrowUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  BG_BASE,
  BG_CARD_2,
  GOLD,
  GOLD_DIM,
  GOLD_RULE,
  TEXT_PRIMARY,
  TEXT_MUTED,
  TEXT_DIM,
  FONT_DISPLAY,
  FONT_ALT,
  FONT_BODY,
  colors,
} from '../../../lib/design-tokens'
import {
  initAudio,
  playBeep,
  vibrateEccentric,
  vibratePause,
  vibrateConcentric,
  vibrateRepComplete,
  isTimerSoundEnabled,
  setTimerSoundEnabled,
} from '../../../lib/timer-audio'

interface TempoExecutorProps {
  tempo: string
  exerciseName: string
  targetReps: number
  onComplete: () => void
  onClose: () => void
}

type Phase = 'eccentric' | 'pause' | 'concentric'

interface PhaseConfig {
  phase: Phase
  label: string
  description: string
  durationMs: number
  icon: typeof ArrowDown
}

/**
 * Parse a tempo string like "3-1-2" into phase durations.
 * Returns null if format is invalid (less than 3 parts or non-numeric).
 */
function parseTempo(tempo: string): { eccentric: number; pause: number; concentric: number } | null {
  const parts = tempo.trim().split('-').map(p => parseInt(p.trim(), 10))
  if (parts.length < 3) return null
  if (parts.some(n => isNaN(n) || n < 0)) return null
  return {
    eccentric: parts[0],
    pause: parts[1],
    concentric: parts[2],
  }
}

export default function TempoExecutor({
  tempo,
  exerciseName,
  targetReps,
  onComplete,
  onClose,
}: TempoExecutorProps) {
  const t = useTranslations('training_tab.tempo')
  const parsed = parseTempo(tempo)

  // Build phase sequence inline to access t() for i18n labels
  const phases: PhaseConfig[] = []
  if (parsed) {
    if (parsed.eccentric > 0) {
      phases.push({ phase: 'eccentric', label: t('phases.eccentricLabel'), description: t('phases.eccentricDesc'), durationMs: parsed.eccentric * 1000, icon: ArrowDown })
    }
    if (parsed.pause > 0) {
      phases.push({ phase: 'pause', label: t('phases.pauseLabel'), description: t('phases.pauseDesc'), durationMs: parsed.pause * 1000, icon: Pause })
    }
    if (parsed.concentric > 0) {
      phases.push({ phase: 'concentric', label: t('phases.concentricLabel'), description: t('phases.concentricDesc'), durationMs: parsed.concentric * 1000, icon: ArrowUp })
    }
  }
  const repTotalMs = phases.reduce((sum, p) => sum + p.durationMs, 0)

  // State
  const [currentRep, setCurrentRep] = useState(1)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseElapsedMs, setPhaseElapsedMs] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [soundOn, setSoundOn] = useState(true)

  // Refs (avoid re-renders + closure issues)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastTickAtRef = useRef<number>(Date.now())
  const isPausedRef = useRef(false)
  const currentRepRef = useRef(1)
  const phaseIndexRef = useRef(0)
  const phaseElapsedMsRef = useRef(0)
  // Absolute timestamp of when the current phase should end.
  // Used for iOS background-safe time tracking (in case JS is suspended)
  const phaseEndsAtRef = useRef<number>(0)
  const pausedRemainingMsRef = useRef<number>(0)
  // True when we detected a JS suspension (background) mid-tempo
  const [wasInterrupted, setWasInterrupted] = useState(false)

  // Sync refs with state for closures
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])
  useEffect(() => { currentRepRef.current = currentRep }, [currentRep])
  useEffect(() => { phaseIndexRef.current = phaseIndex }, [phaseIndex])
  useEffect(() => { phaseElapsedMsRef.current = phaseElapsedMs }, [phaseElapsedMs])

  // Init sound state on mount
  useEffect(() => {
    setSoundOn(isTimerSoundEnabled())
    initAudio()
  }, [])

  /**
   * Called when transitioning INTO a new phase.
   * upcomingPhase: which phase is about to start (eccentric/pause/concentric)
   *                or null if this is the end of a complete rep.
   * Vibration pattern differs per phase to help user feel the change
   * without looking at the screen.
   */
  const onPhaseTransition = useCallback((upcomingPhase: Phase | null) => {
    if (upcomingPhase === null) {
      // End of complete rep
      vibrateRepComplete()
      playBeep()
    } else if (upcomingPhase === 'eccentric') {
      vibrateEccentric()
      playBeep()
    } else if (upcomingPhase === 'pause') {
      vibratePause()
      playBeep()
    } else if (upcomingPhase === 'concentric') {
      vibrateConcentric()
      playBeep()
    }
  }, [])

  // Main tick loop
  useEffect(() => {
    if (phases.length === 0) return

    // Initialize phaseEndsAt to: now + duration of phase 0
    phaseEndsAtRef.current = Date.now() + phases[0].durationMs

    lastTickAtRef.current = Date.now()
    tickRef.current = setInterval(() => {
      if (isPausedRef.current) {
        lastTickAtRef.current = Date.now()
        // While paused, shift phaseEndsAt forward by elapsed time so resume is accurate
        // (we don't apply delta here; we'll re-align below when resumed)
        return
      }

      const now = Date.now()
      const delta = now - lastTickAtRef.current
      lastTickAtRef.current = now

      // Background detection: if delta is way bigger than tick interval (100ms),
      // JS was suspended (iOS lock screen, incoming call, app backgrounded, etc.)
      // We can't reliably continue — stop the tempo and signal interruption.
      if (delta > 2000) {
        if (tickRef.current) clearInterval(tickRef.current)
        setWasInterrupted(true)
        return
      }

      // Compute remaining time for current phase based on absolute end timestamp
      const remainingMs = phaseEndsAtRef.current - now

      if (remainingMs <= 0) {
        // Phase complete → advance
        const nextPhaseIndex = phaseIndexRef.current + 1
        const isLastPhase = nextPhaseIndex >= phases.length

        if (isLastPhase) {
          // Rep complete: dedicated 'done' cue
          onPhaseTransition(null)
          const nextRep = currentRepRef.current + 1
          if (nextRep > targetReps) {
            // All reps done
            if (tickRef.current) clearInterval(tickRef.current)
            onComplete()
            return
          }
          setCurrentRep(nextRep)
          setPhaseIndex(0)
          setPhaseElapsedMs(0)
          // Reset phaseEndsAt for the new rep's first phase
          phaseEndsAtRef.current = now + phases[0].durationMs
          // Brief cue to signal start of phase 0 of the new rep
          // (small delay so it's perceived as separate from the rep-complete cue)
          setTimeout(() => {
            if (phases[0].phase === 'eccentric') vibrateEccentric()
            else if (phases[0].phase === 'pause') vibratePause()
            else if (phases[0].phase === 'concentric') vibrateConcentric()
          }, 300)
        } else {
          // Next phase same rep
          onPhaseTransition(phases[nextPhaseIndex].phase)
          setPhaseIndex(nextPhaseIndex)
          setPhaseElapsedMs(0)
          phaseEndsAtRef.current = now + phases[nextPhaseIndex].durationMs
        }
      } else {
        // Compute elapsed in current phase for the progress circle UI
        const currentPhaseDuration = phases[phaseIndexRef.current]?.durationMs ?? 0
        const elapsed = currentPhaseDuration - remainingMs
        setPhaseElapsedMs(elapsed)
      }
    }, 100)

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTogglePause = () => {
    setIsPaused(prev => {
      const next = !prev
      if (next) {
        // Pausing: remember how much time was left in the current phase
        pausedRemainingMsRef.current = Math.max(0, phaseEndsAtRef.current - Date.now())
      } else {
        // Resuming: re-set phaseEndsAt to (now + remaining time at pause)
        phaseEndsAtRef.current = Date.now() + pausedRemainingMsRef.current
        lastTickAtRef.current = Date.now()
      }
      return next
    })
  }

  const handleToggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setTimerSoundEnabled(next)
  }

  // No valid tempo -> show error state
  if (phases.length === 0) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.95)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: BG_BASE,
            border: `1px solid ${GOLD_RULE}`,
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
            maxWidth: 320,
          }}
        >
          <div style={{ color: TEXT_PRIMARY, fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 8 }}>
            {t('executor.invalidTitle')}
          </div>
          <div style={{ color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 13, marginBottom: 20 }}>
            {t('executor.invalidDesc', { tempo })}
          </div>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: 12,
              background: GOLD,
              border: 'none',
              borderRadius: 10,
              color: colors.onGold,
              fontFamily: FONT_ALT,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 2,
              cursor: 'pointer',
            }}
          >
            {t('executor.close')}
          </button>
        </div>
      </div>
    )
  }

  // Tempo was interrupted by background suspend (iOS) → graceful exit
  if (wasInterrupted) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.95)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: BG_BASE,
            border: `1px solid ${GOLD_RULE}`,
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
            maxWidth: 320,
          }}
        >
          <div
            style={{
              color: TEXT_PRIMARY,
              fontFamily: FONT_DISPLAY,
              fontSize: 18,
              marginBottom: 8,
              letterSpacing: 2,
            }}
          >
            {t('executor.interruptedTitle')}
          </div>
          <div
            style={{
              color: TEXT_MUTED,
              fontFamily: FONT_BODY,
              fontSize: 13,
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            {t('executor.interruptedDesc')}
          </div>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: 12,
              background: GOLD,
              border: 'none',
              borderRadius: 10,
              color: colors.onGold,
              fontFamily: FONT_ALT,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 2,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {t('executor.close')}
          </button>
        </div>
      </div>
    )
  }

  const currentPhase = phases[phaseIndex]
  const phaseRemainingMs = Math.max(0, currentPhase.durationMs - phaseElapsedMs)
  const phaseRemainingSec = Math.ceil(phaseRemainingMs / 1000)
  const phaseProgress = currentPhase.durationMs > 0 ? phaseElapsedMs / currentPhase.durationMs : 0

  const Icon = currentPhase.icon

  // Circle progression — 120px diameter
  const radius = 100
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - phaseProgress)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.96)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'wsPopIn 0.3s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <button
          onClick={handleToggleSound}
          aria-label={soundOn ? t('executor.soundOn') : t('executor.soundOff')}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: GOLD_DIM,
            border: `1px solid ${GOLD_RULE}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: GOLD,
          }}
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        <div
          style={{
            flex: 1,
            textAlign: 'center',
            color: TEXT_MUTED,
            fontFamily: FONT_ALT,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {exerciseName}
        </div>

        <button
          onClick={onClose}
          aria-label={t('executor.close')}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: BG_CARD_2,
            border: `1px solid rgba(255,255,255,0.1)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: TEXT_MUTED,
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body — center vertically */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          gap: 24,
        }}
      >
        {/* Rep counter */}
        <div
          style={{
            color: TEXT_DIM,
            fontFamily: FONT_ALT,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          {t('executor.rep', { current: currentRep, total: targetReps })}
        </div>

        {/* Circle progression with countdown */}
        <div style={{ position: 'relative', width: 220, height: 220 }}>
          <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={GOLD_RULE}
              strokeWidth="6"
              opacity="0.3"
            />
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={GOLD}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 100ms linear' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Icon size={32} color={GOLD} strokeWidth={2.5} />
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 64,
                fontWeight: 800,
                color: GOLD,
                lineHeight: 1,
                letterSpacing: -2,
              }}
            >
              {phaseRemainingSec}
            </span>
            <span
              style={{
                fontFamily: FONT_ALT,
                fontSize: 11,
                fontWeight: 700,
                color: TEXT_DIM,
                letterSpacing: 2,
              }}
            >
              {t('executor.sec')}
            </span>
          </div>
        </div>

        {/* Phase label + description */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 28,
              fontWeight: 800,
              color: TEXT_PRIMARY,
              letterSpacing: 2,
              marginBottom: 6,
            }}
          >
            {currentPhase.label}
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              color: TEXT_MUTED,
            }}
          >
            {currentPhase.description}
          </div>
        </div>
      </div>

      {/* Footer — pause/resume button */}
      <div
        style={{
          padding: '20px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          onClick={handleTogglePause}
          style={{
            width: '100%',
            padding: 16,
            background: isPaused ? GOLD : 'transparent',
            border: `2px solid ${GOLD}`,
            borderRadius: 14,
            color: isPaused ? colors.onGold : GOLD,
            fontFamily: FONT_ALT,
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 2,
            cursor: 'pointer',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {isPaused ? <Play size={18} /> : <Pause size={18} />}
          {isPaused ? t('executor.resume') : t('executor.pause')}
        </button>
      </div>
    </div>
  )
}
