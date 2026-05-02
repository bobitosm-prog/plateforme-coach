'use client'

import { Sparkles, ChevronRight } from 'lucide-react'
import type { OverloadSuggestion } from '../../hooks/useOverloadSuggestion'
import { FONT_ALT, FONT_BODY, RADIUS_CARD } from '../../../lib/design-tokens'

interface OverloadBannerProps {
  onOpen: () => void
  suggestions: OverloadSuggestion[]
  loading: boolean
}

export default function OverloadBanner({ onOpen, suggestions, loading }: OverloadBannerProps) {
  if (loading || suggestions.length === 0) return null

  const first = suggestions[0]

  return (
    <button
      onClick={onOpen}
      aria-label={`Suggestion de progression pour ${first.exercise_name} : ${first.current_weight}kg → ${first.suggested_weight}kg`}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        border: 'none',
        borderRadius: RADIUS_CARD,
        cursor: 'pointer',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Sparkles size={18} color="#fff" strokeWidth={2} />
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{
          fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 800,
          letterSpacing: '0.04em', color: '#fff',
        }}>
          Prêt à progresser ?
        </div>
        <div style={{
          fontFamily: FONT_BODY, fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)',
          marginTop: 2,
        }}>
          Suggestion IA pour {first.exercise_name}
        </div>
      </div>
      <ChevronRight size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} style={{ flexShrink: 0 }} />
    </button>
  )
}
