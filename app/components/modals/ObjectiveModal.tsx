'use client'
import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import {
  colors, fonts, radii, cardStyle, btnPrimary, btnSecondary, inputStyle,
  modalOverlay, modalContainer, titleStyle,
  calcMifflinStJeor, ACTIVITY_LEVELS,
} from '../../../lib/design-tokens'
import { updateProfile } from '../../../lib/profile-service'

interface ObjectiveModalProps {
  profile: any
  currentWeight: number | undefined
  goalWeight: number | null
  supabase: any
  session: any
  onClose: () => void
  onSaved: () => void
}

const OBJECTIVE_IDS = ['cut', 'mass', 'maintain'] as const
const OBJECTIVE_EMOJIS: Record<string, string> = { cut: '🔥', mass: '💪', maintain: '⚖️' }
const ACTIVITY_IDS = ['sedentary', 'light', 'moderate', 'active', 'extreme'] as const

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
  const t = useTranslations('objectiveModal')
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

  function validateWeight(): boolean {
    const w = parseFloat(weight)
    const tw = parseFloat(targetWeight)
    if (!w || !tw) { setWeightError(t('validation.fillBoth')); return false }
    if (objective === 'cut' && tw >= w) { setWeightError(t('validation.cutLower')); return false }
    if (objective === 'mass' && tw <= w) { setWeightError(t('validation.massHigher')); return false }
    setWeightError('')
    return true
  }

  async function handleConfirm() {
    setSaving(true)
    const tw = parseFloat(targetWeight)
    const { error } = await updateProfile(session.user.id, {
      objective,
      target_weight: tw,
      activity_level: activity,
      calorie_goal: newMacros.adjusted,
      protein_goal: newMacros.protein,
      carbs_goal: newMacros.carbs,
      fat_goal: newMacros.fat,
    }, supabase)

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
          background: s <= step ? colors.gold : colors.goldBorder,
          transition: 'background 300ms',
        }} />
      ))}
    </div>
  )

  const stepLabel = t('stepLabel', { step, total: 4 })

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
          <button onClick={onClose} style={{ background: colors.divider, border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color={colors.textMuted} />
          </button>
        </div>

        <ProgressBar />

        {/* ═══ STEP 1 — OBJECTIF ═══ */}
        {step === 1 && (
          <>
            <div style={{ ...titleStyle, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>{t('step1Title')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {OBJECTIVE_IDS.map(id => {
                const selected = objective === id
                return (
                  <button
                    key={id}
                    onClick={() => setObjective(id)}
                    style={{
                      ...cardStyle,
                      border: `1px solid ${selected ? `${colors.gold}66` : `${colors.goldContainer}1a`}`,
                      background: selected ? `${colors.gold}1a` : colors.surface,
                      padding: '16px 18px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 200ms',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{OBJECTIVE_EMOJIS[id]}</span>
                      <span style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: selected ? colors.gold : colors.text, letterSpacing: '0.1em' }}>{t(`objectives.${id}.label`)}</span>
                    </div>
                    <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>{t(`objectives.${id}.desc`)}</div>
                    <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim }}>{t(`objectives.${id}.detail`)}</div>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setStep(2)} style={{ ...btnPrimary, width: '100%', padding: '14px 0' }}>{t('next')}</button>
          </>
        )}

        {/* ═══ STEP 2 — POIDS ═══ */}
        {step === 2 && (
          <>
            <div style={{ ...titleStyle, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>{t('step2Title')}</div>

            <label style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.textDim, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>{t('currentWeightLabel')}</label>
            <input
              type="number" value={weight}
              onChange={e => { setWeight(e.target.value); setWeightError('') }}
              style={{ ...inputStyle, width: '100%', marginBottom: 16 }}
            />

            <label style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.textDim, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>{t('targetWeightLabel')}</label>
            <input
              type="number" value={targetWeight}
              onChange={e => { setTargetWeight(e.target.value); setWeightError('') }}
              style={{ ...inputStyle, width: '100%', marginBottom: 8 }}
            />

            {weightError && (
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.error, marginBottom: 12 }}>{weightError}</div>
            )}

            <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim, marginBottom: 24 }}>
              {t(`weightHint.${objective}`)}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ ...btnSecondary, flex: 1, padding: '14px 0' }}>{t('back')}</button>
              <button onClick={() => { if (validateWeight()) setStep(3) }} style={{ ...btnPrimary, flex: 1, padding: '14px 0' }}>{t('next')}</button>
            </div>
          </>
        )}

        {/* ═══ STEP 3 — ACTIVITÉ ═══ */}
        {step === 3 && (
          <>
            <div style={{ ...titleStyle, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>{t('step3Title')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {ACTIVITY_IDS.map(id => {
                const selected = activity === id
                return (
                  <button
                    key={id}
                    onClick={() => setActivity(id)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 16px', borderRadius: radii.button,
                      border: `1px solid ${selected ? `${colors.gold}4d` : `${colors.goldContainer}1a`}`,
                      background: selected ? colors.goldBorder : 'transparent',
                      cursor: 'pointer', transition: 'all 200ms',
                    }}
                  >
                    <span style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 700, color: selected ? colors.gold : colors.text, letterSpacing: '0.06em' }}>{t(`activity.${id}.label`)}</span>
                    <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim }}>{t(`activity.${id}.sub`)}</span>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ ...btnSecondary, flex: 1, padding: '14px 0' }}>{t('back')}</button>
              <button onClick={() => setStep(4)} style={{ ...btnPrimary, flex: 1, padding: '14px 0' }}>{t('next')}</button>
            </div>
          </>
        )}

        {/* ═══ STEP 4 — CONFIRMATION ═══ */}
        {step === 4 && (
          <>
            <div style={{ ...titleStyle, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>{t('step4Title')}</div>

            {/* Summary card */}
            <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.textDim, letterSpacing: '0.12em', marginBottom: 12 }}>{t('oldToNew')}</div>
              {[
                { label: t('summaryObjective'), old: t(`objectives.${profile?.objective || 'maintain'}.label`), new_: t(`objectives.${objective}.label`) },
                { label: t('summaryTargetWeight'), old: goalWeight ? `${goalWeight} kg` : '—', new_: `${targetWeight} kg` },
                { label: 'TDEE', old: `${oldMacros.adjusted} kcal`, new_: `${newMacros.adjusted} kcal` },
                { label: t('summaryProtein'), old: `${oldMacros.protein}g`, new_: `${newMacros.protein}g` },
                { label: t('summaryCarbs'), old: `${oldMacros.carbs}g`, new_: `${newMacros.carbs}g` },
                { label: t('summaryFat'), old: `${oldMacros.fat}g`, new_: `${newMacros.fat}g` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.goldDim}` }}>
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
              {t('disclaimer')}
            </div>

            <button
              onClick={handleConfirm}
              disabled={saving}
              style={{ ...btnPrimary, width: '100%', padding: '14px 0', marginBottom: 10, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? t('saving') : t('confirm')}
            </button>
            <button onClick={onClose} style={{ ...btnSecondary, width: '100%', padding: '14px 0' }}>{t('cancel')}</button>
          </>
        )}
      </div>
    </div>
  )
}
