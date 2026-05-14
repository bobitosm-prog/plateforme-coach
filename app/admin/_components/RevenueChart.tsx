'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

const MONTH_LABELS = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec']

function shortMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-')
  return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

interface DataPoint {
  month: string
  gross: number
  fee: number
  net: number
  count: number
}

interface Props {
  data: DataPoint[]
  loading?: boolean
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; dataKey: string; color: string; payload: DataPoint }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload

  const fmt = (cents: number) =>
    new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0 })
      .format(cents / 100)

  return (
    <div className="bg-[#15110B] border border-amber-900/40 rounded-xl px-4 py-3 shadow-2xl shadow-black/60 backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
        {shortMonth(label || '')}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-6 text-xs">
          <span className="flex items-center gap-2 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-amber-400/40" />
            Brut
          </span>
          <span className="text-zinc-100 font-medium tabular-nums">{fmt(point.gross)}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-xs">
          <span className="flex items-center gap-2 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Net
          </span>
          <span className="text-emerald-300 font-medium tabular-nums">{fmt(point.net)}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-xs pt-1 mt-1 border-t border-amber-900/20">
          <span className="text-zinc-500">Frais Stripe</span>
          <span className="text-rose-300 font-medium tabular-nums">{fmt(point.fee)}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-[10px] pt-0.5 text-zinc-500">
          <span>Transactions</span>
          <span className="tabular-nums">{point.count}</span>
        </div>
      </div>
    </div>
  )
}

export function RevenueChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="h-[280px] bg-white/[0.02] rounded-xl animate-pulse" />
    )
  }

  const hasData = data.some(d => d.gross > 0)
  if (!hasData) {
    return (
      <div className="h-[280px] flex items-center justify-center text-zinc-500 text-sm">
        Pas encore de revenus enregistres
      </div>
    )
  }

  const chartData = data.map(d => ({
    ...d,
    monthShort: shortMonth(d.month),
    gross_chf: d.gross / 100,
    net_chf: d.net / 100,
  }))

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(180, 83, 9, 0.08)"
            vertical={false}
          />

          <XAxis
            dataKey="monthShort"
            stroke="#52525b"
            tick={{ fontSize: 11, fill: '#71717a' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(180, 83, 9, 0.1)' }}
          />

          <YAxis
            stroke="#52525b"
            tick={{ fontSize: 11, fill: '#71717a' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}`}
            width={40}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(251, 191, 36, 0.2)', strokeWidth: 1 }}
          />

          <Area
            type="monotone"
            dataKey="gross_chf"
            name="Brut"
            stroke="#fbbf24"
            strokeWidth={1.5}
            fill="url(#grossGradient)"
            activeDot={{ r: 4, fill: '#fbbf24', stroke: '#15110B', strokeWidth: 2 }}
          />

          <Area
            type="monotone"
            dataKey="net_chf"
            name="Net"
            stroke="#34d399"
            strokeWidth={2}
            fill="url(#netGradient)"
            activeDot={{ r: 4, fill: '#34d399', stroke: '#15110B', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
