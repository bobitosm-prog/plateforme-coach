'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { colors, fonts, radii, cardStyle, titleStyle, bodyStyle, mutedStyle, btnPrimary, btnSecondary, statStyle } from '../../lib/design-tokens'
import { Zap, Dumbbell, Target, Clock, ChevronLeft, Flame, Activity, TrendingUp, Award, UtensilsCrossed, BarChart3, Leaf, GraduationCap, Medal, Trophy, Armchair, PersonStanding, CheckCircle2 } from 'lucide-react'
import { GOALS, ACTIVITY_OPTS, NUTRITION_OPTS, EXPERIENCE_OPTS, type OnboardingOption } from '@/lib/onboarding-options'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

const TOTAL_STEPS = 5

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  local_fire_department: Flame, fitness_center: Dumbbell, directions_run: Activity, refresh: Target,
  weekend: Armchair, directions_walk: PersonStanding, bolt: Zap, fastfood: UtensilsCrossed,
  restaurant: UtensilsCrossed, analytics: BarChart3, eco: Leaf, school: GraduationCap,
  trending_up: TrendingUp, military_tech: Medal, emoji_events: Trophy,
}

const METRIC_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  local_fire_department: Flame, military_tech: Medal, fitness_center: Dumbbell, bolt: Zap,
}

