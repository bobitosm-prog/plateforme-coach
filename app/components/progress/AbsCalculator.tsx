'use client'
import { useState } from 'react'
import { AlertTriangle, CheckCircle, Target } from 'lucide-react'

const GOLD = '#C9A84C'
const BG_CARD = '#1A1A1A'
const BG_BASE = '#0F0F0F'
const BORDER = '#2A2A2A'
const TEXT_PRIMARY = '#F8FAFC'
const TEXT_MUTED = '#6B7280'

interface AbsCalculatorProps {
  currentWeight: number | undefined
  height: number | undefined
  bodyFat?: number | null
  deficit: number
  objective?: string
}

export default function AbsCalculator({ currentWeight, height, bodyFat, deficit, objective }: AbsCalculatorProps) {
  const [estimatedBf, setEstimatedBf] = useState(22)
  const weight = currentWeight || 0
  const h = height || 0

  if (!weight || !h) return null

  const bmi = weight / ((h / 100) ** 2)
  const bf = bodyFat ?? estimatedBf
  const fatMass = weight * (bf / 100)
  const leanMass = weight - fatMass

  const targetBf15 = 15
  const targetBf12 = 12
  const targetWeight15 = leanMass / (1 - targetBf15 / 100)
  const targetWeight12 = leanMass / (1 - targetBf12 / 100)
  const fatToLose15 = Math.max(0, weight - targetWeight15)
  const fatToLose12 = Math.max(0, weight - targetWeight12)

  const weeklyLoss = deficit < 0 ? (Math.abs(deficit) * 7) / 7700 : 0
  const weeksTo15 = weeklyLoss > 0 ? Math.ceil(fatToLose15 / weeklyLoss) : null
  const weeksTo12 = weeklyLoss > 0 ? Math.ceil(fatToLose12 / weeklyLoss) : null

  const alreadyVisible = bf <= 15
  const aggressiveCut = weeklyLoss > 1

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Target size={18} color={GOLD} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Chemin vers les abdos
        </span>
      </div>

      {/* BF Slider if not provided */}
      {bodyFat == null && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.72rem', color: TEXT_MUTED }}>Estime ton taux de graisse depuis ta photo</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: GOLD }}>{estimatedBf}%</span>
          </div>
          <input
            type="range" min={10} max={40} step={1} value={estimatedBf}
            onChange={e => setEstimatedBf(Number(e.target.value))}
            style={{ width: '100%', accentColor: GOLD, height: 6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: TEXT_MUTED, marginTop: 4 }}>
            <span>10% (très sec)</span>
            <span>25% (moyen)</span>
            <span>40%</span>
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'IMC', value: bmi.toFixed(1), unit: '' },
          { label: 'Masse grasse', value: fatMass.toFixed(1), unit: 'kg' },
          { label: 'Masse sèche', value: leanMass.toFixed(1), unit: 'kg' },
          { label: 'Perte/semaine', value: weeklyLoss > 0 ? weeklyLoss.toFixed(2) : '—', unit: weeklyLoss > 0 ? 'kg' : '' },
        ].map(({ label, value, unit }) => (
          <div key={label} style={{ background: BG_BASE, borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.3rem', fontWeight: 700, color: TEXT_PRIMARY }}>
              {value}<span style={{ fontSize: '0.7rem', color: TEXT_MUTED, marginLeft: 3 }}>{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Already visible */}
      {alreadyVisible && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
          <CheckCircle size={16} color="#34D399" />
          <span style={{ fontSize: '0.78rem', color: '#34D399', fontWeight: 600 }}>
            Tes abdos sont déjà visibles à {bf}% ! Continue en maintenance ou vise 12% pour plus de définition.
          </span>
        </div>
      )}

      {/* Surplus warning */}
      {deficit >= 0 && !alreadyVisible && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
          <AlertTriangle size={16} color="#FBBF24" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: '0.78rem', color: '#FBBF24', lineHeight: 1.5 }}>
            Tu es actuellement en {deficit > 0 ? 'surplus' : 'maintenance'} calorique. Pour voir tes abdos, passe en déficit d'au moins 300 kcal/jour.
          </span>
        </div>
      )}

      {/* Aggressive cut warning */}
      {aggressiveCut && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
          <AlertTriangle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: '0.78rem', color: '#EF4444', lineHeight: 1.5 }}>
            Déficit trop agressif ({weeklyLoss.toFixed(1)} kg/semaine). Risque de perte musculaire. Vise max 0.5-0.7 kg/semaine.
          </span>
        </div>
      )}

      {/* Milestones */}
      {!alreadyVisible && weeklyLoss > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Abdos visibles', bf: '15%', weeks: weeksTo15!, toLose: fatToLose15 },
            { label: 'Abdos définis', bf: '12%', weeks: weeksTo12!, toLose: fatToLose12 },
          ].map(({ label, bf: targetBf, weeks, toLose }) => {
            const months = Math.round(weeks / 4.33)
            return (
              <div key={label} style={{ background: BG_BASE, border: `1px solid ${GOLD}20`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.88rem', fontWeight: 700, color: GOLD, letterSpacing: '0.04em' }}>{label}</span>
                    <span style={{ fontSize: '0.7rem', color: TEXT_MUTED, marginLeft: 8 }}>({targetBf})</span>
                  </div>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT_PRIMARY }}>
                    {weeks} sem<span style={{ fontSize: '0.72rem', color: TEXT_MUTED, marginLeft: 6 }}>≈ {months} mois</span>
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.max(5, ((bf - parseFloat(targetBf)) / bf) * 100))}%`, background: `linear-gradient(90deg, ${GOLD}, #D4AF37)`, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, marginTop: 4 }}>
                  {toLose.toFixed(1)} kg de graisse à perdre · Poids cible : {(weight - toLose).toFixed(1)} kg
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
