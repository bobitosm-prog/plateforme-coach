'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Scale, Target, Dumbbell, Flame, Ruler, Camera, Zap, Moon,
} from 'lucide-react'
import {
  BG_BASE, BG_CARD, BORDER, ORANGE, GREEN, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD,
} from '../../../lib/design-tokens'

interface HomeTabProps {
  supabase: any
  session: any
  profile: any
  displayAvatar: string | undefined
  firstName: string
  avatarRef: React.RefObject<HTMLInputElement | null>
  photoRef: React.RefObject<HTMLInputElement | null>
  uploadAvatar: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  uploadProgressPhoto: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  currentWeight: number | undefined
  goalWeight: number
  calorieGoal: number
  completedSessions: number
  streak: number
  coachProgram: any
  coachMealPlan: any
  todayKey: string
  todayCoachDay: any
  todaySessionDone: boolean
  setActiveTab: (tab: any) => void
  setModal: (modal: string) => void
  startProgramWorkout: (day: any, exercises: any[]) => void
}

export default function HomeTab({
  profile,
  displayAvatar,
  firstName,
  avatarRef,
  photoRef,
  uploadAvatar,
  uploadProgressPhoto,
  currentWeight,
  goalWeight,
  completedSessions,
  streak,
  coachProgram,
  coachMealPlan,
  todayKey,
  todayCoachDay,
  setActiveTab,
  setModal,
  startProgramWorkout,
}: HomeTabProps) {
  return (
    <div style={{ background: BG_BASE, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: BG_CARD, padding: '20px 20px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.72rem', color: TEXT_MUTED, margin: '0 0 4px', textTransform: 'capitalize' }}>
              {format(new Date(), 'EEEE d MMMM', { locale: fr })}
            </p>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.75rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0, letterSpacing: '0.03em' }}>
              Bonjour, {firstName}
            </h1>
          </div>
          <button onClick={() => avatarRef.current?.click()} style={{ width: 48, height: 48, borderRadius: '50%', background: displayAvatar ? 'transparent' : ORANGE, border: `2px solid ${BORDER}`, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
            {displayAvatar
              ? <img src={displayAvatar} style={{ width: 48, height: 48, objectFit: 'cover' }} alt="" />
              : <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>{firstName.charAt(0).toUpperCase()}</span>
            }
          </button>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* 4 metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Poids actuel', value: currentWeight ? `${currentWeight} kg` : '—', sub: 'coach-assigned', color: ORANGE, icon: Scale },
            { label: 'Objectif', value: `${profile?.target_weight || goalWeight} kg`, sub: 'cible', color: TEXT_MUTED, icon: Target },
            { label: 'Séances', value: String(completedSessions), sub: 'total complétées', color: TEXT_MUTED, icon: Dumbbell },
            { label: 'Streak', value: streak > 0 ? `${streak}j` : '—', sub: 'jours consécutifs', color: streak > 0 ? ORANGE : TEXT_MUTED, icon: Flame },
          ].map(({ label, value, color, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22, delay: i * 0.07 }}
              style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '16px' }}
            >
              <Icon size={15} color={color} style={{ marginBottom: 8 }} />
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.62rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 4 }}>{label}</div>
            </motion.div>
          ))}
        </div>

        {/* Programme du jour */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: ORANGE }}>Programme du jour</span>
            <button onClick={() => setActiveTab('training')} style={{ fontSize: '0.68rem', fontWeight: 700, color: TEXT_MUTED, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Voir tout</button>
          </div>
          {!coachProgram ? (
            <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0, fontStyle: 'italic' }}>Programme en attente de ton coach.</p>
          ) : todayCoachDay?.repos ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG_BASE, borderRadius: 12, padding: '12px 14px' }}>
              <Moon size={20} color={TEXT_MUTED} />
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY }}>Jour de repos</div>
                <div style={{ fontSize: '0.72rem', color: TEXT_MUTED }}>Récupère bien, étirements bienvenus</div>
              </div>
            </div>
          ) : !todayCoachDay?.exercises?.length ? (
            <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0 }}>Aucun exercice prévu.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {(todayCoachDay.exercises as any[]).slice(0, 4).map((ex: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: BG_BASE, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: `${ORANGE}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.8rem', color: ORANGE, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                      <div style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>{ex.sets} × {ex.reps} reps{ex.rest ? ` · repos ${ex.rest}` : ''}</div>
                    </div>
                  </div>
                ))}
                {(todayCoachDay.exercises as any[]).length > 4 && (
                  <div style={{ fontSize: '0.72rem', color: ORANGE, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, paddingLeft: 4 }}>
                    +{(todayCoachDay.exercises as any[]).length - 4} autres exercices
                  </div>
                )}
              </div>
              <button
                onClick={() => startProgramWorkout({ day_name: todayKey }, todayCoachDay.exercises)}
                style={{ width: '100%', background: GREEN, color: '#000', fontWeight: 700, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Commencer la séance
              </button>
            </>
          )}
        </div>

        {/* Nutrition du jour (coach meal plan) */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GREEN }}>Nutrition du jour</span>
            <button onClick={() => setActiveTab('nutrition')} style={{ fontSize: '0.68rem', fontWeight: 700, color: TEXT_MUTED, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Voir plan</button>
          </div>
          {!coachMealPlan ? (
            <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0, fontStyle: 'italic' }}>Plan alimentaire en attente.</p>
          ) : (
            <>
              {/* Macro targets row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
                {[
                  { label: 'Kcal', value: coachMealPlan.calorie_target || '—', color: ORANGE },
                  { label: 'Prot', value: coachMealPlan.protein_target ? `${coachMealPlan.protein_target}g` : '—', color: '#3B82F6' },
                  { label: 'Gluc', value: coachMealPlan.carb_target ? `${coachMealPlan.carb_target}g` : '—', color: '#F59E0B' },
                  { label: 'Lip', value: coachMealPlan.fat_target ? `${coachMealPlan.fat_target}g` : '—', color: '#EF4444' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: BG_BASE, borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: '0.58rem', color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
                  </div>
                ))}
              </div>
              {/* Today's meals from plan */}
              {(() => {
                const dayPlan = coachMealPlan[todayKey]
                const meals: any[] = dayPlan?.meals ?? []
                if (!meals.length) return <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, margin: 0 }}>Aucun repas planifié aujourd'hui.</p>
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {meals.map((meal: any, mi: number) => {
                      const mealKcal = (meal.foods || []).reduce((s: number, f: any) => s + (f.kcal || 0), 0)
                      return (
                        <div key={mi} style={{ background: BG_BASE, borderRadius: 12, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: TEXT_PRIMARY, fontSize: '0.9rem' }}>{meal.name}</span>
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: ORANGE }}>{mealKcal} kcal</span>
                          </div>
                          {(meal.foods || []).map((food: any, fi: number) => (
                            <div key={fi} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: fi > 0 ? `1px solid ${BORDER}` : 'none' }}>
                              <span style={{ fontSize: '0.75rem', color: TEXT_MUTED, flex: 1 }}>{food.name}{food.qty ? ` — ${food.qty}` : ''}</span>
                              <span style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>{food.prot ? `${food.prot}g P` : ''}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { icon: Ruler, label: '+ Mesure', action: () => setModal('measure') },
            { icon: Camera, label: '+ Photo', action: () => photoRef.current?.click() },
            { icon: Zap, label: 'BMR', action: () => setModal('bmr') },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Icon size={18} color={TEXT_MUTED} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_MUTED }}>{label}</span>
            </button>
          ))}
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProgressPhoto} />
        </div>

      </div>
    </div>
  )
}