const stepVariants = {
  enter: { opacity: 0, y: 30 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}
const stepTransition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

export default function OnboardingFitnessContent() {
  const t = useTranslations('auth.onboardingFitness')
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [goal, setGoal] = useState<number | null>(null)
  const [activity, setActivity] = useState<number | null>(null)
  const [sessions, setSessions] = useState(3)
  const [nutrition, setNutrition] = useState<number | null>(null)
  const [experience, setExperience] = useState<number | null>(null)

  const [showResult, setShowResult] = useState(false)
  const [animatedScore, setAnimatedScore] = useState(0)

  // Step question keys for t() lookups
  const STEP_KEYS = ['goal', 'activity', 'sessions', 'nutrition', 'experience'] as const

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUserId(session.user.id)
    })
  }, [supabase])

  const rawScore = (goal !== null ? GOALS[goal].pts : 0)
    + (activity !== null ? ACTIVITY_OPTS[activity].pts : 0)
    + (nutrition !== null ? NUTRITION_OPTS[nutrition].pts : 0)
    + (experience !== null ? EXPERIENCE_OPTS[experience].pts : 0)

  const finalScore = Math.round((rawScore / 24) * 100)
  const level = finalScore >= 70 ? 'avance' : finalScore >= 40 ? 'intermediaire' : 'debutant'
  const levelLabel = level === 'avance' ? t('result.levelAdvanced') : level === 'intermediaire' ? t('result.levelIntermediate') : t('result.levelBeginner')

  const generateObjectives = useCallback(() => {
    const objs: string[] = []
    const goalLabel = goal !== null ? GOALS[goal].dbLabel : ''
    const nutritionPts = nutrition !== null ? NUTRITION_OPTS[nutrition].pts : 0
    const activityPts = activity !== null ? ACTIVITY_OPTS[activity].pts : 0

    if (goalLabel === 'Prendre du muscle') {
      objs.push(finalScore >= 50 ? t('result.objMuscleHigh') : t('result.objMuscleLow'))
    }
    if (goalLabel === 'Perdre du poids') {
      objs.push(finalScore >= 50 ? t('result.objWeightHigh') : t('result.objWeightLow'))
    }
    objs.push(t('result.objSessions', { count: sessions }))
    if (nutritionPts <= 2) objs.push(t('result.objNutrition'))
    if (activityPts <= 2) objs.push(t('result.objRoutine'))
    return objs
  }, [goal, activity, sessions, nutrition, finalScore, t])

  useEffect(() => {
    if (!showResult) return
    let frame: number
    const start = performance.now()
    const duration = 1200
    const target = finalScore
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * target))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [showResult, finalScore])

  async function handleFinish() {
    if (!userId) return
    setSaving(true)
    const objectives = generateObjectives()
    const { error } = await supabase
      .from('profiles')
      .update({
        fitness_score: finalScore,
        fitness_level: level,
        onboarding_answers: {
          goal: goal !== null ? GOALS[goal].dbLabel : '',
          goal_score: goal !== null ? GOALS[goal].pts : 0,
          activity: activity !== null ? ACTIVITY_OPTS[activity].dbLabel : '',
          activity_score: activity !== null ? ACTIVITY_OPTS[activity].pts : 0,
          sessions_per_week: sessions,
          nutrition: nutrition !== null ? NUTRITION_OPTS[nutrition].dbLabel : '',
          nutrition_score: nutrition !== null ? NUTRITION_OPTS[nutrition].pts : 0,
          experience: experience !== null ? EXPERIENCE_OPTS[experience].dbLabel : '',
          experience_score: experience !== null ? EXPERIENCE_OPTS[experience].pts : 0,
        },
        fitness_objectives: objectives,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', userId)

    setSaving(false)
    if (!error) window.location.href = '/onboarding'
  }

  const canContinue =
    (step === 1 && goal !== null) ||
    (step === 2 && activity !== null) ||
    (step === 3) ||
    (step === 4 && nutrition !== null) ||
    (step === 5 && experience !== null)

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(s => s + 1)
    else setShowResult(true)
  }

  const ringSize = 200
  const strokeWidth = 10
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  // ─── Result screen ───
  if (showResult) {
    const objectives = generateObjectives()
    const metricCards = [
      { label: t('result.metricFlame'), value: goal !== null ? t(`goal.options.${goal}`) : '-', icon: 'local_fire_department' },
      { label: t('result.metricLevel'), value: levelLabel, icon: 'military_tech' },
      { label: t('result.metricSessions'), value: t('result.sessionsValue', { count: sessions }), icon: 'fitness_center' },
      { label: t('result.metricEnergy'), value: nutrition !== null ? t(`nutrition.options.${nutrition}`) : '-', icon: 'bolt' },
    ]

    return (
      <div style={{ minHeight: '100dvh', background: colors.background, color: colors.text, fontFamily: fonts.body }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          style={{ maxWidth: 448, margin: '0 auto', padding: '32px 24px 128px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ position: 'relative', width: ringSize, height: ringSize }}>
              <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke={`${colors.gold}1a`} strokeWidth={strokeWidth} />
                <motion.circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke={colors.gold} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} animate={{ strokeDashoffset }} transition={{ duration: 1.2, ease: 'easeOut' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ ...statStyle, fontSize: 48, color: colors.gold }}>{animatedScore}</span>
                <span style={{ ...mutedStyle, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}>/100</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 8 }}>{levelLabel}</h2>
            <p style={{ ...bodyStyle, fontSize: 12 }}>
              {finalScore >= 70 ? t('result.descAdvanced') : finalScore >= 40 ? t('result.descIntermediate') : t('result.descBeginner')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 40 }}>
            {metricCards.map(c => {
              const IconComp = METRIC_ICON_MAP[c.icon] || Zap
              return (
                <div key={c.label} style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${colors.gold}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconComp size={20} color={colors.gold} />
                    </div>
                    <span style={{ ...mutedStyle, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{c.label}</span>
                  </div>
                  <div style={{ fontFamily: fonts.headline, fontSize: 14, fontWeight: 700, color: colors.text }}>{c.value}</div>
                </div>
              )
            })}
          </div>

          <div style={{ marginBottom: 40 }}>
            <h3 style={{ ...titleStyle, fontSize: 14, marginBottom: 16 }}>{t('result.objectivesTitle')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {objectives.map((obj, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: `${colors.gold}0d`, border: `1px solid ${colors.goldBorder}`, borderRadius: radii.card }}>
                  <CheckCircle2 size={16} color={colors.gold} />
                  <span style={{ ...bodyStyle, fontSize: 14, fontWeight: 500 }}>{obj}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleFinish} disabled={saving}
            style={{ ...btnPrimary, width: '100%', padding: 18, borderRadius: 14, opacity: saving ? 0.6 : 1 }}>
            {saving ? t('result.saving') : t('result.submit')}
          </button>
        </motion.div>
      </div>
    )
  }

  // ─── Quiz layout ───
  const stepKey = STEP_KEYS[step - 1]

  return (
    <div style={{ minHeight: '100dvh', background: colors.background, color: colors.text, fontFamily: fonts.body, display: 'flex', flexDirection: 'column' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, padding: '32px 24px 16px', background: `${colors.background}cc`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 448, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <span style={{ ...mutedStyle, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
                {t('header.questionOf', { current: String(step).padStart(2, '0'), total: String(TOTAL_STEPS).padStart(2, '0') })}
              </span>
              <h1 style={{ fontFamily: fonts.headline, fontSize: 18, fontWeight: 700, color: colors.text, marginTop: 4, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                {t('header.title')}
              </h1>
            </div>
            <Zap size={24} color={colors.goldContainer} />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i < step ? colors.gold : `${colors.gold}1a`, opacity: i < step ? (i < step - 1 ? 0.7 : 1) : 1, transition: 'all 0.3s ease' }} />
            ))}
          </div>
        </div>
      </header>

      <main style={{ flexGrow: 1, paddingTop: 128, paddingBottom: 96, paddingLeft: 24, paddingRight: 24, maxWidth: 448, margin: '0 auto', width: '100%' }}>
        <div style={{ position: 'relative', marginBottom: 32, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ position: 'absolute', width: 300, height: 300, background: `${colors.gold}0d`, borderRadius: '50%', filter: 'blur(80px)', zIndex: -1 }} />
          <Image src="/images/onboarding/fitness-goals-3d.png" alt="Fitness Goals" width={220} height={220} style={{ objectFit: 'contain' }} priority />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontFamily: fonts.headline, fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 8, letterSpacing: '-0.01em' }}>
            {t(`${stepKey}.title`)}
          </h2>
          <p style={{ ...bodyStyle, fontSize: 12 }}>{t(`${stepKey}.subtitle`)}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={stepTransition}>
            {step === 3 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontFamily: fonts.headline, fontSize: 48, fontWeight: 700, color: colors.gold, marginBottom: 8, textAlign: 'center' }}>
                  {sessions}
                </span>
                <span style={{ ...mutedStyle, fontSize: 12, marginBottom: 32 }}>{t(`sessions.labels.${sessions}`)}</span>
                <input type="range" min={1} max={6} value={sessions} onChange={e => setSessions(Number(e.target.value))}
                  style={{ width: '100%', height: 4, borderRadius: 999, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', accentColor: colors.gold, background: `${colors.gold}1a` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 8 }}>
                  <span style={{ ...mutedStyle, fontSize: 12 }}>1x</span>
                  <span style={{ ...mutedStyle, fontSize: 12 }}>6x</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(step === 1 ? GOALS : step === 2 ? ACTIVITY_OPTS : step === 4 ? NUTRITION_OPTS : EXPERIENCE_OPTS).map((opt, i) => {
                  const sel = step === 1 ? goal : step === 2 ? activity : step === 4 ? nutrition : experience
                  const setSel = step === 1 ? setGoal : step === 2 ? setActivity : step === 4 ? setNutrition : setExperience
                  const isSelected = sel === i
                  const IconComp = ICON_MAP[opt.icon] || Zap
                  const optionKey = `${stepKey}.options.${i}`

                  return (
                    <button key={i} onClick={() => setSel(i)}
                      style={{ ...cardStyle, padding: 16, display: 'flex', alignItems: 'center', textAlign: 'left', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease', border: isSelected ? `1px solid ${colors.gold}66` : `1px solid ${colors.goldBorder}`, background: isSelected ? `${colors.gold}14` : colors.surface }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${colors.gold}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 }}>
                        <IconComp size={20} color={colors.gold} />
                      </div>
                      <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text, flexGrow: 1 }}>
                        {t(optionKey)}
                      </span>
                      {isSelected && (
                        <div style={{ width: 24, height: 24, borderRadius: 12, background: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CheckCircle2 size={16} color={colors.background} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: colors.background, borderTop: `1px solid ${colors.goldBorder}`, padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 448, margin: '0 auto', display: 'flex', gap: 12 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ ...btnSecondary, background: 'transparent', color: colors.gold, padding: 16, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronLeft size={16} color={colors.gold} />
              {t('nav.back')}
            </button>
          )}
          <button onClick={handleNext} disabled={!canContinue}
            style={{ ...btnPrimary, flex: 1, padding: 16, borderRadius: 14, opacity: canContinue ? 1 : 0.3, cursor: canContinue ? 'pointer' : 'not-allowed' }}>
            {step === TOTAL_STEPS ? t('nav.seeResult') : t('nav.continue')}
          </button>
        </div>
      </footer>
    </div>
  )
}
