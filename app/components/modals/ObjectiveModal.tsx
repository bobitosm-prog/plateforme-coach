'use client'
import React, { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import {
  colors, fonts, radii, cardStyle, btnPrimary, btnSecondary, inputStyle,
  modalOverlay, modalContainer, titleStyle,
  calcMifflinStJeor, ACTIVITY_LEVELS,
} from '../../../lib/design-tokens'

interface ObjectiveModalProps {
  profile: any
  currentWeight: number | undefined
  goalWeight: number | null
  supabase: any
  session: any
  onClose: () => void
  onSaved: () => void
}

const OBJECTIVES = [
  { id: 'cut', emoji: '🔥', label: 'SÈCHE', desc: 'Perdre du gras, garder le muscle', detail: 'Déficit calorique · Cardio HIIT' },
  { id: 'mass', emoji: '💪', label: 'PRISE DE MASSE', desc: 'Gagner du muscle, augmenter la force', detail: 'Surplus calorique · Hypertrophie' },
  { id: 'maintain', emoji: '⚖️', label: 'MAINTIEN', desc: 'Recomposition corporelle', detail: 'Calories d\'équilibre · Polyvalent' },
] as const

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: 'Sédentaire', sub: '1-2x/sem' },
  { id: 'light', label: 'Léger', sub: '3x/sem' },
  { id: 'moderate', label: 'Modéré', sub: '4-5x/sem' },
  { id: 'active', label: 'Actif', sub: '6x/sem' },
  { id: 'extreme', label: 'Intense', sub: '2x/jour' },
] as const

function getActivityMult(id: string): number {
  return ACTIVITY_LEVELS.find(a => a.id === id)?.mult || 1.55
}

function computeMacros(objective: string, weight: number, height: number, age: number, gender: string, activity: string) {
  const bmr = calcMifflinStJeor(weight, height, age, gender)
  const mult = getActivityMult(activity)
  const tdee = Math.round(bmr * mult)

  let adjusted: number
  let protPerKg: number, fatPerKg: number
  if (objective === 'cut') {
    adjusted = tdee - 500
    protPerKg = 2.2; fatPerKg = 0.8
  } else if (objective === 'mass') {
    adjusted = tdee + 300
    protPerKg = 1.8; fatPerKg = 1.0
  } else {
    adjusted = tdee
    protPerKg = 2.0; fatPerKg = 0.9
  }

  const protein = Math.round(protPerKg * weight)
  const fat = Math.round(fatPerKg * weight)
  const carbs = Math.round((adjusted - protein * 4 - fat * 9) / 4)

  return { tdee, adjusted, protein, fat, carbs: Math.max(carbs, 50) }
}

