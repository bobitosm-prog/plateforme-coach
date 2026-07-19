import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { colors, fonts, bodyStyle, cardStyle, mutedStyle } from '../../../../lib/design-tokens'
import { SizedContainer } from '../../ui/SizedChart'
import SectionTitle from '../../ui/SectionTitle'
import type { ProgressCheckin, ProgressTranslate } from './progress-tab-types'

const MOOD_SCORES: Readonly<Record<string, number>> = { fatigue: 1, normal: 2, bien: 3, top: 4, energie: 5 }
const MOOD_EMOJIS: Readonly<Record<string, string>> = { fatigue: '😴', normal: '😐', bien: '💪', top: '🔥', energie: '⚡' }

interface TooltipEntry { readonly color?: string; readonly name?: string; readonly value?: string | number | null }
function ChartTip({ active, payload, label }: { readonly active?: boolean; readonly payload?: readonly TooltipEntry[]; readonly label?: string }) {
  if (!active || !payload?.length) return null
  return <div style={{ background: colors.surface, border: `1px solid ${colors.gold}`, borderRadius: 8, padding: '6px 10px' }}><div style={{ fontSize: 10, color: colors.textMuted }}>{label}</div>{payload.map((entry, index) => <div key={index} style={{ fontSize: 12, color: entry.color }}>{entry.name}: {entry.value ?? '—'}</div>)}</div>
}

export function ProgressWellnessSection({ checkins, period, locale, now, hasSize, onPeriodChange, t }: {
  readonly checkins: readonly ProgressCheckin[]; readonly period: number; readonly locale: string; readonly now: Date; readonly hasSize: boolean; readonly onPeriodChange: (period: number) => void; readonly t: ProgressTranslate
}) {
  const chartData = Array.from({ length: period }, (_, index) => {
    const date = new Date(now.getTime() - (period - 1 - index) * 86_400_000)
    const dateString = date.toISOString().split('T')[0]
    const checkin = checkins.find(value => value.date === dateString)
    return { date: dateString, day: date.toLocaleDateString(locale === 'de' ? 'de-CH' : locale === 'en' ? 'en-US' : 'fr-CH', { weekday: 'short' }), mood: checkin?.mood ? MOOD_SCORES[checkin.mood] ?? null : null, sleep: checkin?.sleep_hours || null, note: checkin?.note }
  })
  const moods = checkins.flatMap(checkin => checkin.mood && MOOD_SCORES[checkin.mood] ? [MOOD_SCORES[checkin.mood]] : [])
  const sleeps = checkins.flatMap(checkin => checkin.sleep_hours ? [checkin.sleep_hours] : [])
  const moodAvg = moods.length ? (moods.reduce((sum, value) => sum + value, 0) / moods.length).toFixed(1) : '—'
  const sleepAvg = sleeps.length ? (sleeps.reduce((sum, value) => sum + value, 0) / sleeps.length).toFixed(1) : '—'
  const counts = checkins.reduce<Record<string, number>>((result, checkin) => checkin.mood ? { ...result, [checkin.mood]: (result[checkin.mood] ?? 0) + 1 } : result, {})
  const topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  return <>
    <SectionTitle noPadding title={t('tab.myWellness')} />
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>{[7, 30, 90].map(value => <button key={value} onClick={() => onPeriodChange(value)} style={{ padding: '5px 14px', borderRadius: 999, background: period === value ? colors.goldBorder : 'transparent', color: period === value ? colors.gold : 'rgba(255,255,255,0.4)' }}>{value}J</button>)}</div>
    {checkins.length === 0 ? <div style={{ ...cardStyle, padding: 32, textAlign: 'center' }}><p style={{ ...bodyStyle, color: colors.textDim }}>{t('wellness.noCheckins')}</p><p style={{ ...mutedStyle }}>{t('tab.checkinHint')}</p></div> : <>
      <div style={{ ...cardStyle, padding: 20, marginBottom: 12 }}><div style={{ fontFamily: fonts.headline, fontSize: 11, color: colors.gold, marginBottom: 12 }}>{t('tab.mood')}</div><SizedContainer hasSize={hasSize} height={160}><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tickFormatter={value => ['', '😴', '😐', '💪', '🔥', '⚡'][value] || ''} /><Tooltip content={<ChartTip />} /><Area type="monotone" dataKey="mood" name={t('tab.moodChart')} stroke={colors.gold} fill="url(#moodGrad)" connectNulls /></AreaChart></SizedContainer></div>
      <div style={{ ...cardStyle, padding: 20, marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('tab.sleep')}</span><span>{t('tab.sleepAvg', { avg: sleepAvg })}</span></div><SizedContainer hasSize={hasSize} height={140}><BarChart data={chartData} barSize={period <= 7 ? 20 : period <= 30 ? 8 : 4}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis domain={[0, 12]} /><Tooltip content={<ChartTip />} /><ReferenceLine y={8} stroke={colors.gold} /><Bar dataKey="sleep" name={t('tab.sleepChart')} fill={colors.gold} /></BarChart></SizedContainer></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{[
        { label: t('tab.avgMood'), value: `${moodAvg}/5`, icon: MOOD_EMOJIS[topMood] ?? '—' }, { label: t('tab.avgSleep'), value: `${sleepAvg}h / 8h`, icon: '🌙' }, { label: t('tab.topMood'), value: topMood, icon: MOOD_EMOJIS[topMood] ?? '—' }, { label: t('tab.checkins'), value: String(checkins.length), icon: '✓' },
      ].map(item => <div key={item.label} style={{ ...cardStyle, padding: 14, display: 'flex', gap: 10 }}><div>{item.icon}</div><div><div>{item.value}</div><div>{item.label}</div></div></div>)}</div>
    </>}
  </>
}
