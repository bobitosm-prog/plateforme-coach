'use client'
import { Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { FONT_ALT, FONT_BODY, RADIUS_CARD } from '../../../lib/design-tokens'
import { useAiQuota } from '../../hooks/useAiQuota'

export type AiQuotaBadgeState = 'loading' | 'available' | 'exhausted' | 'error'

export function resolveAiQuotaBadgeState({
  loading,
  error,
  remaining,
}: {
  loading: boolean
  error: string | null
  remaining: number
}): AiQuotaBadgeState {
  if (loading) return 'loading'
  if (error) return 'error'
  return remaining <= 0 ? 'exhausted' : 'available'
}

export default function AiQuotaBadge() {
  const t = useTranslations('aiQuotaBadge')
  const { remaining, days, loading, error } = useAiQuota()
  const state = resolveAiQuotaBadgeState({ loading, error, remaining })

  if (state === 'loading') return null

  const unavailable = state === 'error'
  const exhausted = state === 'exhausted'
  const gradient = unavailable
    ? 'linear-gradient(135deg, #5f6570 0%, #3f4650 100%)'
    : exhausted
    ? 'linear-gradient(135deg, #e05252 0%, #b91c1c 100%)'
    : 'linear-gradient(135deg, #e6c364 0%, #c9a84c 100%)'
  const shadow = unavailable
    ? '0 4px 16px rgba(63,70,80,0.22)'
    : exhausted
    ? '0 4px 16px rgba(224,82,82,0.25)'
    : '0 4px 16px rgba(201,168,76,0.2)'

  return (
    <div role="status" style={{
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
          {unavailable
            ? t('unavailable')
            : exhausted
              ? t('exhausted')
              : t('remaining', { count: remaining })}
        </div>
        <div style={{
          fontFamily: FONT_BODY, fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)',
          marginTop: 2,
        }}>
          {unavailable
            ? t('unavailableHint')
            : exhausted
              ? t('nextAvailable', { days })
              : t('period')}
        </div>
      </div>
    </div>
  )
}