export default function ObjectiveModal({ profile, currentWeight, goalWeight, supabase, session, onClose, onSaved }: ObjectiveModalProps) {
  const [step, setStep] = useState(1)
  const [objective, setObjective] = useState<string>(profile?.objective || 'maintain')
  const [weight, setWeight] = useState<string>((currentWeight || profile?.current_weight || '').toString())
  const [targetWeight, setTargetWeight] = useState<string>((goalWeight || profile?.target_weight || '').toString())
  const [activity, setActivity] = useState<string>(profile?.activity_level || 'moderate')
  const [saving, setSaving] = useState(false)
  const [weightError, setWeightError] = useState('')

  const age = profile?.birth_date ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / 31557600000) : 25
  const height = profile?.height || 175
  const gender = profile?.gender || 'male'

  const oldMacros = useMemo(() => computeMacros(
    profile?.objective || 'maintain',
    currentWeight || profile?.current_weight || 75,
    height, age, gender,
    profile?.activity_level || 'moderate'
  ), [profile, currentWeight])

  const newMacros = useMemo(() => computeMacros(
    objective,
    parseFloat(weight) || 75,
    height, age, gender,
    activity
  ), [objective, weight, activity])

  const objLabels: Record<string, string> = { mass: 'Prise de masse', cut: 'Sèche', maintain: 'Maintien' }

  function validateWeight(): boolean {
    const w = parseFloat(weight)
    const tw = parseFloat(targetWeight)
    if (!w || !tw) { setWeightError('Remplis les deux champs'); return false }
    if (objective === 'cut' && tw >= w) { setWeightError('Pour une sèche, le poids cible doit être inférieur'); return false }
    if (objective === 'mass' && tw <= w) { setWeightError('Pour une prise de masse, le poids cible doit être supérieur'); return false }
    setWeightError('')
    return true
  }

  async function handleConfirm() {
    setSaving(true)
    const tw = parseFloat(targetWeight)
    const { error } = await supabase.from('profiles').update({
      objective,
      target_weight: tw,
      activity_level: activity,
      calorie_goal: newMacros.adjusted,
      protein_goal: newMacros.protein,
      carb_goal: newMacros.carbs,
      fat_goal: newMacros.fat,
    }).eq('id', session.user.id)

    setSaving(false)
    if (!error) {
      onSaved()
      onClose()
    }
  }

  // Progress bar
  const ProgressBar = () => (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
      {[1, 2, 3, 4].map(s => (
        <div key={s} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: s <= step ? colors.gold : 'rgba(201,168,76,0.15)',
          transition: 'background 300ms',
        }} />
      ))}
    </div>
  )

  const stepLabel = `ÉTAPE ${step}/4`

  return (
    <div style={{ ...modalOverlay, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1100 }} onClick={onClose}>
      <div
        style={{
          ...modalContainer,
          width: '100%', maxWidth: 480,
          borderRadius: `${radii.card}px ${radii.card}px 0 0`,
          padding: '20px 20px 40px',
          maxHeight: '90dvh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textDim, letterSpacing: '0.15em' }}>{stepLabel}</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color={colors.textMuted} />
          </button>
        </div>

        <ProgressBar />

        {/* ═══ STEP 1 — OBJECTIF ═══ */}
        {step === 1 && (
          <>
            <div style={{ ...titleStyle, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>QUEL EST TON NOUVEL OBJECTIF ?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {OBJECTIVES.map(obj => {
                const selected = objective === obj.id
                return (
                  <button
                    key={obj.id}
                    onClick={() => setObjective(obj.id)}
                    style={{
                      ...cardStyle,
                      border: `1px solid ${selected ? 'rgba(230,195,100,0.4)' : 'rgba(201,168,76,0.1)'}`,
                      background: selected ? 'rgba(230,195,100,0.1)' : colors.surface,
                      padding: '16px 18px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 200ms',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{obj.emoji}</span>
                      <span style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: selected ? colors.gold : colors.text, letterSpacing: '0.1em' }}>{obj.label}</span>
                    </div>
                    <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>{obj.desc}</div>
                    <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim }}>{obj.detail}</div>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setStep(2)} style={{ ...btnPrimary, width: '100%', padding: '14px 0' }}>SUIVANT</button>
          </>
        )}

        {/* ═══ STEP 2 — POIDS ═══ */}
        {step === 2 && (
          <>
            <div style={{ ...titleStyle, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>POIDS ACTUEL & CIBLE</div>

            <label style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.textDim, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TON POIDS ACTUEL (KG)</label>
            <input
              type="number" value={weight}
              onChange={e => { setWeight(e.target.value); setWeightError('') }}
              style={{ ...inputStyle, width: '100%', marginBottom: 16 }}
            />

            <label style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.textDim, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TON POIDS CIBLE (KG)</label>
            <input
              type="number" value={targetWeight}
              onChange={e => { setTargetWeight(e.target.value); setWeightError('') }}
              style={{ ...inputStyle, width: '100%', marginBottom: 8 }}
            />

            {weightError && (
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.error, marginBottom: 12 }}>{weightError}</div>
            )}

            <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim, marginBottom: 24 }}>
              {objective === 'cut' && 'Pour une sèche, ton poids cible doit être inférieur à ton poids actuel.'}
              {objective === 'mass' && 'Pour une prise de masse, ton poids cible doit être supérieur à ton poids actuel.'}
              {objective === 'maintain' && 'Pour un maintien, ton poids cible peut être proche de ton poids actuel.'}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ ...btnSecondary, flex: 1, padding: '14px 0' }}>RETOUR</button>
              <button onClick={() => { if (validateWeight()) setStep(3) }} style={{ ...btnPrimary, flex: 1, padding: '14px 0' }}>SUIVANT</button>
            </div>
          </>
        )}

        {/* ═══ STEP 3 — ACTIVITÉ ═══ */}
        {step === 3 && (
          <>
            <div style={{ ...titleStyle, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>NIVEAU D&apos;ACTIVITÉ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {ACTIVITY_OPTIONS.map(opt => {
                const selected = activity === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setActivity(opt.id)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 16px', borderRadius: radii.button,
                      border: `1px solid ${selected ? 'rgba(230,195,100,0.3)' : 'rgba(201,168,76,0.1)'}`,
                      background: selected ? 'rgba(230,195,100,0.15)' : 'transparent',
                      cursor: 'pointer', transition: 'all 200ms',
                    }}
                  >
                    <span style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 700, color: selected ? colors.gold : colors.text, letterSpacing: '0.06em' }}>{opt.label}</span>
                    <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim }}>{opt.sub}</span>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ ...btnSecondary, flex: 1, padding: '14px 0' }}>RETOUR</button>
              <button onClick={() => setStep(4)} style={{ ...btnPrimary, flex: 1, padding: '14px 0' }}>SUIVANT</button>
            </div>
          </>
        )}

        {/* ═══ STEP 4 — CONFIRMATION ═══ */}
        {step === 4 && (
          <>
            <div style={{ ...titleStyle, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>CONFIRMATION</div>

            {/* Summary card */}
            <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.textDim, letterSpacing: '0.12em', marginBottom: 12 }}>ANCIEN → NOUVEAU</div>
              {[
                { label: 'Objectif', old: objLabels[profile?.objective] || '—', new_: objLabels[objective] || '—' },
                { label: 'Poids cible', old: goalWeight ? `${goalWeight} kg` : '—', new_: `${targetWeight} kg` },
                { label: 'TDEE', old: `${oldMacros.adjusted} kcal`, new_: `${newMacros.adjusted} kcal` },
                { label: 'Protéines', old: `${oldMacros.protein}g`, new_: `${newMacros.protein}g` },
                { label: 'Glucides', old: `${oldMacros.carbs}g`, new_: `${newMacros.carbs}g` },
                { label: 'Lipides', old: `${oldMacros.fat}g`, new_: `${newMacros.fat}g` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                  <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted }}>{row.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDim }}>{row.old}</span>
                    <span style={{ fontSize: 10, color: colors.textDim }}>→</span>
                    <span style={{ fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, color: colors.gold }}>{row.new_}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim, lineHeight: 1.5, marginBottom: 24, textAlign: 'center' }}>
              Ton plan nutritionnel et tes macros seront recalculés. Ton programme d&apos;entraînement sera adapté à ton nouvel objectif.
            </div>

            <button
              onClick={handleConfirm}
              disabled={saving}
              style={{ ...btnPrimary, width: '100%', padding: '14px 0', marginBottom: 10, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'MISE À JOUR...' : 'CONFIRMER LE CHANGEMENT'}
            </button>
            <button onClick={onClose} style={{ ...btnSecondary, width: '100%', padding: '14px 0' }}>ANNULER</button>
          </>
        )}
      </div>
    </div>
  )
}
