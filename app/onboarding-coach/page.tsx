'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Check, Camera, CreditCard, Upload } from 'lucide-react'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

const GOLD = '#C9A84C'
const BG = '#0A0A0A'
const CARD = '#1A1A1A'
const BORDER = '#2A2A2A'
const TEXT = '#F8FAFC'
const MUTED = '#6B7280'
const TOTAL_STEPS = 4

const SPECIALITIES = ['Musculation', 'Nutrition', 'Fitness général', 'CrossFit', 'Yoga', 'Autre']
const EXPERIENCE_OPTIONS = ['1-3 ans', '3-5 ans', '5-10 ans', '10+ ans']
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const COMM_OPTIONS = ['Chat', 'Email', 'Les deux']

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}
const transition = { type: 'tween' as const, duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

export default function CoachOnboardingPage() {
  const router = useRouter()
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [session, setSession] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [dir, setDir] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [speciality, setSpeciality] = useState('')
  const [experience, setExperience] = useState('')

  // Step 2
  const [hourlyRate, setHourlyRate] = useState('')
  const [maxClients, setMaxClients] = useState('')
  const [availableDays, setAvailableDays] = useState<string[]>([])
  const [commPreference, setCommPreference] = useState('')

  // Step 3
  const [stripeConnected, setStripeConnected] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) { router.replace('/login'); return }
      setSession(s)
      // Pre-fill from user metadata
      const meta = s.user.user_metadata
      if (meta?.full_name) setFullName(meta.full_name)
      if (meta?.coach_speciality) setSpeciality(meta.coach_speciality)
      if (meta?.coach_experience_years) setExperience(meta.coach_experience_years)
      // Load existing profile
      supabase.from('profiles').select('*').eq('id', s.user.id).single().then(({ data }) => {
        if (!data) return
        if (data.full_name) setFullName(data.full_name)
        if (data.coach_bio) setBio(data.coach_bio)
        if (data.coach_speciality) setSpeciality(data.coach_speciality)
        if (data.coach_experience_years) setExperience(data.coach_experience_years)
        if (data.coach_hourly_rate) setHourlyRate(String(data.coach_hourly_rate))
        if (data.coach_max_clients) setMaxClients(String(data.coach_max_clients))
        if (data.coach_available_days) setAvailableDays(data.coach_available_days)
        if (data.coach_comm_preference) setCommPreference(data.coach_comm_preference)
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
      })
    })
  }, [])

  function goNext() { setDir(1); setStep(s => Math.min(s + 1, TOTAL_STEPS)) }
  function goBack() { setDir(-1); setStep(s => Math.max(s - 1, 1)) }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session) return
    setAvatarUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${session.user.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    }
    setAvatarUploading(false)
  }

  async function handleStripeConnect() {
    setStripeLoading(true)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setStripeConnected(true)
      }
    } catch {
      // silently fail, user can retry
    }
    setStripeLoading(false)
  }

  async function finish() {
    if (!session) return
    setSaving(true)
    const uid = session.user.id
    const update: Record<string, any> = {
      id: uid,
      full_name: fullName.trim(),
      coach_bio: bio.trim() || null,
      coach_speciality: speciality || null,
      coach_experience_years: experience || null,
      coach_hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      coach_max_clients: maxClients ? parseInt(maxClients) : null,
      coach_available_days: availableDays.length > 0 ? availableDays : null,
      coach_comm_preference: commPreference || null,
      coach_onboarding_complete: true,
    }
    if (avatarUrl) update.avatar_url = avatarUrl

    const { error } = await supabase.from('profiles').update(update).eq('id', uid).select()
    if (error) await supabase.from('profiles').upsert(update).select()

    setSaving(false)
    router.replace('/')
  }

  function toggleDay(day: string) {
    setAvailableDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  return (
    <div style={{ minHeight: '100svh', background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Segmented progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: BORDER, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: GOLD, width: i < step ? '100%' : '0%', transition: 'width 400ms ease' }} />
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.68rem', color: MUTED, fontWeight: 600, marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>
          {step}/{TOTAL_STEPS}
        </div>
      </div>

      {/* Back button */}
      {step > 1 && step < 4 && (
        <button onClick={goBack} style={{ position: 'fixed', top: 36, left: 16, zIndex: 50, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> Retour
        </button>
      )}

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence custom={dir} mode="wait">
          {/* Step 1: Profil Coach */}
          {step === 1 && (
            <motion.div key="s1" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '64px 24px 32px', gap: 20, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
              <div><h2 style={h2Style}>Profil Coach</h2><p style={subStyle}>Fais bonne impression</p></div>

              {/* Avatar upload */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ position: 'relative', width: 100, height: 100, borderRadius: '50%', border: `2.5px dashed ${avatarUrl ? GOLD : BORDER}`, background: avatarUrl ? 'transparent' : CARD, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 200ms' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={28} color={MUTED} />
                  )}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${BG}` }}>
                    {avatarUploading ? (
                      <div style={{ width: 14, height: 14, border: '2px solid #0004', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    ) : (
                      <Upload size={14} color="#000" strokeWidth={2.5} />
                    )}
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              </div>

              {/* Full Name */}
              <div>
                <label style={labelStyle}>Nom complet *</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jean Dupont" style={inputStyle} />
              </div>

              {/* Bio */}
              <div>
                <label style={labelStyle}>Bio</label>
                <textarea value={bio} onChange={e => { if (e.target.value.length <= 300) setBio(e.target.value) }} placeholder="Parle de toi en quelques mots..."
                  style={{ ...inputStyle, minHeight: 90, resize: 'vertical', lineHeight: 1.5 } as React.CSSProperties} />
                <div style={{ textAlign: 'right', fontSize: '0.7rem', color: bio.length > 280 ? '#EF4444' : MUTED, marginTop: 4, fontWeight: 500 }}>
                  {bio.length}/300
                </div>
              </div>

              {/* Speciality */}
              <div>
                <label style={labelStyle}>Spécialité</label>
                <select value={speciality} onChange={e => setSpeciality(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236B7280' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' } as React.CSSProperties}>
                  <option value="" style={{ background: CARD, color: MUTED }}>Choisir...</option>
                  {SPECIALITIES.map(s => (
                    <option key={s} value={s} style={{ background: CARD, color: TEXT }}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Experience */}
              <div>
                <label style={labelStyle}>Expérience</label>
                <select value={experience} onChange={e => setExperience(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236B7280' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' } as React.CSSProperties}>
                  <option value="" style={{ background: CARD, color: MUTED }}>Choisir...</option>
                  {EXPERIENCE_OPTIONS.map(e => (
                    <option key={e} value={e} style={{ background: CARD, color: TEXT }}>{e}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <NextBtn onClick={goNext} disabled={!fullName.trim()} />
              </div>
            </motion.div>
          )}

          {/* Step 2: Configuration */}
          {step === 2 && (
            <motion.div key="s2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '64px 24px 32px', gap: 20, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
              <div><h2 style={h2Style}>Configuration</h2><p style={subStyle}>Paramètre ton activité</p></div>

              {/* Tarif horaire */}
              <div>
                <label style={labelStyle}>Tarif horaire (CHF)</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" inputMode="decimal" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="ex: 80"
                    style={{ ...inputStyle, paddingRight: 50 }} />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontSize: '0.85rem', pointerEvents: 'none' }}>CHF</span>
                </div>
              </div>

              {/* Max clients */}
              <div>
                <label style={labelStyle}>Nombre max de clients</label>
                <input type="number" inputMode="numeric" value={maxClients} onChange={e => setMaxClients(e.target.value)} placeholder="ex: 20" style={inputStyle} />
              </div>

              {/* Jours de disponibilité */}
              <div>
                <label style={labelStyle}>Jours de disponibilité</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DAYS.map(day => {
                    const sel = availableDays.includes(day)
                    return (
                      <button key={day} onClick={() => toggleDay(day)}
                        style={{ padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${sel ? GOLD : BORDER}`, background: sel ? `${GOLD}20` : CARD, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', fontWeight: 600, color: sel ? GOLD : TEXT, transition: 'all 200ms', minWidth: 44, textAlign: 'center' }}>
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Préférence communication */}
              <div>
                <label style={labelStyle}>Préférence communication</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COMM_OPTIONS.map(opt => {
                    const sel = commPreference === opt
                    return (
                      <button key={opt} onClick={() => setCommPreference(opt)}
                        style={{ flex: 1, padding: '12px 8px', borderRadius: 12, border: `2px solid ${sel ? GOLD : BORDER}`, background: sel ? `${GOLD}18` : CARD, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', fontWeight: 600, color: sel ? GOLD : TEXT, transition: 'all 200ms' }}>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <NextBtn onClick={goNext} />
              </div>
            </motion.div>
          )}

          {/* Step 3: Stripe Connect */}
          {step === 3 && (
            <motion.div key="s3" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 28px 32px', gap: 24, maxWidth: 480, width: '100%', margin: '0 auto' }}>

              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                style={{ width: 80, height: 80, borderRadius: '50%', background: `${GOLD}15`, border: `2px solid ${GOLD}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={36} color={GOLD} strokeWidth={1.5} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ textAlign: 'center' }}>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', fontWeight: 400, color: TEXT, margin: '0 0 12px', letterSpacing: '0.06em' }}>
                  REÇOIS TES PAIEMENTS
                </h2>
                <p style={{ color: MUTED, fontSize: '0.92rem', margin: 0, lineHeight: 1.6, maxWidth: 340 }}>
                  Connecte ton compte Stripe pour recevoir les paiements de tes clients directement sur ton compte bancaire.
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleStripeConnect} disabled={stripeLoading || stripeConnected}
                  style={{ width: '100%', padding: '16px', background: stripeConnected ? '#22C55E' : `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', borderRadius: 14, color: stripeConnected ? '#fff' : '#000', fontSize: '1rem', fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif", cursor: stripeLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.04em' }}>
                  {stripeLoading ? (
                    <><div style={{ width: 18, height: 18, border: '2px solid #0004', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Connexion...</>
                  ) : stripeConnected ? (
                    <><Check size={18} strokeWidth={2.5} /> Connecté</>
                  ) : (
                    'Connecter Stripe'
                  )}
                </motion.button>

                <button onClick={goNext}
                  style={{ width: '100%', padding: '14px', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 14, color: MUTED, fontSize: '0.92rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', transition: 'all 200ms' }}>
                  Plus tard
                </button>
              </motion.div>

              <p style={{ color: MUTED, fontSize: '0.72rem', fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
                Tu pourras toujours connecter Stripe depuis ton profil
              </p>
            </motion.div>
          )}

          {/* Step 4: Terminé */}
          {step === 4 && (
            <motion.div key="s4" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 28px 32px', gap: 24, maxWidth: 480, width: '100%', margin: '0 auto' }}>

              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                style={{ width: 80, height: 80, borderRadius: '50%', background: `${GOLD}20`, border: `2.5px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={40} color={GOLD} strokeWidth={2.5} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ textAlign: 'center' }}>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', fontWeight: 400, color: TEXT, margin: '0 0 6px', letterSpacing: '0.06em' }}>
                  BIENVENUE COACH !
                </h2>
                <p style={{ color: MUTED, fontSize: '1rem', margin: 0 }}>Ton espace est prêt</p>
              </motion.div>

              {/* Summary card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ width: '100%', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${GOLD}40` }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${GOLD}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${GOLD}40` }}>
                      <span style={{ fontSize: '1.2rem', color: GOLD, fontWeight: 700 }}>{fullName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: TEXT }}>{fullName || 'Coach'}</div>
                    <div style={{ fontSize: '0.78rem', color: GOLD, fontWeight: 600 }}>{speciality || 'Coach'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { l: 'Expérience', v: experience || '--' },
                    { l: 'Tarif', v: hourlyRate ? `${hourlyRate} CHF/h` : '--' },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <div style={{ fontSize: '0.6rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                      <div style={{ fontSize: '0.88rem', color: TEXT, fontWeight: 600, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>

                {bio && (
                  <div>
                    <div style={{ fontSize: '0.6rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Bio</div>
                    <p style={{ fontSize: '0.82rem', color: TEXT, margin: 0, lineHeight: 1.5, opacity: 0.85 }}>
                      {bio.length > 120 ? bio.slice(0, 120) + '...' : bio}
                    </p>
                  </div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ width: '100%', maxWidth: 320 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={finish} disabled={saving}
                  style={{ width: '100%', padding: '18px', background: saving ? '#374151' : `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', borderRadius: 16, color: saving ? MUTED : '#000', fontSize: '1.1rem', fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif", cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.04em' }}>
                  {saving ? (
                    <><div style={{ width: 18, height: 18, border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Enregistrement...</>
                  ) : (
                    <>Accéder à mon dashboard <ChevronRight size={20} strokeWidth={2.5} /></>
                  )}
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── Shared styles & components ── */
const h2Style: React.CSSProperties = { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', fontWeight: 400, color: '#F8FAFC', margin: '0 0 4px', letterSpacing: '0.04em' }
const subStyle: React.CSSProperties = { color: '#6B7280', fontSize: '0.9rem', margin: 0, fontFamily: "'DM Sans', sans-serif" }
const labelStyle: React.CSSProperties = { display: 'block', color: '#6B7280', fontSize: '0.78rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginBottom: 8, letterSpacing: '0.03em', textTransform: 'uppercase' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', background: '#1A1A1A', border: '1.5px solid #2A2A2A', borderRadius: 12, color: '#F8FAFC', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', transition: 'border-color 200ms, box-shadow 200ms', boxSizing: 'border-box' }

function NextBtn({ onClick, disabled, label = 'Suivant' }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <motion.button whileTap={disabled ? {} : { scale: 0.97 }} onClick={onClick} disabled={disabled}
      style={{ width: '100%', padding: '18px', background: disabled ? '#2A2A2A' : `linear-gradient(135deg, #C9A84C, #D4AF37)`, border: 'none', borderRadius: 16, color: disabled ? '#6B7280' : '#000', fontSize: '1.05rem', fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif", cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 200ms, color 200ms', letterSpacing: '0.04em' }}>
      {label} <ChevronRight size={20} strokeWidth={2.5} />
    </motion.button>
  )
}
