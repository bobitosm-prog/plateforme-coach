'use client'
import React, { useState, useMemo, useEffect } from 'react'
import { RailOverlay } from '../ui/RailOverlay'
import { format } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale/fr'
import { enUS } from 'date-fns/locale/en-US'
import { de as deLocale } from 'date-fns/locale/de'
import type { Locale } from 'date-fns'
import { useTranslations, useLocale } from 'next-intl'
import { Camera, Plus, Trash2, X, Download, BarChart3, Sparkles, Send, ChevronRight, Star, Trophy, Info, Clock, User } from 'lucide-react'
import { downloadCsv } from '../../../lib/exportCsv'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import {
  colors, fonts,
  titleStyle, subtitleStyle, statStyle, statSmallStyle, bodyStyle, labelStyle, mutedStyle, cardStyle,
  radii,
} from '../../../lib/design-tokens'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { useHasSize, SizedContainer } from '../ui/SizedChart'
import AnalyticsSection from '../AnalyticsSection'
import AbsCalculator from '../progress/AbsCalculator'
import BodyAssessment from '../progress/BodyAssessment'
import AnalysisDisplay from './progress/AnalysisDisplay'
import ActionBtn from './progress/ActionBtn'
import { computeAlignment, type Alignment } from '../../../lib/photo-align'
import SectionTitle from '../ui/SectionTitle'
import { getExerciseName } from '../../../lib/i18n-exercise'
import { addProgressionDays } from '../../../lib/progression/progression-date'
import type { ProgressionWellbeingEntry } from '../../hooks/useAnalytics'
import ProgressionV2 from '../progression-v2/ProgressionV2'
import progressionV2Styles from '../progression-v2/ProgressionV2.module.css'
import type {
  ProgressionPeriod,
  ProgressionViewModel,
} from '../../../lib/progression/progression-dashboard-model'

type PillSection = 'poids' | 'records' | 'photos' | 'mensurations' | 'bienetre' | 'graphiques'

interface ProgressTabProps {
  supabase: any
  session: any
  weightHistory30: { date: string; poids: number }[]
  measurements: any[]
  progressPhotos: any[]
  photoRef: React.RefObject<HTMLInputElement | null>
  photoUploading: boolean
  uploadProgressPhoto: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  deletePhoto: (photo: any) => Promise<void>
  setModal: (modal: string) => void
  onRefresh: () => void
  profile: any
  coachId: string | null
  // Analytics
  personalRecords: any[]
  weeklyCalories: { date: string; calories: number; protein: number; carbs: number; fat: number }[]
  weeklyWater: { date: string; ml: number }[]
  weeklyVolume: { week: string; volume: number }[]
  weightHistoryFull: { date: string; poids: number }[]
  wSessions: any[]
  calorieGoal: number
  goalWeight: number | null
  waterGoal: number
  streak: number
  currentWeight: number | undefined
  wellbeingEntries: ProgressionWellbeingEntry[]
  progressionModel: ProgressionViewModel
  onProgressionPeriodChange: (period: ProgressionPeriod) => void
}

