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

const ACCENT = {
  gold:    { text: 'text-amber-400',   bg: 'bg-amber-400/10',   ring: 'ring-amber-400/20' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', ring: 'ring-emerald-400/20' },
  rose:    { text: 'text-rose-400',    bg: 'bg-rose-400/10',    ring: 'ring-rose-400/20' },
  zinc:    { text: 'text-zinc-300',    bg: 'bg-zinc-400/10',    ring: 'ring-zinc-400/20' },
} as const

export function KpiCard({
  label, value, subtext, icon: Icon, trend, loading, accent = 'gold'
}: Props) {
  const a = ACCENT[accent]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group relative bg-[#15110B] border border-amber-900/15 rounded-2xl p-5 hover:border-amber-900/30 transition-colors overflow-hidden"
    >
      {/* Top row : label + icon */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] uppercase tracking-[0.08em] text-zinc-500 font-medium">
          {label}
        </span>
        {Icon && (
          <div className={`w-7 h-7 rounded-lg ${a.bg} ring-1 ${a.ring} flex items-center justify-center`}>
            <Icon size={13} className={a.text} strokeWidth={2.2} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 bg-white/5 rounded animate-pulse" />
          <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="text-[26px] leading-none font-semibold text-zinc-50 tracking-tight tabular-nums">
            {value}
          </div>

          {(subtext || trend) && (
            <div className="mt-2.5 flex items-center gap-2 min-h-[16px]">
              {subtext && (
                <span className="text-[11px] text-zinc-500">{subtext}</span>
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
        </>
      )}
    </motion.div>
  )
}
