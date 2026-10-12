'use client'
import styles from './ProfilePages.module.css'
import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Target, Flame, Droplets, Activity, ArrowLeft, Beef, Wheat, Droplet } from 'lucide-react'
import { colors, fonts, cardStyle } from '../../../../lib/app-design-tokens'
import { updateProfile } from '../../../../lib/profile-service'
import { calculateMacroTargetsForCalories } from '../../../../lib/nutrition/calorie-macro-targets'
import SectionTitle from '../../ui/SectionTitle'

interface GoalsSectionProps {
  supabase: any
  session: any
  profile: any
  goalWeight: number | null
  setModal: (modal: string) => void
  fetchAll: (force?: boolean) => Promise<void>
  onBack: () => void
}

export default function GoalsSection({
  supabase, session, profile, goalWeight, setModal, fetchAll, onBack,
}: GoalsSectionProps) {
  const t = useTranslations('profile')
  const tGoals = useTranslations('goals')
  const locale = useLocale()

  const [editingCalories, setEditingCalories] = useState(false)
  const [calorieInput, setCalorieInput] = useState(String(profile?.calorie_goal || 2000))
  const [editingWater, setEditingWater] = useState(false)
  const [waterInput, setWaterInput] = useState(String(profile?.water_goal || 3000))
  const [saving, setSaving] = useState(false)

  const objectiveLabels: Record<string, string> = {
    cut: t('fields.objectives.cut'),
    mass: t('fields.objectives.mass'),
    maintain: t('fields.objectives.maintain'),
  }
  const activityLabels: Record<string, string> = {
    sedentary: t('fields.activityLevels.sedentary'),
    light: t('fields.activityLevels.light'),
    moderate: t('fields.activityLevels.moderate'),
    active: t('fields.activityLevels.active'),
    extreme: t('fields.activityLevels.extreme'),
  }

  async function saveCalories() {
    const val = parseInt(calorieInput, 10)
    const weightKg = Number(profile?.current_weight)
    if (!val || val < 1000 || val > 6000 || !Number.isFinite(weightKg) || weightKg <= 0) return
    const macros = calculateMacroTargetsForCalories({
      targetCalories: val,
      weightKg,
      objective: profile?.objective || 'maintain',
      dietaryType: profile?.dietary_type,
    })
    setSaving(true)
    await updateProfile(session.user.id, {
      calorie_goal: val,
      protein_goal: macros.proteinGrams,
      carbs_goal: macros.carbsGrams,
      fat_goal: macros.fatGrams,
    }, supabase)
    await fetchAll(true)
    setSaving(false)
    setEditingCalories(false)
  }

  async function saveWater() {
    const val = parseInt(waterInput, 10)
    if (!val || val < 500 || val > 10000) return
    setSaving(true)
    await updateProfile(session.user.id, { water_goal: val }, supabase)
    await fetchAll(true)
    setSaving(false)
    setEditingWater(false)
  }

  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', cursor: 'pointer' }
  const iconBoxStyle: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, background: colors.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  const separatorStyle: React.CSSProperties = { height: 0.5, background: colors.goldDim }
  const valueStyle: React.CSSProperties = { fontSize: 14, color: colors.textMuted }

  return (
    <div className={styles.page}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className={styles.back} onClick={onBack} aria-label={t('badges.backToAccount')}>
            <ArrowLeft size={20} color={colors.gold} />
          </button>
          <h1 className={styles.title}>{tGoals('pageTitle')}<span>.</span></h1>
        </div>

        {/* ═══ MON OBJECTIF ═══ */}
        <SectionTitle appTheme noPadding title={tGoals('objectiveSection')} />
        <div style={{ ...cardStyle, padding: '4px 16px', marginBottom: 20 }}>
          <button className={styles.row} style={rowStyle} onClick={() => setModal('objective')}>
            <div style={iconBoxStyle}><Target size={14} color={colors.gold} /></div>
            <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text }}>{t('fields.objective')}</span>
            <span style={valueStyle}>{objectiveLabels[profile?.objective] || profile?.objective || '—'}</span>
          </button>
          <div style={separatorStyle} />
          <button className={styles.row} style={rowStyle} onClick={() => setModal('objective')}>
            <div style={iconBoxStyle}><Target size={14} color={colors.gold} /></div>
            <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text }}>{t('fields.goalWeight')}</span>
            <span style={valueStyle}>{goalWeight ? `${goalWeight} kg` : '—'}</span>
          </button>
          <div style={separatorStyle} />
          <button className={styles.row} style={rowStyle} onClick={() => setModal('objective')}>
            <div style={iconBoxStyle}><Activity size={14} color={colors.gold} /></div>
            <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text }}>{t('fields.activityLevel')}</span>
            <span style={valueStyle}>{activityLabels[profile?.activity_level] || profile?.activity_level || '—'}</span>
          </button>
        </div>

        {/* ═══ CIBLES ═══ */}
        <SectionTitle appTheme noPadding title={tGoals('targetsSection')} />
        <div style={{ ...cardStyle, padding: 16, marginBottom: 20 }}>
          {/* Calorie goal */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Flame size={14} color={colors.gold} />
              <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text }}>{tGoals('calorieGoal')}</span>
            </div>
            {editingCalories ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input aria-label={tGoals('calorieGoal')} type="number" value={calorieInput} onChange={e => setCalorieInput(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: colors.surface, border: `1px solid ${colors.divider}`, color: colors.text, fontFamily: fonts.body, fontSize: 13 }} />
                <button onClick={saveCalories} disabled={saving}
                  style={{ padding: '8px 16px', borderRadius: 10, background: colors.gold, border: 'none', color: colors.onGold, fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                <button onClick={() => setEditingCalories(false)}
                  style={{ padding: '8px 12px', borderRadius: 10, background: 'transparent', border: `1px solid ${colors.divider}`, color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <button className={styles.row} onClick={() => setEditingCalories(true)}>
                <span style={{ fontFamily: fonts.headline, fontSize: 18, fontWeight: 700, color: colors.text }}>{profile?.calorie_goal || 2000} kcal</span>
                <span style={{ fontSize: 13, color: colors.textMuted, fontFamily: fonts.body }}>✎</span>
              </button>
            )}
            <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textDim, marginTop: 4 }}>{tGoals('calorieHint')}</div>
          </div>
          <div style={separatorStyle} />
          {/* Water goal */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Droplets size={14} color="#6FB7E8" />
              <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text }}>{tGoals('waterGoal')}</span>
            </div>
            {editingWater ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input aria-label={tGoals('waterGoal')} type="number" value={waterInput} onChange={e => setWaterInput(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: colors.surface, border: `1px solid ${colors.divider}`, color: colors.text, fontFamily: fonts.body, fontSize: 13 }} />
                <button onClick={saveWater} disabled={saving}
                  style={{ padding: '8px 16px', borderRadius: 10, background: colors.gold, border: 'none', color: colors.onGold, fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                <button onClick={() => setEditingWater(false)}
                  style={{ padding: '8px 12px', borderRadius: 10, background: 'transparent', border: `1px solid ${colors.divider}`, color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <button className={styles.row} onClick={() => setEditingWater(true)}>
                <span style={{ fontFamily: fonts.headline, fontSize: 18, fontWeight: 700, color: colors.text }}>{profile?.water_goal || 3000} ml</span>
                <span style={{ fontSize: 13, color: colors.textMuted, fontFamily: fonts.body }}>✎</span>
              </button>
            )}
          </div>
        </div>

        {/* ═══ MACROS (lecture seule) ═══ */}
        <SectionTitle appTheme noPadding title={tGoals('macrosSection')} />
        <div style={{ ...cardStyle, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
            {[
              { icon: Beef, label: tGoals('protein'), value: profile?.protein_goal, color: colors.gold },
              { icon: Wheat, label: tGoals('carbs'), value: profile?.carbs_goal, color: colors.blue },
              { icon: Droplet, label: tGoals('fat'), value: profile?.fat_goal, color: colors.orange },
            ].map(m => (
              <div key={m.label}>
                <m.icon size={16} color={m.color} style={{ marginBottom: 4 }} />
                <div style={{ fontFamily: fonts.headline, fontSize: 20, fontWeight: 700, color: colors.text }}>{m.value || '—'}</div>
                <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textDim, marginTop: 12, textAlign: 'center' }}>{tGoals('macrosHint')}</div>
        </div>

      </div>
    </div>
  )
}
