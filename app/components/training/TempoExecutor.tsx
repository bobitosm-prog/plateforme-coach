'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Volume2, VolumeX, Pause, Play, ArrowDown, ArrowUp } from 'lucide-react'
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
  vibrateDevice,
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

/**
 * Build the phase sequence for a single rep, skipping pause if duration is 0.
 */
function buildPhases(parsed: { eccentric: number; pause: number; concentric: number }): PhaseConfig[] {
  const phases: PhaseConfig[] = []
  if (parsed.eccentric > 0) {
    phases.push({
      phase: 'eccentric',
      label: 'EXCENTRIQUE',
      description: 'Descente contr\u00f4l\u00e9e',
      durationMs: parsed.eccentric * 1000,
      icon: ArrowDown,
    })
  }
  if (parsed.pause > 0) {
    phases.push({
      phase: 'pause',
      label: 'PAUSE BASSE',
      description: 'Maintiens la position',
      durationMs: parsed.pause * 1000,
      icon: Pause,
    })
  }
  if (parsed.concentric > 0) {
    phases.push({
      phase: 'concentric',
      label: 'CONCENTRIQUE',
      description: 'Remont\u00e9e explosive',
      durationMs: parsed.concentric * 1000,
      icon: ArrowUp,
    })
  }
  return phases
}

export default function TempoExecutor({
  tempo,
  exerciseName,
  targetReps,
  onComplete,
  onClose,
}: TempoExecutorProps) {
  const parsed = parseTempo(tempo)
  const phases = parsed ? buildPhases(parsed) : []
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

  // Audio cue on phase transition
  const onPhaseTransition = useCallback((isLastPhaseOfRep: boolean) => {
    vibrateDevice()
    if (isLastPhaseOfRep) {
      // End of rep = louder cue (3 quick beeps via playBeep)
      playBeep()
    } else {
      // Phase transition = short tick (we use playBeep too but vibration is the primary cue)
      playBeep()
    }
  }, [])

  // Main tick loop
  useEffect(() => {
    if (phases.length === 0) return

    lastTickAtRef.current = Date.now()
    tickRef.current = setInterval(() => {
      if (isPausedRef.current) {
        lastTickAtRef.current = Date.now()
        return
      }

      const now = Date.now()
      const delta = now - lastTickAtRef.current
      lastTickAtRef.current = now

      const newElapsed = phaseElapsedMsRef.current + delta
      const currentPhaseDuration = phases[phaseIndexRef.current]?.durationMs ?? 0

      if (newElapsed >= currentPhaseDuration) {
        // Phase complete -> advance
        const nextPhaseIndex = phaseIndexRef.current + 1
        const isLastPhase = nextPhaseIndex >= phases.length

        if (isLastPhase) {
          // Rep complete
          onPhaseTransition(true)
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
        } else {
          // Next phase same rep
          onPhaseTransition(false)
          setPhaseIndex(nextPhaseIndex)
          setPhaseElapsedMs(0)
        }
      } else {
        setPhaseElapsedMs(newElapsed)
      }
    }, 100)

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTogglePause = () => {
    setIsPaused(p => !p)
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
            TEMPO INVALIDE
          </div>
          <div style={{ color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 13, marginBottom: 20 }}>
            Le tempo &quot;{tempo}&quot; n&apos;est pas au format X-X-X.
          </div>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: 12,
              background: GOLD,
              border: 'none',
              borderRadius: 10,
              color: '#0D0B08',
              fontFamily: FONT_ALT,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 2,
              cursor: 'pointer',
            }}
          >
            FERMER
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
          aria-label={soundOn ? 'Couper le son' : 'Activer le son'}
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
          aria-label="Fermer"
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
          Rep {currentRep} / {targetReps}
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
              SEC
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
            color: isPaused ? '#0D0B08' : GOLD,
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
          {isPaused ? 'REPRENDRE' : 'PAUSE'}
        </button>
      </div>
    </div>
  )
}
