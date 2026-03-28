'use client'
import { createBrowserClient } from '@supabase/ssr'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Check, ChevronRight, ChevronLeft } from 'lucide-react'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const GOLD = '#C9A84C'
const BG = '#0A0A0A'
const CARD = '#1A1A1A'
const BORDER = '#2A2A2A'
const TEXT = '#F8FAFC'
const MUTED = '#6B7280'
const TOTAL_STEPS = 4

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}
const transition = { type: 'tween' as const, duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

const SPECIALITIES = [
  { id: 'musculation', label: 'Musculation', emoji: '💪' },
  { id: 'cardio', label: 'Cardio/Running', emoji: '🏃' },
  { id: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { id: 'weight_loss', label: 'Perte de poids', emoji: '⚖️' },
  { id: 'mass', label: 'Prise de masse', emoji: '📈' },
  { id: 'wellness', label: 'Bien-être', emoji: '🧘' },
]

const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', background: CARD, border: `1.5px solid ${BORDER}`, borderRadius: 12, color: TEXT, fontSize: '1rem', fontFamily: "'Barlow', sans-serif", outline: 'none', transition: 'border-color 200ms' }
const labelStyle: React.CSSProperties = { display: 'block', color: MUTED, fontSize: '0.78rem', fontWeight: 600, marginBottom: 8, letterSpacing: '0.03em', textTransform: 'uppercase' }

export default function CoachSignupWrapper() {
  return <Suspense fallback={<div style={{ height: '100dvh', background: '#0A0A0A' }} />}><CoachSignupPage /></Suspense>
}

function CoachSignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [session, setSession] = useState<any>(null)
  const [step, setStep] = useState(parseInt(searchParams.get('step') || '1'))
  const [dir, setDir] = useState(1)
  const [saving, setSaving] = useState(false)

  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [specialities, setSpecialities] = useState<string[]>([])
  const [experience, setExperience] = useState(3)
  const [price, setPrice] = useState('150')
  const [cguAccepted, setCguAccepted] = useState(false)
  const [stripeConnecting, setStripeConnecting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        const meta = session.user.user_metadata
        if (meta?.full_name) setFullName(meta.full_name)
      }
    })
  }, [])

  function goNext() { setDir(1); setStep(s => Math.min(s + 1, TOTAL_STEPS)) }
  function goBack() { setDir(-1); setStep(s => Math.max(s - 1, 1)) }

  async function saveProfile() {
    if (!session) return
    setSaving(true)
    await supabase.from('profiles').upsert({
      id: session.user.id,
      full_name: fullName.trim(),
      role: 'coach',
      coach_bio: bio.trim() || null,
      coach_speciality: specialities.length > 0 ? specialities : null,
      coach_experience_years: experience,
      subscription_price: parseFloat(price) || 150,
      cgu_accepted_at: new Date().toISOString(),
      coach_onboarding_complete: true,
      subscription_status: 'active',
      subscription_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    })
    setSaving(false)
  }

  async function handleStripeConnect() {
    setStripeConnecting(true)
    try {
      // Ensure profile is saved first
      await saveProfile()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { console.error('[coach signup] No user'); setStripeConnecting(false); return }
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: user.id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else console.error('[stripe connect] No URL:', data.error)
    } catch (err) {
      console.error('Stripe connect error:', err)
    }
    setStripeConnecting(false)
  }

  async function finishAndRedirect() {
    await saveProfile()
    router.replace('/coach')
  }

  return (
    <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Barlow', sans-serif" }}>

      {/* Progress bar */}
      {step > 1 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', gap: 4, padding: '8px 16px' }}>
          {Array.from({ length: TOTAL_STEPS - 1 }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: BORDER, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: GOLD, width: i < step - 1 ? '100%' : '0%', transition: 'width 400ms ease' }} />
            </div>
          ))}
        </div>
      )}

      {step > 1 && (
        <button onClick={goBack} style={{ position: 'fixed', top: 20, left: 16, zIndex: 50, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> Retour
        </button>
      )}

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence custom={dir} mode="wait">

          {/* Step 1: Welcome */}
          {step === 1 && (
            <motion.div key="s1" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', gap: 28 }}>
              <div className="animate-pulse-gold" style={{ width: 88, height: 88, background: GOLD, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={48} color="#000" strokeWidth={2.5} fill="#000" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 800, color: TEXT, margin: '0 0 8px', letterSpacing: '0.05em' }}>Rejoins MoovX</h1>
                <p style={{ color: MUTED, fontSize: '0.9rem', margin: 0 }}>La plateforme de coaching fitness #1</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
                {['Gère tes clients depuis une seule app', 'Plans alimentaires et sportifs générés par IA', 'Paiements automatisés via Stripe'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: TEXT }}>
                    <Check size={16} color={GOLD} strokeWidth={3} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => {
                if (session) { goNext() } else {
                  supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/coach-signup?step=2` } })
                }
              }} style={{ width: '100%', maxWidth: 320, padding: '18px', background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', borderRadius: 16, color: '#000', fontSize: '1.1rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {session ? 'Continuer' : 'Créer mon compte coach'} <ChevronRight size={20} strokeWidth={2.5} />
              </button>
              <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: '0.82rem' }}>Déjà un compte ? Se connecter</button>
            </motion.div>
          )}

          {/* Step 2: Professional info */}
          {step === 2 && (
            <motion.div key="s2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 20, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
              <div>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: TEXT, margin: '0 0 4px' }}>Ton profil coach</h2>
                <p style={{ color: MUTED, fontSize: '0.9rem', margin: 0 }}>Présente-toi à tes futurs clients</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label style={labelStyle}>Nom complet *</label><input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jean Dupont" style={inputStyle} /></div>
                <div><label style={labelStyle}>Bio courte</label><textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 200))} placeholder="Ex: Coach certifié IFBB, 8 ans d'expérience..." rows={3} style={{ ...inputStyle, resize: 'none' }} /><div style={{ fontSize: '0.65rem', color: MUTED, textAlign: 'right', marginTop: 2 }}>{bio.length}/200</div></div>
                <div>
                  <label style={labelStyle}>Spécialités</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SPECIALITIES.map(s => {
                      const sel = specialities.includes(s.id)
                      return (
                        <button key={s.id} onClick={() => setSpecialities(prev => sel ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                          style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${sel ? GOLD : BORDER}`, background: sel ? `${GOLD}15` : CARD, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: sel ? GOLD : TEXT, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 150ms' }}>
                          {s.emoji} {s.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Expérience (ans)</label><input type="number" value={experience} onChange={e => setExperience(Math.max(0, parseInt(e.target.value) || 0))} min={0} max={30} style={{ ...inputStyle, textAlign: 'center' }} /></div>
                  <div><label style={labelStyle}>Tarif mensuel (CHF)</label><input type="number" value={price} onChange={e => setPrice(e.target.value)} min={30} style={{ ...inputStyle, textAlign: 'center' }} /></div>
                </div>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <button onClick={goNext} disabled={!fullName.trim()} style={{ width: '100%', padding: '18px', background: !fullName.trim() ? BORDER : `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', borderRadius: 16, color: !fullName.trim() ? MUTED : '#000', fontSize: '1.05rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", cursor: !fullName.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  Continuer <ChevronRight size={20} strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: CGU */}
          {step === 3 && (
            <motion.div key="s3" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', gap: 16, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
              <div>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: TEXT, margin: '0 0 4px' }}>Conditions d'utilisation</h2>
                <p style={{ color: MUTED, fontSize: '0.9rem', margin: 0 }}>Lis et accepte avant de continuer</p>
              </div>
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, maxHeight: 260, overflowY: 'auto', fontSize: '0.78rem', color: MUTED, lineHeight: 1.7 }}>
                <strong style={{ color: TEXT }}>1. COMMISSION PLATEFORME</strong><br />
                En utilisant MoovX, vous acceptez de reverser 5% de chaque paiement client à la plateforme MoovX.<br />
                Exemple : Pour un abonnement de CHF 150/mois, CHF 7.50 sera reversé à MoovX.<br /><br />
                <strong style={{ color: TEXT }}>2. PAIEMENTS</strong><br />
                Les paiements sont traités via Stripe. Vous devez connecter un compte Stripe valide pour recevoir vos revenus.<br /><br />
                <strong style={{ color: TEXT }}>3. RESPONSABILITÉS</strong><br />
                Vous êtes responsable de la qualité de votre coaching et du contenu des plans fournis à vos clients.<br /><br />
                <strong style={{ color: TEXT }}>4. DONNÉES</strong><br />
                MoovX stocke les données de vos clients de manière sécurisée conformément au RGPD.<br /><br />
                <strong style={{ color: TEXT }}>5. RÉSILIATION</strong><br />
                Vous pouvez résilier votre compte à tout moment. Les abonnements clients en cours restent actifs jusqu'à leur terme.
              </div>
              <button onClick={() => setCguAccepted(!cguAccepted)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12, background: cguAccepted ? `${GOLD}12` : CARD, border: `1.5px solid ${cguAccepted ? GOLD : BORDER}`, cursor: 'pointer', textAlign: 'left', transition: 'all 200ms' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: cguAccepted ? GOLD : '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  {cguAccepted && <Check size={14} color="#000" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: '0.82rem', color: TEXT, lineHeight: 1.4 }}>J'accepte les CGU et la commission de 5% par client par mois</span>
              </button>
              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <button onClick={goNext} disabled={!cguAccepted} style={{ width: '100%', padding: '18px', background: !cguAccepted ? BORDER : `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', borderRadius: 16, color: !cguAccepted ? MUTED : '#000', fontSize: '1.05rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", cursor: !cguAccepted ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  Accepter et continuer <ChevronRight size={20} strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Stripe */}
          {step === 4 && (
            <motion.div key="s4" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>Configure tes paiements</h2>
                <p style={{ color: MUTED, fontSize: '0.9rem', margin: 0 }}>Connecte Stripe pour recevoir tes revenus</p>
              </div>
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Paiements sécurisés par Stripe', 'Virements automatiques', 'Dashboard revenus intégré'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: TEXT }}>
                    <Check size={16} color={GOLD} strokeWidth={3} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleStripeConnect} disabled={stripeConnecting}
                style={{ width: '100%', maxWidth: 320, padding: '18px', background: stripeConnecting ? '#2A2A2A' : `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', borderRadius: 16, color: stripeConnecting ? MUTED : '#000', fontSize: '1.05rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", cursor: stripeConnecting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {stripeConnecting ? 'Connexion...' : 'Connecter mon compte Stripe →'}
              </button>
              <button onClick={finishAndRedirect} disabled={saving} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline' }}>
                {saving ? 'Enregistrement...' : 'Passer pour l\'instant'}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
