'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, X, Sparkles, TrendingUp } from 'lucide-react'
import type { OverloadSuggestion } from '../../hooks/useOverloadSuggestion'
import {
  BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD,
} from '../../../lib/design-tokens'
import { useIsMobile } from '../../hooks/useIsMobile'

interface OverloadModalProps {
  open: boolean
  onClose: () => void
  suggestions: OverloadSuggestion[]
  accept: (id: string) => Promise<void>
  decline: (id: string) => Promise<void>
}

export default function OverloadModal({ open, onClose, suggestions, accept, decline }: OverloadModalProps) {
  const isMobile = useIsMobile()
  const [acting, setActing] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  const suggestion = suggestions[0] ?? null

  // Focus dialog au mount + lock body scroll
  useEffect(() => {
    if (open && dialogRef.current) dialogRef.current.focus()
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Esc pour fermer
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !suggestion) return null

  async function handleAccept() {
    if (!suggestion) return
    setActing(true)
    await accept(suggestion.id)
    setActing(false)
    onClose()
  }

  async function handleDecline() {
    if (!suggestion) return
    setActing(true)
    await decline(suggestion.id)
    setActing(false)
    onClose()
  }

  const weightDiff = suggestion.suggested_weight - suggestion.current_weight
  const diffLabel = weightDiff > 0 ? `+${weightDiff.toFixed(1)}` : weightDiff.toFixed(1)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="overload-title"
      aria-describedby="overload-desc"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: isMobile ? '24px 24px 0 0' : RADIUS_CARD,
          padding: '28px 24px 24px',
          width: '100%',
          maxWidth: isMobile ? '100%' : 420,
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #059669, #047857)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={18} color="#fff" strokeWidth={2.5} />
            </div>
            <h2
              id="overload-title"
              style={{
                fontFamily: FONT_DISPLAY, fontSize: '1.2rem', fontWeight: 700,
                letterSpacing: '2px', color: TEXT_PRIMARY, margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Progression
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: TEXT_MUTED, padding: 4, display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Exercice */}
        <div style={{
          fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: TEXT_MUTED, marginBottom: 6,
        }}>
          {suggestion.exercise_name}
        </div>

        {/* Poids : ancien → nouveau */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: '1.8rem', fontWeight: 700,
            color: TEXT_DIM, textDecoration: 'line-through', lineHeight: 1,
          }}>
            {suggestion.current_weight}<span style={{ fontSize: '0.9rem' }}>kg</span>
          </span>
          <span style={{ color: TEXT_DIM, fontSize: '1.2rem' }}>→</span>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: '2.4rem', fontWeight: 700,
            color: '#10b981', lineHeight: 1,
          }}>
            {suggestion.suggested_weight}<span style={{ fontSize: '1rem' }}>kg</span>
          </span>
        </div>

        {/* Diff + reps */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 16,
          fontFamily: FONT_BODY, fontSize: '0.82rem', color: TEXT_MUTED,
        }}>
          <span style={{
            color: '#10b981', fontWeight: 700,
            padding: '2px 8px', borderRadius: 6,
            background: 'rgba(16,185,129,0.1)',
          }}>
            {diffLabel} kg
          </span>
          <span>{suggestion.suggested_reps} reps × {suggestion.current_reps === suggestion.suggested_reps ? 'même format' : `${suggestion.suggested_reps} reps`}</span>
        </div>

        {/* Reasoning IA */}
        {suggestion.reasoning && (
          <div
            id="overload-desc"
            style={{
              background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Sparkles size={12} color={GOLD} />
              <span style={{ fontFamily: FONT_ALT, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1px', color: GOLD, textTransform: 'uppercase' }}>
                Analyse IA
              </span>
            </div>
            <p style={{
              fontFamily: FONT_BODY, fontSize: '0.82rem', color: TEXT_PRIMARY,
              lineHeight: 1.5, margin: 0,
            }}>
              {suggestion.reasoning}
            </p>
          </div>
        )}

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleDecline}
            disabled={acting}
            style={{
              flex: 1, padding: '13px 16px', borderRadius: 12,
              background: 'transparent', border: `1.5px solid ${BORDER}`,
              color: TEXT_MUTED, fontFamily: FONT_ALT, fontSize: '0.82rem',
              fontWeight: 700, letterSpacing: '0.04em', cursor: acting ? 'wait' : 'pointer',
              opacity: acting ? 0.5 : 1, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              minHeight: 44,
            }}
          >
            Plus tard
          </button>
          <button
            onClick={handleAccept}
            disabled={acting}
            style={{
              flex: 1, padding: '13px 16px', borderRadius: 12,
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              border: 'none', color: '#fff',
              fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 800,
              letterSpacing: '0.04em', cursor: acting ? 'wait' : 'pointer',
              opacity: acting ? 0.5 : 1, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              minHeight: 44, boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
            }}
          >
            <Check size={16} strokeWidth={2.5} /> Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
