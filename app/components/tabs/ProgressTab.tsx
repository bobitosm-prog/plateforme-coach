'use client'
import React, { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Scale, Ruler, Camera, TrendingUp, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  BG_BASE, BG_CARD, BORDER, ORANGE, GREEN, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD,
} from '../../../lib/design-tokens'

const new Date().toISOString().split('T')[0] = new Date().toISOString().split('T')[0]

const MEASURE_FIELDS = [
  { key: 'waist',  label: 'Tour de taille',    unit: 'cm' },
  { key: 'hips',   label: 'Tour de hanches',   unit: 'cm' },
  { key: 'chest',  label: 'Tour de poitrine',  unit: 'cm' },
  { key: 'arms',   label: 'Tour de bras',      unit: 'cm' },
  { key: 'thighs', label: 'Tour de cuisses',   unit: 'cm' },
]

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
}

export default function ProgressTab({
  supabase,
  session,
  weightHistory30,
  measurements,
  progressPhotos,
  photoRef,
  photoUploading,
  uploadProgressPhoto,
  deletePhoto,
  setModal,
  chartMin,
  chartMax,
  onRefresh,
}: ProgressTabProps) {
  const latestMeasure = measurements[0]

  // ── Weight modal state ──
  const [showWeight, setShowWeight] = useState(false)
  const [weightVal, setWeightVal] = useState('')
  const [weightDate, setWeightDate] = useState(() => new Date().toISOString().split('T')[0])
  const [savingWeight, setSavingWeight] = useState(false)

  // Local chart data so we can append without waiting for parent refetch
  const [localWeights, setLocalWeights] = useState<{ date: string; poids: number }[]>([])
  const mergedWeights = React.useMemo(() => {
    const all = [...weightHistory30, ...localWeights]
    const seen = new Set<string>()
    return all
      .filter(w => { const k = w.date + w.poids; const ok = !seen.has(k); seen.add(k); return ok })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [weightHistory30, localWeights])

  const cMin = mergedWeights.length > 0 ? Math.min(...mergedWeights.map(p => p.poids)) - 1 : chartMin
  const cMax = mergedWeights.length > 0 ? Math.max(...mergedWeights.map(p => p.poids)) + 1 : chartMax

  async function handleSaveWeight() {
    if (!weightVal || !session?.user?.id) return
    setSavingWeight(true)
    const poids = parseFloat(weightVal)
    const { error } = await supabase
      .from('weight_logs')
      .insert({ user_id: session.user.id, date: weightDate, poids })
    if (error) {
      toast.error('Erreur lors de l\'enregistrement')
    } else {
      setLocalWeights(prev => [...prev, { date: weightDate, poids }])
      toast.success('Poids enregistré !')
      setShowWeight(false)
      setWeightVal('')
      setWeightDate(new Date().toISOString().split('T')[0])
      onRefresh()
    }
    setSavingWeight(false)
  }

  // ── Measurements modal state ──
  const [showMeasure, setShowMeasure] = useState(false)
  const [measureForm, setMeasureForm] = useState<Record<string, string>>({
    waist: '', hips: '', chest: '', arms: '', thighs: '',
  })
  const [measureDate, setMeasureDate] = useState(() => new Date().toISOString().split('T')[0])
  const [savingMeasure, setSavingMeasure] = useState(false)

  async function handleSaveMeasure() {
    if (!session?.user?.id) return
    const measureData = measureForm
    const payload: Record<string, unknown> = { user_id: session.user.id, date: measureDate }
    if (measureData.waist) payload.waist = Number(measureData.waist)
    if (measureData.hips) payload.hips = Number(measureData.hips)
    if (measureData.chest) payload.chest = Number(measureData.chest)
    if (measureData.arms) payload.left_arm = Number(measureData.arms)
    if (measureData.arms) payload.right_arm = Number(measureData.arms)
    if (measureData.thighs) payload.left_thigh = Number(measureData.thighs)
    if (measureData.thighs) payload.right_thigh = Number(measureData.thighs)
    if (Object.keys(payload).length <= 2) return
    setSavingMeasure(true)
    console.log('[measurements] payload:', JSON.stringify(payload))
    const { error } = await supabase.from('body_measurements').insert(payload)
    if (error) {
      console.log('[measurements] error:', JSON.stringify(error))
      toast.error('Erreur lors de l\'enregistrement')
    } else {
      toast.success('Mensurations enregistrées !')
      setShowMeasure(false)
      setMeasureForm({ waist: '', hips: '', chest: '', arms: '', thighs: '' })
      setMeasureDate(new Date().toISOString().split('T')[0])
      onRefresh()
    }
    setSavingMeasure(false)
  }

  const displayWeights = mergedWeights.length > 0 ? mergedWeights : weightHistory30

  return (
    <div style={{ padding: '20px 20px 20px', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>PROGRESSION</h1>
      </div>

      {/* Weight chart */}
      {displayWeights.length > 1 ? (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED }}>Évolution du poids (30j)</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: ORANGE }}>
              {displayWeights[displayWeights.length - 1]?.poids} kg
            </span>
          </div>
          <svg viewBox="0 0 300 90" style={{ width: '100%', height: 90, overflow: 'visible' }} preserveAspectRatio="none">
            <polyline
              points={displayWeights.map((p, i) => {
                const x = (i / (displayWeights.length - 1)) * 300
                const y = 90 - ((p.poids - cMin) / ((cMax - cMin) || 1)) * 86
                return `${x.toFixed(1)},${y.toFixed(1)}`
              }).join(' ')}
              fill="none" stroke={ORANGE} strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round"
            />
            <circle
              cx={300}
              cy={90 - ((displayWeights[displayWeights.length - 1]?.poids - cMin) / ((cMax - cMin) || 1)) * 86}
              r="5" fill={ORANGE}
            />
          </svg>
        </div>
      ) : (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '32px 20px', textAlign: 'center', marginBottom: 16 }}>
          <TrendingUp size={32} color={TEXT_MUTED} style={{ marginBottom: 8 }} />
          <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Pas encore assez de données poids.</p>
        </div>
      )}

      {/* Latest measurements */}
      {latestMeasure && (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED }}>Dernières mesures</span>
            <span style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>{format(new Date(latestMeasure.date), 'd MMMM yyyy', { locale: fr })}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Poitrine', latestMeasure.chest, 'cm'],
              ['Taille', latestMeasure.waist, 'cm'],
              ['Hanches', latestMeasure.hips, 'cm'],
              ['Bras', latestMeasure.left_arm, 'cm'],
              ['Cuisses', latestMeasure.left_thigh, 'cm'],
              ['% Graisse', latestMeasure.body_fat, '%'],
              ['Masse Musc', latestMeasure.muscle_mass, 'kg'],
            ].map(([l, v, u]) => v != null && (
              <div key={l as string} style={{ background: BG_BASE, borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: TEXT_MUTED }}>{l}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT_PRIMARY }}>{v}<span style={{ fontSize: '0.65rem', color: TEXT_MUTED, marginLeft: 2 }}>{u}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress photos grid */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED, display: 'block', marginBottom: 10 }}>Photos progression</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <button onClick={() => photoRef.current?.click()} style={{ aspectRatio: '1', border: `2px dashed ${BORDER}`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG_CARD, cursor: 'pointer' }}>
            {photoUploading
              ? <div style={{ width: 24, height: 24, border: `2px solid ${ORANGE}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <Plus size={22} color={TEXT_MUTED} />}
          </button>
          {progressPhotos.map(p => {
            const imgSrc = supabase.storage.from('progress-photos').getPublicUrl(p.photo_url).data.publicUrl
            return (
              <div key={p.id} style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', position: 'relative' }} className="photo-cell">
                <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                <button
                  onClick={() => deletePhoto(p)}
                  className="photo-delete-btn"
                  style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 200ms' }}
                >
                  <Trash2 size={13} color="#fff" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => setShowWeight(true)}
          style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', width: '100%', minHeight: 64 }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F9731615', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Scale size={20} color={ORANGE} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', color: TEXT_PRIMARY }}>+ ENREGISTRER MON POIDS</div>
            <div style={{ fontSize: '0.72rem', color: TEXT_MUTED, marginTop: 2 }}>Ajouter une mesure kg avec date</div>
          </div>
        </button>
        <button
          onClick={() => setShowMeasure(true)}
          style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', width: '100%', minHeight: 64 }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F9731615', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ruler size={20} color={ORANGE} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', color: TEXT_PRIMARY }}>+ MES MENSURATIONS</div>
            <div style={{ fontSize: '0.72rem', color: TEXT_MUTED, marginTop: 2 }}>Taille, hanches, poitrine, bras, cuisses</div>
          </div>
        </button>
        <button
          onClick={() => photoRef.current?.click()}
          style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', width: '100%', minHeight: 64 }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F9731615', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Camera size={20} color={ORANGE} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', color: TEXT_PRIMARY }}>+ PHOTO PROGRESSION</div>
            <div style={{ fontSize: '0.72rem', color: TEXT_MUTED, marginTop: 2 }}>Ajouter une photo avant/après</div>
          </div>
        </button>
      </div>

      <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProgressPhoto} />

      {/* ── WEIGHT MODAL ── */}
      {showWeight && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: '24px 24px 0 0', padding: '28px 20px 48px', width: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>ENREGISTRER MON POIDS</h3>
              <button
                onClick={() => { setShowWeight(false); setWeightVal(''); setWeightDate(new Date().toISOString().split('T')[0]) }}
                style={{ width: 36, height: 36, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color={TEXT_MUTED} />
              </button>
            </div>

            {/* Big weight input */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={weightVal}
                onChange={e => setWeightVal(e.target.value)}
                placeholder="0.0"
                autoFocus
                style={{
                  width: '100%', background: BG_BASE, border: `2px solid ${weightVal ? ORANGE : BORDER}`,
                  borderRadius: 16, padding: '22px 56px 22px 20px',
                  color: TEXT_PRIMARY, fontSize: '3.2rem',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                  textAlign: 'center', outline: 'none', transition: 'border-color 200ms',
                }}
              />
              <span style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, fontSize: '1rem', fontWeight: 600 }}>kg</span>
            </div>

            {/* Previous weight hint */}
            {weightHistory30.length > 0 && (
              <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.75rem', marginBottom: 20 }}>
                Précédent : {weightHistory30[weightHistory30.length - 1].poids} kg
              </p>
            )}

            {/* Date */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: TEXT_MUTED, marginBottom: 8 }}>Date</label>
              <input
                type="date"
                value={weightDate}
                onChange={e => setWeightDate(e.target.value)}
                style={{
                  width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`,
                  borderRadius: 12, padding: '14px 16px', color: TEXT_PRIMARY,
                  fontSize: '1rem', outline: 'none', colorScheme: 'dark', minHeight: 48,
                }}
              />
            </div>

            {/* Save */}
            <button
              onClick={handleSaveWeight}
              disabled={!weightVal || savingWeight}
              style={{
                width: '100%', background: weightVal && !savingWeight ? GREEN : '#2A2A2A',
                color: weightVal && !savingWeight ? '#000' : TEXT_MUTED,
                fontWeight: 700, padding: '17px', borderRadius: 14, border: 'none',
                cursor: weightVal && !savingWeight ? 'pointer' : 'default',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem',
                letterSpacing: '0.08em', textTransform: 'uppercase', minHeight: 56,
                transition: 'all 200ms',
              }}
            >
              {savingWeight ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* ── MEASUREMENTS MODAL ── */}
      {showMeasure && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto' }}>
          <div style={{ background: BG_CARD, borderRadius: '24px 24px 0 0', padding: '28px 20px 48px', marginTop: 60, minHeight: 'calc(100vh - 60px)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>MES MENSURATIONS</h3>
              <button
                onClick={() => { setShowMeasure(false); setMeasureForm({ waist: '', hips: '', chest: '', arms: '', thighs: '' }); setMeasureDate(new Date().toISOString().split('T')[0]) }}
                style={{ width: 36, height: 36, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color={TEXT_MUTED} />
              </button>
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {MEASURE_FIELDS.map(({ key, label, unit }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG_BASE, border: `1px solid ${measureForm[key] ? ORANGE + '60' : BORDER}`, borderRadius: 12, padding: '0 16px', minHeight: 56, transition: 'border-color 200ms' }}>
                  <span style={{ fontSize: '0.88rem', color: TEXT_MUTED, flex: 1 }}>{label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={measureForm[key]}
                    onChange={e => setMeasureForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder="—"
                    style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '1.1rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textAlign: 'right', width: 72, outline: 'none', border: 'none', padding: '14px 0' }}
                  />
                  <span style={{ color: TEXT_MUTED, fontSize: '0.78rem', width: 28 }}>{unit}</span>
                </div>
              ))}
            </div>

            {/* Date */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: TEXT_MUTED, marginBottom: 8 }}>Date</label>
              <input
                type="date"
                value={measureDate}
                onChange={e => setMeasureDate(e.target.value)}
                style={{
                  width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`,
                  borderRadius: 12, padding: '14px 16px', color: TEXT_PRIMARY,
                  fontSize: '1rem', outline: 'none', colorScheme: 'dark', minHeight: 48,
                }}
              />
            </div>

            {/* Save */}
            <button
              onClick={handleSaveMeasure}
              disabled={Object.values(measureForm).every(v => !v) || savingMeasure}
              style={{
                width: '100%',
                background: Object.values(measureForm).some(v => v) && !savingMeasure ? GREEN : '#2A2A2A',
                color: Object.values(measureForm).some(v => v) && !savingMeasure ? '#000' : TEXT_MUTED,
                fontWeight: 700, padding: '17px', borderRadius: 14, border: 'none',
                cursor: Object.values(measureForm).some(v => v) && !savingMeasure ? 'pointer' : 'default',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem',
                letterSpacing: '0.08em', textTransform: 'uppercase', minHeight: 56,
                transition: 'all 200ms', marginBottom: 32,
              }}
            >
              {savingMeasure ? 'Enregistrement…' : 'Sauvegarder'}
            </button>

            {/* Last 3 measurements history */}
            {measurements.length > 0 && (
              <div>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED, display: 'block', marginBottom: 12 }}>Historique récent</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {measurements.slice(0, 3).map((m: any, i: number) => (
                    <div key={m.id || i} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: i === 0 ? ORANGE : TEXT_MUTED }}>
                          {format(new Date(m.date), 'd MMMM yyyy', { locale: fr })}
                        </span>
                        {i === 0 && (
                          <span style={{ fontSize: '0.6rem', color: ORANGE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: '#F9731615', borderRadius: 6, padding: '2px 8px' }}>
                            Dernier
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                        {MEASURE_FIELDS.map(({ key, label }) => {
                          const val = m[key]
                          return (
                            <div key={key} style={{ textAlign: 'center' }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color: val != null ? TEXT_PRIMARY : TEXT_MUTED }}>
                                {val != null ? val : '—'}
                              </div>
                              <div style={{ fontSize: '0.55rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>
                                {label.replace('Tour de ', '')}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
