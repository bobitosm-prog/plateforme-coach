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
  accent?: 'gold' | 'emerald' | 'zinc'
}

export function KpiCard({
  label, value, subtext, icon: Icon, trend, loading, accent = 'gold'
}: Props) {
  const accentColor = {
    gold: 'text-amber-400',
    emerald: 'text-emerald-400',
    zinc: 'text-zinc-300',
  }[accent]

  const accentBg = {
    gold: 'bg-amber-400/10',
    emerald: 'bg-emerald-400/10',
    zinc: 'bg-zinc-400/10',
  }[accent]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative bg-[#16120D] border border-amber-900/15 rounded-2xl p-5 hover:border-amber-900/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
          {label}
        </span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center`}>
            <Icon size={14} className={accentColor} strokeWidth={2.2} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-32 bg-white/5 rounded animate-pulse" />
          <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="text-3xl font-semibold text-zinc-100 tracking-tight">
            {value}
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            {subtext && (
              <span className="text-xs text-zinc-500">{subtext}</span>
            )}
            {trend && (
              <span className={`text-xs flex items-center gap-1 font-medium ${
                trend.direction === 'up' ? 'text-emerald-400'
                : trend.direction === 'down' ? 'text-rose-400'
                : 'text-zinc-500'
              }`}>
                {trend.direction === 'up' && <TrendingUp size={12} />}
                {trend.direction === 'down' && <TrendingDown size={12} />}
                {trend.value}
              </span>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}
