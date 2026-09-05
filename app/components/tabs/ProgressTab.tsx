'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { format, type Locale } from 'date-fns'
import { de as deLocale } from 'date-fns/locale/de'
import { enUS } from 'date-fns/locale/en-US'
import { fr as frLocale } from 'date-fns/locale/fr'
import { ChevronDown, Sparkles, X } from 'lucide-react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import type { SupabaseClient } from '@supabase/supabase-js'

import { downloadCsv } from '../../../lib/exportCsv'
import { computeAlignment, type Alignment } from '../../../lib/photo-align'
import type {
  ProgressionPeriod,
  ProgressionViewModel,
} from '../../../lib/progression/progression-dashboard-model'
import AnalyticsSection, { type AdvancedWorkoutSession } from '../AnalyticsSection'
import ProgressionExports from '../progression-v2/ProgressionExports'
import ProgressionV2, { type ProgressionSection } from '../progression-v2/ProgressionV2'
import progressionV2Styles from '../progression-v2/ProgressionV2.module.css'
import TransformationPhotos, { shouldLoadSignedPhotoUrls, type TransformationPhoto } from '../progression-v2/TransformationPhotos'
import WellbeingCompact from '../progression-v2/WellbeingCompact'
import { RailOverlay } from '../ui/RailOverlay'

const EMPTY_MUSCLE_MAP = new Map<string, string>()

interface MeasurementRow {
  date: string
  waist?: number | null
  hips?: number | null
  chest?: number | null
  biceps?: number | null
  thighs?: number | null
}

interface ProfileSummary {
  height?: number | null
}

interface ProgressTabProps {
  supabase: SupabaseClient
  weightHistory30: { date: string; poids: number }[]
  measurements: MeasurementRow[]
  progressPhotos: TransformationPhoto[]
  photoRef: React.RefObject<HTMLInputElement | null>
  photoUploading: boolean
  uploadProgressPhoto: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  setModal: (modal: string) => void
  profile: ProfileSummary | null
  weeklyCalories: { date: string; calories: number; protein: number; carbs: number; fat: number }[]
  weeklyWater: { date: string; ml: number }[]
  weightHistoryFull: { date: string; poids: number }[]
  wSessions: AdvancedWorkoutSession[]
  currentWeight: number | undefined
  progressionModel: ProgressionViewModel
  onProgressionPeriodChange: (period: ProgressionPeriod) => void
}

