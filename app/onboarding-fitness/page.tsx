'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GOLD, FONT_DISPLAY, TEXT_PRIMARY, TEXT_MUTED, BORDER } from '../../lib/design-tokens'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

const BG = '#0D0B08'
const GOLD_C = '#D4A843'
const GOLD_BG = 'rgba(201,168,76,0.10)'
const GOLD_BORDER = 'rgba(201,168,76,0.5)'
const FONT_DM = "'DM Sans', var(--font-dm-sans), sans-serif"
const FONT_BEBAS = FONT_DISPLAY

const TOTAL_STEPS = 5

// ─── Step data ───

type Option = { label: string; pts: number }

const GOALS: Option[] = [
  { label: 'Perdre du poids', pts: 3 },
  { label: 'Prendre du muscle', pts: 4 },
  { label: 'Améliorer ma condition', pts: 2 },
  { label: 'Me remettre en forme', pts: 3 },
]

const ACTIVITY: Option[] = [
  { label: 'Sédentaire <1x/sem', pts: 1 },
  { label: 'Actif 1-2x/sem', pts: 3 },
  { label: 'Régulier 3-4x/sem', pts: 5 },
  { label: 'Avancé 5x+/sem', pts: 7 },
]

const NUTRITION: Option[] = [
  { label: 'Sans faire attention', pts: 1 },
  { label: "J'essaie de bien manger", pts: 3 },
  { label: 'Je suis mes macros', pts: 5 },
  { label: 'Régime spécifique', pts: 4 },
]

const EXPERIENCE: Option[] = [
  { label: 'Débutant <6 mois', pts: 1 },
  { label: 'Intermédiaire 6m-2ans', pts: 3 },
  { label: 'Expérimenté 2-5ans', pts: 6 },
  { label: 'Vétéran 5ans+', pts: 8 },
]

const SLIDER_LABELS: Record<number, string> = {
  1: 'Minimum pour progresser',
  2: 'Bien pour débuter',
  3: 'Bonne cadence',
  4: 'Rythme soutenu',
  5: 'Programme intensif',
  6: 'Niveau athlète',
}

// ─── Animations ───

