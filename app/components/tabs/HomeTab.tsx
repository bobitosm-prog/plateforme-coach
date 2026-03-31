'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Scale, Target, Dumbbell, Flame, Ruler, Camera, Zap, Moon, CheckCircle,
} from 'lucide-react'
import {
  BG_BASE, BG_CARD, BORDER, ORANGE, GREEN, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD,
  todayNutritionKey,
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
  goalWeight: number | null
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
  supabase,
  session,
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
  const [todaySession, setTodaySession] = useState<{ id: string; created_at: string } | null>(null)
  const [consumedKcal, setConsumedKcal] = useState(0)
  const calorieGoal = profile?.calorie_goal || 2000
  const [waterToday, setWaterToday] = useState(0)

  // Fetch today's consumed calories from meal_tracking + active meal plan
  useEffect(() => {
    if (!session?.user?.id) return
    const uid = session.user.id
    const todayDate = new Date().toISOString().split('T')[0]
    const dayKey = todayNutritionKey()

    Promise.all([
      supabase.from('meal_tracking').select('meal_type').eq('user_id', uid).eq('date', todayDate).eq('is_completed', true).limit(20),
      supabase.from('meal_plans').select('plan_data').eq('user_id', uid).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('meal_logs').select('calories').eq('user_id', uid).eq('date', todayDate).limit(20),
    ]).then(([trackingRes, planRes, logsRes]) => {
      // Kcal from checked plan meals
      let planKcal = 0
      const completedTypes = new Set((trackingRes.data || []).map((r: any) => r.meal_type))
      const dayData = planRes.data?.plan_data?.[dayKey]
      if (dayData?.repas && completedTypes.size > 0) {
        for (const [mealType, foods] of Object.entries(dayData.repas)) {
          if (!completedTypes.has(mealType) || !Array.isArray(foods)) continue
          for (const f of foods as any[]) planKcal += f.kcal || 0
        }
      }
      // Kcal from meal_logs (manually added foods)
      const logsKcal = (logsRes.data || []).reduce((s: number, l: any) => s + (l.calories || 0), 0)
      setConsumedKcal(planKcal + logsKcal)
    })
  }, [session?.user?.id])

  // Fetch today's water intake
  useEffect(() => {
    if (!session?.user?.id) return
    const today = new Date().toISOString().split('T')[0]
    supabase.from('water_intake').select('amount_ml').eq('user_id', session.user.id).eq('date', today).limit(10)
      .then(({ data }: any) => {
        setWaterToday((data || []).reduce((s: number, r: any) => s + (r.amount_ml || 0), 0))
      })
  }, [session?.user?.id])

  async function addWater(ml: number) {
    if (!session?.user?.id) return
    await supabase.from('water_intake').insert({ user_id: session.user.id, amount_ml: ml, date: new Date().toISOString().split('T')[0] })
    setWaterToday(prev => prev + ml)
  }

  useEffect(() => {
    if (!session?.user?.id) return
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)
    supabase
      .from('workout_sessions')
      .select('id,created_at')
      .eq('user_id', session.user.id)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .limit(1)
      .then(({ data }: { data: any[] | null }) => {
        setTodaySession(data?.[0] ?? null)
      })
  }, [session?.user?.id])

  return (
    <div style={{ background: BG_BASE, minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>

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
              ? <img src={displayAvatar} style={{ width: 48, height: 48, objectFit: 'cover' }} alt="Photo de profil" />
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
            { label: 'Objectif', value: profile?.target_weight ? `${profile.target_weight} kg` : '—', sub: 'cible', color: TEXT_MUTED, icon: Target },
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

        {/* Water intake widget */}
        {(() => {
          const waterGoal = profile?.water_goal || 3000
          const pct = Math.min(100, Math.round((waterToday / waterGoal) * 100))
          const msg = pct >= 100 ? 'Objectif atteint ! 💪' : pct >= 60 ? 'Tu es bien hydraté !' : pct >= 30 ? 'Continue comme ça !' : 'Pense à boire 💧'
          return (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.1rem' }}>💧</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: TEXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hydratation</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#3B82F6', fontWeight: 600 }}>{(waterToday / 1000).toFixed(1)}L / {(waterGoal / 1000).toFixed(1)}L</span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 8, background: '#1A1A1A', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#22C55E' : '#3B82F6', borderRadius: 4, transition: 'width 0.5s ease' }} />
              </div>
              {/* Quick add buttons */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                {[250, 500, 1000].map(ml => (
                  <button key={ml} onClick={() => addWater(ml)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)', background: 'transparent', cursor: 'pointer', color: '#3B82F6', fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" }}>
                    +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.65rem', color: TEXT_MUTED, textAlign: 'center', margin: 0 }}>{msg}</p>
            </div>
          )
        })()}

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
          ) : todaySession ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: `${GREEN}12`, border: `1px solid ${GREEN}40`, borderRadius: 12, padding: '16px 14px' }}>
              <CheckCircle size={32} color={GREEN} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1rem', color: GREEN }}>Séance terminée !</div>
                <div style={{ fontSize: '0.78rem', color: TEXT_PRIMARY, marginTop: 2 }}>Bravo ! Tu as terminé ta séance du jour</div>
                <div style={{ fontSize: '0.68rem', color: TEXT_MUTED, marginTop: 4 }}>
                  {format(new Date(todaySession.created_at), 'HH:mm', { locale: fr })}
                </div>
              </div>
            </div>
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

        {/* Nutrition du jour */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C9A84C' }}>Nutrition du jour</span>
            <button onClick={() => setActiveTab('nutrition')} style={{ fontSize: '0.68rem', fontWeight: 700, color: TEXT_MUTED, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Voir plan</button>
          </div>
          {/* Consumed vs target */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#C9A84C' }}>{consumedKcal}</span>
              <span style={{ fontSize: '0.72rem', color: TEXT_MUTED }}>/ {calorieGoal} kcal</span>
            </div>
            <div style={{ background: '#242424', borderRadius: 999, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #C9A84C, #D4AF37)', width: `${Math.min(100, Math.round((consumedKcal / calorieGoal) * 100))}%`, transition: 'width 300ms ease' }} />
            </div>
            <div style={{ fontSize: '0.6rem', color: TEXT_MUTED, marginTop: 3, textAlign: 'right' }}>
              {consumedKcal > 0 ? `${Math.round((consumedKcal / calorieGoal) * 100)}% de l'objectif` : 'Coche tes repas dans l\'onglet Nutrition'}
            </div>
          </div>
          {/* Macro targets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {[
              { label: 'Cible', value: calorieGoal, color: '#C9A84C' },
              { label: 'Prot', value: profile?.protein_goal ? `${profile.protein_goal}g` : '—', color: '#3B82F6' },
              { label: 'Gluc', value: profile?.carbs_goal ? `${profile.carbs_goal}g` : '—', color: '#22C55E' },
              { label: 'Lip', value: profile?.fat_goal ? `${profile.fat_goal}g` : '—', color: '#F97316' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: BG_BASE, borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: '0.58rem', color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { icon: Ruler, label: '+ Mesure', action: () => setModal('measure') },
            { icon: Camera, label: '+ Photo', action: () => photoRef.current?.click() },
            { icon: Zap, label: 'BMR', action: () => setModal('bmr') },
            { icon: Camera, label: '📷 Scan', action: () => setModal('scan'), gold: true },
          ].map(({ icon: Icon, label, action, gold }) => (
            <button key={label} onClick={action} style={{ background: (gold as any) ? 'rgba(201,168,76,0.06)' : BG_CARD, border: `1px solid ${(gold as any) ? 'rgba(201,168,76,0.25)' : BORDER}`, borderRadius: 14, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              {(gold as any) ? <span style={{ fontSize: '1.1rem' }}>📷</span> : <Icon size={18} color={TEXT_MUTED} />}
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: (gold as any) ? '#C9A84C' : TEXT_MUTED }}>{label}</span>
            </button>
          ))}
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProgressPhoto} />
        </div>

      </div>
    </div>
  )
}
