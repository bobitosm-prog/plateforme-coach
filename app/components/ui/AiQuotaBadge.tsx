'use client'
import { Sparkles } from 'lucide-react'
import { FONT_ALT, FONT_BODY, RADIUS_CARD } from '../../../lib/design-tokens'
import { useAiQuota } from '../../hooks/useAiQuota'

export default function AiQuotaBadge() {
  const { remaining, days, loading } = useAiQuota()

  if (loading) return null

  const exhausted = remaining <= 0
  const gradient = exhausted
    ? 'linear-gradient(135deg, #e05252 0%, #b91c1c 100%)'
    : 'linear-gradient(135deg, #e6c364 0%, #c9a84c 100%)'
  const shadow = exhausted
    ? '0 4px 16px rgba(224,82,82,0.25)'
    : '0 4px 16px rgba(201,168,76,0.2)'

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 16px',
      background: gradient,
      borderRadius: RADIUS_CARD,
      boxShadow: shadow,
      marginBottom: 16,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Sparkles size={18} color="#fff" strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 800,
          letterSpacing: '0.04em', color: '#fff',
        }}>
          {exhausted
            ? `Quota atteint`
            : `${remaining} génération${remaining > 1 ? 's' : ''} IA restante${remaining > 1 ? 's' : ''}`}
        </div>
        <div style={{
          fontFamily: FONT_BODY, fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)',
          marginTop: 2,
        }}>
          {exhausted
            ? `Prochaine dispo dans ${days} jour${days > 1 ? 's' : ''}`
            : 'ce mois'}
        </div>
      </div>
    </div>
  )
}
