'use client'
import React, { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Scale, Ruler, Camera, TrendingUp, TrendingDown, Plus, Trash2, X, ChevronUp, ChevronDown, Download, BarChart3, Sparkles, Send, ChevronRight, Star, Info, Clock, User } from 'lucide-react'
import { downloadCsv } from '../../../lib/exportCsv'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import {
  colors, fonts,
  titleStyle, titleLineStyle, subtitleStyle, statStyle, statSmallStyle, bodyStyle, labelStyle, mutedStyle, pageTitleStyle, cardStyle, cardTitleAbove,
  radii,
} from '../../../lib/design-tokens'
import AnalyticsSection from '../AnalyticsSection'
import AbsCalculator from '../progress/AbsCalculator'
import BodyAssessment from '../progress/BodyAssessment'
import AnalysisDisplay from './progress/AnalysisDisplay'
import ActionBtn from './progress/ActionBtn'
import { computeAlignment, type Alignment } from '../../../lib/photo-align'

const MEASURE_FIELDS = [
  { key: 'waist',  label: 'Tour de taille',   unit: 'cm', dbKey: 'waist' },
  { key: 'hips',   label: 'Tour de hanches',   unit: 'cm', dbKey: 'hips' },
  { key: 'chest',  label: 'Tour de poitrine',  unit: 'cm', dbKey: 'chest' },
  { key: 'arms',   label: 'Tour de bras',      unit: 'cm', dbKey: 'left_arm' },
  { key: 'thighs', label: 'Tour de cuisses',   unit: 'cm', dbKey: 'left_thigh' },
]

const EVOLUTION_METRICS = [
  { key: 'poids', label: 'Poids', unit: 'kg', source: 'weight' },
  { key: 'waist', label: 'Taille', unit: 'cm', source: 'measure' },
  { key: 'chest', label: 'Poitrine', unit: 'cm', source: 'measure' },
  { key: 'hips', label: 'Hanches', unit: 'cm', source: 'measure' },
  { key: 'left_arm', label: 'Biceps', unit: 'cm', source: 'measure' },
  { key: 'body_fat', label: '% MG', unit: '%', source: 'measure' },
]

type PillSection = 'poids' | 'records' | 'photos' | 'mensurations'

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
  chartMin: number
  chartMax: number
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
}

