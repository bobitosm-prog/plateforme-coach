'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

const TOTAL_STEPS = 5

// ─── Step data ───

type Option = { label: string; pts: number; icon: string }

const GOALS: Option[] = [
  { label: 'Perdre du poids', pts: 3, icon: 'local_fire_department' },
  { label: 'Prendre du muscle', pts: 4, icon: 'fitness_center' },
  { label: 'Améliorer ma condition', pts: 2, icon: 'directions_run' },
  { label: 'Me remettre en forme', pts: 3, icon: 'refresh' },
]

const ACTIVITY: Option[] = [
  { label: 'Sédentaire <1x/sem', pts: 1, icon: 'weekend' },
  { label: 'Actif 1-2x/sem', pts: 3, icon: 'directions_walk' },
  { label: 'Régulier 3-4x/sem', pts: 5, icon: 'directions_run' },
  { label: 'Avancé 5x+/sem', pts: 7, icon: 'bolt' },
]

const NUTRITION: Option[] = [
  { label: 'Sans faire attention', pts: 1, icon: 'fastfood' },
  { label: "J'essaie de bien manger", pts: 3, icon: 'restaurant' },
  { label: 'Je suis mes macros', pts: 5, icon: 'analytics' },
  { label: 'Régime spécifique', pts: 4, icon: 'eco' },
]

const EXPERIENCE: Option[] = [
  { label: 'Débutant <6 mois', pts: 1, icon: 'school' },
  { label: 'Intermédiaire 6m-2ans', pts: 3, icon: 'trending_up' },
  { label: 'Expérimenté 2-5ans', pts: 6, icon: 'military_tech' },
  { label: 'Vétéran 5ans+', pts: 8, icon: 'emoji_events' },
]

const SLIDER_LABELS: Record<number, string> = {
  1: 'Minimum pour progresser',
  2: 'Bien pour débuter',
  3: 'Bonne cadence',
  4: 'Rythme soutenu',
  5: 'Programme intensif',
  6: 'Niveau athlète',
}

const STEP_TITLES = [
  'Quel est votre objectif principal ?',
  "Votre niveau d'activité actuel ?",
  'Séances par semaine souhaitées',
  'Votre alimentation actuelle ?',
  'Votre expérience en musculation ?',
]

