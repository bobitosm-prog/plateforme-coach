'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronRight, ChevronLeft, Scale, User, Search, Utensils, Leaf, Apple, Coffee, Salad, Sun, Moon, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ACTIVITY_LEVELS, calcMifflinStJeor, colors, fonts, radii, cardStyle, titleStyle, titleLineStyle, subtitleStyle, statStyle, bodyStyle, labelStyle, mutedStyle, pageTitleStyle, btnPrimary } from '../../lib/design-tokens'
import { capitalizeFullName } from '@/lib/utils/capitalize-name'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

const TOTAL_STEPS = 6

function mapActivityScore(score: number): string {
  if (score >= 7) return 'active'
  if (score >= 5) return 'moderate'
  if (score >= 3) return 'light'
  return 'sedentary'
}

function mapGoalToObjective(goal: string): string {
  if (goal === 'Perdre du poids') return 'cut'
  if (goal === 'Prendre du muscle') return 'mass'
  return 'maintain'
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}
const transition = { type: 'tween' as const, duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

export default function OnboardingContent() {
  const t = useTranslations('auth.onboarding')
  const T = titleStyle
  const router = useRouter()
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current
  const [session, setSession] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [dir, setDir] = useState(1)
  const [saving, setSaving] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [objective, setObjective] = useState('maintain')
  const [activityLevel, setActivityLevel] = useState('moderate')
  const [dietaryType, setDietaryType] = useState('omnivore')
  const [allergies, setAllergies] = useState<string[]>([])
  const [mealPrefs, setMealPrefs] = useState<Record<string, string[]>>({
    petit_dejeuner: [], dejeuner: [], collation: [], diner: [],
  })
  const [mealSubStep, setMealSubStep] = useState(0)
  const [foodQuery, setFoodQuery] = useState('')
  const [fitnessFoods, setFitnessFoods] = useState<any[]>([])
  const [fitnessFoodsLoaded, setFitnessFoodsLoaded] = useState(false)
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({})

  const ALLERGY_OPTIONS = [
    { id: 'gluten', label: t('diet.allergies.gluten') },
    { id: 'lactose', label: t('diet.allergies.lactose') },
    { id: 'nuts', label: t('diet.allergies.nuts') },
    { id: 'eggs', label: t('diet.allergies.eggs') },
    { id: 'soy', label: t('diet.allergies.soy') },
    { id: 'shellfish', label: t('diet.allergies.shellfish') },
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/fr/landing'); return }
      setSession(session)
      const meta = session.user.user_metadata
      if (meta?.full_name) setFirstName(meta.full_name.split(' ')[0])
      supabase.from('profiles').select('onboarding_answers').eq('id', session.user.id).single().then(({ data: profile }) => {
        if (profile?.onboarding_answers) {
          const answers = profile.onboarding_answers as any
          if (answers.goal) setObjective(mapGoalToObjective(answers.goal))
          if (answers.activity_score) setActivityLevel(mapActivityScore(answers.activity_score))
        }
      })
    })
  }, [])

  function goNext() { setDir(1); setStep(s => s + 1) }
  function goBack() {
    if (step === 5 && mealSubStep > 0) { setFoodQuery(''); setMealSubStep(s => s - 1); return }
    setDir(-1); setStep(s => s - 1)
  }

  const tdeeData = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(height)
    if (!w || !h || !birthDate || !gender) return null
    const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000)
    if (age <= 0) return null
    const bmr = calcMifflinStJeor(w, h, age, gender)
    const mult = ACTIVITY_LEVELS.find(l => l.id === activityLevel)?.mult || 1.55
    const tdee = Math.round(bmr * mult)
    let adjusted = tdee
    if (objective === 'cut') adjusted = tdee - 300
    else if (objective === 'mass') adjusted = tdee + 300
    const proteinG = Math.round(2 * w)
    const fatG = Math.round((adjusted * 0.25) / 9)
    const carbsG = Math.round((adjusted - proteinG * 4 - fatG * 9) / 4)
    return { tdee, adjusted, proteinG, carbsG, fatG }
  }, [weight, height, birthDate, gender, objective, activityLevel])

  const bmi = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(height)
    if (!w || !h) return null
    return (w / ((h / 100) ** 2)).toFixed(1)
  }, [weight, height])

  async function finish() {
    if (!session) return
    setSaving(true)
    const uid = session.user.id
    const update: Record<string, any> = {
      id: uid,
      role: 'client',
      full_name: capitalizeFullName(firstName),
      birth_date: birthDate || null,
      gender: gender || null,
      current_weight: weight ? parseFloat(weight) : null,
      start_weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      target_weight: goalWeight ? parseFloat(goalWeight) : null,
      objective: objective || null,
      activity_level: activityLevel,
      dietary_type: dietaryType,
      allergies: allergies.length > 0 ? allergies : null,
      meal_preferences: mealPrefs,
      liked_foods: [...new Set(Object.values(mealPrefs).flat())],
    }
    if (tdeeData) {
      update.tdee = tdeeData.adjusted
      update.calorie_goal = tdeeData.adjusted
      update.protein_goal = tdeeData.proteinG
      update.carbs_goal = tdeeData.carbsG
      update.fat_goal = tdeeData.fatG
    }
    update.trial_ends_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase.from('profiles').update(update).eq('id', uid).select()
    if (error) await supabase.from('profiles').upsert(update).select()
    if (weight) {
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('weight_logs').upsert(
        { user_id: uid, date: today, poids: parseFloat(weight) },
        { onConflict: 'user_id,date' }
      )
    }
    setSaving(false)
    router.replace('/onboarding-photo')
  }

  return (
    <div style={{ minHeight: '100svh', background: colors.background, color: colors.text, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: fonts.body }}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); cursor: pointer; }
      `}</style>

      {step > 1 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', gap: 4, padding: '8px 16px' }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 12, background: i < step - 1 ? colors.gold : i === step - 1 ? colors.gold : `${colors.gold}1a`, opacity: i < step - 1 ? 0.7 : 1, transition: 'all 400ms ease' }} />
          ))}
        </div>
      )}

      {step > 1 && (
        <button onClick={goBack} style={{ position: 'fixed', top: 20, left: 16, zIndex: 50, background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontFamily: fonts.body }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> {t('nav.back')}
        </button>
      )}

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence custom={dir} mode="wait">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <motion.div key="s1" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', gap: 32 }}>
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <img src="/logo-moovx.png" alt="MoovX" width={88} height={88} style={{ borderRadius: radii.card }} className="animate-pulse-gold" />
                <span style={{ ...T, fontSize: '2.8rem', fontWeight: 800, letterSpacing: '3px' }}>MOOVX</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ textAlign: 'center' }}>
                <h1 style={{ ...pageTitleStyle, fontSize: '2rem', margin: '0 0 8px', letterSpacing: '2px' }}>
                  {firstName ? t('welcome.title', { firstName }) : t('welcome.titleNoName')}
                </h1>
                <p style={{ ...bodyStyle, fontSize: '1rem', margin: 0, fontWeight: 300 }}>{t('welcome.subtitle')}</p>
              </motion.div>
              <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} whileTap={{ scale: 0.97 }} onClick={goNext}
                style={{ ...btnPrimary, width: '100%', maxWidth: 320, padding: '18px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {t('welcome.cta')} <ChevronRight size={20} strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <motion.div key="s2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 24, maxWidth: 480, width: '100%', margin: '0 auto' }}>
              <div><h2 style={h2Style}>{t('profile.title')}</h2><p style={subStyle}>{t('profile.subtitle')}</p></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <InputField label={t('profile.firstNameLabel')} value={firstName} onChange={setFirstName} placeholder={t('profile.firstNamePlaceholder')} />
                <div><label style={formLabelStyle}>{t('profile.birthDateLabel')}</label>
                  <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} /></div>
                <div><label style={formLabelStyle}>{t('profile.genderLabel')}</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[{ k: 'male', l: t('profile.male') }, { k: 'female', l: t('profile.female') }].map(g => (
                      <button key={g.k} onClick={() => setGender(g.k as any)}
                        style={{ flex: 1, padding: '14px 16px', borderRadius: 14, border: `1px solid ${gender === g.k ? `${colors.gold}66` : colors.goldBorder}`, background: gender === g.k ? `${colors.gold}14` : colors.surface, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 200ms', fontFamily: fonts.body }}>
                        <User size={20} color={gender === g.k ? colors.gold : colors.textMuted} />
                        <span style={{ fontFamily: fonts.body, fontSize: '0.9rem', fontWeight: 700, color: gender === g.k ? colors.gold : colors.text }}>{g.l}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 'auto' }}><NextBtn onClick={goNext} disabled={!firstName.trim()} label={t('nav.continue')} /></div>
            </motion.div>
          )}

          {/* Step 3: Body */}
          {step === 3 && (
            <motion.div key="s3" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 24, maxWidth: 480, width: '100%', margin: '0 auto' }}>
              <div><h2 style={h2Style}>{t('body.title')}</h2><p style={subStyle}>{t('body.subtitle')}</p></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <NumField label={t('body.weightLabel')} value={weight} onChange={setWeight} unit="kg" placeholder="75" />
                  <NumField label={t('body.heightLabel')} value={height} onChange={setHeight} unit="cm" placeholder="175" />
                </div>
                <NumField label={t('body.goalWeightLabel')} value={goalWeight} onChange={setGoalWeight} unit="kg" placeholder="70" />
                {bmi && (
                  <div style={{ ...cardStyle, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Scale size={16} color={colors.gold} />
                    <span style={{ ...bodyStyle, fontSize: '0.82rem', color: colors.text }}>{t('body.bmiLabel')} <strong style={{ color: colors.gold }}>{bmi}</strong></span>
                    <span style={{ ...mutedStyle, fontSize: '0.72rem', marginLeft: 'auto' }}>
                      {parseFloat(bmi) < 18.5 ? t('body.bmiUnderweight') : parseFloat(bmi) < 25 ? t('body.bmiNormal') : parseFloat(bmi) < 30 ? t('body.bmiOverweight') : t('body.bmiObese')}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 'auto' }}><NextBtn onClick={goNext} disabled={!weight || !height} label={t('nav.continue')} /></div>
            </motion.div>
          )}

          {/* Step 4: Diet & Allergies */}
          {step === 4 && (
            <motion.div key="s4" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 20, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
              <div><h2 style={h2Style}>{t('diet.title')}</h2><p style={subStyle}>{t('diet.subtitle')}</p></div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={titleStyle}>{t('diet.regimeTitle')}</span>
                  <div style={titleLineStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { k: 'omnivore', l: t('diet.omnivore'), d: t('diet.omnivoreDesc'), Icon: Utensils },
                    { k: 'vegetarian', l: t('diet.vegetarian'), d: t('diet.vegetarianDesc'), Icon: Salad },
                    { k: 'vegan', l: t('diet.vegan'), d: t('diet.veganDesc'), Icon: Leaf },
                  ].map(o => {
                    const sel = dietaryType === o.k
                    return (
                      <button key={o.k} onClick={() => setDietaryType(o.k)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, border: `1px solid ${sel ? `${colors.gold}66` : colors.goldBorder}`, background: sel ? `${colors.gold}14` : colors.surface, cursor: 'pointer', transition: 'all 200ms', fontFamily: fonts.body }}>
                        <o.Icon size={20} color={sel ? colors.gold : colors.textMuted} />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontFamily: fonts.body, fontSize: '0.95rem', fontWeight: 700, color: sel ? colors.gold : colors.text }}>{o.l}</div>
                          <div style={{ ...mutedStyle, fontSize: '0.72rem', color: colors.textMuted }}>{o.d}</div>
                        </div>
                        {sel && <Check size={16} color={colors.gold} strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={titleStyle}>{t('diet.allergiesTitle')}</span>
                  <div style={titleLineStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ALLERGY_OPTIONS.map(a => {
                    const sel = allergies.includes(a.id)
                    return (
                      <button key={a.id} onClick={() => setAllergies(prev => sel ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderRadius: 14, border: `1px solid ${sel ? `${colors.gold}66` : colors.goldBorder}`, background: sel ? `${colors.gold}14` : colors.surface, cursor: 'pointer', transition: 'all 200ms', fontFamily: fonts.body }}>
                        <span style={{ ...bodyStyle, fontSize: '0.82rem', fontWeight: 600, color: sel ? colors.gold : colors.text, flex: 1, textAlign: 'left' }}>{a.label}</span>
                        {sel && <Check size={14} color={colors.gold} strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 8 }}><NextBtn onClick={goNext} label={t('nav.continue')} /></div>
            </motion.div>
          )}

          {/* Step 5: Meals — sequential sub-steps */}
          {step === 5 && (() => {
            const MEALS = [
              { id: 'petit_dejeuner', label: t('meals.breakfast'), Icon: Coffee },
              { id: 'dejeuner', label: t('meals.lunch'), Icon: Sun },
              { id: 'collation', label: t('meals.snack'), Icon: Apple },
              { id: 'diner', label: t('meals.dinner'), Icon: Moon },
            ]
            const currentMeal = MEALS[mealSubStep]
            const currentIds = mealPrefs[currentMeal.id] || []

            const CATS = [
              { key: 'proteines', label: t('meals.categories.proteines'), icon: 'beef', patterns: ['poulet', 'dinde', 'boeuf', 'bœuf', 'veau', 'porc', 'saumon', 'thon', 'cabillaud', 'crevette', 'oeuf', 'œuf', 'steak', 'filet', 'escalope', 'jambon', 'bacon', 'merlu', 'sardine', 'truite', 'canard', 'agneau', 'poisson', 'viande'] },
              { key: 'laitiers', label: t('meals.categories.laitiers'), icon: 'milk', patterns: ['yaourt', 'fromage', 'skyr', 'cottage', 'mozzarella', 'parmesan', 'emmental', 'gruyère', 'lait', 'beurre', 'crème'] },
              { key: 'feculents', label: t('meals.categories.feculents'), icon: 'wheat', patterns: ['riz', 'pâtes', 'pasta', 'quinoa', 'patate', 'pomme de terre', 'pain', 'avoine', 'flocon', 'semoule', 'blé', 'sarrasin', 'lentille', 'pois chiche', 'haricot', 'maïs', 'galette', 'wrap', 'toast', 'muesli', 'céréale', 'granola'] },
              { key: 'legumes', label: t('meals.categories.legumes'), icon: 'leaf', patterns: ['brocoli', 'épinard', 'courgette', 'tomate', 'concombre', 'salade', 'carotte', 'poivron', 'aubergine', 'chou', 'haricot vert', 'asperge', 'champignon', 'oignon', 'ail', 'avocat', 'légume'] },
              { key: 'fruits', label: t('meals.categories.fruits'), icon: 'apple', patterns: ['banane', 'pomme', 'fraise', 'myrtille', 'orange', 'kiwi', 'mangue', 'ananas', 'poire', 'raisin', 'pêche', 'abricot', 'melon', 'pastèque', 'fruit', 'baie', 'datte', 'figue'] },
              { key: 'oleagineux', label: t('meals.categories.oleagineux'), icon: 'nut', patterns: ['amande', 'noix', 'cacahuète', 'noisette', 'cajou', 'pistache', 'beurre de', 'graines', 'sésame', 'tournesol', 'lin', 'chia'] },
              { key: 'boissons', label: t('meals.categories.boissons'), icon: 'coffee', patterns: ["lait d'", 'lait de', 'boisson', 'smoothie', 'jus', 'eau de coco'] },
              { key: 'supplements', label: t('meals.categories.supplements'), icon: 'dumbbell', patterns: ['whey', 'protéine', 'caséine', 'barre', 'créatine', 'bcaa', 'shaker', 'iso', 'mass'] },
            ]
            const categorize = (name: string) => {
              const n = name.toLowerCase()
              for (const cat of CATS) { if (cat.patterns.some(p => n.includes(p))) return cat.key }
              return 'autres'
            }

            if (!fitnessFoodsLoaded) {
              setFitnessFoodsLoaded(true)
              supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat').eq('source', 'fitness').order('name').limit(200).then(({ data }) => {
                const mapped = (data || []).map((f: any) => ({
                  id: f.id, nom: f.name || '',
                  kcal: Math.round(f.energy_kcal ?? 0),
                  p: Math.round((f.proteins ?? 0) * 10) / 10,
                  g: Math.round((f.carbohydrates ?? 0) * 10) / 10,
                  l: Math.round((f.fat ?? 0) * 10) / 10,
                  cat: categorize(f.name || ''),
                }))
                setFitnessFoods(mapped)
                const names: Record<string, string> = {}
                mapped.forEach((f: any) => { names[f.id] = f.nom })
                setResolvedNames(prev => ({ ...prev, ...names }))
              })
            }

            const filtered = foodQuery.length >= 1
              ? fitnessFoods.filter(f => f.nom.toLowerCase().includes(foodQuery.toLowerCase()))
              : fitnessFoods

            const toggleFood = (food: any) => {
              const mealId = currentMeal.id
              if (currentIds.includes(food.id)) {
                setMealPrefs(prev => ({ ...prev, [mealId]: (prev[mealId] || []).filter((x: string) => x !== food.id) }))
              } else {
                setMealPrefs(prev => ({ ...prev, [mealId]: [...(prev[mealId] || []), food.id] }))
                setResolvedNames(prev => ({ ...prev, [food.id]: food.nom }))
              }
            }

            const grouped = CATS.map(cat => ({ ...cat, foods: filtered.filter(f => f.cat === cat.key) })).filter(g => g.foods.length > 0)
            const autres = filtered.filter(f => f.cat === 'autres')
            if (autres.length > 0) grouped.push({ key: 'autres', label: t('meals.categories.autres'), icon: 'utensils', patterns: [], foods: autres })

            const advanceMeal = () => {
              setFoodQuery('')
              if (mealSubStep < 3) { setMealSubStep(s => s + 1) }
              else { goNext() }
            }

            return (
              <motion.div key={`s5-${mealSubStep}`} custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 20px 32px', gap: 12, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>

                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {MEALS.map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 12, background: i < mealSubStep ? colors.gold : i === mealSubStep ? colors.gold : `${colors.gold}1a`, opacity: i < mealSubStep ? 0.7 : 1, transition: 'all 300ms' }} />
                  ))}
                </div>
                <div style={{ ...subtitleStyle, fontSize: '0.68rem', letterSpacing: '2px' }}>
                  {t('meals.mealProgress', { current: mealSubStep + 1 })}
                </div>

                <div>
                  <h2 style={{ ...h2Style, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <currentMeal.Icon size={24} color={colors.gold} /> {currentMeal.label}
                  </h2>
                  <p style={subStyle}>{t('meals.instruction')}</p>
                </div>

                <div style={{ position: 'relative' }}>
                  <input value={foodQuery} onChange={e => setFoodQuery(e.target.value)} placeholder={t('meals.filterPlaceholder', { count: fitnessFoods.length })}
                    style={{ ...inputStyle, paddingLeft: 38, padding: '10px 14px 10px 38px', fontSize: '0.82rem' }} />
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.gold }} />
                </div>

                <div style={{ ...subtitleStyle, fontSize: '0.72rem', color: currentIds.length > 0 ? colors.gold : colors.textMuted, fontWeight: 600 }}>
                  {t('meals.selectedCount', { count: currentIds.length })}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
                  {fitnessFoods.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ width: 28, height: 28, border: `2px solid ${colors.goldBorder}`, borderTopColor: colors.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                      <p style={{ ...mutedStyle, fontSize: '0.75rem', color: colors.textMuted }}>{t('meals.loading')}</p>
                    </div>
                  )}
                  {grouped.map(cat => (
                    <div key={cat.key}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, position: 'sticky', top: 0, background: colors.background, paddingTop: 4, paddingBottom: 4, zIndex: 1 }}>
                        <Utensils size={14} color={colors.gold} />
                        <span style={{ ...labelStyle, fontSize: '0.78rem', letterSpacing: '2px' }}>{cat.label}</span>
                        <span style={{ fontSize: '0.6rem', color: colors.textMuted }}>({cat.foods.length})</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {cat.foods.map((food: any) => {
                          const selected = currentIds.includes(food.id)
                          return (
                            <button key={food.id} onClick={() => toggleFood(food)}
                              style={{ ...cardStyle, padding: 12, background: selected ? `${colors.gold}08` : colors.surface, border: `1px solid ${selected ? `${colors.gold}66` : colors.goldBorder}`, textAlign: 'left', cursor: 'pointer', transition: 'all 150ms', position: 'relative' }}>
                              {selected && <Check size={12} color={colors.gold} style={{ position: 'absolute', top: 6, right: 8 }} />}
                              <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text, lineHeight: 1.3, marginBottom: 4, paddingRight: selected ? 16 : 0 }}>{food.nom}</div>
                              <div style={{ display: 'flex', gap: 6, fontSize: 10, fontWeight: 500 }}>
                                <span style={{ color: colors.gold }}>{food.kcal}</span>
                                <span style={{ color: colors.blue }}>P{food.p}</span>
                                <span style={{ color: colors.success }}>G{food.g}</span>
                                <span style={{ color: colors.orange }}>L{food.l}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {foodQuery.length >= 1 && filtered.length === 0 && (
                    <p style={{ ...mutedStyle, fontSize: '0.75rem', color: colors.textMuted, textAlign: 'center', padding: '12px 0' }}>{t('meals.noResults', { query: foodQuery })}</p>
                  )}
                </div>

                <div style={{ flexShrink: 0, paddingTop: 4 }}>
                  <NextBtn onClick={advanceMeal} label={mealSubStep < 3 ? t('nav.next') : t('nav.continue')} />
                  <button onClick={advanceMeal} style={{ width: '100%', marginTop: 6, padding: '8px', background: 'none', border: 'none', color: colors.textMuted, fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline', fontFamily: fonts.body }}>{t('nav.skip')}</button>
                </div>
              </motion.div>
            )
          })()}

          {/* Step 6: Summary */}
          {step === 6 && (
            <motion.div key="s6" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 20, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
              <div><h2 style={h2Style}>{t('summary.title')}</h2><p style={subStyle}>{t('summary.subtitle')}</p></div>

              <div style={{ ...cardStyle, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { l: t('summary.firstName'), v: firstName },
                  { l: t('summary.gender'), v: gender === 'male' ? t('profile.male') : gender === 'female' ? t('profile.female') : '--' },
                  { l: t('summary.weight'), v: weight ? `${weight} kg` : '--' },
                  { l: t('summary.height'), v: height ? `${height} cm` : '--' },
                  { l: t('summary.diet'), v: { omnivore: t('diet.omnivore'), vegetarian: t('diet.vegetarian'), vegan: t('diet.vegan') }[dietaryType] || '--' },
                  { l: t('summary.goalWeight'), v: goalWeight ? `${goalWeight} kg` : '--' },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <div style={{ ...labelStyle, fontSize: 11, letterSpacing: '2px' }}>{l}</div>
                    <div style={{ ...bodyStyle, fontSize: '0.9rem', color: colors.text, fontWeight: 600, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 700, fontFamily: fonts.body, background: colors.goldDim, color: colors.gold, border: `1px solid ${colors.goldRule}`, textTransform: 'uppercase' }}>
                  {{ omnivore: t('diet.omnivore'), vegetarian: t('diet.vegetarian'), vegan: t('diet.vegan') }[dietaryType]}
                </span>
                {allergies.map(a => (
                  <span key={a} style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 700, fontFamily: fonts.body, background: 'rgba(239,68,68,0.12)', color: colors.error, border: '1px solid rgba(239,68,68,0.2)', textTransform: 'uppercase' }}>
                    {a}
                  </span>
                ))}
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 700, fontFamily: fonts.body, background: 'rgba(156,163,175,0.08)', color: colors.textMuted, border: '1px solid rgba(156,163,175,0.12)' }}>
                  {t('summary.foodsBadge', { foodCount: [...new Set(Object.values(mealPrefs).flat())].length, mealCount: Object.values(mealPrefs).filter(ids => ids.length > 0).length })}
                </span>
              </div>

              {tdeeData && (
                <div style={{ ...cardStyle, padding: 16, background: colors.goldDim, border: `1.5px solid ${colors.goldRule}` }}>
                  <div style={{ ...titleStyle, fontSize: 11, letterSpacing: '2px', marginBottom: 10 }}>
                    {t('summary.caloriesTitle')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                    <span style={{ ...statStyle, fontSize: 48, color: colors.gold }}>{tdeeData.adjusted}</span>
                    <span style={{ ...bodyStyle, fontSize: '0.85rem' }}>{t('summary.caloriesUnit')}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { l: t('summary.protein'), v: `${tdeeData.proteinG}g`, c: colors.blue },
                      { l: t('summary.carbs'), v: `${tdeeData.carbsG}g`, c: colors.success },
                      { l: t('summary.fat'), v: `${tdeeData.fatG}g`, c: colors.orange },
                    ].map(m => (
                      <div key={m.l} style={{ background: colors.background, borderRadius: radii.card, padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontFamily: fonts.headline, fontSize: '1.1rem', fontWeight: 700, color: m.c }}>{m.v}</div>
                        <div style={{ ...labelStyle, fontSize: '0.58rem', color: colors.textMuted }}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 'auto' }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={finish} disabled={saving}
                  style={{ ...btnPrimary, width: '100%', padding: '18px', fontSize: '1.05rem', opacity: saving ? 0.3 : 1, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 200ms' }}>
                  {saving ? <><div style={{ width: 18, height: 18, border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> {t('summary.saving')}</>
                    : <>{t('summary.submit')} <CheckCircle size={20} strokeWidth={2.5} /></>}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── Shared styles & components ── */
const h2Style: React.CSSProperties = { ...pageTitleStyle, fontSize: 22, margin: '0 0 4px', letterSpacing: '0.15em' }
const subStyle: React.CSSProperties = { ...bodyStyle, fontSize: '0.9rem', margin: 0, fontWeight: 300 }
const formLabelStyle: React.CSSProperties = { ...labelStyle, display: 'block', fontSize: 11, marginBottom: 8, letterSpacing: '2px' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: radii.input, color: colors.text, fontSize: 16, fontFamily: fonts.body, outline: 'none', transition: 'border-color 200ms, box-shadow 200ms' }

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (<div><label style={formLabelStyle}>{label}</label><input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} /></div>)
}

function NumField({ label, value, onChange, unit, placeholder }: { label: string; value: string; onChange: (v: string) => void; unit: string; placeholder?: string }) {
  return (
    <div><label style={formLabelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, paddingRight: 40 }} />
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, fontSize: '0.85rem', pointerEvents: 'none' }}>{unit}</span>
      </div>
    </div>
  )
}

function NextBtn({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <motion.button whileTap={disabled ? {} : { scale: 0.97 }} onClick={onClick} disabled={disabled}
      style={{ ...btnPrimary, width: '100%', padding: 16, fontSize: '1.05rem', opacity: disabled ? 0.3 : 1, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 200ms' }}>
      {label} <ChevronRight size={20} strokeWidth={2.5} />
    </motion.button>
  )
}
