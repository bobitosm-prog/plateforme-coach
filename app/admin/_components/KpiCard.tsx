'use client'
import { motion } from 'framer-motion'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  label: string
  value: string
  subtext?: string
  icon?: LucideIcon
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  loading?: boolean
  accent?: 'gold' | 'emerald' | 'zinc' | 'rose'
}

const ACCENT_ICON_BG = {
  gold:    { bg: 'rgba(212, 168, 67, 0.08)',  border: 'rgba(212, 168, 67, 0.18)',  color: '#d4a843' },
  emerald: { bg: 'rgba(52, 211, 153, 0.08)',  border: 'rgba(52, 211, 153, 0.18)',  color: '#34d399' },
  rose:    { bg: 'rgba(244, 63, 94, 0.08)',   border: 'rgba(244, 63, 94, 0.18)',   color: '#fb7185' },
  zinc:    { bg: 'rgba(208, 197, 178, 0.06)', border: 'rgba(208, 197, 178, 0.15)', color: '#d0c5b2' },
} as const

export function KpiCard({
  label, value, subtext, icon: Icon, trend, loading, accent = 'gold'
}: Props) {
  const a = ACCENT_ICON_BG[accent]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="admin-card relative"
      style={{ padding: '28px 28px 24px' }}
    >
      {Icon && (
        <div
          className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: a.bg, border: `1px solid ${a.border}` }}
        >
          <Icon size={15} strokeWidth={1.8} style={{ color: a.color }} />
        </div>
      )}

      {loading ? (
        <div className="h-10 w-32 rounded animate-pulse mb-4" style={{ background: 'rgba(255,255,255,0.04)' }} />
      ) : (
        <div
          className="admin-stat mb-3"
          style={{
            fontSize: 'clamp(1.85rem, 3.2vw, 2.4rem)',
            color: accent === 'emerald' ? '#34d399' : accent === 'rose' ? '#fb7185' : '#e5e2e1',
            paddingRight: Icon ? '52px' : '0',
          }}
        >
          {value}
        </div>
      )}

      <div className="admin-label">
        {label}
      </div>

      {(subtext || trend) && (
        <div className="mt-2 flex items-center gap-2 min-h-[14px]">
          {subtext && (
            <span
              className="text-[11px]"
              style={{ color: '#5a5246', letterSpacing: '0.01em' }}
            >
              {subtext}
            </span>
          )}
          {trend && (
            <span className={`text-[11px] flex items-center gap-0.5 font-medium ${
              trend.direction === 'up' ? 'text-emerald-400'
              : trend.direction === 'down' ? 'text-rose-400'
              : 'text-zinc-500'
            }`}>
              {trend.direction === 'up' && <TrendingUp size={11} />}
              {trend.direction === 'down' && <TrendingDown size={11} />}
              {trend.value}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}
