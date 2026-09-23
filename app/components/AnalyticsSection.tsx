'use client'

import { setTonnage } from '@/lib/training/load-volume'
import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

import { colors, fonts } from '../../lib/design-tokens'
import { getMuscleLabel } from '../../lib/i18n-muscle'
import styles from './progression-v2/ProgressionV2.module.css'
import { SizedContainer, useHasSize } from './ui/SizedChart'

const RIR_MIN_SETS_FOR_AVG = 5
const tooltipStyle = { backgroundColor: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 8, color: colors.text, padding: '10px 12px' }

export function MuscleVolumeTooltip({ active, payload }: {
  active?: boolean
  payload?: readonly { payload?: { label: string; sets: number; tonnage: number } }[]
}) {
  const t = useTranslations('progress.analytics')
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return <div style={tooltipStyle}>
    <strong>{row.label}</strong>
    <div>{t('muscleVolumeSets', { sets: row.sets, tonnage: row.tonnage })}</div>
  </div>
}
interface AdvancedWorkoutSet {
  load_mode?: string | null
  duration_seconds?: number | null
  completed?: boolean | null
  created_at?: string | null
  exercise_id?: string | null
  reps?: number | null
  rir?: number | null
  weight?: number | null
}

export interface AdvancedWorkoutSession {
  completed?: boolean | null
  created_at?: string | null
  workout_sets?: AdvancedWorkoutSet[] | null
}

interface AnalyticsSectionProps {
  wSessions: AdvancedWorkoutSession[]
  muscleMap: Map<string, string>
  mappingState: 'loading' | 'ready' | 'empty' | 'error'
}

export default function AnalyticsSection({ wSessions, muscleMap, mappingState }: AnalyticsSectionProps) {
  const { rootRef, hasSize } = useHasSize()
  const t = useTranslations('progress.analytics')
  const tV2 = useTranslations('progress.v2')
  const tMuscle = useTranslations('muscles')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const [analysisCutoff] = useState(() => Date.now() - 28 * 86400000)
  const { volumeByMuscle, unmappedSets } = useMemo(() => {
    const aggregate: Record<string, { sets: number; tonnage: number }> = {}
    let unmappedSets = 0
    for (const session of wSessions) for (const set of session.workout_sets || []) {
      if (session.completed === false || !set.completed) continue
      const timestamp = new Date(set.created_at || session.created_at || '').getTime()
      if (!Number.isFinite(timestamp) || timestamp < analysisCutoff) continue
      const muscle = set.exercise_id ? muscleMap.get(set.exercise_id) : undefined
      if (!muscle) { unmappedSets += 1; continue }
      if (!aggregate[muscle]) aggregate[muscle] = { sets: 0, tonnage: 0 }
      aggregate[muscle].sets += 1
      aggregate[muscle].tonnage += setTonnage(set)
    }
    const volumeByMuscle = Object.entries(aggregate).map(([muscle, value]) => ({
      muscle,
      label: getMuscleLabel(muscle, locale, tMuscle) || muscle,
      sets: value.sets,
      tonnage: Math.round(value.tonnage),
    })).sort((a, b) => b.sets - a.sets)
    return { volumeByMuscle, unmappedSets }
  }, [analysisCutoff, locale, muscleMap, tMuscle, wSessions])

  const rirByMuscle = useMemo(() => {
    const aggregate: Record<string, { sum: number; count: number }> = {}
    for (const session of wSessions) for (const set of session.workout_sets || []) {
      if (!set.completed || !set.exercise_id || set.rir == null) continue
      const timestamp = new Date(set.created_at || session.created_at || '').getTime()
      const muscle = muscleMap.get(set.exercise_id)
      if (!timestamp || timestamp < analysisCutoff || !muscle) continue
      if (!aggregate[muscle]) aggregate[muscle] = { sum: 0, count: 0 }
      aggregate[muscle].sum += set.rir
      aggregate[muscle].count += 1
    }
    return Object.entries(aggregate).filter(([, value]) => value.count >= RIR_MIN_SETS_FOR_AVG).map(([muscle, value]) => ({
      muscle,
      label: getMuscleLabel(muscle, locale, tMuscle) || muscle,
      average: Math.round((value.sum / value.count) * 10) / 10,
      count: value.count,
    })).sort((a, b) => a.average - b.average)
  }, [analysisCutoff, locale, muscleMap, tMuscle, wSessions])

  if (mappingState === 'loading') return <div className={styles.compactState} aria-busy="true">{tV2('states.loading')}</div>
  if (mappingState === 'error') return <div className={styles.compactState} role="status">{tV2('states.unavailable')}</div>

  return <div ref={rootRef} className={styles.advancedGrid}>
    <section aria-labelledby="muscle-volume-title">
      <h3 id="muscle-volume-title">{t('muscleVolumeTitle')}</h3>
      <p>{tV2('history.advanced.volumeHelp')}</p>
      {volumeByMuscle.length ? <>
        <p className={styles.chartSummary}>{tV2('history.advanced.volumeSummary', { count: volumeByMuscle.length })}</p>
        <SizedContainer hasSize={hasSize} height={Math.max(150, volumeByMuscle.length * 36)}>
          <BarChart data={volumeByMuscle} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid stroke={colors.divider} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: colors.textMuted, fontFamily: fonts.body }} />
            <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 12, fill: colors.textMuted, fontFamily: fonts.body }} />
            <Tooltip content={<MuscleVolumeTooltip />} cursor={{ fill: colors.gold, fillOpacity: 0.08 }} />
            <Bar dataKey="sets" name={t('muscleVolumeAxis')} fill={colors.gold} fillOpacity={0.72} radius={[0, 4, 4, 0]} />
          </BarChart>
        </SizedContainer>
        <p className={styles.chartSummary}>{t('muscleVolumeAxis')}</p>
      </> : <p>{tV2('history.advanced.insufficient')}</p>}
      {unmappedSets > 0 && <p className={styles.chartSummary}>{t('muscleVolumeUnmapped', { count: unmappedSets })}</p>}
    </section>

    <section aria-labelledby="muscle-rir-title">
      <h3 id="muscle-rir-title">{tV2('history.advanced.rir')}</h3>
      <p>{tV2('history.advanced.rirHelp', { count: RIR_MIN_SETS_FOR_AVG })}</p>
      {rirByMuscle.length ? <>
        <p className={styles.chartSummary}>{tV2('history.advanced.rirSummary', { count: rirByMuscle.length })}</p>
        <SizedContainer hasSize={hasSize} height={Math.max(150, rirByMuscle.length * 36)}>
          <BarChart data={rirByMuscle} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid stroke={colors.divider} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 4]} tick={{ fontSize: 12, fill: colors.textMuted, fontFamily: fonts.body }} />
            <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 12, fill: colors.textMuted, fontFamily: fonts.body }} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: colors.text }} itemStyle={{ color: colors.text }} cursor={{ fill: colors.gold, fillOpacity: 0.08 }} />
            <Bar dataKey="average" name={tV2('history.advanced.rir')} fill={colors.gold} fillOpacity={0.72} radius={[0, 4, 4, 0]} />
          </BarChart>
        </SizedContainer>
      </> : <p>{tV2('history.advanced.insufficient')}</p>}
    </section>
  </div>
}
