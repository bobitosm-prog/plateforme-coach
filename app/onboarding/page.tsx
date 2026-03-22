'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Check, ChevronRight, Upload, Dumbbell, Flame, Zap as ZapIcon, Leaf } from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const ORANGE = '#F97316'
const BG = '#0A0A0A'
const CARD = '#1A1A1A'
const BORDER = '#2A2A2A'
const TEXT = '#F8FAFC'
const MUTED = '#6B7280'

const TOTAL_STEPS = 5

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
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced' | ''>('')
  const [objective, setObjective] = useState<'mass' | 'weight_loss' | 'performance' | 'wellness' | ''>('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      setSession(session)
    })
  }, [])

  function goNext() {
    setDir(1)
    setStep(s => s + 1)
  }

  function goBack() {
    setDir(-1)
    setStep(s => s - 1)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function finish() {
    if (!session) return
    setSaving(true)
    const uid = session.user.id

    let avatarUrl: string | null = null
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${uid}/avatar.${ext}`
      await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      avatarUrl = publicUrl
    }

    const update: Record<string, any> = {
      id: uid,
      full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      birth_date: birthDate || null,
      gender: gender || null,
      current_weight: weight ? parseFloat(weight) : null,
      start_weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      target_weight: goalWeight ? parseFloat(goalWeight) : null,
      objective: objective || null,
    }
    if (avatarUrl) update.avatar_url = avatarUrl

    console.log('[onboarding save] uid:', uid, 'full_name:', update.full_name, 'payload:', JSON.stringify(update))

    const { data: saveData, error } = await supabase.from('profiles').update(update).eq('id', uid).select()
    console.log('[onboarding save] result:', JSON.stringify(saveData), 'error:', error)

    if (error) {
      // Fallback: try upsert in case profile row doesn't exist yet
      console.log('[onboarding save] update failed, trying upsert...')
      const { data: upsData, error: upsErr } = await supabase.from('profiles').upsert(update).select()
      console.log('[onboarding save] upsert result:', JSON.stringify(upsData), 'error:', upsErr)
    }

    setSaving(false)
    router.replace('/')
  }

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  return (
    <div style={{ minHeight: '100svh', background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Barlow', sans-serif" }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); cursor: pointer; }
      `}</style>

      {/* Progress bar */}
      {step > 1 && step < TOTAL_STEPS && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: BORDER, zIndex: 50 }}>
          <motion.div
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ height: '100%', background: ORANGE }}
          />
        </div>
      )}

      {/* Back button */}
      {step > 1 && step < TOTAL_STEPS && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={goBack}
          style={{ position: 'fixed', top: 16, left: 20, zIndex: 50, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: '8px 4px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontFamily: "'Barlow', sans-serif" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Retour
        </motion.button>
      )}

      {/* Step counter */}
      {step > 1 && step < TOTAL_STEPS && (
        <div style={{ position: 'fixed', top: 16, right: 20, zIndex: 50, color: MUTED, fontSize: 13, fontFamily: "'Barlow', sans-serif" }}>
          {step - 1} / {TOTAL_STEPS - 2}
        </div>
      )}

      {/* Steps */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence custom={dir} mode="wait">
          {step === 1 && (
            <StepWelcome key="step1" dir={dir} onNext={goNext} />
          )}
          {step === 2 && (
            <StepProfile
              key="step2" dir={dir}
              firstName={firstName} setFirstName={setFirstName}
              lastName={lastName} setLastName={setLastName}
              birthDate={birthDate} setBirthDate={setBirthDate}
              gender={gender} setGender={setGender}
              avatarPreview={avatarPreview}
              avatarInputRef={avatarInputRef}
              onAvatarChange={handleAvatarChange}
              onNext={() => { if (firstName.trim()) goNext() }}
            />
          )}
          {step === 3 && (
            <StepBody
              key="step3" dir={dir}
              weight={weight} setWeight={setWeight}
              height={height} setHeight={setHeight}
              goalWeight={goalWeight} setGoalWeight={setGoalWeight}
              fitnessLevel={fitnessLevel} setFitnessLevel={setFitnessLevel}
              onNext={() => { if (weight) goNext() }}
            />
          )}
          {step === 4 && (
            <StepObjective
              key="step4" dir={dir}
              objective={objective} setObjective={setObjective}
              onNext={() => { if (objective) goNext() }}
            />
          )}
          {step === 5 && (
            <StepDone key="step5" dir={dir} saving={saving} onFinish={finish} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── Step 1: Welcome ─── */
function StepWelcome({ dir, onNext }: { dir: number; onNext: () => void }) {
  return (
    <motion.div
      custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', gap: 32 }}
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
      >
        <motion.div
          animate={{ boxShadow: ['0 0 0px #F9731600', '0 0 40px #F9731666', '0 0 0px #F9731600'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 88, height: 88, background: ORANGE, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Zap size={48} color="#fff" strokeWidth={2.5} fill="#fff" />
        </motion.div>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.8rem', fontWeight: 800, color: TEXT, letterSpacing: '0.1em' }}>FITPRO</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.2rem', fontWeight: 700, color: TEXT, margin: 0, lineHeight: 1.1 }}>
          Bienvenue chez FITPRO
        </h1>
        <p style={{ color: MUTED, fontSize: '1rem', margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
          Ton coach t'a invité à rejoindre sa plateforme
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        style={{ width: '100%', maxWidth: 320, padding: '18px 24px', background: ORANGE, border: 'none', borderRadius: 16, color: '#fff', fontSize: '1.1rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        Commencer
        <ChevronRight size={20} strokeWidth={2.5} />
      </motion.button>
    </motion.div>
  )
}

/* ─── Step 2: Profile ─── */
function StepProfile({ dir, firstName, setFirstName, lastName, setLastName, birthDate, setBirthDate, gender, setGender, avatarPreview, avatarInputRef, onAvatarChange, onNext }: any) {
  const genders = [{ key: 'male', label: 'Homme' }, { key: 'female', label: 'Femme' }, { key: 'other', label: 'Autre' }]
  return (
    <motion.div
      custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '72px 24px 32px', gap: 28, maxWidth: 480, width: '100%', margin: '0 auto' }}
    >
      <div>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: TEXT, margin: '0 0 4px' }}>Ton profil</h2>
        <p style={{ color: MUTED, fontSize: '0.9rem', margin: 0 }}>Dis-nous qui tu es</p>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          style={{ width: 88, height: 88, borderRadius: '50%', background: CARD, border: `2px dashed ${BORDER}`, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <>
              <Upload size={20} color={MUTED} />
              <span style={{ color: MUTED, fontSize: 11, fontFamily: "'Barlow', sans-serif" }}>Photo</span>
            </>
          )}
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onAvatarChange} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Prénom *" value={firstName} onChange={setFirstName} placeholder="Jean" />
          <Field label="Nom" value={lastName} onChange={setLastName} placeholder="Dupont" />
        </div>
        <div>
          <label style={labelStyle}>Date de naissance</label>
          <input
            type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Genre</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {genders.map(g => (
              <button
                key={g.key} type="button" onClick={() => setGender(g.key)}
                style={{ flex: 1, padding: '12px 8px', borderRadius: 12, border: `1.5px solid ${gender === g.key ? ORANGE : BORDER}`, background: gender === g.key ? `${ORANGE}22` : CARD, color: gender === g.key ? ORANGE : MUTED, fontFamily: "'Barlow', sans-serif", fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <NextButton onClick={onNext} disabled={!firstName.trim()} />
      </div>
    </motion.div>
  )
}

/* ─── Step 3: Body ─── */
function StepBody({ dir, weight, setWeight, height, setHeight, goalWeight, setGoalWeight, fitnessLevel, setFitnessLevel, onNext }: any) {
  const levels = [
    { key: 'beginner', label: 'Débutant', desc: '< 1 an' },
    { key: 'intermediate', label: 'Intermédiaire', desc: '1–3 ans' },
    { key: 'advanced', label: 'Avancé', desc: '3+ ans' },
  ]
  return (
    <motion.div
      custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '72px 24px 32px', gap: 28, maxWidth: 480, width: '100%', margin: '0 auto' }}
    >
      <div>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: TEXT, margin: '0 0 4px' }}>Ton corps</h2>
        <p style={{ color: MUTED, fontSize: '0.9rem', margin: 0 }}>Pour personnaliser ton programme</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <NumberField label="Poids actuel *" value={weight} onChange={setWeight} unit="kg" placeholder="75" />
          <NumberField label="Taille" value={height} onChange={setHeight} unit="cm" placeholder="175" />
        </div>
        <NumberField label="Objectif poids" value={goalWeight} onChange={setGoalWeight} unit="kg" placeholder="70" />
      </div>

      <div>
        <label style={labelStyle}>Niveau fitness</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {levels.map(l => (
            <button
              key={l.key} type="button" onClick={() => setFitnessLevel(l.key)}
              style={{ padding: '14px 18px', borderRadius: 14, border: `1.5px solid ${fitnessLevel === l.key ? ORANGE : BORDER}`, background: fitnessLevel === l.key ? `${ORANGE}18` : CARD, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
            >
              <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600, color: fitnessLevel === l.key ? ORANGE : TEXT, fontSize: '0.95rem' }}>{l.label}</span>
              <span style={{ color: MUTED, fontSize: '0.82rem', fontFamily: "'Barlow', sans-serif" }}>{l.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <NextButton onClick={onNext} disabled={!weight} />
      </div>
    </motion.div>
  )
}

/* ─── Step 4: Objective ─── */
function StepObjective({ dir, objective, setObjective, onNext }: any) {
  const objectives = [
    { key: 'mass', label: 'Prise de masse', desc: 'Gagner du muscle et de la force', Icon: Dumbbell, color: '#818CF8' },
    { key: 'weight_loss', label: 'Perte de poids', desc: 'Brûler les graisses, affiner', Icon: Flame, color: '#F97316' },
    { key: 'performance', label: 'Performance', desc: 'Améliorer tes capacités athlétiques', Icon: ZapIcon, color: '#FACC15' },
    { key: 'wellness', label: 'Bien-être & Maintien', desc: 'Rester en forme et en bonne santé', Icon: Leaf, color: '#22C55E' },
  ]
  return (
    <motion.div
      custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '72px 24px 32px', gap: 28, maxWidth: 480, width: '100%', margin: '0 auto' }}
    >
      <div>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: TEXT, margin: '0 0 4px' }}>Ton objectif</h2>
        <p style={{ color: MUTED, fontSize: '0.9rem', margin: 0 }}>Qu'est-ce qui te motive ?</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {objectives.map(({ key, label, desc, Icon, color }) => {
          const selected = objective === key
          return (
            <motion.button
              key={key} type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setObjective(key)}
              style={{ padding: '18px 20px', borderRadius: 18, border: `1.5px solid ${selected ? color : BORDER}`, background: selected ? `${color}18` : CARD, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left', transition: 'border-color 0.2s, background 0.2s' }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={24} color={color} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: selected ? color : TEXT }}>{label}</div>
                <div style={{ color: MUTED, fontSize: '0.82rem', marginTop: 2, fontFamily: "'Barlow', sans-serif" }}>{desc}</div>
              </div>
              {selected && (
                <div style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <NextButton onClick={onNext} disabled={!objective} label="Terminer" />
      </div>
    </motion.div>
  )
}

/* ─── Step 5: Done ─── */
function StepDone({ dir, saving, onFinish }: { dir: number; saving: boolean; onFinish: () => void }) {
  return (
    <motion.div
      custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', gap: 32, textAlign: 'center' }}
    >
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
        style={{ width: 100, height: 100, borderRadius: '50%', background: '#22C55E22', border: '2px solid #22C55E66', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Check size={52} color="#22C55E" strokeWidth={2.5} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.4rem', fontWeight: 800, color: TEXT, margin: 0, letterSpacing: '0.02em' }}>Tout est prêt !</h2>
        <p style={{ color: MUTED, fontSize: '1rem', margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
          Ton coach va préparer ton programme personnalisé
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        whileTap={{ scale: 0.97 }}
        onClick={onFinish}
        disabled={saving}
        style={{ width: '100%', maxWidth: 320, padding: '18px 24px', background: saving ? '#374151' : ORANGE, border: 'none', borderRadius: 16, color: '#fff', fontSize: '1.05rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em', cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
      >
        {saving ? (
          <>
            <div style={{ width: 18, height: 18, border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Enregistrement…
          </>
        ) : (
          <>
            Accéder à mon dashboard
            <ChevronRight size={20} strokeWidth={2.5} />
          </>
        )}
      </motion.button>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </motion.div>
  )
}

/* ─── Shared components ─── */
const labelStyle: React.CSSProperties = {
  display: 'block', color: MUTED, fontSize: '0.82rem', fontWeight: 500,
  fontFamily: "'Barlow', sans-serif", marginBottom: 8, letterSpacing: '0.03em', textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px', background: CARD, border: `1.5px solid ${BORDER}`,
  borderRadius: 12, color: TEXT, fontSize: '1rem', fontFamily: "'Barlow', sans-serif", outline: 'none',
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inputStyle, '::placeholder': { color: MUTED } } as any}
      />
    </div>
  )
}

function NumberField({ label, value, onChange, unit, placeholder }: { label: string; value: string; onChange: (v: string) => void; unit: string; placeholder?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ ...inputStyle, paddingRight: 40 }}
        />
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontSize: '0.85rem', fontFamily: "'Barlow', sans-serif", pointerEvents: 'none' }}>{unit}</span>
      </div>
    </div>
  )
}

function NextButton({ onClick, disabled, label = 'Continuer' }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      style={{ width: '100%', padding: '18px 24px', background: disabled ? BORDER : ORANGE, border: 'none', borderRadius: 16, color: disabled ? MUTED : '#fff', fontSize: '1.05rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s, color 0.2s' }}
    >
      {label}
      <ChevronRight size={20} strokeWidth={2.5} />
    </motion.button>
  )
}
