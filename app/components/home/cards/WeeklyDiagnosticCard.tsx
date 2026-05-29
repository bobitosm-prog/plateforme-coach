'use client'

import { useTranslations, useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { Sparkles, ChevronRight, Loader2 } from 'lucide-react'
import { colors, fonts, btnPrimary } from '../../../../lib/design-tokens'

function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981'
  if (score >= 60) return colors.gold
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

function formatWeekRange(weekStart: string, locale: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const loc = locale === 'fr' ? 'fr-CH' : locale === 'de' ? 'de-CH' : 'en-GB'
  const startStr = start.toLocaleDateString(loc, { day: 'numeric' })
  const endFull = end.toLocaleDateString(loc, opts)
  if (start.getMonth() === end.getMonth()) {
    return `${startStr} → ${endFull}`
  }
  return `${start.toLocaleDateString(loc, opts)} → ${endFull}`
}

const localCardStyle: React.CSSProperties = {
  background: colors.surface2,
  border: `1px solid ${colors.divider}`,
  borderRadius: 16,
  padding: 20,
}

interface WeeklyDiagnosticCardProps {
  diagnostic: {
    id: string
    week_start: string
    score_semaine: number
    points_forts: string[]
    points_alerte: string[]
    adherence_pct: number
    sessions_done: number
    sessions_planned: number
    created_at: string
  } | null
  onViewDetails: () => void
  onGenerate?: () => void
  generating?: boolean
}

export default function WeeklyDiagnosticCard({
  diagnostic,
  onViewDetails,
  onGenerate,
  generating = false,
}: WeeklyDiagnosticCardProps) {
  const t = useTranslations('home.weekly_diagnostic')
  const locale = useLocale()

  // ─── Empty state ───
  if (!diagnostic) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ ...localCardStyle, marginTop: 16, textAlign: 'center' }}
      >
        <Sparkles size={28} color={colors.gold} style={{ margin: '0 auto 12px' }} />
        <p style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text, margin: '0 0 4px' }}>
          {t('empty_state_title')}
        </p>
        <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textDim, margin: '0 0 16px' }}>
          {t('empty_state_subtitle')}
        </p>
        <button
          onClick={onGenerate}
          disabled={generating}
          style={{
            ...btnPrimary,
            width: '100%',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              {t('generating')} <span style={{ fontSize: 11, opacity: 0.7 }}>{t('generating_time')}</span>
            </>
          ) : (
            t('generate_cta')
          )}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </motion.div>
    )
  }

  // ─── Diagnostic available ───
  const scoreColor = getScoreColor(diagnostic.score_semaine)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ ...localCardStyle, marginTop: 16 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: colors.gold }}>
          {t('title')}
        </span>
        <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDim }}>
          {formatWeekRange(diagnostic.week_start, locale)}
        </span>
      </div>

      {/* Score circle + points */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Score */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: `3px solid ${scoreColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${scoreColor}14`,
            }}
          >
            <span style={{ fontFamily: fonts.headline, fontSize: 32, fontWeight: 800, color: scoreColor }}>
              {diagnostic.score_semaine}
            </span>
          </div>
          <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim, marginTop: 4 }}>/100</span>
        </div>

        {/* Points */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Points forts */}
          {diagnostic.points_forts.length > 0 && (
            <div>
              <span style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#10B981' }}>
                {t('points_forts_heading')}
              </span>
              {diagnostic.points_forts.map((p, i) => (
                <p key={i} style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, margin: '3px 0 0', lineHeight: 1.4 }}>
                  • {p}
                </p>
              ))}
            </div>
          )}
          {/* Points alerte */}
          {diagnostic.points_alerte.length > 0 && (
            <div>
              <span style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#F59E0B' }}>
                {t('points_alerte_heading')}
              </span>
              {diagnostic.points_alerte.map((p, i) => (
                <p key={i} style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, margin: '3px 0 0', lineHeight: 1.4 }}>
                  • {p}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onViewDetails}
        style={{
          ...btnPrimary,
          width: '100%',
          padding: '11px 20px',
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {t('view_details')}
        <ChevronRight size={16} />
      </button>
    </motion.div>
  )
}