export default function ProgressTab({
  supabase, session, weightHistory30, measurements, progressPhotos,
  photoRef, photoUploading, uploadProgressPhoto, deletePhoto,
  setModal, chartMin, chartMax, onRefresh,
  profile, coachId,
  personalRecords, weeklyCalories, weeklyWater, weeklyVolume,
  weightHistoryFull, wSessions, calorieGoal, goalWeight, waterGoal,
  streak, currentWeight,
}: ProgressTabProps) {
  const [activePill, setActivePill] = useState<PillSection>('poids')
  const sectionRefs = { poids: React.useRef<HTMLDivElement>(null), records: React.useRef<HTMLDivElement>(null), photos: React.useRef<HTMLDivElement>(null), mensurations: React.useRef<HTMLDivElement>(null) }
  const [weightPeriod, setWeightPeriod] = useState<'7' | '30' | '90' | 'all'>('30')
  const [showAssessment, setShowAssessment] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [compareIdx, setCompareIdx] = useState<[number, number]>([0, 0])
  const [sliderValue, setSliderValue] = useState(50)
  const [alignment, setAlignment] = useState<{ before: Alignment; after: Alignment } | null>(null)
  const [isAligning, setIsAligning] = useState(false)
  const [alignError, setAlignError] = useState<string | null>(null)
  const latestMeasure = measurements[0]
  const prevMeasure = measurements[1]

  // Weight modal
  const [showWeight, setShowWeight] = useState(false)
  const [weightVal, setWeightVal] = useState('')
  const [weightDate, setWeightDate] = useState(() => new Date().toISOString().split('T')[0])
  const [savingWeight, setSavingWeight] = useState(false)
  const [localWeights, setLocalWeights] = useState<{ date: string; poids: number }[]>([])
  const mergedWeights = useMemo(() => {
    const all = [...weightHistory30, ...localWeights]
    const seen = new Set<string>()
    return all.filter(w => { const k = w.date + w.poids; const ok = !seen.has(k); seen.add(k); return ok }).sort((a, b) => a.date.localeCompare(b.date))
  }, [weightHistory30, localWeights])
  const cMin = mergedWeights.length > 0 ? Math.min(...mergedWeights.map(p => p.poids)) - 1 : chartMin
  const cMax = mergedWeights.length > 0 ? Math.max(...mergedWeights.map(p => p.poids)) + 1 : chartMax

  // Measure modal
  const [showMeasure, setShowMeasure] = useState(false)
  const [measureForm, setMeasureForm] = useState<Record<string, string>>({ waist: '', hips: '', chest: '', arms: '', thighs: '' })
  const [measureDate, setMeasureDate] = useState(() => new Date().toISOString().split('T')[0])
  const [savingMeasure, setSavingMeasure] = useState(false)

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

  const ANALYSIS_STEPS = ['Analyse en cours...', 'Détection des groupes musculaires...', 'Calcul des proportions...', 'Génération du rapport...']
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
    if (error) { toast.error('Erreur upload'); return }
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
        toast.error(`Tu pourras relancer une analyse dans ${mins} minute${mins > 1 ? 's' : ''}`)
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
      toast.success('Analyse terminée !')
    } catch (e: any) {
      const msg = e.message?.includes('requêtes') || e.message?.includes('429')
        ? 'L\'analyse est temporairement indisponible. Réessaye dans quelques minutes.'
        : (e.message || 'Erreur lors de l\'analyse')
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
    if (!progressPhotos.length) return
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
  }, [photoIds])

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
      if (!photoUrl) { toast.error('URL de la photo non disponible'); setExpandedAnalysis(null); setAnalyzingId(null); return }
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
            body_fat: latestM?.body_fat || null,
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
      toast.error(e.message || 'Erreur lors de l\'analyse')
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
    if (error) toast.error('Erreur lors de l\'envoi')
    else toast.success('Analyse partagée avec ton coach !')
    setSharingId(null)
  }

  // Evolution
  const [evoMetric, setEvoMetric] = useState('poids')

  async function handleSaveWeight() {
    if (!weightVal || !session?.user?.id) return
    setSavingWeight(true)
    const poids = parseFloat(weightVal)
    const { error } = await supabase.from('weight_logs').upsert({ user_id: session.user.id, date: weightDate, poids }, { onConflict: 'user_id,date' })
    if (error) { toast.error('Erreur lors de l\'enregistrement') }
    else {
      setLocalWeights(prev => [...prev, { date: weightDate, poids }])
      toast.success('Poids enregistré !')
      setShowWeight(false); setWeightVal(''); setWeightDate(new Date().toISOString().split('T')[0])
      onRefresh()
    }
    setSavingWeight(false)
  }

  async function handleSaveMeasure() {
    if (savingMeasure || !session?.user?.id) return
    const payload: Record<string, unknown> = { user_id: session.user.id, date: measureDate }
    if (measureForm.waist) payload.waist = Number(measureForm.waist)
    if (measureForm.hips) payload.hips = Number(measureForm.hips)
    if (measureForm.chest) payload.chest = Number(measureForm.chest)
    if (measureForm.arms) { payload.left_arm = Number(measureForm.arms); payload.right_arm = Number(measureForm.arms) }
    if (measureForm.thighs) { payload.left_thigh = Number(measureForm.thighs); payload.right_thigh = Number(measureForm.thighs) }
    if (Object.keys(payload).length <= 2) return
    setSavingMeasure(true)
    const { error } = await supabase.from('body_measurements').insert(payload)
    if (error) { toast.error('Erreur lors de l\'enregistrement') }
    else {
      toast.success('Mensurations enregistrées !')
      setShowMeasure(false); setMeasureForm({ waist: '', hips: '', chest: '', arms: '', thighs: '' }); setMeasureDate(new Date().toISOString().split('T')[0])
      onRefresh()
    }
    setSavingMeasure(false)
  }

  // Get delta between two measures for a field
  function delta(field: string): { val: number; icon: any; color: string } | null {
    if (!latestMeasure || !prevMeasure) return null
    const curr = latestMeasure[field], prev = prevMeasure[field]
    if (curr == null || prev == null) return null
    const d = curr - prev
    if (d === 0) return null
    return { val: Math.abs(d), icon: d > 0 ? ChevronUp : ChevronDown, color: d > 0 ? '#EF4444' : colors.success }
  }

  // Evolution chart data
  const evoData = useMemo(() => {
    const metric = EVOLUTION_METRICS.find(m => m.key === evoMetric)
    if (!metric) return []
    if (metric.source === 'weight') {
      return mergedWeights.map(w => ({ date: w.date, value: w.poids }))
    }
    return measurements
      .filter((m: any) => m[metric.key] != null)
      .map((m: any) => ({ date: m.date, value: m[metric.key] }))
      .reverse()
  }, [evoMetric, mergedWeights, measurements])

  const displayWeights = mergedWeights.length > 0 ? mergedWeights : weightHistory30

  // Filtered weights by period
  const periodWeights = useMemo(() => {
    if (weightPeriod === 'all') return weightHistoryFull.length > 0 ? weightHistoryFull : displayWeights
    const days = weightPeriod === '7' ? 7 : weightPeriod === '90' ? 90 : 30
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    return displayWeights.filter(w => w.date >= cutoff)
  }, [weightPeriod, displayWeights, weightHistoryFull])

  const pMin = periodWeights.length > 0 ? Math.min(...periodWeights.map(p => p.poids)) - 1 : cMin
  const pMax = periodWeights.length > 0 ? Math.max(...periodWeights.map(p => p.poids)) + 1 : cMax

  // Total volume in tonnes
  const totalVolume = useMemo(() => weeklyVolume.reduce((s, w) => s + w.volume, 0), [weeklyVolume])

  // Scroll to section on pill tap
  function scrollToSection(section: PillSection) {
    setActivePill(section)
    sectionRefs[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Weight variation
  const weightDelta = displayWeights.length >= 2 ? Math.round((displayWeights[displayWeights.length - 1].poids - displayWeights[0].poids) * 10) / 10 : 0
  const isBulking = profile?.objective === 'prise_masse' || profile?.objective === 'gain'
  const deltaPositive = isBulking ? weightDelta > 0 : weightDelta < 0

  return (
    <div style={{ padding: '20px 20px 120px', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>

      {/* ═══ SECTION 1 — HEADER ═══ */}
      <h1 style={{ ...pageTitleStyle, margin: '0 0 16px' }}>ANALYTICS</h1>

      {/* ═══ SECTION 2 — 3 STATS RÉSUMÉ ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'SÉANCES', value: wSessions.length },
          { label: 'VOLUME', value: totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}T` : `${Math.round(totalVolume)}kg` },
          { label: 'STREAK', value: streak },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, padding: 14, textAlign: 'center' }}>
            <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 800, color: colors.gold }}>{s.value}</div>
            <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ SECTION 3 — PILLS NAVIGATION ═══ */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 8 }}>
        {([
          { id: 'poids' as PillSection, label: 'POIDS' },
          { id: 'records' as PillSection, label: 'RECORDS' },
          { id: 'photos' as PillSection, label: 'PHOTOS' },
          { id: 'mensurations' as PillSection, label: 'MENSURATIONS' },
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


      {/* ═══ SECTION 4 — ÉVOLUTION DU POIDS ═══ */}
      <div ref={sectionRefs.poids} style={{ scrollMarginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={cardTitleAbove}>ÉVOLUTION DU POIDS</span>
          <div style={titleLineStyle} />
          <span style={{ ...mutedStyle, fontSize: 10 }}>{weightPeriod === 'all' ? 'TOUT' : `${weightPeriod}J`}</span>
        </div>
        <div style={{ ...cardStyle, padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: fonts.headline, fontSize: 32, fontWeight: 800, color: colors.text, lineHeight: 1 }}>
                {currentWeight || displayWeights[displayWeights.length - 1]?.poids || '—'}<span style={{ ...mutedStyle, fontSize: 14, marginLeft: 4 }}>KG</span>
              </div>
              {goalWeight && <div style={{ ...mutedStyle, fontSize: 10, marginTop: 4 }}>Objectif : {goalWeight} kg</div>}
            </div>
            {weightDelta !== 0 && (
              <div style={{ padding: '4px 10px', borderRadius: 999, background: deltaPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${deltaPositive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                <span style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 700, color: deltaPositive ? '#22c55e' : '#ef4444' }}>
                  {weightDelta > 0 ? '+' : ''}{weightDelta} kg
                </span>
              </div>
            )}
          </div>
          {periodWeights.length > 1 && (
            <svg viewBox="0 0 300 90" style={{ width: '100%', height: 90, overflow: 'visible' }} preserveAspectRatio="none">
              <polyline points={periodWeights.map((p, i) => { const x = (i / (periodWeights.length - 1)) * 300; const y = 90 - ((p.poids - pMin) / ((pMax - pMin) || 1)) * 86; return `${x.toFixed(1)},${y.toFixed(1)}` }).join(' ')} fill="none" stroke={colors.gold} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={300} cy={90 - ((periodWeights[periodWeights.length - 1]?.poids - pMin) / ((pMax - pMin) || 1)) * 86} r="5" fill={colors.gold} />
            </svg>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {(['7', '30', '90', 'all'] as const).map(p => {
              const active = weightPeriod === p
              return (
                <button key={p} onClick={() => setWeightPeriod(p)} style={{
                  padding: '4px 10px', borderRadius: 999, border: active ? `1px solid ${colors.gold}4d` : '1px solid transparent',
                  background: active ? `${colors.gold}33` : `${colors.gold}1a`,
                  color: colors.gold, fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                }}>
                  {p === 'all' ? 'TOUT' : `${p}J`}
                </button>
              )
            })}
          </div>
        </div>
        <button onClick={() => setShowWeight(true)} style={{ ...cardStyle, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, width: '100%', cursor: 'pointer', border: `1px solid ${colors.goldBorder}`, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Scale size={20} color={colors.gold} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: colors.text }}>Enregistrer mon poids</div>
            <div style={{ ...mutedStyle, fontSize: 10 }}>Ajouter une mesure kg</div>
          </div>
          <ChevronRight size={16} color={colors.textDim} />
        </button>
      </div>

      {/* ═══ SECTION 5 — RECORDS PERSONNELS ═══ */}
      <div ref={sectionRefs.records} style={{ scrollMarginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={cardTitleAbove}>RECORDS PERSONNELS</span>
          <div style={titleLineStyle} />
          <span style={{ ...mutedStyle, fontSize: 10 }}>{personalRecords.length} PR</span>
        </div>
        <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
          {personalRecords.length > 0 ? personalRecords.slice(0, 10).map((pr: any, i: number) => (
            <div key={pr.exercise || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < Math.min(personalRecords.length, 10) - 1 ? `0.5px solid ${colors.goldDim}` : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Star size={14} color={colors.gold} fill={colors.gold} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.exercise}</div>
                <div style={{ ...mutedStyle, fontSize: 9 }}>{pr.date ? format(new Date(pr.date), 'd MMM yyyy', { locale: fr }) : ''}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 700, color: colors.gold }}>{pr.weight || pr.value}</span>
                <span style={{ ...mutedStyle, fontSize: 9, marginLeft: 2 }}>KG</span>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Star size={28} color={colors.textDim} style={{ marginBottom: 6 }} />
              <p style={{ ...mutedStyle, fontSize: 12, margin: 0 }}>Bats ton premier record !</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTION 6 — TRANSFORMATION (Photos) ═══ */}
      {showAssessment && (
        <BodyAssessment supabase={supabase} session={session} profile={profile} onClose={() => setShowAssessment(false)} onRefresh={onRefresh} />
      )}
      <div ref={sectionRefs.photos} style={{ scrollMarginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={cardTitleAbove}>TRANSFORMATION</span>
          <div style={titleLineStyle} />
          <span style={{ ...mutedStyle, fontSize: 10 }}>PHOTOS</span>
        </div>
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
            <div style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: colors.text }}>Ajouter une photo</div>
            <div style={{ ...mutedStyle, fontSize: 10 }}>Photo avant/après progression</div>
          </div>
          <ChevronRight size={16} color={colors.textDim} />
        </button>
      </div>

      {/* ═══ SECTION 6.5 — ANALYSE IA ═══ */}
      <div style={{ scrollMarginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={cardTitleAbove}>ANALYSE IA</span>
          <div style={titleLineStyle} />
          <span style={{ fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, background: `${colors.goldContainer}1a`, border: `1px solid ${colors.goldRule}`, borderRadius: 999, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={8} /> BETA
          </span>
        </div>
        <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={18} color={colors.gold} />
            </div>
            <div>
              <div style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: colors.text }}>Analyse corporelle par IA</div>
              <div style={{ ...mutedStyle, fontSize: 10 }}>Basée sur tes photos de progression</div>
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
                  <div style={{ ...mutedStyle, fontSize: 9 }}>Estimation IA</div>
                </div>
                <div style={{ background: colors.goldDim, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 4 }}>MASSE MAIGRE</div>
                  <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 800, color: colors.gold }}>~{Math.round(bodyAnalysis.lean_mass_estimate)} KG</div>
                  <div style={{ ...mutedStyle, fontSize: 9 }}>Estimation IA</div>
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
                  <div style={{ ...mutedStyle, fontSize: 9, marginTop: 4 }}>Score de symétrie gauche/droite</div>
                </div>
              )}

              {/* Footer */}
              <div style={{ background: `${colors.gold}0a`, border: `1px solid ${colors.gold}1a`, borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={12} color='rgba(255,255,255,0.25)' />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
                  Dernière analyse : {bodyAnalysis.created_at ? format(new Date(bodyAnalysis.created_at), 'd MMM yyyy', { locale: fr }) : '—'} — Basée sur {bodyAnalysis.photos_used || 3} photos
                </span>
              </div>
            </>
          )}

          {/* Empty state */}
          {!bodyAnalysisLoading && !bodyAnalysis && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <User size={28} color={colors.textDim} style={{ marginBottom: 6 }} />
              <p style={{ ...mutedStyle, fontSize: 12, margin: '0 0 4px' }}>Aucune analyse encore</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: 0 }}>Upload 3 photos pour lancer ta première analyse</p>
            </div>
          )}
        </div>

        {/* Upload modal — centered */}
        {showBodyUpload && (
          <div onClick={() => { if (!bodyAnalysisLoading) { setShowBodyUpload(false); setBodyUploadPhotos({}) } }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
              {/* a) Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={titleStyle}>PHOTOS POUR ANALYSE</span>
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
                    style={{ width: '100%', padding: 14, borderRadius: radii.button, border: 'none', cursor: ready && !bodyAnalysisLoading ? 'pointer' : 'default', background: ready ? colors.gold : colors.surfaceHigh, color: ready ? '#000' : colors.textMuted, fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, opacity: ready && !bodyAnalysisLoading ? 1 : 0.5 }}>
                    {bodyAnalysisLoading ? 'Analyse en cours...' : 'LANCER L\'ANALYSE IA'}
                  </button>
                )
              })()}
              {/* d) Disclaimer */}
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: '12px 0 0' }}>Estimation IA — peut contenir des erreurs</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <button onClick={() => setShowBodyUpload(true)} style={{ flex: 1, background: `linear-gradient(135deg, ${colors.goldBorder}, ${colors.goldDim})`, border: `1px solid ${colors.goldRule}`, borderRadius: 14, padding: 14, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Camera size={14} color={colors.gold} />
              <span style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: colors.gold, letterSpacing: '0.08em' }}>NOUVELLE ANALYSE</span>
            </div>
            <div style={{ ...mutedStyle, fontSize: 8 }}>Upload 3 photos</div>
          </button>
          <button onClick={() => setModal('messages')} style={{ ...cardStyle, flex: 1, borderRadius: 14, padding: 14, cursor: 'pointer', textAlign: 'left', border: `1px solid ${colors.goldBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Send size={14} color='rgba(255,255,255,0.4)' />
              <span style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>VOIR UN PRO</span>
            </div>
            <div style={{ ...mutedStyle, fontSize: 8 }}>Contacte ton coach</div>
          </button>
        </div>
      </div>

      {/* ═══ SECTION 7 — MENSURATIONS ═══ */}
      <div ref={sectionRefs.mensurations} style={{ scrollMarginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={cardTitleAbove}>MENSURATIONS</span>
          <div style={titleLineStyle} />
        </div>
        <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { l: 'TAILLE', v: latestMeasure?.waist, u: 'cm' },
              { l: 'POITRINE', v: latestMeasure?.chest, u: 'cm' },
              { l: 'BRAS', v: latestMeasure?.left_arm, u: 'cm' },
              { l: 'CUISSES', v: latestMeasure?.left_thigh, u: 'cm' },
            ].map(({ l, v, u }) => (
              <div key={l} style={{ background: `${colors.gold}0a`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 4 }}>{l}</div>
                <div>
                  <span style={{ fontFamily: fonts.headline, fontSize: 18, fontWeight: 800, color: colors.text }}>{v ?? '—'}</span>
                  <span style={{ ...mutedStyle, fontSize: 10, marginLeft: 2 }}>{v ? u : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => setShowMeasure(true)} style={{ ...cardStyle, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, width: '100%', cursor: 'pointer', border: `1px solid ${colors.goldBorder}`, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ruler size={20} color={colors.gold} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: colors.text }}>Mes mensurations</div>
            <div style={{ ...mutedStyle, fontSize: 10 }}>Taille, hanches, poitrine, bras, cuisses</div>
          </div>
          <ChevronRight size={16} color={colors.textDim} />
        </button>
      </div>

      {/* ═══ SECTION 8 — EXPORT ═══ */}
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
                return [m.date, m.waist ?? '', m.hips ?? '', m.chest ?? '', m.left_arm ?? '', m.left_thigh ?? '', m.body_fat ?? '', typeof imc === 'number' ? +imc.toFixed(1) : '']
              })
            ]
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(msData), 'Mensurations')
          }
          XLSX.writeFile(wb, 'MoovX_Mes_Donnees.xlsx')
          toast.success('Fichier exporté ✓')
        }} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: 14, borderRadius: radii.button,
          background: 'transparent', border: `1px solid ${colors.goldBorder}`,
          color: colors.textMuted, fontFamily: fonts.headline, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const,
        }}>
          <Download size={14} /> EXPORTER MES DONNÉES (.XLSX)
        </button>
      )}

      {/* ═══ PHOTO COMPARE MODAL ═══ */}
      {showCompare && progressPhotos.length >= 2 && (() => {
        const beforePhoto = progressPhotos[compareIdx[0]]
        const afterPhoto = progressPhotos[compareIdx[1]]
        if (!beforePhoto || !afterPhoto) return null
        const beforeUrl = signedUrls[beforePhoto.id] || ''
        const afterUrl = signedUrls[afterPhoto.id] || ''
        const beforeDate = beforePhoto.date ? format(new Date(beforePhoto.date), 'd MMM yyyy', { locale: fr }) : ''
        const afterDate = afterPhoto.date ? format(new Date(afterPhoto.date), 'd MMM yyyy', { locale: fr }) : ''
        const afterTransform = alignment
          ? `scale(${alignment.after.zoom}) translate(${alignment.after.x}%, ${alignment.after.y}%)`
          : 'none'
        const handleAutoAlign = async () => {
          if (!beforeUrl || !afterUrl) return
          setIsAligning(true); setAlignError(null)
          try {
            const result = await computeAlignment(beforeUrl, afterUrl)
            if (!result) { setAlignError('Impossible de detecter la silhouette. Assure-toi que le corps est entierement visible.'); return }
            setAlignment(result)
            // Save to DB
            await supabase.from('progress_photos').update({ adjustments: result.after }).eq('id', afterPhoto.id)
            toast.success('Photos alignees automatiquement')
          } catch (err) {
            setAlignError('Erreur lors de l\'analyse. Reessaie.')
          } finally { setIsAligning(false) }
        }
        return (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #222', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <span style={{ color: colors.error, fontWeight: 600 }}>Avant : {beforeDate}</span>
                <span style={{ color: colors.success, fontWeight: 600 }}>Apres : {afterDate}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={handleAutoAlign} disabled={isAligning}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: isAligning ? '#222' : `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`, color: isAligning ? colors.textMuted : '#0D0B08', border: 'none', borderRadius: 10, cursor: isAligning ? 'default' : 'pointer', fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                  {isAligning ? (
                    <><div style={{ width: 12, height: 12, border: '2px solid #555', borderTopColor: colors.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />ANALYSE...</>
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
              {[{ label: 'Avant', idx: 0 }, { label: 'Apres', idx: 1 }].map(({ label, idx }) => (
                <div key={idx} style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>{label}</label>
                  <select value={compareIdx[idx]} onChange={e => { const n = [...compareIdx] as [number, number]; n[idx] = Number(e.target.value); setCompareIdx(n); setAlignment(null) }}
                    style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '6px 8px', color: '#fff', fontSize: 12 }}>
                    {progressPhotos.map((p: any, i: number) => (
                      <option key={i} value={i}>{p.date ? format(new Date(p.date), 'd MMM yyyy', { locale: fr }) : `Photo ${i + 1}`}</option>
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
                  <span style={{ color: '#000', fontSize: 11, fontWeight: 700 }}>⟷</span>
                </div>
              </div>
              <input type="range" min={0} max={100} value={sliderValue} onChange={e => setSliderValue(Number(e.target.value))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'ew-resize', zIndex: 3 }} />
              <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(239,68,68,0.8)', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#fff', zIndex: 2 }}>AVANT</div>
              <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(34,197,94,0.8)', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#fff', zIndex: 2 }}>APRES</div>
            </div>
          </div>
        )
      })()}

      <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProgressPhoto} />

      {/* ── WEIGHT MODAL ── */}
      {showWeight && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: colors.surface, borderTop: `1px solid ${colors.goldBorder}`, borderRadius: `${radii.card}px ${radii.card}px 0 0`, padding: '28px 20px 48px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h3 style={{ ...titleStyle, fontSize: 18, margin: 0 }}>ENREGISTRER MON POIDS</h3>
              <button onClick={() => { setShowWeight(false); setWeightVal('') }} style={{ width: 36, height: 36, background: colors.surfaceHigh, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color={colors.textMuted} /></button>
            </div>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <input type="number" inputMode="decimal" step="0.1" min="0" value={weightVal} onChange={e => setWeightVal(e.target.value)} placeholder="0.0" autoFocus
                style={{ width: '100%', background: colors.background, border: `2px solid ${weightVal ? colors.gold : colors.goldBorder}`, borderRadius: radii.card, padding: '22px 56px 22px 20px', color: colors.text, fontSize: '3.2rem', fontFamily: fonts.headline, textAlign: 'center', outline: 'none', transition: 'border-color 200ms' }} />
              <span style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, fontSize: 16, fontWeight: 600 }}>kg</span>
            </div>
            {weightHistory30.length > 0 && <p style={{ textAlign: 'center', ...bodyStyle, fontSize: 12, marginBottom: 20 }}>Précédent : {weightHistory30[weightHistory30.length - 1].poids} kg</p>}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', ...subtitleStyle, marginBottom: 8 }}>Date</label>
              <input type="date" value={weightDate} onChange={e => setWeightDate(e.target.value)} style={{ width: '100%', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: radii.card, padding: '14px 16px', color: colors.text, fontFamily: fonts.body, fontSize: 16, outline: 'none', colorScheme: 'dark', minHeight: 48 }} />
            </div>
            <button onClick={handleSaveWeight} disabled={!weightVal || savingWeight} style={{ width: '100%', background: weightVal && !savingWeight ? colors.gold : '#2A2A2A', color: weightVal && !savingWeight ? '#000' : colors.textMuted, fontWeight: 700, padding: 17, borderRadius: radii.card, border: 'none', cursor: weightVal && !savingWeight ? 'pointer' : 'default', fontFamily: fonts.headline, fontSize: 16, letterSpacing: '0.1em', textTransform: 'uppercase' as const, minHeight: 56 }}>
              {savingWeight ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* ── MEASUREMENTS MODAL ── */}
      {showMeasure && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto' }}>
          <div style={{ background: colors.surface, borderRadius: `${radii.card}px ${radii.card}px 0 0`, padding: '28px 20px 48px', marginTop: 60, minHeight: 'calc(100vh - 60px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ ...titleStyle, fontSize: 18, margin: 0 }}>MES MENSURATIONS</h3>
              <button onClick={() => { setShowMeasure(false); setMeasureForm({ waist: '', hips: '', chest: '', arms: '', thighs: '' }) }} style={{ width: 36, height: 36, background: colors.surfaceHigh, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color={colors.textMuted} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {MEASURE_FIELDS.map(({ key, label, unit }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.background, border: `1px solid ${measureForm[key] ? colors.gold + '60' : colors.goldBorder}`, borderRadius: radii.card, padding: '0 16px', minHeight: 56, transition: 'border-color 200ms' }}>
                  <span style={{ ...bodyStyle, fontSize: 14, flex: 1 }}>{label}</span>
                  <input type="number" inputMode="decimal" step="0.1" min="0" value={measureForm[key]} onChange={e => setMeasureForm(p => ({ ...p, [key]: e.target.value }))} placeholder="—"
                    style={{ background: 'transparent', color: colors.text, fontSize: 18, fontFamily: fonts.headline, textAlign: 'right', width: 72, outline: 'none', border: 'none', padding: '14px 0' }} />
                  <span style={{ ...mutedStyle, fontSize: 12, width: 28 }}>{unit}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', ...subtitleStyle, marginBottom: 8 }}>Date</label>
              <input type="date" value={measureDate} onChange={e => setMeasureDate(e.target.value)} style={{ width: '100%', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: radii.card, padding: '14px 16px', color: colors.text, fontFamily: fonts.body, fontSize: 16, outline: 'none', colorScheme: 'dark', minHeight: 48 }} />
            </div>
            <button onClick={handleSaveMeasure} disabled={Object.values(measureForm).every(v => !v) || savingMeasure}
              style={{ width: '100%', background: Object.values(measureForm).some(v => v) && !savingMeasure ? colors.gold : '#2A2A2A', color: Object.values(measureForm).some(v => v) && !savingMeasure ? '#000' : colors.textMuted, fontWeight: 700, padding: 17, borderRadius: radii.card, border: 'none', cursor: Object.values(measureForm).some(v => v) && !savingMeasure ? 'pointer' : 'default', fontFamily: fonts.headline, fontSize: 16, letterSpacing: '0.1em', textTransform: 'uppercase' as const, minHeight: 56, marginBottom: 32 }}>
              {savingMeasure ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
