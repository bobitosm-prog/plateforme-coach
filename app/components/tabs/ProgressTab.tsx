'use client'
import React, { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Scale, Ruler, Camera, TrendingUp, TrendingDown, Plus, Trash2, X, ChevronUp, ChevronDown, Download, BarChart3, Sparkles, Send, ChevronRight } from 'lucide-react'
import { downloadCsv } from '../../../lib/exportCsv'
import { toast } from 'sonner'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, ORANGE, GOLD, GOLD_DIM, GOLD_RULE, GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'
import AnalyticsSection from '../AnalyticsSection'
import AbsCalculator from '../progress/AbsCalculator'

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

type SubTab = 'mesures' | 'photos' | 'evolution' | 'analytics'

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
  weeklyCalories: { date: string; calories: number; proteins: number; carbs: number; fats: number }[]
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
  const [subTab, setSubTab] = useState<SubTab>('mesures')
  const [showCompare, setShowCompare] = useState(false)
  const [compareIdx, setCompareIdx] = useState<[number, number]>([0, 0])
  const [sliderValue, setSliderValue] = useState(50)
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
    return { val: Math.abs(d), icon: d > 0 ? ChevronUp : ChevronDown, color: d > 0 ? '#EF4444' : GREEN }
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

  return (
    <div style={{ padding: '20px 20px 20px', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>PROGRESSION</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {subTab === 'mesures' && displayWeights.length > 0 && (
            <button onClick={() => {
              const rows = displayWeights.map((w, i) => [w.date, w.poids, i > 0 ? (w.poids - displayWeights[i-1].poids).toFixed(1) : ''])
              downloadCsv('poids.csv', ['Date', 'Poids (kg)', 'Variation'], rows)
            }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '6px 10px', cursor: 'pointer', fontFamily: FONT_ALT, color: TEXT_MUTED, fontSize: '0.68rem', fontWeight: 600 }}>
              <Download size={12} /> Poids
            </button>
          )}
          {subTab === 'mesures' && measurements.length > 0 && (
            <button onClick={() => {
              const rows = measurements.map((m: any) => [m.date, m.waist ?? '', m.hips ?? '', m.chest ?? '', m.left_arm ?? '', m.left_thigh ?? '', m.body_fat ?? ''])
              downloadCsv('mensurations.csv', ['Date', 'Taille (cm)', 'Hanches (cm)', 'Poitrine (cm)', 'Bras (cm)', 'Cuisses (cm)', '% MG'], rows)
            }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '6px 10px', cursor: 'pointer', fontFamily: FONT_ALT, color: TEXT_MUTED, fontSize: '0.68rem', fontWeight: 600 }}>
              <Download size={12} /> Mensurations
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {([
          { id: 'mesures' as SubTab, label: 'Mesures', icon: Ruler },
          { id: 'photos' as SubTab, label: 'Photos', icon: Camera },
          { id: 'evolution' as SubTab, label: 'Évolution', icon: TrendingUp },
          { id: 'analytics' as SubTab, label: 'Analytics', icon: BarChart3 },
        ]).map(({ id, label, icon: Icon }) => {
          const active = subTab === id
          return (
            <button key={id} onClick={() => setSubTab(id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '10px 8px', borderRadius: 0, border: 'none', cursor: 'pointer',
              fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              background: active ? GOLD : BG_CARD,
              color: active ? '#080808' : TEXT_MUTED, transition: 'all 150ms',
            }}>
              <Icon size={14} strokeWidth={2.5} />
              {label}
            </button>
          )
        })}
      </div>

      {/* ═══ MESURES SUB-TAB ═══ */}
      {subTab === 'mesures' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Weight chart */}
          {displayWeights.length > 1 && (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderLeft: '2px solid #60A5FA', borderRadius: RADIUS_CARD, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED }}>Poids (30j)</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 28, color: GOLD }}>{displayWeights[displayWeights.length - 1]?.poids} kg</span>
              </div>
              <svg viewBox="0 0 300 90" style={{ width: '100%', height: 90, overflow: 'visible' }} preserveAspectRatio="none">
                <polyline points={displayWeights.map((p, i) => { const x = (i / (displayWeights.length - 1)) * 300; const y = 90 - ((p.poids - cMin) / ((cMax - cMin) || 1)) * 86; return `${x.toFixed(1)},${y.toFixed(1)}` }).join(' ')} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={300} cy={90 - ((displayWeights[displayWeights.length - 1]?.poids - cMin) / ((cMax - cMin) || 1)) * 86} r="5" fill={GOLD} />
              </svg>
            </div>
          )}

          {/* Latest measurements with deltas */}
          {latestMeasure && (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED }}>Dernières mesures</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: '0.68rem', fontWeight: 300, color: TEXT_MUTED }}>{format(new Date(latestMeasure.date), 'd MMM yyyy', { locale: fr })}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden' }}>
                {[
                  { l: 'Poitrine', v: latestMeasure.chest, f: 'chest', u: 'cm' },
                  { l: 'Taille', v: latestMeasure.waist, f: 'waist', u: 'cm' },
                  { l: 'Hanches', v: latestMeasure.hips, f: 'hips', u: 'cm' },
                  { l: 'Bras', v: latestMeasure.left_arm, f: 'left_arm', u: 'cm' },
                  { l: 'Cuisses', v: latestMeasure.left_thigh, f: 'left_thigh', u: 'cm' },
                  { l: '% Graisse', v: latestMeasure.body_fat, f: 'body_fat', u: '%' },
                ].filter(x => x.v != null).map(({ l, v, f, u }) => {
                  const d = delta(f)
                  return (
                    <div key={l} style={{ background: BG_CARD, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...(f === 'body_fat' ? { borderLeft: '2px solid #C9A84C' } : {}) }}>
                      <span style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED }}>{l}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: FONT_DISPLAY, fontSize: '1.1rem', color: GOLD }}>{v}<span style={{ fontFamily: FONT_BODY, fontSize: '0.65rem', color: TEXT_MUTED, marginLeft: 2 }}>{u}</span></span>
                        {d && <d.icon size={12} color={d.color} strokeWidth={3} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ActionBtn icon={Scale} label="Enregistrer mon poids" sub="Ajouter une mesure kg" onClick={() => setShowWeight(true)} />
            <ActionBtn icon={Ruler} label="Mes mensurations" sub="Taille, hanches, poitrine, bras, cuisses" onClick={() => setShowMeasure(true)} />
          </div>

          {/* Recent history */}
          {measurements.length > 0 && (
            <div>
              <span style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED, display: 'block', marginBottom: 10 }}>Historique ({measurements.length})</span>
              {measurements.slice(0, 5).map((m: any, i: number) => (
                <div key={m.id || i} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: '0.78rem', color: i === 0 ? GOLD : TEXT_MUTED, fontWeight: 600 }}>{format(new Date(m.date), 'd MMM yyyy', { locale: fr })}</span>
                  <div style={{ display: 'flex', gap: 10, fontFamily: FONT_BODY, fontSize: '0.72rem' }}>
                    {m.waist && <span style={{ color: TEXT_MUTED }}>T:{m.waist}</span>}
                    {m.chest && <span style={{ color: TEXT_MUTED }}>P:{m.chest}</span>}
                    {m.hips && <span style={{ color: TEXT_MUTED }}>H:{m.hips}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ PHOTOS SUB-TAB ═══ */}
      {subTab === 'photos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Photo grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button onClick={() => photoRef.current?.click()} style={{ aspectRatio: '1', border: `2px dashed ${BORDER}`, borderRadius: RADIUS_CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: BG_CARD, cursor: 'pointer' }}>
              {photoUploading
                ? <div style={{ width: 24, height: 24, border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <><Plus size={22} color={TEXT_MUTED} /><span style={{ fontSize: '0.55rem', color: TEXT_MUTED, fontWeight: 600 }}>Ajouter</span></>}
            </button>
            {progressPhotos.map((p: any, idx: number) => {
              const imgSrc = signedUrls[p.id] || ''
              const isAnalyzing = analyzingId === p.id
              const isExpanded = expandedAnalysis === p.id
              const hasAnalysis = !!analyses[p.id]
              return (
                <React.Fragment key={p.id}>
                  <div style={{ aspectRatio: '1', borderRadius: RADIUS_CARD, overflow: 'hidden', position: 'relative', border: `1px solid ${BORDER}`, background: BG_CARD }} className="photo-cell">
                    {imgSrc && <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Photo de progression" />}
                    {!imgSrc && (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={24} color={TEXT_MUTED} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '20px 8px 6px', fontSize: '0.55rem', color: '#fff', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 2 }}>
                      <span>{p.date ? format(new Date(p.date), 'd MMM', { locale: fr }) : ''}</span>
                      <button onClick={(e) => { e.stopPropagation(); analyzePhoto(p, idx) }}
                        style={{ background: hasAnalysis ? `${GOLD}30` : GOLD, border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, zIndex: 3 }}>
                        <Sparkles size={10} color={hasAnalysis ? GOLD : '#000'} />
                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: hasAnalysis ? GOLD : '#000' }}>IA</span>
                      </button>
                    </div>
                    <button onClick={() => deletePhoto(p)} className="photo-delete-btn" style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 200ms' }}>
                      <Trash2 size={13} color="#fff" />
                    </button>
                  </div>
                  {/* Analysis panel — spans full row */}
                  {isExpanded && (
                    <div style={{ gridColumn: '1 / -1', background: BG_CARD, border: `1px solid ${GOLD}30`, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {isAnalyzing ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 0' }}>
                          <div style={{ width: 20, height: 20, border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                          <span style={{ fontSize: '0.82rem', color: GOLD, fontWeight: 600 }}>Analyse en cours...</span>
                        </div>
                      ) : hasAnalysis ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Sparkles size={14} color={GOLD} />
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: GOLD, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Analyse IA</span>
                            </div>
                            <button onClick={() => setExpandedAnalysis(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                              <X size={14} color={TEXT_MUTED} />
                            </button>
                          </div>
                          <AnalysisDisplay text={analyses[p.id]} />
                          {coachId && (
                            <button onClick={() => shareAnalysis(p.id)} disabled={sharingId === p.id}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: `1px solid ${GOLD}40`, background: `${GOLD}08`, cursor: 'pointer', width: '100%' }}>
                              <Send size={14} color={GOLD} />
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: GOLD }}>
                                {sharingId === p.id ? 'Envoi...' : 'Partager avec mon coach'}
                              </span>
                            </button>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {progressPhotos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Camera size={36} color={TEXT_MUTED} style={{ marginBottom: 8 }} />
              <p style={{ fontFamily: FONT_BODY, fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Aucune photo encore. Ajoute ta première !</p>
            </div>
          )}

          <ActionBtn icon={Camera} label="Photo progression" sub="Ajouter une photo avant/après" onClick={() => photoRef.current?.click()} />

          {/* Compare button */}
          {progressPhotos.length >= 2 && (
            <button onClick={() => { setCompareIdx([progressPhotos.length - 1, 0]); setSliderValue(50); setShowCompare(true) }}
              style={{ width: '100%', padding: '14px', borderRadius: RADIUS_CARD, border: `1px solid ${GOLD_RULE}`, background: GOLD_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: '1rem' }}>📸</span>
              <span style={{ fontFamily: FONT_ALT, fontSize: '0.88rem', fontWeight: 700, color: GOLD, letterSpacing: '2px', textTransform: 'uppercase' }}>Comparer avant / après</span>
            </button>
          )}
        </div>
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

        return (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #222' }}>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem' }}>
                <span style={{ color: '#EF4444', fontWeight: 600 }}>Avant : {beforeDate}</span>
                <span style={{ color: '#22C55E', fontWeight: 600 }}>Après : {afterDate}</span>
              </div>
              <button onClick={() => setShowCompare(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#222', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#fff" />
              </button>
            </div>

            {/* Photo selectors */}
            <div style={{ display: 'flex', gap: 8, padding: '8px 16px', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.6rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase' }}>Avant</label>
                <select value={compareIdx[0]} onChange={e => setCompareIdx([Number(e.target.value), compareIdx[1]])}
                  style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '6px 8px', color: '#fff', fontSize: '0.75rem' }}>
                  {progressPhotos.map((p: any, i: number) => (
                    <option key={i} value={i}>{p.date ? format(new Date(p.date), 'd MMM yyyy', { locale: fr }) : `Photo ${i + 1}`}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.6rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase' }}>Après</label>
                <select value={compareIdx[1]} onChange={e => setCompareIdx([compareIdx[0], Number(e.target.value)])}
                  style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '6px 8px', color: '#fff', fontSize: '0.75rem' }}>
                  {progressPhotos.map((p: any, i: number) => (
                    <option key={i} value={i}>{p.date ? format(new Date(p.date), 'd MMM yyyy', { locale: fr }) : `Photo ${i + 1}`}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison area */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {/* After photo (full background) */}
              <img src={afterUrl} alt="Après" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
              {/* Before photo (clipped) */}
              <img src={beforeUrl} alt="Avant" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000', clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }} />
              {/* Slider line */}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${sliderValue}%`, width: 2, background: GOLD, transform: 'translateX(-50%)', zIndex: 2 }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 36, height: 36, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#000', fontSize: '0.7rem', fontWeight: 700 }}>⟷</span>
                </div>
              </div>
              {/* Range input overlay */}
              <input type="range" min={0} max={100} value={sliderValue} onChange={e => setSliderValue(Number(e.target.value))}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'ew-resize', zIndex: 3 }} />
              {/* Labels */}
              <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(239,68,68,0.8)', borderRadius: 6, padding: '3px 8px', fontSize: '0.65rem', fontWeight: 700, color: '#fff', zIndex: 2 }}>AVANT</div>
              <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(34,197,94,0.8)', borderRadius: 6, padding: '3px 8px', fontSize: '0.65rem', fontWeight: 700, color: '#fff', zIndex: 2 }}>APRÈS</div>
            </div>
          </div>
        )
      })()}

      {/* ═══ EVOLUTION SUB-TAB ═══ */}
      {subTab === 'evolution' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Metric selector */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {EVOLUTION_METRICS.map(m => (
              <button key={m.key} onClick={() => setEvoMetric(m.key)} style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 0, border: 'none', cursor: 'pointer',
                fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700,
                background: evoMetric === m.key ? GOLD : BG_CARD,
                color: evoMetric === m.key ? '#080808' : TEXT_MUTED, transition: 'all 150ms',
              }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          {evoData.length > 1 ? (() => {
            const values = evoData.map(d => d.value)
            const min = Math.min(...values) - 1
            const max = Math.max(...values) + 1
            const unit = EVOLUTION_METRICS.find(m => m.key === evoMetric)?.unit || ''
            const first = values[0], last = values[values.length - 1]
            const diff = last - first
            const diffPct = first !== 0 ? ((diff / first) * 100).toFixed(1) : '0'
            return (
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED }}>
                    {EVOLUTION_METRICS.find(m => m.key === evoMetric)?.label}
                  </span>
                  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 28, color: GOLD }}>
                    {last} {unit}
                  </span>
                </div>
                <svg viewBox="0 0 300 100" style={{ width: '100%', height: 100, overflow: 'visible' }} preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={y} x2="300" y2={y} stroke={TEXT_DIM} strokeWidth="0.5" />
                  ))}
                  <polyline
                    points={evoData.map((p, i) => {
                      const x = (i / (evoData.length - 1)) * 300
                      const y = 100 - ((p.value - min) / ((max - min) || 1)) * 96
                      return `${x.toFixed(1)},${y.toFixed(1)}`
                    }).join(' ')}
                    fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                  />
                  {/* Dots */}
                  {evoData.map((p, i) => {
                    const x = (i / (evoData.length - 1)) * 300
                    const y = 100 - ((p.value - min) / ((max - min) || 1)) * 96
                    return <circle key={i} cx={x} cy={y} r={i === evoData.length - 1 ? 5 : 3} fill={i === evoData.length - 1 ? GOLD : `${GOLD}80`} />
                  })}
                </svg>
                {/* Date labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED }}>{format(new Date(evoData[0].date), 'd MMM', { locale: fr })}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED }}>{format(new Date(evoData[evoData.length - 1].date), 'd MMM', { locale: fr })}</span>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden', marginTop: 14 }}>
                  <div style={{ background: BG_CARD, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED }}>Début</div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', color: TEXT_PRIMARY }}>{first} {unit}</div>
                  </div>
                  <div style={{ background: BG_CARD, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED }}>Actuel</div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', color: GOLD }}>{last} {unit}</div>
                  </div>
                  <div style={{ background: BG_CARD, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED }}>Diff</div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', color: diff > 0 ? '#EF4444' : diff < 0 ? GREEN : TEXT_MUTED }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} ({diffPct}%)
                    </div>
                  </div>
                </div>
              </div>
            )
          })() : (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 20px', textAlign: 'center' }}>
              <TrendingUp size={32} color={TEXT_MUTED} style={{ marginBottom: 8 }} />
              <p style={{ fontFamily: FONT_BODY, fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Pas assez de données pour ce graphique.</p>
              <p style={{ fontFamily: FONT_BODY, fontSize: '0.72rem', color: TEXT_MUTED, margin: '6px 0 0' }}>Ajoute au moins 2 mesures.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ ANALYTICS SUB-TAB ═══ */}
      {subTab === 'analytics' && (
        <>
        <AbsCalculator
          currentWeight={currentWeight}
          height={profile?.height}
          bodyFat={latestMeasure?.body_fat}
          deficit={profile?.calorie_goal && profile?.tdee ? profile.calorie_goal - profile.tdee : 0}
          objective={profile?.objective}
          session={session}
          supabase={supabase}
          profile={profile}
        />
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
        />
        </>
      )}

      <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProgressPhoto} />

      {/* ── WEIGHT MODAL ── */}
      {showWeight && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: `${RADIUS_CARD}px ${RADIUS_CARD}px 0 0`, padding: '28px 20px 48px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h3 style={{ fontFamily: FONT_ALT, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>ENREGISTRER MON POIDS</h3>
              <button onClick={() => { setShowWeight(false); setWeightVal('') }} style={{ width: 36, height: 36, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <input type="number" inputMode="decimal" step="0.1" min="0" value={weightVal} onChange={e => setWeightVal(e.target.value)} placeholder="0.0" autoFocus
                style={{ width: '100%', background: BG_BASE, border: `2px solid ${weightVal ? GOLD : BORDER}`, borderRadius: RADIUS_CARD, padding: '22px 56px 22px 20px', color: TEXT_PRIMARY, fontSize: '3.2rem', fontFamily: FONT_DISPLAY, textAlign: 'center', outline: 'none', transition: 'border-color 200ms' }} />
              <span style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, fontSize: '1rem', fontWeight: 600 }}>kg</span>
            </div>
            {weightHistory30.length > 0 && <p style={{ textAlign: 'center', fontFamily: FONT_BODY, color: TEXT_MUTED, fontSize: '0.75rem', marginBottom: 20 }}>Précédent : {weightHistory30[weightHistory30.length - 1].poids} kg</p>}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: TEXT_MUTED, marginBottom: 8 }}>Date</label>
              <input type="date" value={weightDate} onChange={e => setWeightDate(e.target.value)} style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '14px 16px', color: TEXT_PRIMARY, fontFamily: FONT_BODY, fontSize: '1rem', outline: 'none', colorScheme: 'dark', minHeight: 48 }} />
            </div>
            <button onClick={handleSaveWeight} disabled={!weightVal || savingWeight} style={{ width: '100%', background: weightVal && !savingWeight ? GOLD : '#2A2A2A', color: weightVal && !savingWeight ? '#000' : TEXT_MUTED, fontWeight: 700, padding: '17px', borderRadius: RADIUS_CARD, border: 'none', cursor: weightVal && !savingWeight ? 'pointer' : 'default', fontFamily: FONT_ALT, fontSize: '1.1rem', letterSpacing: '2px', textTransform: 'uppercase', minHeight: 56 }}>
              {savingWeight ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* ── MEASUREMENTS MODAL ── */}
      {showMeasure && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto' }}>
          <div style={{ background: BG_CARD, borderRadius: `${RADIUS_CARD}px ${RADIUS_CARD}px 0 0`, padding: '28px 20px 48px', marginTop: 60, minHeight: 'calc(100vh - 60px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontFamily: FONT_ALT, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>MES MENSURATIONS</h3>
              <button onClick={() => { setShowMeasure(false); setMeasureForm({ waist: '', hips: '', chest: '', arms: '', thighs: '' }) }} style={{ width: 36, height: 36, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {MEASURE_FIELDS.map(({ key, label, unit }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG_BASE, border: `1px solid ${measureForm[key] ? GOLD + '60' : BORDER}`, borderRadius: RADIUS_CARD, padding: '0 16px', minHeight: 56, transition: 'border-color 200ms' }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: '0.88rem', color: TEXT_MUTED, flex: 1 }}>{label}</span>
                  <input type="number" inputMode="decimal" step="0.1" min="0" value={measureForm[key]} onChange={e => setMeasureForm(p => ({ ...p, [key]: e.target.value }))} placeholder="—"
                    style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '1.1rem', fontFamily: FONT_DISPLAY, textAlign: 'right', width: 72, outline: 'none', border: 'none', padding: '14px 0' }} />
                  <span style={{ fontFamily: FONT_BODY, color: TEXT_MUTED, fontSize: '0.78rem', width: 28 }}>{unit}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: TEXT_MUTED, marginBottom: 8 }}>Date</label>
              <input type="date" value={measureDate} onChange={e => setMeasureDate(e.target.value)} style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '14px 16px', color: TEXT_PRIMARY, fontFamily: FONT_BODY, fontSize: '1rem', outline: 'none', colorScheme: 'dark', minHeight: 48 }} />
            </div>
            <button onClick={handleSaveMeasure} disabled={Object.values(measureForm).every(v => !v) || savingMeasure}
              style={{ width: '100%', background: Object.values(measureForm).some(v => v) && !savingMeasure ? GOLD : '#2A2A2A', color: Object.values(measureForm).some(v => v) && !savingMeasure ? '#000' : TEXT_MUTED, fontWeight: 700, padding: '17px', borderRadius: RADIUS_CARD, border: 'none', cursor: Object.values(measureForm).some(v => v) && !savingMeasure ? 'pointer' : 'default', fontFamily: FONT_ALT, fontSize: '1.1rem', letterSpacing: '2px', textTransform: 'uppercase', minHeight: 56, marginBottom: 32 }}>
              {savingMeasure ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Analysis Display ── */
function AnalysisDisplay({ text }: { text: string }) {
  const sections = [
    { title: 'ANALYSE VISUELLE', color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
    { title: 'COHÉRENCE PROGRAMME', color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
    { title: 'POINTS POSITIFS', color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
    { title: 'AXES DE PROGRESSION', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
    { title: 'RECOMMANDATION PRIORITAIRE', color: '#C9A84C', bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.2)' },
  ]

  // Try to split by numbered sections
  const parts: { title: string; content: string; color: string; bg: string; border: string }[] = []
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    // Match patterns like "1.", "1. 👁 ANALYSE", "**1.**", emoji prefixes, etc.
    const regex = new RegExp(`(?:^|\\n)\\**${i + 1}\\.\\s*(?:[👁⚖️✅🎯🚀]\\s*)?(?:\\**${s.title.split(' ')[0]}[^\\n]*)?[:\\s]*`, 'i')
    const nextRegex = i < sections.length - 1 ? new RegExp(`(?:^|\\n)\\**${i + 2}\\.\\s*`, 'i') : null
    const match = text.match(regex)
    if (match) {
      const startIdx = (match.index || 0) + match[0].length
      const endIdx = nextRegex ? text.slice(startIdx).search(nextRegex) : -1
      const content = endIdx >= 0 ? text.slice(startIdx, startIdx + endIdx).trim() : (i === sections.length - 1 ? text.slice(startIdx).trim() : '')
      if (content) parts.push({ ...s, content })
    }
  }

  // Fallback: show raw text if parsing failed
  if (parts.length === 0) {
    return <div style={{ fontSize: '0.82rem', color: '#D1D5DB', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{text}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {parts.map(({ title, content, color, bg, border }) => (
        <div key={title} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{title}</div>
          <p style={{ fontSize: '0.78rem', color: '#D1D5DB', lineHeight: 1.55, margin: 0 }}>{content}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Action Button ── */
function ActionBtn({ icon: Icon, label, sub, onClick }: { icon: any; label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', width: '100%', minHeight: 60 }}>
      <div style={{ width: 38, height: 38, borderRadius: RADIUS_CARD, background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={GOLD} />
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontFamily: FONT_ALT, fontSize: '0.92rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY }}>+ {label.toUpperCase()}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: '0.68rem', color: TEXT_MUTED, marginTop: 2 }}>{sub}</div>
      </div>
    </button>
  )
}