const stepVariants = {
  enter: { opacity: 0, y: 30 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}
const stepTransition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

// ─── Component ───

export default function OnboardingFitnessPage() {
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Answers
  const [goal, setGoal] = useState<number | null>(null)
  const [activity, setActivity] = useState<number | null>(null)
  const [sessions, setSessions] = useState(3)
  const [nutrition, setNutrition] = useState<number | null>(null)
  const [experience, setExperience] = useState<number | null>(null)

  // Result
  const [showResult, setShowResult] = useState(false)
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUserId(session.user.id)
    })
  }, [supabase])

  // ─── Score calculation ───

  const rawScore = (goal !== null ? GOALS[goal].pts : 0)
    + (activity !== null ? ACTIVITY[activity].pts : 0)
    + (nutrition !== null ? NUTRITION[nutrition].pts : 0)
    + (experience !== null ? EXPERIENCE[experience].pts : 0)

  const finalScore = Math.round((rawScore / 24) * 100)

  const level = finalScore >= 70 ? 'avance' : finalScore >= 40 ? 'intermediaire' : 'debutant'
  const levelLabel = level === 'avance' ? 'Niveau avancé' : level === 'intermediaire' ? 'Niveau intermédiaire' : 'Niveau débutant'

  // ─── Dynamic objectives ───

  const generateObjectives = useCallback(() => {
    const objs: string[] = []
    const goalLabel = goal !== null ? GOALS[goal].label : ''
    const nutritionPts = nutrition !== null ? NUTRITION[nutrition].pts : 0
    const activityPts = activity !== null ? ACTIVITY[activity].pts : 0

    if (goalLabel === 'Prendre du muscle') {
      objs.push(finalScore >= 50 ? 'Gagner 5 kg de muscle en 12 semaines' : 'Gagner 3 kg de muscle en 12 semaines')
    }
    if (goalLabel === 'Perdre du poids') {
      objs.push(finalScore >= 50 ? 'Perdre 8 kg en 10 semaines' : 'Perdre 4 kg en 10 semaines')
    }
    objs.push(`${sessions}x séances/semaine pendant 8 semaines`)
    if (nutritionPts <= 2) objs.push('Améliorer la qualité nutritionnelle')
    if (activityPts <= 2) objs.push('Construire une routine stable')
    return objs
  }, [goal, activity, sessions, nutrition, finalScore])

  // ─── Count-up animation ───

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

  // ─── Save to Supabase ───

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
          goal: goal !== null ? GOALS[goal].label : '',
          goal_score: goal !== null ? GOALS[goal].pts : 0,
          activity: activity !== null ? ACTIVITY[activity].label : '',
          activity_score: activity !== null ? ACTIVITY[activity].pts : 0,
          sessions_per_week: sessions,
          nutrition: nutrition !== null ? NUTRITION[nutrition].label : '',
          nutrition_score: nutrition !== null ? NUTRITION[nutrition].pts : 0,
          experience: experience !== null ? EXPERIENCE[experience].label : '',
          experience_score: experience !== null ? EXPERIENCE[experience].pts : 0,
        },
        fitness_objectives: objectives,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', userId)

    setSaving(false)
    if (!error) {
      window.location.href = '/onboarding'
    }
  }

  // ─── Can continue ───

  const canContinue =
    (step === 1 && goal !== null) ||
    (step === 2 && activity !== null) ||
    (step === 3) || // slider always has a value
    (step === 4 && nutrition !== null) ||
    (step === 5 && experience !== null)

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(s => s + 1)
    else setShowResult(true)
  }

  // ─── Ring SVG ───

  const ringSize = 180
  const strokeWidth = 10
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  // ─── Shared styles ───

  const optionStyle = (selected: boolean): React.CSSProperties => ({
    padding: '16px 20px',
    background: selected ? GOLD_BG : 'rgba(255,255,255,0.03)',
    border: `1.5px solid ${selected ? GOLD_BORDER : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 12,
    cursor: 'pointer',
    fontFamily: FONT_DM,
    fontSize: 15,
    fontWeight: selected ? 600 : 400,
    color: selected ? GOLD_C : TEXT_PRIMARY,
    transition: 'all 0.2s ease',
    textAlign: 'left' as const,
  })

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '16px',
    background: disabled ? 'rgba(255,255,255,0.05)' : GOLD_C,
    color: disabled ? TEXT_MUTED : '#0D0B08',
    border: 'none',
    borderRadius: 12,
    fontFamily: FONT_BEBAS,
    fontSize: 20,
    letterSpacing: '0.08em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
  })

  // ─── Result screen ───

  if (showResult) {
    const objectives = generateObjectives()
    const metricCards = [
      { label: 'Objectif', value: goal !== null ? GOALS[goal].label : '-' },
      { label: 'Niveau', value: levelLabel },
      { label: 'Séances/sem', value: `${sessions}x` },
      { label: 'Nutrition', value: nutrition !== null ? NUTRITION[nutrition].label : '-' },
    ]

    return (
      <div style={{ minHeight: '100dvh', background: BG, fontFamily: FONT_DM, color: TEXT_PRIMARY }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px 60px' }}
        >
          {/* Score ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={radius}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
              />
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={radius}
                fill="none" stroke={GOLD_C} strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.05s linear' }}
              />
            </svg>
            <div style={{
              position: 'relative', marginTop: -ringSize + 10,
              height: ringSize - 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: FONT_BEBAS, fontSize: 56, color: GOLD_C, lineHeight: 1 }}>
                {animatedScore}
              </span>
              <span style={{ fontFamily: FONT_DM, fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>/100</span>
            </div>
          </div>

          {/* Level title */}
          <h1 style={{
            fontFamily: FONT_BEBAS, fontSize: 32, color: TEXT_PRIMARY,
            textAlign: 'center', letterSpacing: '0.06em', marginBottom: 28, marginTop: 8,
          }}>
            {levelLabel.toUpperCase()}
          </h1>

          {/* Metric cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28,
          }}>
            {metricCards.map(c => (
              <div key={c.label} style={{
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
              }}>
                <div style={{ fontFamily: FONT_DM, fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  {c.label}
                </div>
                <div style={{ fontFamily: FONT_DM, fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          {/* Objectives */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: FONT_BEBAS, fontSize: 22, color: TEXT_PRIMARY, letterSpacing: '0.06em', marginBottom: 14 }}>
              VOS OBJECTIFS
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {objectives.map((obj, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: 'rgba(201,168,76,0.06)',
                  border: '1px solid rgba(201,168,76,0.15)',
                  borderRadius: 12,
                }}>
                  <span style={{ color: GOLD_C, fontSize: 16, flexShrink: 0 }}>&#9654;</span>
                  <span style={{ fontFamily: FONT_DM, fontSize: 14, color: TEXT_PRIMARY }}>{obj}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleFinish}
            disabled={saving}
            style={{
              ...btnStyle(false),
              opacity: saving ? 0.6 : 1,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'SAUVEGARDE...' : 'COMMENCER MON PROGRAMME'}
          </button>
        </motion.div>
      </div>
    )
  }

  // ─── Step content ───

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <StepChoices
            title="Quel est votre objectif principal ?"
            options={GOALS}
            selected={goal}
            onSelect={setGoal}
          />
        )
      case 2:
        return (
          <StepChoices
            title="Votre niveau d'activité actuel ?"
            options={ACTIVITY}
            selected={activity}
            onSelect={setActivity}
          />
        )
      case 3:
        return (
          <div>
            <h2 style={{ fontFamily: FONT_BEBAS, fontSize: 28, color: TEXT_PRIMARY, letterSpacing: '0.06em', marginBottom: 24 }}>
              SÉANCES PAR SEMAINE SOUHAITÉES
            </h2>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span style={{ fontFamily: FONT_BEBAS, fontSize: 64, color: GOLD_C, lineHeight: 1 }}>
                {sessions}
              </span>
              <span style={{ fontFamily: FONT_DM, fontSize: 15, color: TEXT_MUTED, display: 'block', marginTop: 8 }}>
                {SLIDER_LABELS[sessions]}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={6}
              value={sessions}
              onChange={e => setSessions(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: GOLD_C,
                height: 6,
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT_DM, fontSize: 12, color: TEXT_MUTED, marginTop: 8 }}>
              <span>1</span><span>6</span>
            </div>
          </div>
        )
      case 4:
        return (
          <StepChoices
            title="Votre alimentation actuelle ?"
            options={NUTRITION}
            selected={nutrition}
            onSelect={setNutrition}
          />
        )
      case 5:
        return (
          <StepChoices
            title="Votre expérience en musculation ?"
            options={EXPERIENCE}
            selected={experience}
            onSelect={setExperience}
          />
        )
      default:
        return null
    }
  }

  // ─── Main layout ───

  const progressPct = (step / TOTAL_STEPS) * 100

  return (
    <div style={{ minHeight: '100dvh', background: BG, fontFamily: FONT_DM, color: TEXT_PRIMARY }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>

        {/* Progress bar */}
        <div style={{ paddingTop: 20, marginBottom: 8 }}>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
              style={{ height: '100%', background: GOLD_C }}
            />
          </div>
        </div>

        {/* Step label */}
        <div style={{
          fontFamily: FONT_DM, fontSize: 12, color: TEXT_MUTED,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 32, paddingTop: 8,
        }}>
          Étape {step} / {TOTAL_STEPS}
        </div>

        {/* Step content with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, marginTop: 36, paddingBottom: 40 }}>
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: '0 0 auto',
                padding: '16px 24px',
                background: 'transparent',
                border: `1.5px solid rgba(255,255,255,0.1)`,
                borderRadius: 12,
                color: TEXT_MUTED,
                fontFamily: FONT_BEBAS,
                fontSize: 18,
                letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              RETOUR
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canContinue}
            style={{ ...btnStyle(!canContinue), flex: 1 }}
          >
            {step === TOTAL_STEPS ? 'VOIR MON RÉSULTAT' : 'CONTINUER'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reusable choice step ───

function StepChoices({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string
  options: Option[]
  selected: number | null
  onSelect: (i: number) => void
}) {
  return (
    <div>
      <h2 style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 28,
        color: TEXT_PRIMARY,
        letterSpacing: '0.06em',
        marginBottom: 24,
        lineHeight: 1.1,
      }}>
        {title.toUpperCase()}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            style={{
              padding: '16px 20px',
              background: selected === i ? 'rgba(201,168,76,0.10)' : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${selected === i ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12,
              cursor: 'pointer',
              fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
              fontSize: 15,
              fontWeight: selected === i ? 600 : 400,
              color: selected === i ? '#D4A843' : TEXT_PRIMARY,
              transition: 'all 0.2s ease',
              textAlign: 'left' as const,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
