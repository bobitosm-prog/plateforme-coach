'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const G = '#C9A84C'
const GL = '#F0D060'

type AuthMode = 'login' | 'register-1' | 'register-2' | 'choose-coach'

export default function LandingPage() {
  const router = useRouter()
  const [faq, setFaq] = useState<number | null>(null)
  const [mode, setMode] = useState<AuthMode>('login')
  const [firstName, setFirstName] = useState('')
  const [gender, setGender] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/')
    })
  }, [])

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/' } })
  }

  async function handleEmailLogin() {
    setError(''); setLoading(true)
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) setError(e.message)
    else router.push('/')
    setLoading(false)
  }

  async function handleSignUp() {
    setError('')
    if (password !== password2) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 6) { setError('Minimum 6 caractères'); return }
    setLoading(true)
    const { data, error: e } = await supabase.auth.signUp({ email, password, options: { data: { full_name: firstName, gender } } })
    if (e) { setError(e.message); setLoading(false); return }
    if (data.user) {
      setUserId(data.user.id)
      await supabase.from('profiles').upsert({ id: data.user.id, full_name: firstName, gender, role: 'client' })
      setMode('choose-coach')
    }
    setLoading(false)
  }

  async function handleChooseCoach() {
    setLoading(true)
    const uid = userId || (await supabase.auth.getUser()).data.user?.id
    if (!uid) { setLoading(false); return }
    const { data: coach } = await supabase.from('profiles').select('id').eq('email', 'fe.ma@bluewin.ch').single()
    if (coach) {
      await supabase.from('coach_clients').upsert({ coach_id: coach.id, client_id: uid }, { onConflict: 'coach_id,client_id' })
    }
    router.push('/onboarding')
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none' }

  // Auth card content
  function renderAuth() {
    if (mode === 'login') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, background: G, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 10 }}>⚡</div>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: 2, margin: '0 0 4px' }}>COACHPRO</h2>
          <p style={{ color: '#666', fontSize: 14, margin: 0 }}>Bon retour 👋</p>
        </div>
        <button onClick={handleGoogleLogin} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#ccc', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continuer avec Google
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} /><span style={{ fontSize: 12, color: '#555' }}>ou</span><div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} /></div>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" type="password" style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleEmailLogin()} />
        {error && <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{error}</p>}
        <button onClick={handleEmailLogin} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${G},${GL})`, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{loading ? 'Connexion...' : 'Connexion'}</button>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#555', margin: 0 }}>Mot de passe oublié ?</p>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: '#666', textAlign: 'center', margin: 0 }}>Pas encore de compte ?</p>
          <button onClick={() => { setMode('register-1'); setError('') }} style={{ width: '100%', padding: '11px', borderRadius: 12, border: `1px solid rgba(201,168,76,0.3)`, background: 'transparent', color: G, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Créer un compte client</button>
          <button onClick={() => router.push('/coach-signup')} style={{ width: '100%', padding: '11px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#777', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Devenir coach</button>
        </div>
      </div>
    )

    if (mode === 'register-1') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 2, margin: '0 0 4px' }}>CRÉE TON COMPTE</h2>
          <p style={{ color: '#666', fontSize: 13, margin: 0 }}>Rejoins CoachPro en 1 minute</p>
        </div>
        <div><label style={{ fontSize: 12, color: '#666', marginBottom: 6, display: 'block' }}>Prénom</label><input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" style={inputStyle} /></div>
        <div><label style={{ fontSize: 12, color: '#666', marginBottom: 6, display: 'block' }}>Genre</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[{ k: 'male', l: 'HOMME', e: '👨' }, { k: 'female', l: 'FEMME', e: '👩' }].map(g => (
              <button key={g.k} onClick={() => setGender(g.k)} style={{ padding: '20px 12px', borderRadius: 16, border: gender === g.k ? 'none' : `1px solid rgba(201,168,76,0.3)`, background: gender === g.k ? `linear-gradient(135deg,${G},${GL})` : 'rgba(255,255,255,0.02)', color: gender === g.k ? '#000' : '#888', cursor: 'pointer', fontSize: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
                {g.e}<span style={{ fontSize: 13, fontWeight: 600 }}>{g.l}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { if (firstName.trim() && gender) { setMode('register-2'); setError('') } }} disabled={!firstName.trim() || !gender} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: firstName.trim() && gender ? `linear-gradient(135deg,${G},${GL})` : '#222', color: firstName.trim() && gender ? '#000' : '#555', fontSize: 14, fontWeight: 600, cursor: firstName.trim() && gender ? 'pointer' : 'default' }}>Continuer →</button>
        <button onClick={() => { setMode('login'); setError('') }} style={{ background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>← Retour à la connexion</button>
      </div>
    )

    if (mode === 'register-2') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 2, margin: '0 0 4px' }}>TON COMPTE</h2>
          <p style={{ color: '#666', fontSize: 13, margin: 0 }}>Salut {firstName} ! Choisis tes identifiants.</p>
        </div>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
        <div style={{ position: 'relative' }}>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe (min. 6)" type={showPw ? 'text' : 'password'} style={inputStyle} />
          <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12 }}>{showPw ? '🙈' : '👁️'}</button>
        </div>
        <input value={password2} onChange={e => setPassword2(e.target.value)} placeholder="Confirmer le mot de passe" type="password" style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleSignUp()} />
        {error && <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{error}</p>}
        <button onClick={handleSignUp} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${G},${GL})`, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{loading ? 'Création...' : 'Créer mon compte →'}</button>
        <button onClick={() => setMode('register-1')} style={{ background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>← Retour</button>
      </div>
    )

    if (mode === 'choose-coach') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 2, margin: '0 0 4px' }}>CHOISIS TON COACH</h2>
          <p style={{ color: '#666', fontSize: 13, margin: 0 }}>Il créera ton plan personnalisé</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg,${G},${GL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#000' }}>FM</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Marco Ferreira</div>
            <div style={{ fontSize: 12, color: '#666' }}>Coach certifié · Genève 🇨🇭</div>
            <div style={{ fontSize: 12, color: G, marginTop: 4 }}>⭐ 4.9 · 50+ clients</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {['💪 Musculation', '🥗 Nutrition', '⚖️ Perte de poids', '🏃 Cardio'].map(s => (
              <span key={s} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', color: G }}>{s}</span>
            ))}
          </div>
        </div>
        <button onClick={handleChooseCoach} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${G},${GL})`, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{loading ? 'Sélection...' : '✓ Choisir ce coach'}</button>
      </div>
    )
  }

  return (
    <div style={{ background: '#050505', color: '#fff', fontFamily: "'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        .bn{font-family:'Bebas Neue',sans-serif;letter-spacing:1.5px}
        @keyframes fbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes slide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media(max-width:900px){.land-grid{grid-template-columns:1fr !important}.auth-col{position:static !important;height:auto !important}.bento-l{grid-template-columns:1fr !important}.bento-l .bc-big-l{grid-column:span 1 !important;grid-row:span 1 !important}.how-grid-l{grid-template-columns:1fr !important;gap:40px !important}.how-grid-l .how-line-l{display:none !important}.price-grid-l{grid-template-columns:1fr !important}.testi-grid-l{grid-template-columns:1fr !important}.phone-zone-l{display:none !important}.footer-grid-l{grid-template-columns:1fr 1fr !important}.sec-pad{padding:60px 20px !important}}
      `}</style>

      <div className="land-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', minHeight: '100vh' }}>
        {/* ═══ LEFT COLUMN — Marketing ═══ */}
        <div>
          {/* HERO */}
          <section style={{ padding: '60px 40px 40px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, background: 'radial-gradient(circle,rgba(201,168,76,0.06),transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 700 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.06)', borderRadius: 40, padding: '5px 14px 5px 8px', marginBottom: 28 }}>
                <div style={{ width: 20, height: 20, background: 'rgba(201,168,76,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✦</div>
                <span style={{ fontSize: 11.5, color: G }}>Propulsé par l'IA Claude d'Anthropic</span>
              </div>
              <h1 className="bn" style={{ fontSize: 'clamp(52px,6vw,88px)', lineHeight: 0.9, marginBottom: 24 }}>TRANSFORME<br />TON CORPS.<br /><span style={{ color: G }}>DÉPASSE</span><br /><span style={{ color: G }}>TES LIMITES.</span></h1>
              <p style={{ color: '#888', fontSize: 16, fontWeight: 300, lineHeight: 1.8, marginBottom: 36, maxWidth: 480 }}>Plans alimentaires et sportifs générés par IA. Basé sur <strong style={{ color: '#ccc', fontWeight: 400 }}>3 484 aliments ANSES/Ciqual 2025</strong>.</p>
              <div style={{ display: 'flex' }}>
                {[{ n: '4.9★', l: 'Note' }, { n: '500+', l: 'Athlètes' }, { n: '50+', l: 'Coachs' }].map((s, i) => (
                  <div key={i} style={{ padding: '0 24px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none', ...(i === 0 ? { paddingLeft: 0 } : {}) }}>
                    <div className="bn" style={{ fontSize: 32, color: G, lineHeight: 1 }}>{s.n}</div>
                    <div style={{ fontSize: 10, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: 2, marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FEATURES */}
          <section className="sec-pad" style={{ padding: '80px 40px', background: '#070707' }}>
            <div style={{ marginBottom: 48 }}><div style={{ fontSize: 10.5, color: G, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Fonctionnalités</div><h2 className="bn" style={{ fontSize: 'clamp(36px,4vw,56px)', lineHeight: 0.95 }}>TOUT CE DONT TU AS BESOIN</h2></div>
            <div className="bento-l" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
              <div className="bc-big-l" style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 22, padding: 28 }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>🥗</div>
                <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 18, padding: '3px 11px', fontSize: 9.5, color: G, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>Ciqual 2025</div>
                <h3 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Nutrition IA personnalisée</h3>
                <p style={{ color: '#5a5a5a', fontSize: 13, lineHeight: 1.75, fontWeight: 300 }}>Plans 7 jours en 30 secondes. <strong style={{ color: '#aaa', fontWeight: 400 }}>3 484 aliments ANSES/Ciqual</strong>.</p>
              </div>
              {[{ i: '💪', t: 'Training sur mesure', d: 'Programmes adaptés à ton niveau.' }, { i: '📊', t: 'Suivi & Progression', d: 'Graphiques, photos, streak.' }, { i: '💬', t: 'Coach connecté', d: 'Messagerie temps réel.' }, { i: '🛒', t: 'Liste de courses', d: 'Générée automatiquement.' }].map((f, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 24 }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{f.i}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{f.t}</h3>
                  <p style={{ color: '#5a5a5a', fontSize: 12.5, lineHeight: 1.7, fontWeight: 300, margin: 0 }}>{f.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="sec-pad" style={{ padding: '80px 40px', background: '#080808' }}>
            <div style={{ marginBottom: 48 }}><div style={{ fontSize: 10.5, color: G, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Comment ça marche</div><h2 className="bn" style={{ fontSize: 'clamp(36px,4vw,56px)', lineHeight: 0.95 }}>3 ÉTAPES</h2></div>
            <div className="how-grid-l" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, position: 'relative' }}>
              <div className="how-line-l" style={{ position: 'absolute', top: 32, left: '16%', right: '16%', height: 1, background: `linear-gradient(90deg,transparent,rgba(201,168,76,0.18),transparent)` }} />
              {[{ i: '🎯', t: 'Crée ton profil', d: '2 min', g: false }, { i: '⚡', t: 'Plan IA en 30s', d: '30 sec', g: true }, { i: '🏆', t: 'Progresse', d: 'Chaque jour', g: false }].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, position: 'relative', zIndex: 1, background: s.g ? `linear-gradient(135deg,${G},${GL})` : 'rgba(201,168,76,0.07)', border: s.g ? 'none' : '1px solid rgba(201,168,76,0.18)' }}>{s.i}</div>
                  <div style={{ fontSize: 9, color: G, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>{s.d}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{s.t}</h3>
                </div>
              ))}
            </div>
          </section>

          {/* PRICING */}
          <section className="sec-pad" style={{ padding: '80px 40px', background: '#0d0d0d' }}>
            <div style={{ marginBottom: 48 }}><div style={{ fontSize: 10.5, color: G, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Tarifs</div><h2 className="bn" style={{ fontSize: 'clamp(36px,4vw,56px)', lineHeight: 0.95 }}>SIMPLE ET TRANSPARENT</h2></div>
            <div className="price-grid-l" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ borderRadius: 22, padding: 32, background: 'rgba(201,168,76,0.04)', border: '1.5px solid rgba(201,168,76,0.4)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, background: G, color: '#000', fontSize: 9, fontWeight: 700, padding: '3px 12px', borderRadius: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Populaire</div>
                <div style={{ fontSize: 10, color: G, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>Athlète</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}><span className="bn" style={{ fontSize: 64, lineHeight: 1, color: G }}>30</span><span style={{ color: '#555', fontSize: 13 }}>CHF/mois</span></div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, margin: '20px 0' }}>
                  {['Plan IA 7 jours', 'Programme entraînement', '3484 aliments Ciqual', 'Chat coach temps réel', 'Liste de courses auto'].map(f => <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ccc', fontWeight: 300 }}><span style={{ color: G }}>✦</span>{f}</li>)}
                </ul>
              </div>
              <div style={{ borderRadius: 22, padding: 32, background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: 10, color: '#555', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>Coach</div>
                <div className="bn" style={{ fontSize: 36, lineHeight: 1, marginBottom: 4 }}>GRATUIT</div>
                <p style={{ color: '#444', fontSize: 12, marginBottom: 20, fontWeight: 300 }}>*5% commission/client</p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['Dashboard clients', 'Plans IA', 'Paiements Stripe', 'Calendrier', 'Messagerie'].map(f => <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555', fontWeight: 300 }}><span style={{ color: '#333' }}>✦</span>{f}</li>)}
                </ul>
              </div>
            </div>
          </section>

          {/* TESTIMONIALS */}
          <section className="sec-pad" style={{ padding: '80px 40px', background: '#060606' }}>
            <div style={{ marginBottom: 48 }}><div style={{ fontSize: 10.5, color: G, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Témoignages</div><h2 className="bn" style={{ fontSize: 'clamp(36px,4vw,56px)', lineHeight: 0.95 }}>ILS EN PARLENT</h2></div>
            <div className="testi-grid-l" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {[{ n: 'Marc T.', r: 'Coach IFBB', q: "Les plans IA me font gagner 2h par client.", ini: 'MT', bg: '#1a3a2a' }, { n: 'Sarah M.', r: 'Cliente', q: "-8 kg en 3 mois. Bluffant.", ini: 'SM', bg: '#1a2a3a' }, { n: 'Lucas B.', r: 'Client', q: "Game changer absolu.", ini: 'LB', bg: '#2a1a3a' }].map((t, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: t.bg, border: '1.5px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{t.ini}</div>
                    <div><div style={{ fontSize: 13, fontWeight: 500 }}>{t.n}</div><div style={{ fontSize: 11, color: '#444' }}>{t.r}</div></div>
                  </div>
                  <div style={{ color: G, fontSize: 12, marginBottom: 8 }}>★★★★★</div>
                  <p style={{ color: '#666', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic', fontWeight: 300, margin: 0 }}>"{t.q}"</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="sec-pad" style={{ padding: '80px 40px', background: '#060606' }}>
            <div style={{ marginBottom: 48 }}><div style={{ fontSize: 10.5, color: G, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>FAQ</div><h2 className="bn" style={{ fontSize: 'clamp(36px,4vw,48px)', lineHeight: 0.95 }}>TES QUESTIONS</h2></div>
            <div style={{ maxWidth: 600 }}>
              {[{ q: 'Comment fonctionne le paiement ?', a: 'CHF 30/mois via Stripe, résiliable à tout moment.' }, { q: "L'IA remplace-t-elle mon coach ?", a: "Non, l'IA assiste ton coach humain." }, { q: 'Données sécurisées ?', a: 'Suisse, Supabase, AES-256, RGPD.' }].map((f, i) => (
                <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <button onClick={() => setFaq(faq === i ? null : i)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#ddd', padding: '18px 0', fontSize: 14, fontWeight: 400, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {f.q}<span style={{ color: G, fontSize: 18, transition: 'transform 0.3s', transform: faq === i ? 'rotate(45deg)' : 'none', flexShrink: 0, marginLeft: 12 }}>+</span>
                  </button>
                  <div style={{ maxHeight: faq === i ? 100 : 0, overflow: 'hidden', transition: 'max-height 300ms ease' }}><p style={{ color: '#555', fontSize: 13, lineHeight: 1.8, paddingBottom: 16, margin: 0, fontWeight: 300 }}>{f.a}</p></div>
                </div>
              ))}
            </div>
          </section>

          {/* FOOTER */}
          <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: '#020202', padding: '32px 40px' }}>
            <div className="footer-grid-l" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, background: G, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
                <span className="bn" style={{ fontSize: 16 }}>COACHPRO</span>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
                {['CGU', 'Confidentialité', 'Contact'].map(l => <a key={l} href="#" style={{ color: '#333', textDecoration: 'none' }}>{l}</a>)}
              </div>
              <span style={{ color: '#2a2a2a', fontSize: 11 }}>© 2026 CoachPro by MoovX</span>
            </div>
          </footer>
        </div>

        {/* ═══ RIGHT COLUMN — Auth (sticky) ═══ */}
        <div className="auth-col" style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', borderLeft: '1px solid rgba(201,168,76,0.1)', background: '#0d0d0d', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 32 }}>
          {renderAuth()}
        </div>
      </div>
    </div>
  )
}