export default function ProgressTab({
  supabase, session, weightHistory30, measurements, progressPhotos,
  photoRef, photoUploading, uploadProgressPhoto, deletePhoto,
  setModal, onRefresh,
  profile, coachId,
  personalRecords, weeklyCalories, weeklyWater, weeklyVolume,
  weightHistoryFull, wSessions, calorieGoal, goalWeight, waterGoal,
  streak, currentWeight,
  wellbeingEntries,
  progressionModel, onProgressionPeriodChange,
}: ProgressTabProps) {
  const { rootRef, hasSize } = useHasSize()
  const t = useTranslations('progress')
  const locale = useLocale()
  const DATE_LOCALES: Record<string, Locale> = { fr: frLocale, en: enUS, de: deLocale }
  const dateLocale = DATE_LOCALES[locale] || frLocale
  const [activePill, setActivePill] = useState<PillSection>('poids')
  const sectionRefs = { poids: React.useRef<HTMLDivElement>(null), records: React.useRef<HTMLDivElement>(null), photos: React.useRef<HTMLDivElement>(null), mensurations: React.useRef<HTMLDivElement>(null), bienetre: React.useRef<HTMLDivElement>(null), graphiques: React.useRef<HTMLDivElement>(null) }
  const [recordsLimit, setRecordsLimit] = useState(10)
  const [showAssessment, setShowAssessment] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [compareIdx, setCompareIdx] = useState<[number, number]>([0, 0])
  const [sliderValue, setSliderValue] = useState(50)
  const [alignment, setAlignment] = useState<{ before: Alignment; after: Alignment } | null>(null)
  const [isAligning, setIsAligning] = useState(false)
  const [alignError, setAlignError] = useState<string | null>(null)
  const [checkinPeriod, setCheckinPeriod] = useState(7)
  const [todayDateKey] = useState(() => new Date().toISOString().split('T')[0])
  const checkinData = useMemo(() => {
    const cutoff = addProgressionDays(todayDateKey, -checkinPeriod)
    return wellbeingEntries.filter(entry => entry.date >= cutoff)
  }, [checkinPeriod, todayDateKey, wellbeingEntries])
  const displayWeights = weightHistory30

  // AI Analysis
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<Record<string, string>>({})
  const [sharingId, setSharingId] = useState<string | null>(null)

  // Body AI analysis
  const [bodyAnalysis, setBodyAnalysis] = useState<any>(null)
  const [bodyAnalysisLoading, setBodyAnalysisLoading] = useState(false)
  const [bodyAnalysisStep, setBodyAnalysisStep] = useState(0)
  const [bodyUploadPhotos, setBodyUploadPhotos] = useState<{ front?: string; back?: string; side?: string }>({})
  const [showBodyUpload, setShowBodyUpload] = useState(false)
  const bodyUploadRef = React.useRef<HTMLInputElement>(null)
  const [bodyUploadTarget, setBodyUploadTarget] = useState<'front' | 'back' | 'side'>('front')

  // Fetch latest body analysis
  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('body_analyses').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1)
      .then(({ data }: any) => { if (data?.[0]) setBodyAnalysis(data[0]) })
  }, [session?.user?.id])

  const ANALYSIS_STEPS = [t('tab.analysisStep0'), t('tab.analysisStep1'), t('tab.analysisStep2'), t('tab.analysisStep3')]
  useEffect(() => {
    if (!bodyAnalysisLoading) return
    const interval = setInterval(() => setBodyAnalysisStep(s => (s + 1) % ANALYSIS_STEPS.length), 2500)
    return () => clearInterval(interval)
  }, [bodyAnalysisLoading])

  async function handleBodyUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session?.user?.id) return
    const path = `${session.user.id}/body-${bodyUploadTarget}-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('progress-photos').upload(path, file)
    if (error) { toast.error(t('tab.uploadError')); return }
    const { data: urlData } = await supabase.storage.from('progress-photos').createSignedUrl(path, 3600)
    if (urlData?.signedUrl) {
      setBodyUploadPhotos(prev => ({ ...prev, [bodyUploadTarget]: urlData.signedUrl }))
      // Auto-advance to next missing photo
      if (bodyUploadTarget === 'front') setBodyUploadTarget('back')
      else if (bodyUploadTarget === 'back') setBodyUploadTarget('side')
    }
    e.target.value = ''
  }

  async function runBodyAnalysis() {
    const { front, back, side } = bodyUploadPhotos
    if (!front || !back || !side || !session?.user?.id) return

    // 1h cooldown check
    if (bodyAnalysis?.created_at) {
      const lastTime = new Date(bodyAnalysis.created_at).getTime()
      const diff = Date.now() - lastTime
      if (diff < 3600000) {
        const mins = Math.ceil((3600000 - diff) / 60000)
        toast.error(t('tab.analysisLimitMin', { mins }))
        return
      }
    }

    setBodyAnalysisLoading(true)
    setBodyAnalysisStep(0)
    try {
      // Retry with exponential backoff
      let data: any = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch('/api/analyze-body', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoFrontUrl: front, photoBackUrl: back, photoSideUrl: side, weight: currentWeight || profile?.current_weight, height: profile?.height }),
        })
        data = await res.json()
        if (res.status === 429 && attempt < 2) {
          await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt)))
          continue
        }
        break
      }
      if (data?.error) throw new Error(data.error)
      const row = { user_id: session.user.id, body_fat_estimate: data.body_fat_estimate, lean_mass_estimate: data.lean_mass_estimate, strengths: data.strengths, improvements: data.improvements, symmetry_score: data.symmetry_score, summary: data.summary, photos_used: 3 }
      await supabase.from('body_analyses').insert(row)
      setBodyAnalysis({ ...row, created_at: new Date().toISOString() })
      setShowBodyUpload(false)
      setBodyUploadPhotos({})
      toast.success(t('tab.analysisDone'))
    } catch (e: any) {
      const msg = e.message?.includes('requêtes') || e.message?.includes('429')
        ? 'L\'analyse est temporairement indisponible. Réessaye dans quelques minutes.'
        : (e.message || t('tab.analysisError'))
      toast.error(msg)
    } finally {
      setBodyAnalysisLoading(false)
    }
  }

  // Signed URLs for private bucket
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const photoIds = useMemo(
    () => progressPhotos.map((p: any) => p.id).join(','),
    [progressPhotos]
  )
  useEffect(() => {
    if (activePill !== 'photos' || !progressPhotos.length) return
    let cancelled = false
    async function generateUrls() {
      const urls: Record<string, string> = {}
      for (const photo of progressPhotos) {
        if (cancelled) return
        const { data } = await supabase.storage.from('progress-photos').createSignedUrl(photo.photo_url, 3600)
        if (data?.signedUrl) urls[photo.id] = data.signedUrl
      }
      if (!cancelled) setSignedUrls(prev => {
        const isSame = JSON.stringify(prev) === JSON.stringify(urls)
        return isSame ? prev : urls
      })
    }
    generateUrls()
    return () => { cancelled = true }
  }, [activePill, photoIds, progressPhotos, supabase])

  // Load cached analyses from progressPhotos
  React.useEffect(() => {
    const cached: Record<string, string> = {}
    progressPhotos.forEach((p: any) => { if (p.ai_analysis) cached[p.id] = p.ai_analysis })
    setAnalyses(prev => ({ ...prev, ...cached }))
  }, [progressPhotos])

  async function analyzePhoto(photo: any, index: number) {
    if (analyzingId) return
    // Check if already analyzed
    if (analyses[photo.id]) { setExpandedAnalysis(expandedAnalysis === photo.id ? null : photo.id); return }

    setAnalyzingId(photo.id)
    setExpandedAnalysis(photo.id)
    try {
      // Use signed URLs for private bucket
      const photoUrl = signedUrls[photo.id]
      if (!photoUrl) { toast.error(t('tab.photoUrlError')); setExpandedAnalysis(null); setAnalyzingId(null); return }
      const prevPhoto = progressPhotos[index + 1]
      const previousPhotoUrl = prevPhoto ? signedUrls[prevPhoto.id] : undefined

      // Compute weight trend from 30-day history
      const w30 = weightHistory30 || []
      let weightTrend = 'stable'
      let weightDelta30d = 0
      if (w30.length >= 2) {
        weightDelta30d = Math.round((w30[w30.length - 1].poids - w30[0].poids) * 10) / 10
        weightTrend = weightDelta30d > 0.5 ? 'gaining' : weightDelta30d < -0.5 ? 'losing' : 'stable'
      }
      // Latest waist measurement
      const latestM = measurements?.[0]
      // Previous analysis for coherence
      const prevAnalyzedPhoto = progressPhotos.find((pp: any, i: number) => i > index && analyses[pp.id])
      const lastAnalysis = prevAnalyzedPhoto ? analyses[prevAnalyzedPhoto.id] : undefined

      const res = await fetch('/api/analyze-progress-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl,
          profileData: profile ? {
            full_name: profile.full_name, current_weight: profile.current_weight,
            target_weight: profile.target_weight, gender: profile.gender,
            height: profile.height, objective: profile.objective,
            fitness_score: profile.fitness_score, fitness_level: profile.fitness_level,
            calorie_goal: profile.calorie_goal, tdee: profile.tdee,
            protein_goal: profile.protein_goal, carbs_goal: profile.carbs_goal,
            fat_goal: profile.fat_goal, activity_level: profile.activity_level,
            body_fat: profile.body_fat_pct || null,
            waist: latestM?.waist || null,
            weight_trend: weightTrend,
            weight_delta_30d: weightDelta30d,
            last_analysis: lastAnalysis,
          } : {},
          previousPhotoUrl,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setAnalyses(prev => ({ ...prev, [photo.id]: data.analysis }))

      // Save to DB
      await supabase.from('progress_photos').update({ ai_analysis: data.analysis, ai_analyzed_at: new Date().toISOString() }).eq('id', photo.id)
    } catch (e: any) {
      toast.error(e.message || t('tab.analysisError'))
      setExpandedAnalysis(null)
    } finally {
      setAnalyzingId(null)
    }
  }

  async function shareAnalysis(photoId: string) {
    if (!coachId || !session?.user?.id || sharingId) return
    setSharingId(photoId)
    const text = `📸 Analyse IA de ma photo de progression :\n\n${analyses[photoId]}`
    const { error } = await supabase.from('messages').insert({ sender_id: session.user.id, receiver_id: coachId, content: text })
    if (error) toast.error(t('tab.shareError'))
    else toast.success(t('tab.sharedWithCoach'))
    setSharingId(null)
  }

  // Total volume in tonnes
  const groupedRecords = useMemo(() => {
    const priorityExercises = ['developpe couche', 'bench press', 'squat', 'deadlift', 'souleve de terre', 'overhead press', 'developpe militaire', 'rowing', 'barbell row']
    const byExercise: Record<string, { name: string; maxWeight: number | null; oneRm: number | null; date: string; unit: string }> = {}
    for (const pr of personalRecords) {
      const key = pr.exercise_name
      if (!byExercise[key]) byExercise[key] = { name: key, maxWeight: null, oneRm: null, date: pr.achieved_at, unit: pr.unit || 'kg' }
      if (pr.record_type === 'max_weight') byExercise[key].maxWeight = pr.value
      if (pr.record_type === '1rm') byExercise[key].oneRm = pr.value
      if (pr.achieved_at > byExercise[key].date) byExercise[key].date = pr.achieved_at
    }
    return Object.values(byExercise).sort((a, b) => {
      const aP = priorityExercises.findIndex(e => a.name.toLowerCase().includes(e))
      const bP = priorityExercises.findIndex(e => b.name.toLowerCase().includes(e))
      if (aP !== -1 && bP === -1) return -1
      if (aP === -1 && bP !== -1) return 1
      if (aP !== -1 && bP !== -1) return aP - bP
      return (b.maxWeight ?? b.oneRm ?? 0) - (a.maxWeight ?? a.oneRm ?? 0)
    })
  }, [personalRecords])

  // Scroll to section on pill tap
  function scrollToSection(section: PillSection) {
    setActivePill(section)
    if (section === 'poids') {
      document.getElementById('progression-v2-weight')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (section === 'mensurations') {
      document.getElementById('progression-v2-measurements')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    sectionRefs[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div ref={rootRef} className={progressionV2Styles.page}>
      <ProgressionV2
        model={progressionModel}
        onPeriodChange={onProgressionPeriodChange}
        onAddWeight={() => setModal('weight')}
        onAddBodyMeasurement={() => setModal('measure')}
      />

      {/* ═══ SECTION 3 — PILLS NAVIGATION ═══ */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 8 }}>
        {([
          { id: 'poids' as PillSection, label: t('pills.poids') },
          { id: 'records' as PillSection, label: t('pills.records') },
          { id: 'photos' as PillSection, label: t('pills.photos') },
          { id: 'mensurations' as PillSection, label: t('pills.mensurations') },
          { id: 'bienetre' as PillSection, label: t('pills.bienetre') },
          { id: 'graphiques' as PillSection, label: t('pills.graphiques') },
        ]).map(({ id, label }) => {
          const active = activePill === id
          return (
            <button key={id} onClick={() => scrollToSection(id)} style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
              fontFamily: fonts.headline, fontSize: 9, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              background: active ? colors.goldBorder : 'transparent',
              border: `1px solid ${active ? `${colors.gold}66` : colors.goldBorder}`,
              color: active ? colors.gold : 'rgba(255,255,255,0.4)', transition: 'all 150ms',
            }}>
              {label}
            </button>
          )
        })}
      </div>
      {/* ═══ SECTION 5 — RECORDS PERSONNELS ═══ */}
      <div ref={sectionRefs.records} style={{ scrollMarginTop: 20 }}>
        <SectionTitle noPadding title={t('tab.personalRecords')} trailing={t('weight.prCount', { count: groupedRecords.length })} />
        <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[10, 50, 100].map(n => (
              <button key={n} onClick={() => setRecordsLimit(n)} style={{ padding: '5px 14px', borderRadius: 20, border: recordsLimit === n ? `1px solid ${colors.gold}` : `1px solid ${colors.goldDim}`, background: recordsLimit === n ? colors.goldDim : 'transparent', color: recordsLimit === n ? colors.gold : colors.textMuted, fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{n}</button>
            ))}
          </div>
          {groupedRecords.length > 0 ? groupedRecords.slice(0, recordsLimit).map((r, i) => {
            const principal = r.maxWeight ?? r.oneRm
            return (
              <div key={r.name + i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < Math.min(groupedRecords.length, recordsLimit) - 1 ? `0.5px solid ${colors.goldDim}` : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trophy size={14} color={colors.gold} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getExerciseName({ name: r.name }, locale as 'fr' | 'en' | 'de')}</div>
                  <div style={{ ...mutedStyle, fontSize: 9 }}>{r.date ? format(new Date(r.date), 'd MMM yyyy', { locale: dateLocale }) : ''}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 700, color: colors.gold }}>{principal}</span>
                  <span style={{ ...mutedStyle, fontSize: 9, marginLeft: 2 }}>{r.unit}</span>
                  {r.oneRm && r.maxWeight ? <div style={{ ...mutedStyle, fontSize: 9, marginTop: 1 }}>{t('analytics.estimated1rmValue', { value: r.oneRm, unit: r.unit })}</div> : null}
                </div>
              </div>
            )
          }) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Star size={28} color={colors.textDim} style={{ marginBottom: 6 }} />
              <p style={{ ...mutedStyle, fontSize: 12, margin: 0 }}>{t('tab.firstRecord')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTION 6 — TRANSFORMATION (Photos) ═══ */}
      {showAssessment && (
        <BodyAssessment supabase={supabase} session={session} profile={profile} onClose={() => setShowAssessment(false)} onRefresh={onRefresh} />
      )}
      <div ref={sectionRefs.photos} style={{ scrollMarginTop: 20 }}>
        <SectionTitle noPadding title={t('tab.transformation')} trailing="PHOTOS" />
        <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
          {progressPhotos.length >= 2 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[progressPhotos[progressPhotos.length - 1], progressPhotos[0]].map((p, i) => {
                const url = p ? signedUrls[p.id] : ''
                const label = i === 0 ? 'AVANT' : 'APRÈS'
                return (
                  <div key={i} style={{ aspectRatio: '3/4', borderRadius: radii.card, overflow: 'hidden', position: 'relative', border: `1px solid ${colors.goldBorder}`, background: colors.background }}>
                    {url ? <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={label} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={24} color={colors.textMuted} /></div>}
                    <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '2px 8px', borderRadius: 4, background: i === 0 ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)', fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>{label}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {['AVANT', 'APRÈS'].map(label => (
                <div key={label} onClick={() => photoRef.current?.click()} style={{ aspectRatio: '3/4', borderRadius: radii.card, border: `2px dashed ${colors.goldBorder}`, background: colors.goldDim, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                  <Camera size={20} color={colors.textDim} />
                  <span style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textDim, letterSpacing: '0.1em' }}>{label}</span>
                </div>
              ))}
            </div>
          )}
          {progressPhotos.length >= 2 && (
            <button onClick={() => { setCompareIdx([progressPhotos.length - 1, 0]); setSliderValue(50); setShowCompare(true) }}
              style={{ width: '100%', padding: 10, borderRadius: radii.button, border: `1px solid ${colors.goldRule}`, background: colors.goldDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: colors.gold, letterSpacing: '0.08em' }}>COMPARER AVANT / APRÈS</span>
            </button>
          )}
        </div>
        <button onClick={() => photoRef.current?.click()} style={{ ...cardStyle, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, width: '100%', cursor: 'pointer', border: `1px solid ${colors.goldBorder}`, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Camera size={20} color={colors.gold} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: colors.text }}>{t('photos.addPhoto')}</div>
            <div style={{ ...mutedStyle, fontSize: 10 }}>{t('tab.photoProgress')}</div>
          </div>
          <ChevronRight size={16} color={colors.textDim} />
        </button>
      </div>

      {/* ═══ SECTION 6.5 — ANALYSE IA ═══ */}
      <div style={{ scrollMarginTop: 20 }}>
        <SectionTitle
          noPadding
          title={t('tab.aiSection')}
          trailingNode={
            <span style={{ fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, background: `${colors.goldContainer}1a`, border: `1px solid ${colors.goldRule}`, borderRadius: 999, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={8} /> BETA
            </span>
          }
        />
        <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={18} color={colors.gold} />
            </div>
            <div>
              <div style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: colors.text }}>{t('tab.aiAnalysis')}</div>
              <div style={{ ...mutedStyle, fontSize: 10 }}>{t('tab.aiAnalysisDesc')}</div>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{ background: `${colors.goldContainer}0a`, border: `0.5px solid ${colors.goldContainer}1a`, borderRadius: 12, padding: 12, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Info size={14} color={colors.gold} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
              Cette analyse est une estimation par intelligence artificielle. Elle peut contenir des erreurs. Rien ne remplace l&apos;avis d&apos;un professionnel qualifié.
            </span>
          </div>

          {/* Loading state */}
          {bodyAnalysisLoading && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 24, height: 24, border: `2px solid ${colors.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
              <div style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 600, color: colors.gold }}>{ANALYSIS_STEPS[bodyAnalysisStep]}</div>
            </div>
          )}

          {/* Results */}
          {!bodyAnalysisLoading && bodyAnalysis && (
            <>
              {/* Estimated values */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: colors.goldDim, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 4 }}>MASSE GRASSE</div>
                  <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 800, color: colors.gold }}>~{bodyAnalysis.body_fat_estimate}%</div>
                  <div style={{ ...mutedStyle, fontSize: 9 }}>{t('tab.aiEstimate')}</div>
                </div>
                <div style={{ background: colors.goldDim, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 4 }}>MASSE MAIGRE</div>
                  <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 800, color: colors.gold }}>~{Math.round(bodyAnalysis.lean_mass_estimate)} KG</div>
                  <div style={{ ...mutedStyle, fontSize: 9 }}>{t('tab.aiEstimate')}</div>
                </div>
              </div>

              {/* Strengths */}
              {bodyAnalysis.strengths?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>POINTS FORTS</div>
                  {bodyAnalysis.strengths.map((s: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.success, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Improvements */}
              {bodyAnalysis.improvements?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>AXES D&apos;AMÉLIORATION</div>
                  {bodyAnalysis.improvements.map((s: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.gold, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Symmetry */}
              {bodyAnalysis.symmetry_score != null && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>SYMÉTRIE CORPORELLE</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: `${colors.gold}1a`, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${bodyAnalysis.symmetry_score}%`, height: '100%', background: colors.gold, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: colors.gold }}>{bodyAnalysis.symmetry_score}%</span>
                  </div>
                  <div style={{ ...mutedStyle, fontSize: 9, marginTop: 4 }}>{t('tab.symmetryScore')}</div>
                </div>
              )}

              {/* Footer */}
              <div style={{ background: `${colors.gold}0a`, border: `1px solid ${colors.gold}1a`, borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={12} color='rgba(255,255,255,0.25)' />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
                  Dernière analyse : {bodyAnalysis.created_at ? format(new Date(bodyAnalysis.created_at), 'd MMM yyyy', { locale: dateLocale }) : '—'} — Basée sur {bodyAnalysis.photos_used || 3} photos
                </span>
              </div>
            </>
          )}

          {/* Empty state */}
          {!bodyAnalysisLoading && !bodyAnalysis && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <User size={28} color={colors.textDim} style={{ marginBottom: 6 }} />
              <p style={{ ...mutedStyle, fontSize: 12, margin: '0 0 4px' }}>{t('photos.noAnalysis')}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: 0 }}>{t('tab.upload3Photos')}</p>
            </div>
          )}
        </div>

        {/* Upload modal — centered */}
        {showBodyUpload && (<RailOverlay>
          <div onClick={() => { if (!bodyAnalysisLoading) { setShowBodyUpload(false); setBodyUploadPhotos({}) } }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
              {/* a) Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={titleStyle}>{t('photos.analysisPhotos')}</span>
                <button onClick={() => { setShowBodyUpload(false); setBodyUploadPhotos({}) }} style={{ width: 32, height: 32, background: colors.surfaceHigh, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={colors.textMuted} /></button>
              </div>
              {/* b) 3 photo zones */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {(['front', 'back', 'side'] as const).map(angle => {
                  const url = bodyUploadPhotos[angle]
                  const labels = { front: 'FACE', back: 'DOS', side: 'PROFIL' }
                  return (
                    <div key={angle} onClick={() => { setBodyUploadTarget(angle); bodyUploadRef.current?.click() }}
                      style={{ aspectRatio: '3/4', maxHeight: 140, borderRadius: radii.button, overflow: 'hidden', border: url ? `2px solid ${colors.goldRule}` : `2px dashed ${colors.goldBorder}`, background: url ? colors.surface : colors.goldDim, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', position: 'relative' }}>
                      {url ? <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} alt={labels[angle]} /> : (
                        <>
                          <Camera size={16} color={colors.textDim} />
                          <span style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textDim, letterSpacing: '0.1em' }}>{labels[angle]}</span>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              <input ref={bodyUploadRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBodyUpload} />
              {/* c) Analyze button */}
              {(() => {
                const ready = !!(bodyUploadPhotos.front && bodyUploadPhotos.back && bodyUploadPhotos.side)
                return (
                  <button onClick={runBodyAnalysis} disabled={!ready || bodyAnalysisLoading}
                    style={{ width: '100%', padding: 14, borderRadius: radii.button, border: 'none', cursor: ready && !bodyAnalysisLoading ? 'pointer' : 'default', background: ready ? colors.gold : colors.surfaceHigh, color: ready ? colors.onGold : colors.textMuted, fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, opacity: ready && !bodyAnalysisLoading ? 1 : 0.5 }}>
                    {bodyAnalysisLoading ? t('tab.analyzing') : t('tab.launchAi')}
                  </button>
                )
              })()}
              {/* d) Disclaimer */}
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: '12px 0 0' }}>{t('tab.aiDisclaimer')}</p>
            </div>
          </div>
        </RailOverlay>)}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <button onClick={() => setShowBodyUpload(true)} style={{ flex: 1, background: `linear-gradient(135deg, ${colors.goldBorder}, ${colors.goldDim})`, border: `1px solid ${colors.goldRule}`, borderRadius: 14, padding: 14, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Camera size={14} color={colors.gold} />
              <span style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: colors.gold, letterSpacing: '0.08em' }}>{t('tab.newAnalysis')}</span>
            </div>
            <div style={{ ...mutedStyle, fontSize: 8 }}>{t('tab.upload3Short')}</div>
          </button>
          <button onClick={() => setModal('messages')} style={{ ...cardStyle, flex: 1, borderRadius: 14, padding: 14, cursor: 'pointer', textAlign: 'left', border: `1px solid ${colors.goldBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Send size={14} color='rgba(255,255,255,0.4)' />
              <span style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>{t('tab.seePro')}</span>
            </div>
            <div style={{ ...mutedStyle, fontSize: 8 }}>{t('tab.contactCoach')}</div>
          </button>
        </div>
      </div>

      {/* ═══ SECTION 7.5 — MON BIEN-ÊTRE ═══ */}
      <div ref={sectionRefs.bienetre} style={{ scrollMarginTop: 20, marginTop: 24 }}>
        <SectionTitle noPadding title={t('tab.myWellness')} />
        {/* Period selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[{ v: 7, l: '7J' }, { v: 30, l: '30J' }, { v: 90, l: '90J' }].map(p => (
            <button key={p.v} onClick={() => setCheckinPeriod(p.v)} style={{
              padding: '5px 14px', borderRadius: 999, cursor: 'pointer',
              fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
              background: checkinPeriod === p.v ? colors.goldBorder : 'transparent',
              border: `1px solid ${checkinPeriod === p.v ? `${colors.gold}66` : colors.goldBorder}`,
              color: checkinPeriod === p.v ? colors.gold : 'rgba(255,255,255,0.4)',
            }}>{p.l}</button>
          ))}
        </div>

        {(() => {
          const moodScores: Record<string, number> = { fatigue: 1, normal: 2, bien: 3, top: 4, energie: 5 }
          const moodEmojis: Record<string, string> = { fatigue: '😴', normal: '😐', bien: '💪', top: '🔥', energie: '⚡' }
          const moodScore = (m: string) => moodScores[m] || null
          const moodEmoji = (m: string) => moodEmojis[m] || '—'
          // Prepare chart data with all days filled
          const chartData: any[] = []
          for (let i = checkinPeriod - 1; i >= 0; i--) {
            const ds = addProgressionDays(todayDateKey, -i)
            const displayDate = new Date(`${ds}T12:00:00`)
            const c = checkinData.find(entry => entry.date === ds)
            chartData.push({ date: ds, day: displayDate.toLocaleDateString(locale === 'de' ? 'de-CH' : locale === 'en' ? 'en-US' : 'fr-CH', { weekday: 'short' }), mood: c?.mood ? moodScore(c.mood) : null, sleep: c?.sleep_hours || null, note: c?.note })
          }
          // Stats
          const moods = checkinData.flatMap(entry => entry.mood ? [moodScore(entry.mood)] : []).filter((score): score is number => score != null)
          const sleeps = checkinData.flatMap(entry => entry.sleep_hours ? [entry.sleep_hours] : [])
          const moodAvg = moods.length ? (moods.reduce((a: number, b: number) => a + b, 0) / moods.length).toFixed(1) : '—'
          const sleepAvg = sleeps.length ? (sleeps.reduce((a: number, b: number) => a + b, 0) / sleeps.length).toFixed(1) : '—'
          // Most frequent mood
          const moodCounts: Record<string, number> = {}
          checkinData.forEach((c: any) => { if (c.mood) moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1 })
          const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
          // Tooltip
          const ChartTip = ({ active, payload, label }: any) => {
            if (!active || !payload?.length) return null
            return (<div style={{ background: colors.surface, border: `1px solid ${colors.gold}`, borderRadius: 8, padding: '6px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted }}>{label}</div>
              {payload.map((p: any, i: number) => <div key={i} style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 700, color: p.color }}>{p.name}: {p.value ?? '—'}</div>)}
            </div>)
          }

          return checkinData.length === 0 ? (
            <div style={{ ...cardStyle, padding: 32, textAlign: 'center' }}>
              <p style={{ ...bodyStyle, color: colors.textDim }}>{t('wellness.noCheckins')}</p>
              <p style={{ ...mutedStyle, marginTop: 4 }}>{t('tab.checkinHint')}</p>
            </div>
          ) : (
            <>
              {/* Mood chart */}
              <div style={{ ...cardStyle, padding: 20, marginBottom: 12 }}>
                <div style={{ fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, color: colors.gold, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>{t('tab.mood')}</div>
                <SizedContainer hasSize={hasSize} height={160}>
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colors.gold} stopOpacity={0.25} /><stop offset="100%" stopColor={colors.gold} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" tick={{ fill: colors.textDim, fontSize: 9, fontFamily: fonts.body }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: colors.textDim, fontSize: 9, fontFamily: fonts.body }} axisLine={false} tickLine={false} width={20} tickFormatter={(v: number) => ['', '😴', '😐', '💪', '🔥', '⚡'][v] || ''} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="mood" name={t('tab.moodChart')} stroke={colors.gold} strokeWidth={2.5} fill="url(#moodGrad)" dot={{ fill: colors.gold, r: 4, strokeWidth: 0 }} connectNulls />
                  </AreaChart>
                </SizedContainer>
              </div>

              {/* Sleep chart */}
              <div style={{ ...cardStyle, padding: 20, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, color: colors.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t('tab.sleep')}</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted }}>{t('tab.sleepAvg', { avg: sleepAvg })}</span>
                </div>
                <SizedContainer hasSize={hasSize} height={140}>
                  <BarChart data={chartData} barSize={checkinPeriod <= 7 ? 20 : checkinPeriod <= 30 ? 8 : 4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" tick={{ fill: colors.textDim, fontSize: 9, fontFamily: fonts.body }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 12]} tick={{ fill: colors.textDim, fontSize: 9, fontFamily: fonts.body }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip content={<ChartTip />} />
                    <ReferenceLine y={8} stroke={colors.gold} strokeDasharray="6 4" strokeWidth={1} />
                    <Bar dataKey="sleep" name={t('tab.sleepChart')} fill={colors.gold} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </SizedContainer>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: t('tab.avgMood'), value: `${moodAvg}/5`, icon: moodEmoji(topMood) },
                  { label: t('tab.avgSleep'), value: `${sleepAvg}h / 8h`, icon: '🌙' },
                  { label: t('tab.topMood'), value: topMood, icon: moodEmoji(topMood) },
                  { label: t('tab.checkins'), value: `${checkinData.length}`, icon: '✓' },
                ].map(s => (
                  <div key={s.label} style={{ ...cardStyle, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: colors.goldDim, border: `1px solid ${colors.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontFamily: fonts.headline, fontSize: 14, fontWeight: 700, color: colors.text }}>{s.value}</div>
                      <div style={{ fontFamily: fonts.body, fontSize: 8, color: colors.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        })()}
      </div>

      {/* ═══ SECTION 8 — GRAPHIQUES ═══ */}
      <div ref={sectionRefs.graphiques} style={{ scrollMarginTop: 20, marginTop: 24 }}>
        <SectionTitle noPadding title={t('tab.charts')} />
        <AnalyticsSection
          personalRecords={personalRecords}
          weeklyCalories={weeklyCalories}
          weeklyWater={weeklyWater}
          weeklyVolume={weeklyVolume}
          weightHistoryFull={weightHistoryFull}
          weightHistory30={weightHistory30}
          wSessions={wSessions}
          calorieGoal={calorieGoal}
          goalWeight={goalWeight}
          waterGoal={waterGoal}
          streak={streak}
          currentWeight={currentWeight}
          showWeightChart={false}
        />
      </div>

      {/* ═══ SECTION 9 — EXPORT ═══ */}
      {(displayWeights.length > 0 || measurements.length > 0) && (
        <button onClick={() => {
          const wb = XLSX.utils.book_new()
          if (displayWeights.length > 0) {
            const wsData = [['Date', 'Poids (kg)', 'Variation (kg)'], ...displayWeights.map((w, i) => [w.date, w.poids, i > 0 ? +(w.poids - displayWeights[i-1].poids).toFixed(1) : ''])]
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), 'Poids')
          }
          if (measurements.length > 0) {
            const msData = [['Date', 'Taille (cm)', 'Hanches (cm)', 'Poitrine (cm)', 'Bras (cm)', 'Cuisses (cm)', '% Graisse', 'IMC'],
              ...measurements.map((m: any) => {
                const h = profile?.height ? profile.height / 100 : 0
                const imc = m.waist && h > 0 ? +(displayWeights.find(w => w.date === m.date)?.poids || currentWeight || 0) / (h * h) : ''
                return [m.date, m.waist ?? '', m.hips ?? '', m.chest ?? '', m.biceps ?? '', m.thighs ?? '', '', typeof imc === 'number' ? +imc.toFixed(1) : '']
              })
            ]
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(msData), 'Mensurations')
          }
          XLSX.writeFile(wb, 'MoovX_Mes_Donnees.xlsx')
          toast.success(t('tab.exportDone'))
        }} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: 14, borderRadius: radii.button,
          background: 'transparent', border: `1px solid ${colors.goldBorder}`,
          color: colors.textMuted, fontFamily: fonts.headline, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const,
        }}>
          <Download size={14} /> {t('tab.exportData')}
        </button>
      )}

      {/* ═══ PHOTO COMPARE MODAL ═══ */}
      {showCompare && progressPhotos.length >= 2 && (() => {
        const beforePhoto = progressPhotos[compareIdx[0]]
        const afterPhoto = progressPhotos[compareIdx[1]]
        if (!beforePhoto || !afterPhoto) return null
        const beforeUrl = signedUrls[beforePhoto.id] || ''
        const afterUrl = signedUrls[afterPhoto.id] || ''
        const beforeDate = beforePhoto.date ? format(new Date(beforePhoto.date), 'd MMM yyyy', { locale: dateLocale }) : ''
        const afterDate = afterPhoto.date ? format(new Date(afterPhoto.date), 'd MMM yyyy', { locale: dateLocale }) : ''
        const afterTransform = alignment
          ? `scale(${alignment.after.zoom}) translate(${alignment.after.x}%, ${alignment.after.y}%)`
          : 'none'
        const handleAutoAlign = async () => {
          if (!beforeUrl || !afterUrl) return
          setIsAligning(true); setAlignError(null)
          try {
            const result = await computeAlignment(beforeUrl, afterUrl)
            if (!result) { setAlignError(t('tab.analysisError')); return }
            setAlignment(result)
            // Save to DB
            await supabase.from('progress_photos').update({ adjustments: result.after }).eq('id', afterPhoto.id)
            toast.success(t('tab.photosAligned'))
          } catch (err) {
            setAlignError(t('tab.analysisError'))
          } finally { setIsAligning(false) }
        }
        return (<RailOverlay>
          <div data-no-tab-swipe="true" style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #222', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <span style={{ color: colors.error, fontWeight: 600 }}>{t('tab.before')} : {beforeDate}</span>
                <span style={{ color: colors.success, fontWeight: 600 }}>{t('tab.after')} : {afterDate}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={handleAutoAlign} disabled={isAligning}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: isAligning ? '#222' : `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`, color: isAligning ? colors.textMuted : colors.onGold, border: 'none', borderRadius: 10, cursor: isAligning ? 'default' : 'pointer', fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                  {isAligning ? (
                    <><div style={{ width: 12, height: 12, border: '2px solid #555', borderTopColor: colors.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />{t('tab.analyzingShort')}</>
                  ) : (
                    <><Sparkles size={12} />ALIGNER</>
                  )}
                </button>
                {alignment && (
                  <button onClick={() => setAlignment(null)}
                    style={{ padding: '7px 10px', background: '#222', border: '1px solid #333', borderRadius: 10, color: colors.textMuted, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.body }}>
                    RESET
                  </button>
                )}
                <button onClick={() => { setShowCompare(false); setAlignment(null); setAlignError(null) }} style={{ width: 32, height: 32, borderRadius: '50%', background: '#222', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color="#fff" /></button>
              </div>
            </div>
            {alignError && (
              <div style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.15)', fontFamily: fonts.body, fontSize: 11, color: colors.error, textAlign: 'center' }}>
                {alignError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, padding: '8px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
              {[{ label: t('tab.before'), idx: 0 }, { label: t('tab.after'), idx: 1 }].map(({ label, idx }) => (
                <div key={idx} style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>{label}</label>
                  <select value={compareIdx[idx]} onChange={e => { const n = [...compareIdx] as [number, number]; n[idx] = Number(e.target.value); setCompareIdx(n); setAlignment(null) }}
                    style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '6px 8px', color: '#fff', fontSize: 12 }}>
                    {progressPhotos.map((p: any, i: number) => (
                      <option key={i} value={i}>{p.date ? format(new Date(p.date), 'd MMM yyyy', { locale: dateLocale }) : `Photo ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <img src={afterUrl} alt="Apres" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000', transform: afterTransform, transition: 'transform 300ms ease-out', transformOrigin: 'center center' }} />
              <img src={beforeUrl} alt="Avant" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000', clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${sliderValue}%`, width: 2, background: colors.gold, transform: 'translateX(-50%)', zIndex: 2 }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 36, height: 36, borderRadius: '50%', background: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: colors.onGold, fontSize: 11, fontWeight: 700 }}>⟷</span>
                </div>
              </div>
              <input type="range" min={0} max={100} value={sliderValue} onChange={e => setSliderValue(Number(e.target.value))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'ew-resize', zIndex: 3 }} />
              <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(239,68,68,0.8)', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#fff', zIndex: 2 }}>AVANT</div>
              <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(34,197,94,0.8)', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#fff', zIndex: 2 }}>APRES</div>
            </div>
          </div>
        </RailOverlay>)
      })()}

      <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProgressPhoto} />
    </div>
  )
}