export default function ProgressTab({
  supabase,
  weightHistory30,
  measurements,
  progressPhotos,
  photoRef,
  photoUploading,
  uploadProgressPhoto,
  setModal,
  profile,
  weeklyCalories,
  weeklyWater,
  weightHistoryFull,
  wSessions,
  currentWeight,
  progressionModel,
  onProgressionPeriodChange,
}: ProgressTabProps) {
  const t = useTranslations('progress.v2')
  const tAnalytics = useTranslations('progress.analytics')
  const locale = useLocale()
  const dateLocales: Record<string, Locale> = { fr: frLocale, en: enUS, de: deLocale }
  const dateLocale = dateLocales[locale] || frLocale
  const [activeSection, setActiveSection] = useState<ProgressionSection>('weight')
  const [photosOpen, setPhotosOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advancedMappingResult, setAdvancedMappingResult] = useState<{
    key: string
    state: 'ready' | 'empty' | 'error'
    muscleMap: Map<string, string>
  }>({ key: '', state: 'empty', muscleMap: new Map() })
  const [photoUrlResult, setPhotoUrlResult] = useState<{
    key: string
    state: 'ready' | 'error'
    urls: Record<string, string>
  }>({ key: '', state: 'ready', urls: {} })
  const [showCompare, setShowCompare] = useState(false)
  const [compareIndexes, setCompareIndexes] = useState<[number, number]>([0, 0])
  const [sliderValue, setSliderValue] = useState(50)
  const [alignment, setAlignment] = useState<{ before: Alignment; after: Alignment } | null>(null)
  const [isAligning, setIsAligning] = useState(false)
  const [alignError, setAlignError] = useState<string | null>(null)

  const photoIds = useMemo(() => progressPhotos.map(photo => photo.id).join(','), [progressPhotos])
  const requestedPhotoKey = photosOpen ? photoIds : ''
  const photoUrlState = !requestedPhotoKey
    ? 'idle'
    : photoUrlResult.key === requestedPhotoKey
      ? photoUrlResult.state
      : 'loading'
  const signedUrls = photoUrlResult.key === requestedPhotoKey ? photoUrlResult.urls : {}
  const advancedExerciseIds = useMemo(() => Array.from(new Set(wSessions.flatMap(session =>
    (session.workout_sets || []).flatMap(set => set.exercise_id ? [set.exercise_id] : []),
  ))).sort(), [wSessions])
  const advancedExerciseKey = advancedOpen ? advancedExerciseIds.join(',') : ''
  const advancedMappingState = !advancedExerciseKey
    ? 'empty'
    : advancedMappingResult.key === advancedExerciseKey
      ? advancedMappingResult.state
      : 'loading'
  const advancedMuscleMap = advancedMappingResult.key === advancedExerciseKey
    ? advancedMappingResult.muscleMap
    : EMPTY_MUSCLE_MAP

  useEffect(() => {
    if (!shouldLoadSignedPhotoUrls(photosOpen, progressPhotos.length)) return
    let cancelled = false
    async function generateUrls() {
      const urls: Record<string, string> = {}
      for (const photo of progressPhotos) {
        if (cancelled) return
        const { data, error } = await supabase.storage.from('progress-photos').createSignedUrl(photo.photo_url, 3600)
        if (error) {
          if (!cancelled) setPhotoUrlResult({ key: photoIds, state: 'error', urls: {} })
          return
        }
        if (data?.signedUrl) urls[photo.id] = data.signedUrl
      }
      if (!cancelled) {
        setPhotoUrlResult({ key: photoIds, state: 'ready', urls })
      }
    }
    generateUrls()
    return () => { cancelled = true }
  }, [photoIds, photosOpen, progressPhotos, supabase])

  useEffect(() => {
    if (!advancedExerciseKey) return
    let cancelled = false
    const requestedExerciseIds = advancedExerciseKey.split(',')
    supabase.from('exercises_db').select('id, muscle_group').in('id', requestedExerciseIds).then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        setAdvancedMappingResult({ key: advancedExerciseKey, state: 'error', muscleMap: new Map() })
        return
      }
      const muscleMap = new Map<string, string>()
      for (const row of data ?? []) if (row.id && row.muscle_group) muscleMap.set(row.id, row.muscle_group)
      setAdvancedMappingResult({ key: advancedExerciseKey, state: muscleMap.size ? 'ready' : 'empty', muscleMap })
    })
    return () => { cancelled = true }
  }, [advancedExerciseKey, supabase])

  useEffect(() => {
    if (!showCompare) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowCompare(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showCompare])

  function scrollToSection(section: ProgressionSection) {
    setActiveSection(section)
    const target = section === 'weight'
      ? 'progression-v2-weight'
      : section === 'performance'
        ? 'progression-v2-records'
        : section === 'body'
          ? 'progression-v2-measurements'
          : 'progression-v2-history'
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openComparison() {
    if (progressPhotos.length < 2) return
    setCompareIndexes([progressPhotos.length - 1, 0])
    setSliderValue(50)
    setShowCompare(true)
  }

  function exportAnalyticsCsv() {
    const dates = new Set<string>()
    weightHistoryFull.forEach(row => dates.add(row.date))
    weeklyCalories.forEach(row => dates.add(row.date))
    weeklyWater.forEach(row => dates.add(row.date))
    const weightMap = Object.fromEntries(weightHistoryFull.map(row => [row.date, row.poids]))
    const calorieMap = Object.fromEntries(weeklyCalories.map(row => [row.date, row]))
    const waterMap = Object.fromEntries(weeklyWater.map(row => [row.date, row.ml]))
    const rows = [...dates].sort().map(date => [
      date,
      weightMap[date] ?? null,
      calorieMap[date]?.calories ?? null,
      calorieMap[date]?.protein ?? null,
      calorieMap[date]?.carbs ?? null,
      calorieMap[date]?.fat ?? null,
      waterMap[date] ? Math.round((waterMap[date] / 1000) * 10) / 10 : null,
    ])
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    downloadCsv(`moovx_analytics_${today}.csv`, [tAnalytics('csvDate'), tAnalytics('csvWeight'), tAnalytics('csvCalories'), tAnalytics('csvProtein'), tAnalytics('csvCarbs'), tAnalytics('csvFat'), tAnalytics('csvWater')], rows)
  }

  function exportBodyXlsx() {
    const workbook = XLSX.utils.book_new()
    if (weightHistory30.length) {
      const rows = [['Date', 'Poids (kg)', 'Variation (kg)'], ...weightHistory30.map((weight, index) => [weight.date, weight.poids, index ? +(weight.poids - weightHistory30[index - 1].poids).toFixed(1) : ''])]
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Poids')
    }
    if (measurements.length) {
      const rows = [['Date', 'Taille (cm)', 'Hanches (cm)', 'Poitrine (cm)', 'Bras (cm)', 'Cuisses (cm)', '% Graisse', 'IMC'], ...measurements.map(measurement => {
        const height = profile?.height ? profile.height / 100 : 0
        const bmi = measurement.waist && height > 0 ? +(weightHistory30.find(weight => weight.date === measurement.date)?.poids || currentWeight || 0) / (height * height) : ''
        return [measurement.date, measurement.waist ?? '', measurement.hips ?? '', measurement.chest ?? '', measurement.biceps ?? '', measurement.thighs ?? '', '', typeof bmi === 'number' ? +bmi.toFixed(1) : '']
      })]
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Mensurations')
    }
    XLSX.writeFile(workbook, 'MoovX_Mes_Donnees.xlsx')
    toast.success(t('history.exports.done'))
  }

  const photoState = photoUrlState === 'error'
    ? 'error'
    : photoUrlState === 'loading'
      ? 'loading'
      : progressionModel.photos.state

  const beforePhoto = progressPhotos[compareIndexes[0]]
  const afterPhoto = progressPhotos[compareIndexes[1]]
  const beforeUrl = beforePhoto ? signedUrls[beforePhoto.id] ?? '' : ''
  const afterUrl = afterPhoto ? signedUrls[afterPhoto.id] ?? '' : ''

  async function handleAutoAlign() {
    if (!beforePhoto || !afterPhoto || !beforeUrl || !afterUrl) return
    setIsAligning(true)
    setAlignError(null)
    try {
      const result = await computeAlignment(beforeUrl, afterUrl)
      if (!result) {
        setAlignError(t('history.photos.alignError'))
        return
      }
      setAlignment(result)
      await supabase.from('progress_photos').update({ adjustments: result.after }).eq('id', afterPhoto.id)
    } catch {
      setAlignError(t('history.photos.alignError'))
    } finally {
      setIsAligning(false)
    }
  }

  return <div className={progressionV2Styles.page}>
    <ProgressionV2
      model={progressionModel}
      onPeriodChange={onProgressionPeriodChange}
      onAddWeight={() => setModal('weight')}
      onAddBodyMeasurement={() => setModal('measure')}
      activeSection={activeSection}
      onSectionNavigate={scrollToSection}
    >

    <section id="progression-v2-history" className={progressionV2Styles.historySection} aria-labelledby="progression-history-title">
      <div className={progressionV2Styles.sectionHeading}>
        <p className={progressionV2Styles.eyebrow}>{t('history.eyebrow')}</p>
        <h2 id="progression-history-title">{t('history.title')}</h2>
        <p>{t('history.subtitle')}</p>
      </div>

      <div className={progressionV2Styles.secondaryGrid}>
        <TransformationPhotos
          state={photoState}
          photos={progressPhotos}
          signedUrls={signedUrls}
          open={photosOpen}
          onToggle={() => setPhotosOpen(open => !open)}
          onAdd={() => photoRef.current?.click()}
          onCompare={openComparison}
        />
        <WellbeingCompact wellbeing={progressionModel.wellbeing} />
      </div>

      <section className={progressionV2Styles.secondaryCard} aria-labelledby="progression-advanced-title">
        <button type="button" className={progressionV2Styles.secondaryToggle} onClick={() => setAdvancedOpen(open => !open)} aria-expanded={advancedOpen} aria-controls="progression-advanced-content">
          <span><strong id="progression-advanced-title">{t('history.advanced.title')}</strong><small>{t('history.advanced.subtitle')}</small></span>
          <ChevronDown size={18} aria-hidden="true" data-open={advancedOpen} />
        </button>
        {advancedOpen && <div id="progression-advanced-content" className={progressionV2Styles.secondaryContent}><AnalyticsSection wSessions={wSessions} muscleMap={advancedMuscleMap} mappingState={advancedMappingState} /></div>}
      </section>

      <ProgressionExports onCsv={exportAnalyticsCsv} onXlsx={exportBodyXlsx} xlsxAvailable={Boolean(weightHistory30.length || measurements.length)} />
    </section>
    </ProgressionV2>

    {showCompare && beforePhoto && afterPhoto && <RailOverlay>
      <div className={progressionV2Styles.compareDialog} role="dialog" aria-modal="true" aria-labelledby="photo-compare-title" data-no-tab-swipe="true">
        <header className={progressionV2Styles.compareHeader}>
          <h2 id="photo-compare-title">{t('history.photos.comparisonTitle')}</h2>
          <div className={progressionV2Styles.compareActions}>
            <button type="button" className={progressionV2Styles.secondaryButton} onClick={handleAutoAlign} disabled={isAligning}><Sparkles size={15} aria-hidden="true" />{isAligning ? t('history.photos.aligning') : t('history.photos.align')}</button>
            <button type="button" className={progressionV2Styles.iconButton} onClick={() => setShowCompare(false)} aria-label={t('history.photos.close')}><X size={18} aria-hidden="true" /></button>
          </div>
        </header>
        {alignError && <p className={progressionV2Styles.errorNotice} role="status">{alignError}</p>}
        <div className={progressionV2Styles.compareSelectors}>
          {(['before', 'after'] as const).map((position, index) => <label key={position}>{t(`history.photos.${position}`)}
            <select value={compareIndexes[index]} onChange={event => {
              const next = [...compareIndexes] as [number, number]
              next[index] = Number(event.target.value)
              setCompareIndexes(next)
              setAlignment(null)
            }}>
              {progressPhotos.map((photo, photoIndex) => <option key={photo.id} value={photoIndex}>{photo.date ? format(new Date(photo.date), 'd MMM yyyy', { locale: dateLocale }) : t('history.photos.photoNumber', { number: photoIndex + 1 })}</option>)}
            </select>
          </label>)}
        </div>
        <div className={progressionV2Styles.compareCanvas}>
          <Image src={afterUrl} alt={t('history.photos.after')} fill sizes="100vw" unoptimized style={{ transform: alignment ? `scale(${alignment.after.zoom}) translate(${alignment.after.x}%, ${alignment.after.y}%)` : 'none' }} />
          <Image src={beforeUrl} alt={t('history.photos.before')} fill sizes="100vw" unoptimized style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }} />
          <span className={progressionV2Styles.compareDivider} style={{ left: `${sliderValue}%` }} aria-hidden="true" />
          <input type="range" min={0} max={100} value={sliderValue} onChange={event => setSliderValue(Number(event.target.value))} aria-label={t('history.photos.sliderLabel')} />
        </div>
      </div>
    </RailOverlay>}

    <input ref={photoRef} type="file" accept="image/*" hidden onChange={uploadProgressPhoto} disabled={photoUploading} />
  </div>
}
