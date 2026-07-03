'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { format, type Locale } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale/fr'
import { enUS } from 'date-fns/locale/en-US'
import { de as deLocale } from 'date-fns/locale/de'
import { useTranslations, useLocale } from 'next-intl'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { Trophy, TrendingUp, Flame, Dumbbell, Download, Droplets, BarChart3 } from 'lucide-react'
import { downloadCsv } from '../../lib/exportCsv'
import { colors, fonts } from '../../lib/design-tokens'
import { getMuscleLabel } from '../../lib/i18n-muscle'
import { createBrowserClient } from '@supabase/ssr'

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
    <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12, padding: '8px 12px', fontSize: '0.72rem', fontFamily: fonts.body }}>
      <div style={{ color: colors.textMuted, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || colors.text, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value} {p.unit || ''}
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
  const t = useTranslations('progress.analytics')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const DATE_LOCALES: Record<string, Locale> = { fr: frLocale, en: enUS, de: deLocale }
  const dateLocale = DATE_LOCALES[locale] || frLocale
  const PERIOD_LABELS: Record<WeightPeriod, string> = { '30j': t('period30'), '60j': t('period60'), '90j': t('period90'), 'tout': t('periodAll') }
  const [weightPeriod, setWeightPeriod] = useState<WeightPeriod>('30j')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [muscleMap, setMuscleMap] = useState<Map<string, string>>(new Map())
  const tMuscle = useTranslations('muscles')

  // -- Fetch exercise→muscle mapping (once) --
  const muscleFetchedRef = useRef(false)
  useEffect(() => {
    if (muscleFetchedRef.current) return
    muscleFetchedRef.current = true
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    sb.from('exercises_db').select('id, muscle_group').then(({ data }) => {
      if (!data) return
      const map = new Map<string, string>()
      for (const row of data) if (row.id && row.muscle_group) map.set(row.id, row.muscle_group)
      setMuscleMap(map)
    })
  }, [])

  // -- Exercise progression (e1RM Epley) --
  const { exerciseList, byExercise } = useMemo(() => {
    const map: Record<string, Map<string, { e1rm: number; weight: number; reps: number }>> = {}
    for (const sess of wSessions) {
      for (const s of (sess.workout_sets || [])) {
        if (!s.completed || !s.weight || s.weight <= 0 || !s.reps || s.reps <= 0) continue
        const name = s.exercise_name
        if (!name) continue
        const date = (s.created_at || sess.created_at || '').slice(0, 10)
        if (!date) continue
        const e1rm = Math.round(s.weight * (1 + s.reps / 30) * 10) / 10
        if (!map[name]) map[name] = new Map()
        const prev = map[name].get(date)
        if (!prev || e1rm > prev.e1rm) map[name].set(date, { e1rm, weight: s.weight, reps: s.reps })
      }
    }
    const list = Object.keys(map).sort((a, b) => (map[b].size) - (map[a].size))
    const byEx: Record<string, { date: string; e1rm: number; weight: number; reps: number }[]> = {}
    for (const name of list) {
      byEx[name] = Array.from(map[name].entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }
    return { exerciseList: list, byExercise: byEx }
  }, [wSessions])

  useEffect(() => {
    if (exerciseList.length > 0 && !exerciseList.includes(selectedExercise)) {
      setSelectedExercise(exerciseList[0])
    }
  }, [exerciseList])

  // -- Volume by muscle (28 days) --
  const volumeByMuscle = useMemo(() => {
    if (muscleMap.size === 0) return []
    const cutoff = Date.now() - 28 * 86400000
    const agg: Record<string, { sets: number; tonnage: number }> = {}
    for (const sess of wSessions) {
      for (const s of (sess.workout_sets || [])) {
        if (!s.completed || !s.exercise_id) continue
        const date = new Date(s.created_at || sess.created_at || '').getTime()
        if (!date || date < cutoff) continue
        const muscle = muscleMap.get(s.exercise_id)
        if (!muscle) continue
        if (!agg[muscle]) agg[muscle] = { sets: 0, tonnage: 0 }
        agg[muscle].sets += 1
        agg[muscle].tonnage += (s.weight || 0) * (s.reps || 0)
      }
    }
    return Object.entries(agg)
      .map(([muscle, v]) => ({ muscle, sets: v.sets, tonnage: Math.round(v.tonnage) }))
      .sort((a, b) => b.sets - a.sets)
  }, [wSessions, muscleMap])

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
        date: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
        poids: w.poids,
        tendance: Math.round(avg * 10) / 10,
      }
    })
  }, [weightHistoryFull, weightPeriod])

  // -- Calories chart data --
  const calData = useMemo(() =>
    weeklyCalories.map(c => ({
      date: format(new Date(c.date), 'EEE', { locale: dateLocale }),
      calories: Math.round(c.calories),
      inTarget: Math.abs(c.calories - calorieGoal) <= 100,
    })),
    [weeklyCalories, calorieGoal]
  )

  // -- Macros chart data --
  const macroData = useMemo(() =>
    weeklyCalories.map(c => ({
      date: format(new Date(c.date), 'EEE', { locale: dateLocale }),
      protein: Math.round(c.protein),
      carbs: Math.round(c.carbs),
      fat: Math.round(c.fat),
    })),
    [weeklyCalories]
  )

  // -- Water chart data --
  const waterData = useMemo(() =>
    weeklyWater.map(w => ({
      date: format(new Date(w.date), 'EEE', { locale: dateLocale }),
      litres: Math.round(w.ml) / 1000,
    })),
    [weeklyWater]
  )

  // -- Volume chart data --
  const volumeData = useMemo(() =>
    weeklyVolume.map(v => ({
      week: `S${format(new Date(v.week), 'w', { locale: dateLocale })}`,
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
      [t('csvDate'), t('csvWeight'), t('csvCalories'), t('csvProtein'), t('csvCarbs'), t('csvFat'), t('csvWater')],
      rows
    )
  }

  const axisStyle = { fontSize: '0.55rem', fill: colors.textDim }
  const gridColor = colors.divider

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* STATS SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {[
          { icon: Flame, label: t('streak'), value: `${streak} ${t('days')}`, color: streak > 0 ? colors.gold : colors.textMuted },
          { icon: TrendingUp, label: t('weight'), value: monthWeightDiff !== null ? `${monthWeightDiff > 0 ? '+' : ''}${monthWeightDiff} kg` : '---', color: monthWeightDiff !== null ? (monthWeightDiff <= 0 ? colors.success : colors.error) : colors.textMuted },
          { icon: Dumbbell, label: t('volume'), value: volumeChange !== null ? `${volumeChange > 0 ? '+' : ''}${volumeChange}%` : '---', color: volumeChange !== null ? (volumeChange >= 0 ? colors.success : colors.error) : colors.textMuted },
          { icon: Trophy, label: t('records'), value: `${monthPRs} PR`, color: monthPRs > 0 ? colors.gold : colors.textMuted },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16,
            padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon size={18} color={color} />
            <div>
              <div style={{ fontFamily: fonts.headline, fontSize: '1.2rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.58rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* WEIGHT CHART */}
      {weightHistoryFull.length > 1 && (
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: fonts.alt, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: colors.gold }}>{t('weight')}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['30j', '60j', '90j', 'tout'] as WeightPeriod[]).map(p => (
                <button key={p} onClick={() => setWeightPeriod(p)} style={{
                  padding: '6px 10px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, fontFamily: fonts.alt, letterSpacing: '0.15em',
                  background: weightPeriod === p ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${weightPeriod === p ? colors.gold : 'rgba(255,255,255,0.1)'}`,
                  color: weightPeriod === p ? colors.gold : colors.textDim,
                }}>
                  {PERIOD_LABELS[p]}
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
                {goalWeight && <ReferenceLine y={goalWeight} stroke={colors.success} strokeDasharray="6 4" label={{ value: t('goal'), fill: colors.success, fontSize: 10, position: 'right' }} />}
                <Line type="monotone" dataKey="tendance" stroke={`${colors.gold}50`} strokeDasharray="4 4" strokeWidth={1.5} dot={false} name={t('trend')} />
                <Line type="monotone" dataKey="poids" stroke={colors.gold} strokeWidth={2} dot={{ r: 2, fill: colors.gold }} activeDot={{ r: 4, fill: colors.gold }} name={t('weight')} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* CALORIES CHART */}
      {calData.length > 0 && (
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16 }}>
          <span style={{ fontFamily: fonts.alt, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: colors.gold, display: 'block', marginBottom: 12 }}>{t('calories7d')}</span>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={calData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={calorieGoal} stroke={colors.success} strokeDasharray="6 4" label={{ value: `${calorieGoal}`, fill: colors.success, fontSize: 10, position: 'right' }} />
              <Bar dataKey="calories" radius={[2, 2, 0, 0]} name={t('caloriesName')}>
                {calData.map((entry, i) => (
                  <Cell key={i} fill={entry.inTarget ? colors.success : colors.error} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* MACROS CHART */}
      {macroData.length > 0 && (
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16 }}>
          <span style={{ fontFamily: fonts.alt, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: colors.gold, display: 'block', marginBottom: 12 }}>{t('macros7d')}</span>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={macroData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="protein" stackId="macro" fill={colors.gold} radius={[0, 0, 0, 0]} name={t('protein')} />
              <Bar dataKey="carbs" stackId="macro" fill={colors.blue} radius={[0, 0, 0, 0]} name={t('carbs')} />
              <Bar dataKey="fat" stackId="macro" fill={colors.orange} radius={[2, 2, 0, 0]} name={t('fat')} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {[{ label: t('protein'), color: colors.gold }, { label: t('carbs'), color: colors.blue }, { label: t('fat'), color: colors.orange }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 12, background: l.color }} />
                <span style={{ fontSize: '0.55rem', fontFamily: fonts.body, color: colors.textMuted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VOLUME CHART */}
      {volumeData.length > 0 && (
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16 }}>
          <span style={{ fontFamily: fonts.alt, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: colors.gold, display: 'block', marginBottom: 12 }}>{t('trainingVolume')}</span>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={volumeData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="volume" stroke={colors.gold} strokeWidth={2.5} dot={{ r: 4, fill: colors.gold }} name={t('volumeKg')} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HYDRATION CHART */}
      {waterData.length > 0 && (
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Droplets size={14} color={LIGHT_BLUE} />
            <span style={{ fontFamily: fonts.alt, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: colors.gold }}>{t('hydration7d')}</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={waterData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={axisStyle} />
              <YAxis tick={axisStyle} unit="L" />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={waterGoal / 1000} stroke={LIGHT_BLUE} strokeDasharray="6 4" />
              <Bar dataKey="litres" fill={LIGHT_BLUE} fillOpacity={0.6} radius={[2, 2, 0, 0]} name={t('waterL')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* EXERCISE PROGRESSION */}
      {exerciseList.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Dumbbell size={16} color={colors.gold} />
            <span style={{ fontFamily: fonts.alt, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: colors.gold }}>{t('exerciseProgressTitle')}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: fonts.alt, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1.5px', color: colors.textMuted, textTransform: 'uppercase' }}>{t('exerciseProgressTrailing')}</span>
          </div>
          <select
            value={selectedExercise}
            onChange={e => setSelectedExercise(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', marginBottom: 12, borderRadius: 12,
              background: colors.surface2, border: `1px solid ${colors.divider}`,
              color: colors.text, fontFamily: fonts.body, fontSize: '0.82rem',
              appearance: 'none', cursor: 'pointer',
            }}
          >
            {exerciseList.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {selectedExercise && (byExercise[selectedExercise]?.length ?? 0) >= 2 ? (
            <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: '16px 8px 8px' }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={byExercise[selectedExercise].map(d => ({ ...d, label: format(new Date(d.date + 'T12:00:00'), 'd MMM', { locale: dateLocale }) }))}>
                  <CartesianGrid stroke={`${colors.divider}`} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: colors.textMuted, fontFamily: fonts.body }} />
                  <YAxis tick={{ fontSize: 10, fill: colors.textMuted, fontFamily: fonts.body }} unit="kg" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="e1rm" stroke={colors.gold} strokeWidth={2} dot={{ r: 3, fill: colors.gold }} name={t('exerciseProgress1rm')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: colors.textMuted, fontFamily: fonts.body, fontSize: '0.82rem' }}>
              {t('exerciseProgressEmpty')}
            </div>
          )}
        </div>
      )}

      {/* MUSCLE VOLUME */}
      {volumeByMuscle.length > 0 ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BarChart3 size={16} color={colors.gold} />
            <span style={{ fontFamily: fonts.alt, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: colors.gold }}>{t('muscleVolumeTitle')}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: fonts.alt, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1.5px', color: colors.textMuted, textTransform: 'uppercase' }}>{t('muscleVolumeTrailing')}</span>
          </div>
          <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: '16px 8px 8px' }}>
            <ResponsiveContainer width="100%" height={volumeByMuscle.length * 36 + 16}>
              <BarChart data={volumeByMuscle.map(d => ({ ...d, label: getMuscleLabel(d.muscle, locale, tMuscle) || d.muscle }))} layout="vertical" margin={{ left: 8, right: 8, top: 0, bottom: 0 }}>
                <CartesianGrid stroke={`${colors.divider}`} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: colors.textMuted, fontFamily: fonts.body }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: colors.textMuted, fontFamily: fonts.body }} width={90} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12, padding: '8px 12px', fontSize: '0.72rem', fontFamily: fonts.body }}>
                      <div style={{ color: colors.gold, fontWeight: 600 }}>{d.label}</div>
                      <div style={{ color: colors.text }}>{t('muscleVolumeSets', { sets: d.sets, tonnage: d.tonnage.toLocaleString() })}</div>
                    </div>
                  )
                }} />
                <Bar dataKey="sets" fill={colors.gold} fillOpacity={0.7} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : muscleMap.size > 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: colors.textMuted, fontFamily: fonts.body, fontSize: '0.82rem' }}>
          {t('muscleVolumeEmpty')}
        </div>
      ) : null}

      {/* EXPORT */}
      <button
        onClick={exportAnalytics}
        style={{
          width: '100%', padding: '14px', background: colors.surface2,
          border: `1px solid ${colors.divider}`, borderRadius: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginTop: 8,
        }}
      >
        <Download size={16} color={colors.textMuted} />
        <span style={{ fontSize: '0.85rem', fontFamily: fonts.alt, fontWeight: 700, color: colors.textMuted, letterSpacing: '1px', textTransform: 'uppercase' }}>{t('exportData')}</span>
      </button>
    </div>
  )
}
