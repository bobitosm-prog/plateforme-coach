'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Check, ChevronRight, ChevronLeft, Dumbbell, Flame, Scale, Activity, User, Heart } from 'lucide-react'
import { ACTIVITY_LEVELS, calcMifflinStJeor } from '../../lib/design-tokens'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const GOLD = '#C9A84C'
const BG = '#0A0A0A'
const CARD = '#1A1A1A'
const BORDER = '#2A2A2A'
const TEXT = '#F8FAFC'
const MUTED = '#6B7280'
const TOTAL_STEPS = 8

const ALLERGY_OPTIONS = [
  { id: 'gluten', label: 'Gluten', emoji: '🌾' },
  { id: 'lactose', label: 'Lactose', emoji: '🥛' },
  { id: 'nuts', label: 'Fruits à coque', emoji: '🥜' },
  { id: 'eggs', label: 'Oeufs', emoji: '🥚' },
  { id: 'soy', label: 'Soja', emoji: '🫘' },
  { id: 'shellfish', label: 'Crustacés', emoji: '🦐' },
]


const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}
const transition = { type: 'tween' as const, duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

export default function OnboardingPage() {
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
  const [objective, setObjective] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState('')
  const [activityLevel, setActivityLevel] = useState('moderate')
  const [dietaryType, setDietaryType] = useState('omnivore')
  const [allergies, setAllergies] = useState<string[]>([])
  const [mealPrefs, setMealPrefs] = useState<Record<string, string[]>>({
    petit_dejeuner: [], dejeuner: [], collation: [], diner: [],
  })
  const [mealTab, setMealTab] = useState('petit_dejeuner')
  const [foodQuery, setFoodQuery] = useState('')
  const [foodResults, setFoodResults] = useState<any[]>([])
  const [foodSearching, setFoodSearching] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      setSession(session)
      const meta = session.user.user_metadata
      if (meta?.full_name) setFirstName(meta.full_name.split(' ')[0])
    })
  }, [])

  function goNext() { setDir(1); setStep(s => s + 1) }
  function goBack() { setDir(-1); setStep(s => s - 1) }

  // TDEE calculation
  const tdeeData = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(height)
    if (!w || !h || !birthDate || !gender) return null
    const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000)
    if (age <= 0) return null
    const bmr = calcMifflinStJeor(w, h, age, gender)
    const mult = ACTIVITY_LEVELS.find(l => l.id === activityLevel)?.mult || 1.55
    const tdee = Math.round(bmr * mult)
    let adjusted = tdee
    if (objective === 'weight_loss') adjusted = tdee - 300
    else if (objective === 'mass') adjusted = tdee + 300
    const proteinG = Math.round(2 * w)
    const fatG = Math.round((adjusted * 0.25) / 9)
    const carbsG = Math.round((adjusted - proteinG * 4 - fatG * 9) / 4)
    return { tdee, adjusted, proteinG, carbsG, fatG }
  }, [weight, height, birthDate, gender, objective, activityLevel])

  // BMI
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
      full_name: firstName.trim(),
      birth_date: birthDate || null,
      gender: gender || null,
      current_weight: weight ? parseFloat(weight) : null,
      start_weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      target_weight: goalWeight ? parseFloat(goalWeight) : null,
      objective: objective || null,
      fitness_level: fitnessLevel || null,
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
    router.replace('/')
  }

  return (
    <div style={{ minHeight: '100svh', background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Barlow', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500;600&display=swap');
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); cursor: pointer; }
      `}</style>

      {/* Segmented progress bar */}
      {step > 1 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', gap: 4, padding: '8px 16px' }}>
          {Array.from({ length: TOTAL_STEPS - 1 }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: BORDER, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: GOLD, width: i < step - 1 ? '100%' : '0%', transition: 'width 400ms ease' }} />
            </div>
          ))}
        </div>
      )}

      {/* Back button */}
      {step > 1 && (
        <button onClick={goBack} style={{ position: 'fixed', top: 20, left: 16, zIndex: 50, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontFamily: "'Barlow', sans-serif" }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> Retour
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
                <div className="animate-pulse-gold" style={{ width: 88, height: 88, background: GOLD, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={48} color="#000" strokeWidth={2.5} fill="#000" />
                </div>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.8rem', fontWeight: 800, color: TEXT, letterSpacing: '0.1em' }}>FITPRO</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ textAlign: 'center' }}>
                <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>
                  Bienvenue{firstName ? `, ${firstName}` : ''} !
                </h1>
                <p style={{ color: MUTED, fontSize: '1rem', margin: 0 }}>Configurons ton profil en 2 minutes</p>
              </motion.div>
              <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} whileTap={{ scale: 0.97 }} onClick={goNext}
                style={{ width: '100%', maxWidth: 320, padding: '18px', background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', borderRadius: 16, color: '#000', fontSize: '1.1rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                C'est parti <ChevronRight size={20} strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: Infos de base */}
          {step === 2 && (
            <motion.div key="s2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 24, maxWidth: 480, width: '100%', margin: '0 auto' }}>
              <div><h2 style={h2Style}>Qui es-tu ?</h2><p style={subStyle}>Les bases pour commencer</p></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <InputField label="Prénom *" value={firstName} onChange={setFirstName} placeholder="Jean" />
                <div><label style={labelStyle}>Date de naissance</label>
                  <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} /></div>
                <div><label style={labelStyle}>Genre</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[{ k: 'male', l: 'Homme', icon: '♂️' }, { k: 'female', l: 'Femme', icon: '♀️' }].map(g => (
                      <button key={g.k} onClick={() => setGender(g.k as any)}
                        style={{ flex: 1, padding: '16px', borderRadius: 14, border: `2px solid ${gender === g.k ? GOLD : BORDER}`, background: gender === g.k ? `${GOLD}18` : CARD, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 200ms' }}>
                        <span style={{ fontSize: '1.6rem' }}>{g.icon}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, color: gender === g.k ? GOLD : TEXT }}>{g.l}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 'auto' }}><NextBtn onClick={goNext} disabled={!firstName.trim()} /></div>
            </motion.div>
          )}

          {/* Step 3: Morphologie */}
          {step === 3 && (
            <motion.div key="s3" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 24, maxWidth: 480, width: '100%', margin: '0 auto' }}>
              <div><h2 style={h2Style}>Ton corps</h2><p style={subStyle}>Pour personnaliser ton programme</p></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <NumField label="Poids actuel *" value={weight} onChange={setWeight} unit="kg" placeholder="75" />
                  <NumField label="Taille *" value={height} onChange={setHeight} unit="cm" placeholder="175" />
                </div>
                <NumField label="Objectif poids" value={goalWeight} onChange={setGoalWeight} unit="kg" placeholder="70" />
                {bmi && (
                  <div style={{ background: CARD, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Scale size={16} color={GOLD} />
                    <span style={{ fontSize: '0.82rem', color: TEXT }}>IMC : <strong style={{ color: GOLD }}>{bmi}</strong></span>
                    <span style={{ fontSize: '0.72rem', color: MUTED, marginLeft: 'auto' }}>
                      {parseFloat(bmi) < 18.5 ? 'Insuffisant' : parseFloat(bmi) < 25 ? 'Normal' : parseFloat(bmi) < 30 ? 'Surpoids' : 'Obèse'}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 'auto' }}><NextBtn onClick={goNext} disabled={!weight || !height} /></div>
            </motion.div>
          )}

          {/* Step 4: Objectif */}
          {step === 4 && (
            <motion.div key="s4" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 24, maxWidth: 480, width: '100%', margin: '0 auto' }}>
              <div><h2 style={h2Style}>Ton objectif</h2><p style={subStyle}>Qu'est-ce qui te motive ?</p></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { k: 'weight_loss', l: 'Perdre du poids', e: '🔥', c: '#EF4444' },
                  { k: 'mass', l: 'Prendre de la masse', e: '💪', c: '#818CF8' },
                  { k: 'maintenance', l: 'Maintien', e: '⚖️', c: '#22C55E' },
                  { k: 'performance', l: 'Performance', e: '🏃', c: '#F59E0B' },
                ].map(o => {
                  const sel = objective === o.k
                  return (
                    <button key={o.k} onClick={() => setObjective(o.k)}
                      style={{ padding: '20px 12px', borderRadius: 16, border: `2px solid ${sel ? o.c : BORDER}`, background: sel ? `${o.c}15` : CARD, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 200ms' }}>
                      <span style={{ fontSize: '2rem' }}>{o.e}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: sel ? o.c : TEXT, textAlign: 'center' }}>{o.l}</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: 'auto' }}><NextBtn onClick={goNext} disabled={!objective} /></div>
            </motion.div>
          )}

          {/* Step 5: Niveau & Activité */}
          {step === 5 && (
            <motion.div key="s5" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 20, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
              <div><h2 style={h2Style}>Ton niveau</h2><p style={subStyle}>Pour adapter l'intensité</p></div>
              <div>
                <label style={labelStyle}>Niveau fitness</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ k: 'beginner', l: 'Débutant' }, { k: 'intermediate', l: 'Intermédiaire' }, { k: 'advanced', l: 'Avancé' }].map(lv => {
                    const sel = fitnessLevel === lv.k
                    return (
                      <button key={lv.k} onClick={() => setFitnessLevel(lv.k)}
                        style={{ flex: 1, padding: '12px 8px', borderRadius: 12, border: `2px solid ${sel ? GOLD : BORDER}`, background: sel ? `${GOLD}18` : CARD, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: sel ? GOLD : TEXT, transition: 'all 200ms' }}>
                        {lv.l}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Niveau d'activité</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ACTIVITY_LEVELS.map(lvl => {
                    const sel = activityLevel === lvl.id
                    return (
                      <button key={lvl.id} onClick={() => setActivityLevel(lvl.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${sel ? GOLD : BORDER}`, background: sel ? `${GOLD}12` : CARD, cursor: 'pointer', transition: 'all 200ms' }}>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: sel ? GOLD : TEXT, fontFamily: "'Barlow Condensed', sans-serif" }}>{lvl.label}</div>
                          <div style={{ fontSize: '0.68rem', color: MUTED }}>{lvl.sub}</div>
                        </div>
                        {sel && <Check size={16} color={GOLD} strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 8 }}><NextBtn onClick={goNext} disabled={!fitnessLevel} /></div>
            </motion.div>
          )}

          {/* Step 6: Régime & Allergies */}
          {step === 6 && (
            <motion.div key="s6" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 20, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
              <div><h2 style={h2Style}>Ton alimentation</h2><p style={subStyle}>Ces infos personnaliseront ton plan</p></div>

              <div>
                <label style={labelStyle}>Mon régime</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { k: 'omnivore', l: 'Omnivore', d: 'Je mange de tout', e: '🍖' },
                    { k: 'vegetarian', l: 'Végétarien', d: 'Pas de viande ni poisson', e: '🥗' },
                    { k: 'vegan', l: 'Vegan', d: '100% végétal', e: '🌱' },
                  ].map(o => {
                    const sel = dietaryType === o.k
                    return (
                      <button key={o.k} onClick={() => setDietaryType(o.k)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, border: `2px solid ${sel ? GOLD : BORDER}`, background: sel ? `${GOLD}15` : CARD, cursor: 'pointer', transition: 'all 200ms' }}>
                        <span style={{ fontSize: '1.4rem' }}>{o.e}</span>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: sel ? GOLD : TEXT }}>{o.l}</div>
                          <div style={{ fontSize: '0.72rem', color: MUTED }}>{o.d}</div>
                        </div>
                        {sel && <Check size={16} color={GOLD} strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Allergies & intolérances</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ALLERGY_OPTIONS.map(a => {
                    const sel = allergies.includes(a.id)
                    return (
                      <button key={a.id} onClick={() => setAllergies(prev => sel ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${sel ? '#EF4444' : BORDER}`, background: sel ? 'rgba(239,68,68,0.08)' : CARD, cursor: 'pointer', transition: 'all 200ms' }}>
                        <span style={{ fontSize: '1.1rem' }}>{a.emoji}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: sel ? '#EF4444' : TEXT, flex: 1, textAlign: 'left' }}>{a.label}</span>
                        {sel && <Check size={14} color="#EF4444" strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 8 }}><NextBtn onClick={goNext} /></div>
            </motion.div>
          )}

          {/* Step 7: Mes repas (Ciqual search) */}
          {step === 7 && (() => {
            const MEAL_TABS = [
              { id: 'petit_dejeuner', label: 'Matin', emoji: '🌅' },
              { id: 'dejeuner', label: 'Midi', emoji: '☀️' },
              { id: 'collation', label: 'Collation', emoji: '🍎' },
              { id: 'diner', label: 'Dîner', emoji: '🌙' },
            ]
            const currentIds = mealPrefs[mealTab] || []
            const totalFoods = Object.values(mealPrefs).flat().length
            const mealsWithFood = Object.values(mealPrefs).filter(ids => ids.length > 0).length

            // Search handler
            const handleSearch = (q: string) => {
              setFoodQuery(q)
              clearTimeout(searchTimerRef.current)
              if (q.length < 2) { setFoodResults([]); return }
              setFoodSearching(true)
              searchTimerRef.current = setTimeout(async () => {
                const { data } = await supabase
                  .from('food_items')
                  .select('id, name, energy_kcal, proteins, carbohydrates, fat')
                  .ilike('name', `%${q}%`)
                  .limit(15)
                setFoodResults((data || []).map((f: any) => ({
                  id: f.id, nom: f.name || '',
                  kcal: Math.round(f.energy_kcal ?? 0),
                  p: Math.round((f.proteins ?? 0) * 10) / 10,
                  g: Math.round((f.carbohydrates ?? 0) * 10) / 10,
                  l: Math.round((f.fat ?? 0) * 10) / 10,
                })))
                setFoodSearching(false)
              }, 300)
            }

            const addFood = (food: any) => {
              if (currentIds.includes(food.id)) return
              setMealPrefs(prev => ({ ...prev, [mealTab]: [...(prev[mealTab] || []), food.id] }))
              setResolvedNames(prev => ({ ...prev, [food.id]: food.nom }))
              setFoodQuery('')
              setFoodResults([])
            }

            const removeFood = (id: string) => {
              setMealPrefs(prev => ({ ...prev, [mealTab]: (prev[mealTab] || []).filter(x => x !== id) }))
            }

            return (
              <motion.div key="s7" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 14, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
                <div><h2 style={h2Style}>Tes habitudes alimentaires</h2><p style={subStyle}>Dis-nous ce que tu aimes manger à chaque repas</p></div>

                {/* Meal tabs */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {MEAL_TABS.map(t => {
                    const active = mealTab === t.id
                    const count = (mealPrefs[t.id] || []).length
                    return (
                      <button key={t.id} onClick={() => { setMealTab(t.id); setFoodQuery(''); setFoodResults([]) }}
                        style={{ flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: active ? `${GOLD}20` : CARD, transition: 'all 150ms' }}>
                        <span style={{ fontSize: '1.1rem' }}>{t.emoji}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, color: active ? GOLD : MUTED }}>{t.label}</span>
                        {count > 0 && <span style={{ fontSize: '0.55rem', color: GOLD, fontWeight: 700 }}>{count}</span>}
                      </button>
                    )
                  })}
                </div>

                {/* Search input */}
                <div style={{ position: 'relative' }}>
                  <input value={foodQuery} onChange={e => handleSearch(e.target.value)} placeholder="Rechercher dans 3484 aliments..."
                    style={{ ...inputStyle, paddingLeft: 38 }} />
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: GOLD, fontSize: '0.9rem' }}>🔍</span>
                </div>

                {/* Search results dropdown */}
                {foodResults.length > 0 && (
                  <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, maxHeight: 200, overflowY: 'auto' }}>
                    {foodResults.map(food => (
                      <button key={food.id} onClick={() => addFood(food)} disabled={currentIds.includes(food.id)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: `1px solid ${BORDER}`, cursor: currentIds.includes(food.id) ? 'default' : 'pointer', opacity: currentIds.includes(food.id) ? 0.4 : 1, textAlign: 'left' }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', color: TEXT, fontWeight: 600 }}>{food.nom}</div>
                          <div style={{ fontSize: '0.62rem', color: MUTED }}>{food.kcal}kcal · {food.p}P · {food.g}G · {food.l}L</div>
                        </div>
                        {!currentIds.includes(food.id) && <span style={{ color: GOLD, fontSize: '1rem' }}>+</span>}
                      </button>
                    ))}
                  </div>
                )}
                {foodSearching && <p style={{ fontSize: '0.72rem', color: MUTED, textAlign: 'center' }}>Recherche...</p>}

                {/* Selected foods as chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 32 }}>
                  {currentIds.length === 0 && <span style={{ fontSize: '0.75rem', color: MUTED, fontStyle: 'italic' }}>Aucun aliment sélectionné</span>}
                  {currentIds.map(id => (
                    <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: `${GOLD}18`, border: `1px solid ${GOLD}40`, fontSize: '0.72rem', fontWeight: 600, color: GOLD }}>
                      {resolvedNames[id] || id.slice(0, 8)}
                      <button onClick={() => removeFood(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GOLD, padding: 0, fontSize: '0.85rem', lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: '0.68rem', color: MUTED, textAlign: 'center' }}>
                  {currentIds.length} aliment{currentIds.length !== 1 ? 's' : ''} pour {MEAL_TABS.find(t => t.id === mealTab)?.label?.toLowerCase()}
                </div>

                {/* Validation + next */}
                <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                  <div style={{ fontSize: '0.72rem', color: mealsWithFood >= 2 ? GOLD : MUTED, fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>
                    {totalFoods} aliments au total · {mealsWithFood}/4 repas configurés {mealsWithFood < 2 && '(min. 2)'}
                  </div>
                  <NextBtn onClick={goNext} disabled={mealsWithFood < 2} />
                </div>
              </motion.div>
            )
          })()}

          {/* Step 8: Récapitulatif */}
          {step === 8 && (
            <motion.div key="s8" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 20, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
              <div><h2 style={h2Style}>Récapitulatif</h2><p style={subStyle}>Vérifie tes informations</p></div>

              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { l: 'Prénom', v: firstName },
                  { l: 'Genre', v: gender === 'male' ? 'Homme' : gender === 'female' ? 'Femme' : '—' },
                  { l: 'Poids', v: weight ? `${weight} kg` : '—' },
                  { l: 'Taille', v: height ? `${height} cm` : '—' },
                  { l: 'Objectif', v: { weight_loss: 'Perte de poids', mass: 'Prise de masse', maintenance: 'Maintien', performance: 'Performance' }[objective] || '—' },
                  { l: 'Poids cible', v: goalWeight ? `${goalWeight} kg` : '—' },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <div style={{ fontSize: '0.6rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                    <div style={{ fontSize: '0.9rem', color: TEXT, fontWeight: 600, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Diet / allergies / foods badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", background: dietaryType === 'vegan' ? 'rgba(34,197,94,0.12)' : dietaryType === 'vegetarian' ? 'rgba(249,115,22,0.12)' : `${GOLD}15`, color: dietaryType === 'vegan' ? '#22C55E' : dietaryType === 'vegetarian' ? '#F97316' : GOLD, border: `1px solid ${dietaryType === 'vegan' ? 'rgba(34,197,94,0.2)' : dietaryType === 'vegetarian' ? 'rgba(249,115,22,0.2)' : `${GOLD}30`}`, textTransform: 'uppercase' }}>
                  {dietaryType === 'omnivore' ? '🍖 Omnivore' : dietaryType === 'vegetarian' ? '🥗 Végétarien' : '🌱 Vegan'}
                </span>
                {allergies.map(a => (
                  <span key={a} style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', textTransform: 'uppercase' }}>
                    {ALLERGY_OPTIONS.find(o => o.id === a)?.emoji} {a}
                  </span>
                ))}
                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", background: 'rgba(156,163,175,0.08)', color: MUTED, border: '1px solid rgba(156,163,175,0.12)' }}>
                  {[...new Set(Object.values(mealPrefs).flat())].length} aliments · {Object.values(mealPrefs).filter(ids => ids.length > 0).length}/4 repas
                </span>
              </div>

              {/* TDEE card */}
              {tdeeData && (
                <div style={{ background: `${GOLD}10`, border: `1.5px solid ${GOLD}40`, borderRadius: 16, padding: 16 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Tes besoins caloriques
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 800, color: GOLD }}>{tdeeData.adjusted}</span>
                    <span style={{ fontSize: '0.85rem', color: MUTED }}>kcal / jour</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { l: 'Protéines', v: `${tdeeData.proteinG}g`, c: '#3B82F6' },
                      { l: 'Glucides', v: `${tdeeData.carbsG}g`, c: '#22C55E' },
                      { l: 'Lipides', v: `${tdeeData.fatG}g`, c: '#F97316' },
                    ].map(m => (
                      <div key={m.l} style={{ background: BG, borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: m.c }}>{m.v}</div>
                        <div style={{ fontSize: '0.58rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase' }}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 'auto' }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={finish} disabled={saving}
                  style={{ width: '100%', padding: '18px', background: saving ? '#374151' : `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', borderRadius: 16, color: saving ? MUTED : '#000', fontSize: '1.05rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {saving ? <><div style={{ width: 18, height: 18, border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Enregistrement...</>
                    : <>Valider mon profil <Check size={20} strokeWidth={2.5} /></>}
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
const h2Style: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#F8FAFC', margin: '0 0 4px' }
const subStyle: React.CSSProperties = { color: '#6B7280', fontSize: '0.9rem', margin: 0 }
const labelStyle: React.CSSProperties = { display: 'block', color: '#6B7280', fontSize: '0.78rem', fontWeight: 600, fontFamily: "'Barlow', sans-serif", marginBottom: 8, letterSpacing: '0.03em', textTransform: 'uppercase' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', background: '#1A1A1A', border: '1.5px solid #2A2A2A', borderRadius: 12, color: '#F8FAFC', fontSize: '1rem', fontFamily: "'Barlow', sans-serif", outline: 'none', transition: 'border-color 200ms, box-shadow 200ms' }

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (<div><label style={labelStyle}>{label}</label><input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} /></div>)
}

function NumField({ label, value, onChange, unit, placeholder }: { label: string; value: string; onChange: (v: string) => void; unit: string; placeholder?: string }) {
  return (
    <div><label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, paddingRight: 40 }} />
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontSize: '0.85rem', pointerEvents: 'none' }}>{unit}</span>
      </div>
    </div>
  )
}

function NextBtn({ onClick, disabled, label = 'Continuer' }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <motion.button whileTap={disabled ? {} : { scale: 0.97 }} onClick={onClick} disabled={disabled}
      style={{ width: '100%', padding: '18px', background: disabled ? '#2A2A2A' : `linear-gradient(135deg, #C9A84C, #D4AF37)`, border: 'none', borderRadius: 16, color: disabled ? '#6B7280' : '#000', fontSize: '1.05rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 200ms, color 200ms' }}>
      {label} <ChevronRight size={20} strokeWidth={2.5} />
    </motion.button>
  )
}
