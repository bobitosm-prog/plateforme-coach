'use client'
import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { Trophy, TrendingUp, Flame, Dumbbell, Download, Droplets } from 'lucide-react'
import { downloadCsv } from '../../lib/exportCsv'
import { BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD } from '../../lib/design-tokens'

const LIGHT_BLUE = '#7DD3FC'

interface AnalyticsSectionProps {
  personalRecords: any[]
  weeklyCalories: { date: string; calories: number; protein: number; carbs: number; fat: number }[]
  weeklyWater: { date: string; ml: number }[]
  weeklyVolume: { week: string; volume: number }[]
  weightHistoryFull: { date: string; poids: number }[]
  weightHistory30: { date: string; poids: number }[]
  wSessions: any[]
  calorieGoal: number
  goalWeight: number | null
  waterGoal: number
  streak: number
  currentWeight: number | undefined
}

type WeightPeriod = '30j' | '60j' | '90j' | 'tout'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${GOLD}`, borderRadius: 2, padding: '8px 12px', fontSize: '0.72rem', fontFamily: FONT_BODY }}>
      <div style={{ color: TEXT_MUTED, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || TEXT_PRIMARY, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value} {p.unit || ''}
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsSection({
  personalRecords, weeklyCalories, weeklyWater, weeklyVolume,
  weightHistoryFull, weightHistory30, wSessions,
  calorieGoal, goalWeight, waterGoal, streak, currentWeight,
}: AnalyticsSectionProps) {
  const [weightPeriod, setWeightPeriod] = useState<WeightPeriod>('30j')

  // -- Weight chart data --
  const weightData = useMemo(() => {
    const source = weightPeriod === 'tout' ? weightHistoryFull : weightHistoryFull
    const now = Date.now()
    const days = weightPeriod === '30j' ? 30 : weightPeriod === '60j' ? 60 : weightPeriod === '90j' ? 90 : 9999
    const cutoff = now - days * 86400000
    const filtered = source.filter(w => new Date(w.date).getTime() >= cutoff)
    // 7-day moving average
    return filtered.map((w, i) => {
      const window = filtered.slice(Math.max(0, i - 6), i + 1)
      const avg = window.reduce((s, v) => s + v.poids, 0) / window.length
      return {
        date: format(new Date(w.date), 'd MMM', { locale: fr }),
        poids: w.poids,
        tendance: Math.round(avg * 10) / 10,
      }
    })
  }, [weightHistoryFull, weightPeriod])

  // -- Calories chart data --
  const calData = useMemo(() =>
    weeklyCalories.map(c => ({
      date: format(new Date(c.date), 'EEE', { locale: fr }),
      calories: Math.round(c.calories),
      inTarget: Math.abs(c.calories - calorieGoal) <= 100,
    })),
    [weeklyCalories, calorieGoal]
  )

  // -- Macros chart data --
  const macroData = useMemo(() =>
    weeklyCalories.map(c => ({
      date: format(new Date(c.date), 'EEE', { locale: fr }),
      Proteines: Math.round(c.protein),
      Glucides: Math.round(c.carbs),
      Lipides: Math.round(c.fat),
    })),
    [weeklyCalories]
  )

  // -- Water chart data --
  const waterData = useMemo(() =>
    weeklyWater.map(w => ({
      date: format(new Date(w.date), 'EEE', { locale: fr }),
      litres: Math.round(w.ml) / 1000,
    })),
    [weeklyWater]
  )

  // -- Volume chart data --
  const volumeData = useMemo(() =>
    weeklyVolume.map(v => ({
      week: `S${format(new Date(v.week), 'w', { locale: fr })}`,
      volume: v.volume,
    })),
    [weeklyVolume]
  )

  // -- Stats summary --
  const monthWeightDiff = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000
    const recent = weightHistoryFull.filter(w => new Date(w.date).getTime() >= thirtyDaysAgo)
    if (recent.length < 2) return null
    return Math.round((recent[recent.length - 1].poids - recent[0].poids) * 10) / 10
  }, [weightHistoryFull])

  const volumeChange = useMemo(() => {
    if (weeklyVolume.length < 2) return null
    const last = weeklyVolume[weeklyVolume.length - 1].volume
    const prev = weeklyVolume[weeklyVolume.length - 2].volume
    if (prev === 0) return null
    return Math.round(((last - prev) / prev) * 100)
  }, [weeklyVolume])

  const monthPRs = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString().split('T')[0]
    return personalRecords.filter(pr => pr.achieved_at >= cutoff).length
  }, [personalRecords])

  // -- PR records grouped: show 1rm only, prioritize compound lifts --
  const prRecords = useMemo(() => {
    const priorityExercises = ['developpe couche', 'bench press', 'squat', 'deadlift', 'souleve de terre', 'overhead press', 'developpe militaire', 'rowing', 'barbell row']
    const rmRecords = personalRecords.filter(pr => pr.record_type === '1rm')
    return rmRecords.sort((a, b) => {
      const aP = priorityExercises.findIndex(e => a.exercise_name.toLowerCase().includes(e))
      const bP = priorityExercises.findIndex(e => b.exercise_name.toLowerCase().includes(e))
      if (aP !== -1 && bP === -1) return -1
      if (aP === -1 && bP !== -1) return 1
      if (aP !== -1 && bP !== -1) return aP - bP
      return new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime()
    })
  }, [personalRecords])

  // -- CSV export --
  function exportAnalytics() {
    const rows: (string | number | null)[][] = []
    const allDates = new Set<string>()
    weightHistoryFull.forEach(w => allDates.add(w.date))
    weeklyCalories.forEach(c => allDates.add(c.date))
    weeklyWater.forEach(w => allDates.add(w.date))

    const sorted = [...allDates].sort()
    const weightMap = Object.fromEntries(weightHistoryFull.map(w => [w.date, w.poids]))
    const calMap = Object.fromEntries(weeklyCalories.map(c => [c.date, c]))
    const waterMap = Object.fromEntries(weeklyWater.map(w => [w.date, w.ml]))

    for (const date of sorted) {
      rows.push([
        date,
        weightMap[date] ?? null,
        calMap[date]?.calories ?? null,
        calMap[date]?.protein ?? null,
        calMap[date]?.carbs ?? null,
        calMap[date]?.fat ?? null,
        waterMap[date] ? Math.round(waterMap[date] / 1000 * 10) / 10 : null,
      ])
    }

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    downloadCsv(`moovx_analytics_${today}.csv`,
      ['Date', 'Poids (kg)', 'Calories', 'Proteines (g)', 'Glucides (g)', 'Lipides (g)', 'Eau (L)'],
      rows
    )
  }

  const axisStyle = { fontSize: '0.55rem', fill: TEXT_DIM }
  const gridColor = BORDER

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* STATS SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {[
          { icon: Flame, label: 'Streak', value: `${streak} jours`, color: streak > 0 ? GOLD : TEXT_MUTED },
          { icon: TrendingUp, label: 'Poids', value: monthWeightDiff !== null ? `${monthWeightDiff > 0 ? '+' : ''}${monthWeightDiff} kg` : '---', color: monthWeightDiff !== null ? (monthWeightDiff <= 0 ? GREEN : RED) : TEXT_MUTED },
          { icon: Dumbbell, label: 'Volume', value: volumeChange !== null ? `${volumeChange > 0 ? '+' : ''}${volumeChange}%` : '---', color: volumeChange !== null ? (volumeChange >= 0 ? GREEN : RED) : TEXT_MUTED },
          { icon: Trophy, label: 'Records', value: `${monthPRs} PR`, color: monthPRs > 0 ? GOLD : TEXT_MUTED },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD,
            padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon size={18} color={color} />
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.2rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.58rem', fontFamily: FONT_ALT, color: TEXT_MUTED, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* WEIGHT CHART */}
      {weightHistoryFull.length > 1 && (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD }}>Poids</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['30j', '60j', '90j', 'tout'] as WeightPeriod[]).map(p => (
                <button key={p} onClick={() => setWeightPeriod(p)} style={{
                  padding: '4px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', fontFamily: FONT_ALT, letterSpacing: '1px',
                  background: weightPeriod === p ? GOLD : 'transparent',
                  color: weightPeriod === p ? '#050505' : TEXT_MUTED,
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {weightData.length > 1 && (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weightData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={axisStyle} interval="preserveStartEnd" />
                <YAxis tick={axisStyle} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip content={<CustomTooltip />} />
                {goalWeight && <ReferenceLine y={goalWeight} stroke={GREEN} strokeDasharray="6 4" label={{ value: 'Objectif', fill: GREEN, fontSize: 10, position: 'right' }} />}
                <Line type="monotone" dataKey="tendance" stroke={`${GOLD}50`} strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Tendance" />
                <Line type="monotone" dataKey="poids" stroke={GOLD} strokeWidth={2} dot={{ r: 2, fill: GOLD }} activeDot={{ r: 4, fill: GOLD }} name="Poids" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* CALORIES CHART */}
      {calData.length > 0 && (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
          <span style={{ fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD, display: 'block', marginBottom: 12 }}>Calories (7 jours)</span>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={calData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={calorieGoal} stroke={GREEN} strokeDasharray="6 4" label={{ value: `${calorieGoal}`, fill: GREEN, fontSize: 10, position: 'right' }} />
              <Bar dataKey="calories" radius={[2, 2, 0, 0]} name="Calories">
                {calData.map((entry, i) => (
                  <Cell key={i} fill={entry.inTarget ? GREEN : RED} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* MACROS CHART */}
      {macroData.length > 0 && (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
          <span style={{ fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD, display: 'block', marginBottom: 12 }}>Macros (7 jours)</span>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={macroData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Proteines" stackId="macro" fill={GOLD} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Glucides" stackId="macro" fill={GREEN} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Lipides" stackId="macro" fill={GOLD} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {[{ label: 'Proteines', color: GOLD }, { label: 'Glucides', color: GREEN }, { label: 'Lipides', color: GOLD }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 12, background: l.color }} />
                <span style={{ fontSize: '0.55rem', fontFamily: FONT_BODY, color: TEXT_MUTED }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VOLUME CHART */}
      {volumeData.length > 0 && (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
          <span style={{ fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD, display: 'block', marginBottom: 12 }}>Volume d&apos;entrainement</span>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={volumeData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="volume" stroke={GOLD} strokeWidth={2.5} dot={{ r: 4, fill: GOLD }} name="Volume (kg)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HYDRATION CHART */}
      {waterData.length > 0 && (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Droplets size={14} color={LIGHT_BLUE} />
            <span style={{ fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD }}>Hydratation (7 jours)</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={waterData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={axisStyle} />
              <YAxis tick={axisStyle} unit="L" />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={waterGoal / 1000} stroke={LIGHT_BLUE} strokeDasharray="6 4" />
              <Bar dataKey="litres" fill={LIGHT_BLUE} fillOpacity={0.6} radius={[2, 2, 0, 0]} name="Eau (L)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* PERSONAL RECORDS */}
      {prRecords.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Trophy size={16} color={GOLD} />
            <span style={{ fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD }}>Mes records</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {prRecords.map(pr => {
              const diff = pr.previous_value ? Math.round((pr.value - pr.previous_value) * 10) / 10 : null
              return (
                <div key={pr.id} style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD,
                  padding: '14px 12px', borderLeft: `3px solid ${GOLD}`,
                }}>
                  <div style={{ fontSize: '0.65rem', fontFamily: FONT_BODY, color: TEXT_MUTED, fontWeight: 400, marginBottom: 4, lineHeight: 1.3 }}>
                    {pr.exercise_name}
                  </div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, color: GOLD, lineHeight: 1 }}>
                    {pr.value} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{pr.unit}</span>
                  </div>
                  <div style={{ fontSize: '0.55rem', fontFamily: FONT_ALT, color: TEXT_MUTED, marginTop: 2 }}>
                    1RM estime
                  </div>
                  {diff !== null && diff > 0 ? (
                    <div style={{ fontSize: '0.6rem', fontFamily: FONT_ALT, color: GREEN, fontWeight: 700, marginTop: 4 }}>
                      +{diff} {pr.unit} vs precedent
                    </div>
                  ) : diff === null ? (
                    <div style={{ fontSize: '0.6rem', fontFamily: FONT_ALT, color: GOLD, fontWeight: 700, marginTop: 4 }}>
                      Premier record
                    </div>
                  ) : null}
                  <div style={{ fontSize: '0.5rem', fontFamily: FONT_BODY, color: TEXT_DIM, marginTop: 4 }}>
                    Atteint le {format(new Date(pr.achieved_at), 'd MMM yyyy', { locale: fr })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* EXPORT */}
      <button
        onClick={exportAnalytics}
        style={{
          width: '100%', padding: '14px', background: BG_CARD,
          border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginTop: 8,
        }}
      >
        <Download size={16} color={TEXT_MUTED} />
        <span style={{ fontSize: '0.85rem', fontFamily: FONT_ALT, fontWeight: 700, color: TEXT_MUTED, letterSpacing: '1px', textTransform: 'uppercase' }}>Exporter mes donnees</span>
      </button>
    </div>
  )
}