const STEP_SUBTITLES = [
  'Sélectionnez l\'objectif qui correspond à votre vision.',
  'Décrivez votre routine actuelle.',
  'Définissez votre fréquence idéale.',
  'Évaluez vos habitudes alimentaires.',
  'Indiquez votre parcours fitness.',
]

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
    (step === 3) ||
    (step === 4 && nutrition !== null) ||
    (step === 5 && experience !== null)

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(s => s + 1)
    else setShowResult(true)
  }

  // ─── Ring SVG ───

  const ringSize = 200
  const strokeWidth = 10
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  const progressPct = (step / TOTAL_STEPS) * 100

  // ─── Result screen (Stitch: Fitness Score Reveal) ───

  if (showResult) {
    const objectives = generateObjectives()
    const metricCards = [
      { label: 'Flamme', value: goal !== null ? GOALS[goal].label : '-', icon: 'local_fire_department' },
      { label: 'Niveau', value: levelLabel, icon: 'military_tech' },
      { label: 'Séances', value: `${sessions}x/sem`, icon: 'fitness_center' },
      { label: 'Énergie', value: nutrition !== null ? NUTRITION[nutrition].label : '-', icon: 'bolt' },
    ]

    return (
      <div className="min-h-dvh bg-[#131313] text-[#e5e2e1] font-['Inter',sans-serif]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto px-6 pt-8 pb-32"
        >
          {/* 3D Hero */}
          <div className="relative w-full flex items-center justify-center mb-4">
            <div className="absolute inset-0 bg-[#e6c364]/5 rounded-full blur-[80px]" />
            <Image
              src="/images/onboarding/fitness-score-3d.png"
              alt="Fitness Score"
              width={280}
              height={280}
              className="relative z-10 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
              priority
            />
            {/* Score overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
              <span className="font-['Plus_Jakarta_Sans'] text-6xl font-extrabold tracking-tighter text-[#e6c364]" style={{ textShadow: '0 0 20px rgba(230,195,100,0.3)' }}>
                {animatedScore}
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#d0c5b2] font-bold">/100</span>
            </div>
          </div>

          {/* Level title */}
          <div className="text-center mb-8">
            <h2 className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-tight mb-2">{levelLabel}</h2>
            <p className="text-[#d0c5b2] text-sm font-medium">
              {finalScore >= 70
                ? 'Vous êtes dans le top 5% des membres MoovX.'
                : finalScore >= 40
                ? 'Votre potentiel est excellent. Construisons dessus.'
                : 'Un super point de départ. On va progresser ensemble.'}
            </p>
          </div>

          {/* Metric cards — Bento grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            {metricCards.map(c => (
              <div key={c.label} className="bg-[#201f1f] rounded-xl p-5 flex flex-col gap-4 group hover:bg-[#2a2a2a] transition-colors">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-[#e6c364]/10 rounded-lg text-[#e6c364]">
                    <span className="material-symbols-outlined">{c.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#d0c5b2] tracking-widest uppercase">{c.label}</span>
                </div>
                <div className="font-['Plus_Jakarta_Sans'] text-lg font-bold">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Objectives */}
          <div className="mb-10">
            <h3 className="font-['Plus_Jakarta_Sans'] text-xl font-bold uppercase tracking-tighter mb-4">Vos objectifs</h3>
            <div className="flex flex-col gap-3">
              {objectives.map((obj, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-[#e6c364]/5 border border-[#e6c364]/15 rounded-xl">
                  <span className="material-symbols-outlined text-[#e6c364] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="text-sm font-medium">{obj}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-br from-[#e6c364] to-[#c9a84c] text-[#3d2e00] font-['Plus_Jakarta_Sans'] font-bold rounded-full shadow-lg shadow-[#e6c364]/20 active:scale-[0.98] transition-all uppercase tracking-widest text-sm disabled:opacity-60"
          >
            {saving ? 'Sauvegarde...' : 'Commencer mon programme'}
          </button>
        </motion.div>

        {/* Material Symbols font */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </div>
    )
  }

  // ─── Quiz layout (Stitch: Fitness Goals Quiz) ───

  return (
    <div className="min-h-dvh bg-[#131313] text-[#e5e2e1] font-['Inter',sans-serif] flex flex-col">
      {/* Header + Progress */}
      <header className="fixed top-0 left-0 w-full z-50 px-6 pt-8 pb-4 bg-[#131313]/80 backdrop-blur-md">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <div>
              <span className="font-['Plus_Jakarta_Sans'] text-[#e6c364] text-[10px] uppercase tracking-[0.3em] font-bold">
                Question {String(step).padStart(2, '0')} / {String(TOTAL_STEPS).padStart(2, '0')}
              </span>
              <h1 className="font-['Plus_Jakarta_Sans'] text-xl font-black tracking-tighter uppercase mt-1">
                Définissez votre parcours
              </h1>
            </div>
            <span className="material-symbols-outlined text-[#c9a84c] text-2xl">bolt</span>
          </div>
          {/* Gold progress bar */}
          <div className="relative w-full h-[6px] bg-[#353534] rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#e6c364] to-[#c9a84c] rounded-full shadow-[0_0_15px_rgba(230,195,100,0.4)]"
            />
          </div>
        </div>
      </header>

      <main className="flex-grow pt-32 pb-24 px-6 max-w-md mx-auto w-full">
        {/* 3D Illustration */}
        <div className="relative mb-8 flex justify-center items-center">
          <div className="absolute w-[300px] h-[300px] bg-[#e6c364]/5 rounded-full blur-[80px] -z-10" />
          <Image
            src="/images/onboarding/fitness-goals-3d.png"
            alt="Fitness Goals"
            width={220}
            height={220}
            className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            priority
          />
        </div>

        {/* Step title */}
        <div className="text-center mb-8">
          <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-tight mb-2">
            {STEP_TITLES[step - 1]}
          </h2>
          <p className="text-[#d0c5b2] text-sm font-medium">{STEP_SUBTITLES[step - 1]}</p>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            {step === 3 ? (
              /* Slider step */
              <div className="flex flex-col items-center">
                <span className="font-['Plus_Jakarta_Sans'] text-6xl font-extrabold text-[#e6c364] mb-2" style={{ textShadow: '0 0 20px rgba(230,195,100,0.3)' }}>
                  {sessions}
                </span>
                <span className="text-sm text-[#d0c5b2] font-medium mb-8">{SLIDER_LABELS[sessions]}</span>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={sessions}
                  onChange={e => setSessions(Number(e.target.value))}
                  className="w-full h-[6px] rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#e6c364', background: '#353534' }}
                />
                <div className="flex justify-between w-full text-xs text-[#d0c5b2] mt-2 font-medium">
                  <span>1x</span><span>6x</span>
                </div>
              </div>
            ) : (
              /* Choice cards */
              <div className="flex flex-col gap-3">
                {(step === 1 ? GOALS : step === 2 ? ACTIVITY : step === 4 ? NUTRITION : EXPERIENCE).map((opt, i) => {
                  const sel = step === 1 ? goal : step === 2 ? activity : step === 4 ? nutrition : experience
                  const setSel = step === 1 ? setGoal : step === 2 ? setActivity : step === 4 ? setNutrition : setExperience
                  const isSelected = sel === i

                  return (
                    <button
                      key={i}
                      onClick={() => setSel(i)}
                      className={`group relative flex items-center p-4 rounded-xl transition-all duration-300 text-left ${
                        isSelected
                          ? 'bg-[#1c1b1b] border-2 border-[#e6c364]/60 shadow-[0_0_20px_rgba(230,195,100,0.1)]'
                          : 'bg-[#201f1f] border border-[#4d4637]/20 hover:bg-[#2a2a2a] hover:border-[#e6c364]/40'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-transform group-hover:scale-110 ${
                        isSelected ? 'bg-[#e6c364]/20' : 'bg-[#353534]'
                      }`}>
                        <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-[#e6c364]' : 'text-[#d0c5b2]'}`}>
                          {opt.icon}
                        </span>
                      </div>
                      <span className={`font-semibold text-[15px] flex-grow ${isSelected ? 'text-[#e6c364]' : ''}`}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[#e6c364]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer CTA */}
      <footer className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#131313] via-[#131313] to-transparent">
        <div className="max-w-md mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-4 rounded-full border border-[#4d4637]/30 text-[#d0c5b2] font-bold text-sm uppercase tracking-widest hover:bg-[#201f1f] transition-colors"
            >
              Retour
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canContinue}
            className="flex-1 py-4 rounded-full font-['Plus_Jakarta_Sans'] font-bold bg-gradient-to-br from-[#e6c364] to-[#c9a84c] text-[#3d2e00] shadow-lg shadow-[#e6c364]/10 active:scale-[0.98] transition-all uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === TOTAL_STEPS ? 'Voir mon résultat' : 'Continuer'}
          </button>
        </div>
      </footer>

      {/* Material Symbols font */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
    </div>
  )
}
