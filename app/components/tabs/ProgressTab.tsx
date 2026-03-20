'use client'
import React from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Scale, Ruler, Camera, TrendingUp, Plus, Trash2 } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BORDER, ORANGE, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD,
} from '../../../lib/design-tokens'

interface ProgressTabProps {
  supabase: any
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
}

export default function ProgressTab({
  supabase,
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
}: ProgressTabProps) {
  const latestMeasure = measurements[0]

  return (
    <div style={{ padding: '20px 20px 20px', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>PROGRESSION</h1>
      </div>

      {/* Weight chart */}
      {weightHistory30.length > 1 ? (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MUTED }}>Évolution du poids (30j)</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: ORANGE }}>
              {weightHistory30[weightHistory30.length - 1]?.poids} kg
            </span>
          </div>
          <svg viewBox="0 0 300 90" style={{ width: '100%', height: 90, overflow: 'visible' }} preserveAspectRatio="none">
            <polyline
              points={weightHistory30.map((p, i) => {
                const x = (i / (weightHistory30.length - 1)) * 300
                const y = 90 - ((p.poids - chartMin) / ((chartMax - chartMin) || 1)) * 86
                return `${x.toFixed(1)},${y.toFixed(1)}`
              }).join(' ')}
              fill="none" stroke={ORANGE} strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round"
            />
            <circle
              cx={300}
              cy={90 - ((weightHistory30[weightHistory30.length - 1]?.poids - chartMin) / ((chartMax - chartMin) || 1)) * 86}
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
              ['Bras G', latestMeasure.left_arm, 'cm'],
              ['Bras D', latestMeasure.right_arm, 'cm'],
              ['% Graisse', latestMeasure.body_fat, '%'],
              ['Masse Musc', latestMeasure.muscle_mass, 'kg'],
            ].map(([l, v, u]) => v && (
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
              <div key={p.id} style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', position: 'relative' }}
                className="photo-cell"
              >
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

      {/* Quick log row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { icon: Scale, label: '+ Poids', action: () => setModal('weight') },
          { icon: Ruler, label: '+ Mesure', action: () => setModal('measure') },
          { icon: Camera, label: '+ Photo', action: () => photoRef.current?.click() },
        ].map(({ icon: Icon, label, action }) => (
          <button key={label} onClick={action} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Icon size={20} color={TEXT_MUTED} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_MUTED }}>{label}</span>
          </button>
        ))}
      </div>
      <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProgressPhoto} />
    </div>
  )
}
