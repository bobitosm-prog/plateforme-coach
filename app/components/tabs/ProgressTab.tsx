'use client'
import React, { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Scale, Ruler, Camera, TrendingUp, TrendingDown, Plus, Trash2, X, ChevronUp, ChevronDown, Download, BarChart3 } from 'lucide-react'
import { downloadCsv } from '../../../lib/exportCsv'
import { toast } from 'sonner'
import {
  BG_BASE, BG_CARD, BORDER, ORANGE, GREEN, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD,
} from '../../../lib/design-tokens'
import AnalyticsSection from '../AnalyticsSection'

const GOLD = '#C9A84C'

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
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>PROGRESSION</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {subTab === 'mesures' && displayWeights.length > 0 && (
            <button onClick={() => {
              const rows = displayWeights.map((w, i) => [w.date, w.poids, i > 0 ? (w.poids - displayWeights[i-1].poids).toFixed(1) : ''])
              downloadCsv('poids.csv', ['Date', 'Poids (kg)', 'Variation'], rows)
            }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: TEXT_MUTED, fontSize: '0.68rem', fontWeight: 600 }}>
              <Download size={12} /> Poids
            </button>
          )}
          {subTab === 'mesures' && measurements.length > 0 && (
            <button onClick={() => {
              const rows = measurements.map((m: any) => [m.date, m.waist ?? '', m.hips ?? '', m.chest ?? '', m.left_arm ?? '', m.left_thigh ?? '', m.body_fat ?? ''])
              downloadCsv('mensurations.csv', ['Date', 'Taille (cm)', 'Hanches (cm)', 'Poitrine (cm)', 'Bras (cm)', 'Cuisses (cm)', '% MG'], rows)
            }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: TEXT_MUTED, fontSize: '0.68rem', fontWeight: 600 }}>
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
              padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              background: active ? `${GOLD}20` : BG_CARD,
              color: active ? GOLD : TEXT_MUTED, transition: 'all 150ms',
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
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED }}>Poids (30j)</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: GOLD }}>{displayWeights[displayWeights.length - 1]?.poids} kg</span>
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
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED }}>Dernières mesures</span>
                <span style={{ fontSize: '0.68rem', color: TEXT_MUTED }}>{format(new Date(latestMeasure.date), 'd MMM yyyy', { locale: fr })}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
                    <div key={l} style={{ background: BG_BASE, borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: TEXT_MUTED }}>{l}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT_PRIMARY }}>{v}<span style={{ fontSize: '0.65rem', color: TEXT_MUTED, marginLeft: 2 }}>{u}</span></span>
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
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED, display: 'block', marginBottom: 10 }}>Historique ({measurements.length})</span>
              {measurements.slice(0, 5).map((m: any, i: number) => (
                <div key={m.id || i} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: i === 0 ? GOLD : TEXT_MUTED, fontWeight: 600 }}>{format(new Date(m.date), 'd MMM yyyy', { locale: fr })}</span>
                  <div style={{ display: 'flex', gap: 10, fontSize: '0.72rem' }}>
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
            <button onClick={() => photoRef.current?.click()} style={{ aspectRatio: '1', border: `2px dashed ${BORDER}`, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: BG_CARD, cursor: 'pointer' }}>
              {photoUploading
                ? <div style={{ width: 24, height: 24, border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <><Plus size={22} color={TEXT_MUTED} /><span style={{ fontSize: '0.55rem', color: TEXT_MUTED, fontWeight: 600 }}>Ajouter</span></>}
            </button>
            {progressPhotos.map((p: any) => {
              const imgSrc = supabase.storage.from('progress-photos').getPublicUrl(p.photo_url).data.publicUrl
              return (
                <div key={p.id} style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', position: 'relative' }} className="photo-cell">
                  <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '16px 8px 6px', fontSize: '0.55rem', color: '#fff', fontWeight: 600 }}>
                    {p.date ? format(new Date(p.date), 'd MMM', { locale: fr }) : ''}
                  </div>
                  <button onClick={() => deletePhoto(p)} className="photo-delete-btn" style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 200ms' }}>
                    <Trash2 size={13} color="#fff" />
                  </button>
                </div>
              )
            })}
          </div>

          {progressPhotos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Camera size={36} color={TEXT_MUTED} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Aucune photo encore. Ajoute ta première !</p>
            </div>
          )}

          <ActionBtn icon={Camera} label="Photo progression" sub="Ajouter une photo avant/après" onClick={() => photoRef.current?.click()} />

          {/* Compare button */}
          {progressPhotos.length >= 2 && (
            <button onClick={() => { setCompareIdx([progressPhotos.length - 1, 0]); setSliderValue(50); setShowCompare(true) }}
              style={{ width: '100%', padding: '14px', borderRadius: 14, border: `1px solid ${GOLD}40`, background: `${GOLD}08`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: '1rem' }}>📸</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.88rem', fontWeight: 700, color: GOLD, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Comparer avant / après</span>
            </button>
          )}
        </div>
      )}

      {/* ═══ PHOTO COMPARE MODAL ═══ */}
      {showCompare && progressPhotos.length >= 2 && (() => {
        const beforePhoto = progressPhotos[compareIdx[0]]
        const afterPhoto = progressPhotos[compareIdx[1]]
        if (!beforePhoto || !afterPhoto) return null
        const beforeUrl = supabase.storage.from('progress-photos').getPublicUrl(beforePhoto.photo_url).data.publicUrl
        const afterUrl = supabase.storage.from('progress-photos').getPublicUrl(afterPhoto.photo_url).data.publicUrl
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
                flexShrink: 0, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700,
                background: evoMetric === m.key ? `${GOLD}20` : BG_CARD,
                color: evoMetric === m.key ? GOLD : TEXT_MUTED, transition: 'all 150ms',
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
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED }}>
                    {EVOLUTION_METRICS.find(m => m.key === evoMetric)?.label}
                  </span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: GOLD }}>
                    {last} {unit}
                  </span>
                </div>
                <svg viewBox="0 0 300 100" style={{ width: '100%', height: 100, overflow: 'visible' }} preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#1A1A1A" strokeWidth="0.5" />
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
                  <span style={{ fontSize: '0.6rem', color: TEXT_MUTED }}>{format(new Date(evoData[0].date), 'd MMM', { locale: fr })}</span>
                  <span style={{ fontSize: '0.6rem', color: TEXT_MUTED }}>{format(new Date(evoData[evoData.length - 1].date), 'd MMM', { locale: fr })}</span>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
                  <div style={{ background: BG_BASE, borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.58rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase' }}>Début</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color: TEXT_PRIMARY }}>{first} {unit}</div>
                  </div>
                  <div style={{ background: BG_BASE, borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.58rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase' }}>Actuel</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color: GOLD }}>{last} {unit}</div>
                  </div>
                  <div style={{ background: BG_BASE, borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.58rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase' }}>Diff</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color: diff > 0 ? '#EF4444' : diff < 0 ? GREEN : TEXT_MUTED }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} ({diffPct}%)
                    </div>
                  </div>
                </div>
              </div>
            )
          })() : (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '40px 20px', textAlign: 'center' }}>
              <TrendingUp size={32} color={TEXT_MUTED} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Pas assez de données pour ce graphique.</p>
              <p style={{ fontSize: '0.72rem', color: TEXT_MUTED, margin: '6px 0 0' }}>Ajoute au moins 2 mesures.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ ANALYTICS SUB-TAB ═══ */}
      {subTab === 'analytics' && (
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
      )}

      <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProgressPhoto} />

      {/* ── WEIGHT MODAL ── */}
      {showWeight && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: '24px 24px 0 0', padding: '28px 20px 48px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>ENREGISTRER MON POIDS</h3>
              <button onClick={() => { setShowWeight(false); setWeightVal('') }} style={{ width: 36, height: 36, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <input type="number" inputMode="decimal" step="0.1" min="0" value={weightVal} onChange={e => setWeightVal(e.target.value)} placeholder="0.0" autoFocus
                style={{ width: '100%', background: BG_BASE, border: `2px solid ${weightVal ? GOLD : BORDER}`, borderRadius: 16, padding: '22px 56px 22px 20px', color: TEXT_PRIMARY, fontSize: '3.2rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textAlign: 'center', outline: 'none', transition: 'border-color 200ms' }} />
              <span style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, fontSize: '1rem', fontWeight: 600 }}>kg</span>
            </div>
            {weightHistory30.length > 0 && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.75rem', marginBottom: 20 }}>Précédent : {weightHistory30[weightHistory30.length - 1].poids} kg</p>}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: TEXT_MUTED, marginBottom: 8 }}>Date</label>
              <input type="date" value={weightDate} onChange={e => setWeightDate(e.target.value)} style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', color: TEXT_PRIMARY, fontSize: '1rem', outline: 'none', colorScheme: 'dark', minHeight: 48 }} />
            </div>
            <button onClick={handleSaveWeight} disabled={!weightVal || savingWeight} style={{ width: '100%', background: weightVal && !savingWeight ? GOLD : '#2A2A2A', color: weightVal && !savingWeight ? '#000' : TEXT_MUTED, fontWeight: 700, padding: '17px', borderRadius: 14, border: 'none', cursor: weightVal && !savingWeight ? 'pointer' : 'default', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', letterSpacing: '0.08em', textTransform: 'uppercase', minHeight: 56 }}>
              {savingWeight ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* ── MEASUREMENTS MODAL ── */}
      {showMeasure && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto' }}>
          <div style={{ background: BG_CARD, borderRadius: '24px 24px 0 0', padding: '28px 20px 48px', marginTop: 60, minHeight: 'calc(100vh - 60px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>MES MENSURATIONS</h3>
              <button onClick={() => { setShowMeasure(false); setMeasureForm({ waist: '', hips: '', chest: '', arms: '', thighs: '' }) }} style={{ width: 36, height: 36, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {MEASURE_FIELDS.map(({ key, label, unit }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG_BASE, border: `1px solid ${measureForm[key] ? GOLD + '60' : BORDER}`, borderRadius: 12, padding: '0 16px', minHeight: 56, transition: 'border-color 200ms' }}>
                  <span style={{ fontSize: '0.88rem', color: TEXT_MUTED, flex: 1 }}>{label}</span>
                  <input type="number" inputMode="decimal" step="0.1" min="0" value={measureForm[key]} onChange={e => setMeasureForm(p => ({ ...p, [key]: e.target.value }))} placeholder="—"
                    style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '1.1rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textAlign: 'right', width: 72, outline: 'none', border: 'none', padding: '14px 0' }} />
                  <span style={{ color: TEXT_MUTED, fontSize: '0.78rem', width: 28 }}>{unit}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: TEXT_MUTED, marginBottom: 8 }}>Date</label>
              <input type="date" value={measureDate} onChange={e => setMeasureDate(e.target.value)} style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', color: TEXT_PRIMARY, fontSize: '1rem', outline: 'none', colorScheme: 'dark', minHeight: 48 }} />
            </div>
            <button onClick={handleSaveMeasure} disabled={Object.values(measureForm).every(v => !v) || savingMeasure}
              style={{ width: '100%', background: Object.values(measureForm).some(v => v) && !savingMeasure ? GOLD : '#2A2A2A', color: Object.values(measureForm).some(v => v) && !savingMeasure ? '#000' : TEXT_MUTED, fontWeight: 700, padding: '17px', borderRadius: 14, border: 'none', cursor: Object.values(measureForm).some(v => v) && !savingMeasure ? 'pointer' : 'default', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', letterSpacing: '0.08em', textTransform: 'uppercase', minHeight: 56, marginBottom: 32 }}>
              {savingMeasure ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Action Button ── */
function ActionBtn({ icon: Icon, label, sub, onClick }: { icon: any; label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', width: '100%', minHeight: 60 }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: `${GOLD}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={GOLD} />
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.92rem', fontWeight: 700, letterSpacing: '0.06em', color: TEXT_PRIMARY }}>+ {label.toUpperCase()}</div>
        <div style={{ fontSize: '0.68rem', color: TEXT_MUTED, marginTop: 2 }}>{sub}</div>
      </div>
    </button>
  )
}
