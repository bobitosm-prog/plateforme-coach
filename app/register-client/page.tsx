'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, User, ChevronDown } from 'lucide-react'
import { BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE, RED, GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../../lib/design-tokens'

/*
  APPLE SIGN-IN SETUP:
  1. Supabase Dashboard → Authentication → Providers → Apple → Enable
  2. Apple Developer Account ($99/year) required
  3. Create Service ID + Key (.p8) in Apple Developer Console
  4. Fill Service ID, Team ID, Key ID, Private Key in Supabase
  5. Add redirect URLs: https://app.moovx.ch, Supabase callback URL
*/

const supabase = createBrowserClient((process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(), (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim())

const GoogleIcon = () => <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
const AppleIcon = () => <svg width="16" height="19" viewBox="0 0 16 19" fill="white"><path d="M15.462 6.498c-.098.063-1.828 1.05-1.828 3.218 0 2.508 2.202 3.396 2.268 3.418-.011.042-.351 1.207-1.163 2.384-.713 1.035-1.456 2.068-2.585 2.068s-1.422-.657-2.727-.657c-1.273 0-1.724.679-2.761.679s-1.741-.955-2.585-2.116C3.06 14.052 2.17 11.839 2.17 9.748c0-3.374 2.191-5.163 4.35-5.163 1.147 0 2.103.753 2.826.753.69 0 1.767-.8 3.078-.8.497 0 2.283.044 3.038 1.96zM10.737.94C11.286.294 11.676-.352 11.676-.352s-.03 0-.03.002c.003.003-.617.258-1.166.912-.504.598-.946 1.258-.946 1.929 0 .085.008.171.024.252.016.082.038.152.038.152s.035.002.035.002c.003 0 .654-.22 1.106-.957z"/></svg>

const ClientIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="16" cy="10" r="5" />
    <path d="M6 30v-2a8 8 0 0116 0v2" />
    <path d="M30 16v10M25 21h10" />
  </svg>
)

const CoachIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="16" cy="10" r="5" />
    <path d="M6 30v-2a8 8 0 0116 0v2" />
    <rect x="26" y="8" width="10" height="14" rx="2" />
    <path d="M29 12h4M29 15h4M29 18h2" />
  </svg>
)

const SPECIALITIES = ['Musculation', 'Nutrition', 'Fitness général', 'CrossFit', 'Yoga', 'Autre']
const EXPERIENCE_OPTIONS = ['1-3 ans', '3-5 ans', '5-10 ans', '10+ ans']

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState<'choose' | 'client' | 'coach'>('choose')
  const [selectedRole, setSelectedRole] = useState<'client' | 'coach'>('client')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  // Coach-specific fields
  const [fullName, setFullName] = useState('')
  const [speciality, setSpeciality] = useState('')
  const [experience, setExperience] = useState('')

  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'coach') {
      setSelectedRole('coach')
      setStep('coach')
    }
  }, [searchParams])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: prof } = await supabase.from('profiles').select('role, coach_onboarding_complete').eq('id', session.user.id).maybeSingle()
        router.replace(prof?.role === 'coach' && !prof?.coach_onboarding_complete ? '/onboarding-coach' : '/')
        return
      }
      setChecking(false)
    })
  }, [])

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${selectedRole === 'coach' ? 'onboarding-coach' : 'onboarding'}`
    : selectedRole === 'coach' ? '/onboarding-coach' : '/onboarding'

  function validate(): string | null {
    if (!email.trim()) return 'Email requis'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email invalide'
    if (password.length < 8) return 'Mot de passe : 8 caractères minimum'
    if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas'
    if (step === 'coach') {
      if (!fullName.trim()) return 'Nom complet requis'
      if (!speciality) return 'Spécialité requise'
      if (!experience) return 'Expérience requise'
    }
    return null
  }

  async function handleEmailSignUp() {
    const err = validate()
    if (err) { setError(err); return }
    setError(''); setSubmitting(true)
    const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectUrl } })
    if (signUpError) {
      setSubmitting(false)
      setError(signUpError.message.includes('already registered') ? 'Cet email est déjà utilisé. Connecte-toi.' : signUpError.message)
      return
    }
    // Save role — wait for Supabase trigger to create profile first, then UPDATE
    if (data?.user) {
      const uid = data.user.id
      const profileData: Record<string, any> = {
        role: selectedRole,
        email: email.trim(),
      }
      if (selectedRole === 'coach') {
        profileData.full_name = fullName.trim()
        profileData.coach_speciality = speciality
        profileData.coach_experience_years = experience
      }
      // Wait for trigger to create the row
      await new Promise(r => setTimeout(r, 1000))
      // Try UPDATE first (trigger already created the row)
      const { error: updateErr } = await supabase.from('profiles').update(profileData).eq('id', uid)
      if (updateErr) {
        // Fallback: trigger hasn't fired yet, upsert with id
        await new Promise(r => setTimeout(r, 1000))
        await supabase.from('profiles').upsert({ id: uid, ...profileData })
      }

      // Auto-assign clients (not coaches) to default coach fe.ma
      if (selectedRole === 'client') {
        await fetch('/api/assign-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: uid, autoAssign: true }),
        })
      }
    }
    setSubmitting(false)
    setEmailSent(true)
  }

  if (checking) return (
    <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG_BASE }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (emailSent) return (
    <div style={{ height: '100dvh', display: 'flex', background: BG_BASE }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <LeftPanel />
      <div className="auth-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: BG_BASE }}>
        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center', animation: 'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ width: 72, height: 72, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: RADIUS_CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={36} color={GREEN} strokeWidth={1.5} />
          </div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '2.2rem', letterSpacing: '2px', color: TEXT_PRIMARY, margin: '0 0 12px' }}>VERIFIE TA BOITE MAIL</h1>
          <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 8px', fontFamily: FONT_BODY }}>
            Un email de confirmation a été envoyé à <strong style={{ color: GOLD }}>{email}</strong>.
          </p>
          <p style={{ color: TEXT_MUTED, fontSize: '0.78rem', margin: '0 0 32px', lineHeight: 1.5, fontFamily: FONT_BODY }}>
            Clique sur le lien pour activer ton compte et commencer.
          </p>
          <button onClick={() => { setEmailSent(false); setPassword(''); setConfirmPassword('') }} style={{ background: 'transparent', border: `1px solid ${GOLD_RULE}`, borderRadius: 0, padding: '12px 32px', color: TEXT_MUTED, fontSize: '0.85rem', cursor: 'pointer', fontFamily: FONT_ALT, fontWeight: 700, transition: 'border-color 0.3s' }}>Retour</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: BG_BASE, fontFamily: FONT_BODY }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes panelIn{from{opacity:0}to{opacity:1}}
        .auth-input{width:100%;background:${BG_BASE};border:1px solid ${BORDER};border-radius:0;padding:14px 14px 14px 44px;color:${TEXT_PRIMARY};font-size:0.9rem;outline:none;transition:border-color 0.3s,box-shadow 0.3s;font-family:${FONT_BODY};box-sizing:border-box}
        .auth-input:focus{border-color:${GOLD};box-shadow:none}
        .auth-input::placeholder{color:${TEXT_DIM}}
        .auth-select{width:100%;background:${BG_BASE};border:1px solid ${BORDER};border-radius:0;padding:14px 14px 14px 44px;color:${TEXT_PRIMARY};font-size:0.9rem;outline:none;transition:border-color 0.3s,box-shadow 0.3s;font-family:${FONT_BODY};appearance:none;cursor:pointer;box-sizing:border-box}
        .auth-select:focus{border-color:${GOLD};box-shadow:none}
        .auth-select option{background:${BG_BASE};color:${TEXT_PRIMARY}}
        .oauth-btn{width:100%;padding:14px 20px;border-radius:0;font-size:0.9rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-family:${FONT_ALT};transition:transform 0.2s,box-shadow 0.2s}
        .oauth-btn:hover{transform:translateY(-1px)}
        .gold-btn{width:100%;padding:15px 20px;background:${GOLD};border:none;border-radius:0;color:${BG_BASE};font-size:0.95rem;font-weight:800;cursor:pointer;font-family:${FONT_ALT};clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%);transition:transform 0.2s,box-shadow 0.2s}
        .gold-btn:hover{transform:translateY(-2px)}
        .gold-btn:disabled{opacity:0.6;cursor:wait;transform:none;box-shadow:none}
        .ghost-btn{width:100%;padding:15px 20px;background:transparent;border:1px solid ${GOLD_RULE};border-radius:0;color:${GOLD};font-size:0.95rem;font-weight:700;cursor:pointer;font-family:${FONT_ALT};transition:transform 0.2s,box-shadow 0.2s,background 0.2s}
        .ghost-btn:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(201,168,76,0.15);background:rgba(201,168,76,0.05)}
        .role-card{background:${BG_CARD};border:1px solid ${BORDER};border-radius:${RADIUS_CARD}px;padding:40px 32px;cursor:pointer;transition:border-color 0.3s,transform 0.3s,box-shadow 0.3s;display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px}
        .role-card:hover{border-color:${GOLD_RULE};transform:translateY(-4px);box-shadow:0 16px 48px rgba(201,168,76,0.1)}
        .back-btn{background:none;border:none;color:${TEXT_MUTED};font-size:0.85rem;cursor:pointer;font-family:${FONT_ALT};padding:0;margin-bottom:20px;transition:color 0.2s;display:flex;align-items:center;gap:6px}
        .back-btn:hover{color:${GOLD}}
        @media(max-width:768px){.auth-left{display:none!important}.auth-right{min-height:100dvh!important}.role-grid{grid-template-columns:1fr!important}}
      `}</style>

      <LeftPanel />

      <div className="auth-right" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: BG_BASE, overflowY: 'auto' }}>

        {/* Mobile logo */}
        <div className="auth-mobile-logo" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <img src="/logo-moovx.png" alt="MoovX Logo" width={48} height={48} style={{ borderRadius: RADIUS_CARD, marginBottom: 12 }} />
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 3, color: GOLD }}>MOOVX</span>
        </div>
        <style>{`@media(max-width:768px){.auth-mobile-logo{display:flex!important}}`}</style>

        {/* ─── STEP: CHOOSE ─── */}
        {step === 'choose' && (
          <div style={{ maxWidth: 800, width: '100%', animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(2rem,4vw,2.8rem)', letterSpacing: '2px', color: TEXT_PRIMARY, margin: '0 0 6px', lineHeight: 1 }}>REJOINS MOOVX</h1>
              <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', fontWeight: 300, margin: 0, fontFamily: FONT_BODY }}>Choisis ton profil</p>
            </div>

            <div className="role-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Card CLIENT */}
              <div className="role-card" onClick={() => { setSelectedRole('client'); setStep('client') }}>
                <ClientIcon />
                <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: '2px', color: TEXT_PRIMARY, margin: 0 }}>JE SUIS CLIENT</h2>
                <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, margin: 0, lineHeight: 1.6 }}>
                  Je veux transformer mon corps avec un programme personnalisé
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', width: '100%' }}>
                  {['Plans nutrition personnalises', 'Programme PPL', 'Suivi progression', 'Coach personnel 24/7'].map(f => (
                    <span key={f} style={{ fontSize: 13, color: TEXT_MUTED, fontFamily: FONT_BODY }}>
                      <span style={{ color: GOLD, marginRight: 6 }}>&#10003;</span>{f}
                    </span>
                  ))}
                </div>
                <button className="gold-btn" style={{ marginTop: 8 }} onClick={e => { e.stopPropagation(); setSelectedRole('client'); setStep('client') }}>
                  Commencer — 10 jours gratuits
                </button>
              </div>

              {/* Card COACH */}
              <div className="role-card" onClick={() => { setSelectedRole('coach'); setStep('coach') }}>
                <CoachIcon />
                <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: '2px', color: TEXT_PRIMARY, margin: 0 }}>JE SUIS COACH</h2>
                <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, margin: 0, lineHeight: 1.6 }}>
                  Je veux gérer mes clients avec les outils pro de MoovX
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', width: '100%' }}>
                  {['Dashboard coach', 'Plans personnalises pour tes clients', 'Messagerie', 'Analytics'].map(f => (
                    <span key={f} style={{ fontSize: 13, color: TEXT_MUTED, fontFamily: FONT_BODY }}>
                      <span style={{ color: GOLD, marginRight: 6 }}>&#10003;</span>{f}
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: 12, color: GOLD, background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: 0, padding: '4px 12px', fontWeight: 600, fontFamily: FONT_ALT }}>CHF 50/mois</span>
                <button className="ghost-btn" style={{ marginTop: 4 }} onClick={e => { e.stopPropagation(); setSelectedRole('coach'); setStep('coach') }}>
                  Devenir Coach Pro
                </button>
              </div>
            </div>

            {/* Link to login */}
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <span style={{ color: TEXT_DIM, fontSize: '0.82rem', fontFamily: FONT_BODY }}>Déjà un compte ?{' '}</span>
              <button onClick={() => router.push('/login')} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'none', fontFamily: FONT_BODY, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)} onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
                Se connecter
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP: CLIENT SIGNUP ─── */}
        {step === 'client' && (
          <div style={{ maxWidth: 400, width: '100%' }}>
            <button className="back-btn" onClick={() => setStep('choose')}>
              &#8592; Changer de profil
            </button>

            <div style={{ animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1)' }}>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(2rem,4vw,2.8rem)', letterSpacing: '2px', color: TEXT_PRIMARY, margin: '0 0 6px', lineHeight: 1 }}>CREER TON COMPTE</h1>
              <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', fontWeight: 300, margin: '0 0 32px', fontFamily: FONT_BODY }}>Commence ta transformation</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Google */}
              <button className="oauth-btn" onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } })}
                style={{ background: '#fff', border: 'none', color: '#000', animation: 'fadeUp 0.7s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
                <GoogleIcon /> Continuer avec Google
              </button>

              {/* Apple */}
              <button className="oauth-btn" onClick={() => supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: redirectUrl } })}
                style={{ background: '#000', border: `1px solid ${BORDER}`, color: '#fff', animation: 'fadeUp 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both' }}>
                <AppleIcon /> Continuer avec Apple
              </button>

              {/* Separator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0', animation: 'fadeUp 0.7s 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
                <div style={{ flex: 1, height: 1, background: BORDER }} />
                <span style={{ color: TEXT_DIM, fontSize: '0.72rem', fontWeight: 500, letterSpacing: 1, fontFamily: FONT_ALT }}>OU</span>
                <div style={{ flex: 1, height: 1, background: BORDER }} />
              </div>

              {/* Email */}
              <div style={{ position: 'relative', animation: 'fadeUp 0.7s 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
                <Mail size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="email" className="auth-input" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="Email" />
              </div>

              {/* Password */}
              <div style={{ position: 'relative', animation: 'fadeUp 0.7s 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
                <Lock size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type={showPassword ? 'text' : 'password'} className="auth-input" style={{ paddingRight: 44 }} value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="Mot de passe (min. 8 car.)" />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPassword ? <EyeOff size={16} color={TEXT_DIM} /> : <Eye size={16} color={TEXT_DIM} />}
                </button>
              </div>

              {/* Confirm */}
              <div style={{ position: 'relative', animation: 'fadeUp 0.7s 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
                <Lock size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type={showPassword ? 'text' : 'password'} className="auth-input" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError('') }} placeholder="Confirmer le mot de passe" onKeyDown={e => { if (e.key === 'Enter') handleEmailSignUp() }} />
              </div>

              {/* Error */}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: RADIUS_CARD }}>
                  <AlertCircle size={14} color={RED} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', color: RED }}>{error}</span>
                </div>
              )}

              {/* Submit */}
              <div style={{ animation: 'fadeUp 0.7s 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
                <button className="gold-btn" onClick={handleEmailSignUp} disabled={submitting}>
                  {submitting ? 'Création du compte...' : 'Créer mon compte'}
                </button>
              </div>

              {/* Link to login */}
              <div style={{ textAlign: 'center', marginTop: 12, animation: 'fadeUp 0.7s 0.45s cubic-bezier(0.16,1,0.3,1) both' }}>
                <span style={{ color: TEXT_DIM, fontSize: '0.82rem', fontFamily: FONT_BODY }}>Déjà un compte ?{' '}</span>
                <button onClick={() => router.push('/login')} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'none', fontFamily: FONT_BODY, transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)} onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
                  Se connecter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP: COACH SIGNUP ─── */}
        {step === 'coach' && (
          <div style={{ maxWidth: 400, width: '100%' }}>
            <button className="back-btn" onClick={() => setStep('choose')}>
              &#8592; Changer de profil
            </button>

            <div style={{ animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1)' }}>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(2rem,4vw,2.8rem)', letterSpacing: '2px', color: TEXT_PRIMARY, margin: '0 0 6px', lineHeight: 1 }}>DEVENIR COACH PRO</h1>
              <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', fontWeight: 300, margin: '0 0 32px', fontFamily: FONT_BODY }}>Gère tes clients avec nos outils pro</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Google */}
              <button className="oauth-btn" onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } })}
                style={{ background: '#fff', border: 'none', color: '#000', animation: 'fadeUp 0.7s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
                <GoogleIcon /> Continuer avec Google
              </button>

              {/* Apple */}
              <button className="oauth-btn" onClick={() => supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: redirectUrl } })}
                style={{ background: '#000', border: `1px solid ${BORDER}`, color: '#fff', animation: 'fadeUp 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both' }}>
                <AppleIcon /> Continuer avec Apple
              </button>

              {/* Separator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0', animation: 'fadeUp 0.7s 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
                <div style={{ flex: 1, height: 1, background: BORDER }} />
                <span style={{ color: TEXT_DIM, fontSize: '0.72rem', fontWeight: 500, letterSpacing: 1, fontFamily: FONT_ALT }}>OU</span>
                <div style={{ flex: 1, height: 1, background: BORDER }} />
              </div>

              {/* Full Name */}
              <div style={{ position: 'relative', animation: 'fadeUp 0.7s 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
                <User size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="text" className="auth-input" value={fullName} onChange={e => { setFullName(e.target.value); setError('') }} placeholder="Nom complet" />
              </div>

              {/* Email */}
              <div style={{ position: 'relative', animation: 'fadeUp 0.7s 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
                <Mail size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="email" className="auth-input" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="Email" />
              </div>

              {/* Password */}
              <div style={{ position: 'relative', animation: 'fadeUp 0.7s 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
                <Lock size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type={showPassword ? 'text' : 'password'} className="auth-input" style={{ paddingRight: 44 }} value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="Mot de passe (min. 8 car.)" />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPassword ? <EyeOff size={16} color={TEXT_DIM} /> : <Eye size={16} color={TEXT_DIM} />}
                </button>
              </div>

              {/* Confirm */}
              <div style={{ position: 'relative', animation: 'fadeUp 0.7s 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
                <Lock size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type={showPassword ? 'text' : 'password'} className="auth-input" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError('') }} placeholder="Confirmer le mot de passe" />
              </div>

              {/* Speciality */}
              <div style={{ position: 'relative', animation: 'fadeUp 0.7s 0.45s cubic-bezier(0.16,1,0.3,1) both' }}>
                <ChevronDown size={16} color={TEXT_DIM} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <User size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <select className="auth-select" value={speciality} onChange={e => { setSpeciality(e.target.value); setError('') }}>
                  <option value="" disabled>Spécialité</option>
                  {SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Experience */}
              <div style={{ position: 'relative', animation: 'fadeUp 0.7s 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
                <ChevronDown size={16} color={TEXT_DIM} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <User size={16} color={TEXT_DIM} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <select className="auth-select" value={experience} onChange={e => { setExperience(e.target.value); setError('') }}>
                  <option value="" disabled>Expérience</option>
                  {EXPERIENCE_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              {/* Error */}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: RADIUS_CARD }}>
                  <AlertCircle size={14} color={RED} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', color: RED }}>{error}</span>
                </div>
              )}

              {/* Submit */}
              <div style={{ animation: 'fadeUp 0.7s 0.55s cubic-bezier(0.16,1,0.3,1) both' }}>
                <button className="gold-btn" onClick={handleEmailSignUp} disabled={submitting}>
                  {submitting ? 'Création du compte...' : 'Créer mon compte coach'}
                </button>
              </div>

              {/* Link to login */}
              <div style={{ textAlign: 'center', marginTop: 12, animation: 'fadeUp 0.7s 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>
                <span style={{ color: TEXT_DIM, fontSize: '0.82rem', fontFamily: FONT_BODY }}>Déjà un compte ?{' '}</span>
                <button onClick={() => router.push('/login')} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'none', fontFamily: FONT_BODY, transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)} onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
                  Se connecter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RegisterClientPage() {
  return (
    <Suspense fallback={
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG_BASE }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}

/* ── Left decorative panel (shared) ── */
function LeftPanel() {
  return (
    <div className="auth-left" style={{ width: '50%', flexShrink: 0, background: BG_BASE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', animation: 'panelIn 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
      {/* Grid lines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(201,168,76,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.015) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
      {/* Gold orb */}
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, background: 'radial-gradient(circle,rgba(201,168,76,0.06),transparent 60%)', pointerEvents: 'none' }} />
      {/* Grain */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.02, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 40px' }}>
        <img src="/logo-moovx.png" alt="MoovX Logo" width={72} height={72} style={{ borderRadius: RADIUS_CARD, margin: '0 auto 20px', display: 'block', boxShadow: '0 16px 48px rgba(201,168,76,0.2)' }} />
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, letterSpacing: 3, color: GOLD, marginBottom: 8 }}>MOOVX</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          <span style={{ fontSize: 14 }}>🇨🇭</span>
          <span style={{ fontSize: '0.7rem', letterSpacing: 4, color: GOLD, textTransform: 'uppercase', fontWeight: 400, fontFamily: FONT_BODY }}>Swiss Made · Swiss Quality</span>
        </div>
        <p style={{ color: TEXT_MUTED, fontSize: '0.88rem', fontWeight: 300, lineHeight: 1.8, maxWidth: 300, margin: '0 auto', fontFamily: FONT_BODY }}>
          La plateforme de coaching fitness d&apos;élite
        </p>
      </div>

      {/* Bottom copyright */}
      <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ color: TEXT_DIM, fontSize: '0.68rem', fontWeight: 300, letterSpacing: 1, fontFamily: FONT_BODY }}>© 2026 MoovX · Genève, Suisse</span>
      </div>
    </div>
  )
}
