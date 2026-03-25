'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function LandingPage() {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<'login'|'register'>('login')
  const [regStep, setRegStep] = useState(1)
  const [gender, setGender] = useState<'homme'|'femme'|null>(null)
  const [featTab, setFeatTab] = useState('nutri')
  const [billingAnnual, setBillingAnnual] = useState(false)
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/')
    })
  }, [])

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/' } })
  }
  const handleLogin = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message); else router.push('/')
    setLoading(false)
  }
  const handleRegister = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: prenom, gender } } })
    if (error) setError(error.message); else setRegStep(3)
    setLoading(false)
  }
  const handleChooseCoach = async () => {
    setLoading(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/onboarding'); return }
      const userId = session.user.id
      const { data: coach } = await supabase.from('profiles').select('id').eq('email', 'fe.ma@bluewin.ch').single()
      if (coach) {
        await supabase.from('coach_clients').upsert({ coach_id: coach.id, client_id: userId }, { onConflict: 'client_id' })
        await supabase.from('profiles').update({ role: 'client', full_name: prenom || null, gender: gender || null }).eq('id', userId)
      }
      router.push('/onboarding')
    } catch (err) {
      console.error('handleChooseCoach error:', err)
      router.push('/onboarding')
    } finally { setLoading(false) }
  }

  const G = '#C9A84C', GL = '#F0D060'
  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '11px 14px', color: '#fff', fontSize: 14, fontFamily: "'DM Sans',sans-serif", marginBottom: 12, outline: 'none' }
  const btnGold: React.CSSProperties = { width: '100%', background: `linear-gradient(135deg,${G},${GL})`, border: 'none', borderRadius: 12, padding: 13, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", marginBottom: 14, opacity: loading ? 0.7 : 1 }
  const btnGoogle: React.CSSProperties = { width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#ccc', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 }

  const GoogleIcon = () => <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>

  const featContent: Record<string, React.ReactNode> = {
    nutri: <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}><div style={{ gridColumn: 'span 2', background: 'rgba(201,168,76,0.03)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 18, padding: 28 }}><div style={{ fontSize: 28, marginBottom: 14 }}>🥗</div><div style={{ fontSize: 20, fontWeight: 500, marginBottom: 10 }}>Plan alimentaire IA — 7 jours en 30 secondes</div><div style={{ color: '#5a5a5a', fontSize: 13.5, lineHeight: 1.7, fontWeight: 300, marginBottom: 18 }}>Basé sur <strong style={{ color: '#aaa', fontWeight: 400 }}>3 484 aliments ANSES/Ciqual 2025</strong>. Quantités exactes en grammes.</div>{[['Petit-déjeuner',"Flocons d'avoine · Banane · Yaourt grec",'487 kcal'],['Déjeuner','Blanc de poulet · Riz basmati · Brocoli','612 kcal'],['Dîner','Pavé de saumon · Patate douce · Épinards','520 kcal']].map(([t,items,k])=>(<div key={t} style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 10, padding: '9px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><div><div style={{ fontSize: 9, color: G, letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: 2 }}>{t}</div><div style={{ fontSize: 12, color: '#5a5a5a', fontWeight: 300 }}>{items}</div></div><div style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.04)', padding: '3px 9px', borderRadius: 7, color: '#444' }}>{k}</div></div>))}</div>{[['🛒','Liste de courses auto','Générée depuis ton plan semaine.'],['📊','Macros temps réel','Visualise tes calories consommées.']].map(([icon,title,desc])=>(<div key={title} style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 24 }}><div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div><div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{title}</div><div style={{ color: '#5a5a5a', fontSize: 13, lineHeight: 1.7, fontWeight: 300 }}>{desc}</div></div>))}</div>,
    training: <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}><div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 28 }}><div style={{ fontSize: 28, marginBottom: 14 }}>💪</div><div style={{ fontSize: 20, fontWeight: 500, marginBottom: 10 }}>Programmes d'entraînement sur mesure</div><div style={{ color: '#5a5a5a', fontSize: 13.5, lineHeight: 1.7, fontWeight: 300 }}>Séries, reps, repos optimisés selon ton niveau et équipement.</div></div>{[['⏱️','Timer intégré','Chrono de repos avec vibration mobile.'],['🏆','Streak','Série d\'entraînements consécutifs.']].map(([i,t,d])=>(<div key={t} style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 24 }}><div style={{ fontSize: 28, marginBottom: 14 }}>{i}</div><div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{t}</div><div style={{ color: '#5a5a5a', fontSize: 13, lineHeight: 1.7, fontWeight: 300 }}>{d}</div></div>))}</div>,
    suivi: <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}><div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 28 }}><div style={{ fontSize: 28, marginBottom: 14 }}>📈</div><div style={{ fontSize: 20, fontWeight: 500, marginBottom: 10 }}>Suivi de progression complet</div><div style={{ color: '#5a5a5a', fontSize: 13.5, lineHeight: 1.7, fontWeight: 300 }}>Graphiques poids, mensurations, photos avant/après.</div></div>{[['💬','Chat coach','Retours instantanés sur tes progrès.'],['🔔','Rappels','Notifications push repas et séances.']].map(([i,t,d])=>(<div key={t} style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 24 }}><div style={{ fontSize: 28, marginBottom: 14 }}>{i}</div><div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{t}</div><div style={{ color: '#5a5a5a', fontSize: 13, lineHeight: 1.7, fontWeight: 300 }}>{d}</div></div>))}</div>,
    pwa: <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}><div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 28 }}><div style={{ fontSize: 28, marginBottom: 14 }}>📱</div><div style={{ fontSize: 20, fontWeight: 500, marginBottom: 10 }}>App native sans App Store</div><div style={{ color: '#5a5a5a', fontSize: 13.5, lineHeight: 1.7, fontWeight: 300 }}>Progressive Web App. Installe en 2 secondes. Plein écran, notifications push, hors ligne.</div></div>{[['⚡','Mises à jour auto','Toujours la dernière version.'],['🔒','Données en Suisse','AES-256. RGPD.']].map(([i,t,d])=>(<div key={t} style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 24 }}><div style={{ fontSize: 28, marginBottom: 14 }}>{i}</div><div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{t}</div><div style={{ color: '#5a5a5a', fontSize: 13, lineHeight: 1.7, fontWeight: 300 }}>{d}</div></div>))}</div>,
  }

  return (
    <div style={{ background: '#050505', color: '#fff', fontFamily: "'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`input::placeholder{color:#333}input:focus{border-color:rgba(201,168,76,0.5)!important;outline:none}@keyframes livepulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media(max-width:900px){.landing-wrap{grid-template-columns:1fr!important}.landing-right{position:relative!important;height:auto!important}.feat-grid{grid-template-columns:1fr!important}.results-grid{grid-template-columns:1fr!important}.counter-grid{grid-template-columns:repeat(2,1fr)!important}.price-cards{grid-template-columns:1fr!important}.footer-grid{grid-template-columns:1fr 1fr!important}}`}</style>

      <div className="landing-wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 420px', minHeight: '100vh' }}>
        {/* LEFT */}
        <div style={{ overflowX: 'hidden' }}>
          {/* HERO */}
          <div style={{ minHeight: '88vh', display: 'flex', alignItems: 'center', padding: '60px 48px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.025) 1px,transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: -80, left: -80, width: 500, height: 500, background: 'radial-gradient(circle,rgba(201,168,76,0.06),transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 600 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 40, padding: '6px 14px', marginBottom: 28 }}>
                <div style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', animation: 'livepulse 1.5s infinite' }} />
                <span style={{ fontSize: 11.5, color: G }}>500+ athlètes actifs en ce moment</span>
              </div>
              <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(64px,8vw,108px)', lineHeight: 0.88, letterSpacing: '0.5px', marginBottom: 20 }}>TRANSFORME<br />TON CORPS.<br /><span style={{ color: G }}>RÉSULTATS</span><br /><span style={{ color: G }}>GARANTIS.</span></h1>
              <p style={{ color: '#777', fontSize: 16, fontWeight: 300, lineHeight: 1.8, marginBottom: 32, maxWidth: 480 }}>Plans alimentaires et sportifs IA en 30 secondes. <strong style={{ color: '#bbb', fontWeight: 400 }}>3 484 aliments ANSES/Ciqual</strong>. Suivi par ton coach personnel.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex' }}>{[['#1a3a2a','SM'],['#1a2a3a','LB'],['#2a1a3a','MT'],['#2a2a1a','AR']].map(([bg,init],i)=>(<div key={init} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #050505', marginLeft: i===0?0:-8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{init}</div>))}</div>
                <div style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>Rejoint par <strong style={{ color: '#888', fontWeight: 400 }}>+47 athlètes</strong> ce mois</div>
              </div>
            </div>
          </div>

          {/* TICKER */}
          <div style={{ background: '#0a0a0a', borderTop: '1px solid rgba(201,168,76,0.07)', borderBottom: '1px solid rgba(201,168,76,0.07)', padding: '12px 0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 48, animation: 'ticker 25s linear infinite', whiteSpace: 'nowrap' }}>{['FitClub Geneva','Sport Academy Zurich','Elite Performance Basel','ProCoach Lausanne','Swiss Athletics','FitClub Geneva','Sport Academy Zurich','Elite Performance Basel'].map((n,i)=>(<span key={i} style={{ fontSize: 11, color: '#2a2a2a', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 500 }}>{n}</span>))}</div>
          </div>

          {/* COUNTERS */}
          <div style={{ padding: 48, background: '#0a0a0a', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
            <div className="counter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>{[['500+','Athlètes actifs'],['3 484','Aliments Ciqual'],['4.9★','Note moyenne'],['50+','Coachs certifiés']].map(([num,label],i)=>(<div key={label} style={{ textAlign: 'center', padding: '0 24px', borderRight: i<3?'1px solid rgba(255,255,255,0.05)':'none' }}><div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, color: G, lineHeight: 1, letterSpacing: 1 }}>{num}</div><div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '2px', marginTop: 6, fontWeight: 300 }}>{label}</div></div>))}</div>
          </div>

          {/* FEATURES */}
          <div style={{ padding: '72px 48px', background: '#070707' }}>
            <div style={{ fontSize: 10, color: G, letterSpacing: '4px', textTransform: 'uppercase', marginBottom: 10 }}>Fonctionnalités</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, letterSpacing: '1.5px', marginBottom: 8, lineHeight: 1 }}>CE QUE TU OBTIENS</div>
            <div style={{ color: '#444', fontSize: 14, fontWeight: 300, marginBottom: 28 }}>Tout ce dont tu as besoin dans une seule app.</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>{[{id:'nutri',l:'Nutrition IA'},{id:'training',l:'Training'},{id:'suivi',l:'Suivi'},{id:'pwa',l:'Installation'}].map(t=>(<button key={t.id} onClick={()=>setFeatTab(t.id)} style={{ padding: '8px 18px', borderRadius: 40, border: featTab===t.id?'1px solid rgba(201,168,76,0.35)':'1px solid rgba(255,255,255,0.06)', background: featTab===t.id?'rgba(201,168,76,0.1)':'transparent', color: featTab===t.id?G:'#555', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{t.l}</button>))}</div>
            {featContent[featTab]}
          </div>

          {/* TESTIMONIALS */}
          <div style={{ padding: '72px 48px' }}>
            <div style={{ fontSize: 10, color: G, letterSpacing: '4px', textTransform: 'uppercase', marginBottom: 10 }}>Témoignages</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, letterSpacing: '1.5px', marginBottom: 32, lineHeight: 1 }}>DES RÉSULTATS RÉELS</div>
            <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>{[{init:'MT',bg:'#1a3a2a',name:'Marc T.',role:'Coach IFBB · Genève',quote:'Les plans IA me font gagner 2h par client.',result:'+12 clients'},{init:'SM',bg:'#1a2a3a',name:'Sarah M.',role:'Cliente · Lausanne',quote:'8 kg perdus en 3 mois. Précision bluffante.',result:'-8 kg'},{init:'LB',bg:'#2a1a3a',name:'Lucas B.',role:'Client · Zurich',quote:'Coach humain + IA. Le vrai game changer.',result:'+6 kg muscle'}].map(t=>(<div key={t.name} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 24, textAlign: 'center' }}><div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 14px', border: '2px solid rgba(201,168,76,0.2)', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 16 }}>{t.init}</div><div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{t.name}</div><div style={{ fontSize: 11.5, color: '#444', marginBottom: 12 }}>{t.role}</div><div style={{ color: G, fontSize: 12, letterSpacing: '2px', marginBottom: 12 }}>★★★★★</div><div style={{ color: '#555', fontSize: 13, lineHeight: 1.75, fontStyle: 'italic', fontWeight: 300, marginBottom: 14 }}>"{t.quote}"</div><span style={{ display: 'inline-block', background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, padding: '5px 12px', fontSize: 11.5, color: G, fontWeight: 500 }}>{t.result}</span></div>))}</div>
          </div>

          {/* PRICING */}
          <div style={{ padding: '72px 48px', background: '#070707' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 10, color: G, letterSpacing: '4px', textTransform: 'uppercase', marginBottom: 10 }}>Tarifs</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, letterSpacing: '1.5px', lineHeight: 1, marginBottom: 20 }}>SIMPLE ET TRANSPARENT</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}><span style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>Mensuel</span><div onClick={()=>setBillingAnnual(!billingAnnual)} style={{ width: 44, height: 24, background: 'rgba(201,168,76,0.2)', borderRadius: 12, position: 'relative', cursor: 'pointer', border: '1px solid rgba(201,168,76,0.3)' }}><div style={{ width: 18, height: 18, background: G, borderRadius: '50%', position: 'absolute', top: 2, left: billingAnnual?22:2, transition: 'left 0.2s' }} /></div><span style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>Annuel</span><span style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 10.5, padding: '3px 10px', borderRadius: 12 }}>-20%</span></div>
            </div>
            <div className="price-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 800, margin: '0 auto' }}>
              <div style={{ background: 'rgba(201,168,76,0.04)', border: '1.5px solid rgba(201,168,76,0.35)', borderRadius: 22, padding: 32, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 18, right: 18, background: G, color: '#000', fontSize: 9, fontWeight: 700, padding: '4px 12px', borderRadius: 16, letterSpacing: '1px', textTransform: 'uppercase' }}>Populaire</div>
                <div style={{ fontSize: 10, color: G, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>Athlète</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 20 }}><span style={{ fontSize: 12, color: '#666', marginTop: 14 }}>CHF</span><span style={{ fontFamily: "'Bebas Neue'", fontSize: 72, lineHeight: 1, color: G }}>{billingAnnual?'24':'30'}</span><span style={{ color: '#444', fontSize: 13 }}>{billingAnnual?'/mois · annuel':'/mois'}</span></div>
                <ul style={{ listStyle: 'none', marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>{['Plan alimentaire IA 7 jours','Programme entraînement perso','3 484 aliments ANSES/Ciqual','Suivi progression & photos','Messagerie coach temps réel','Liste de courses automatique'].map(f=>(<li key={f} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, color: '#bbb', fontWeight: 300 }}><span style={{ color: G, fontSize: 11 }}>✦</span>{f}</li>))}</ul>
                <button onClick={()=>{setAuthMode('register');window.scrollTo(0,0)}} style={{ width: '100%', background: G, border: 'none', borderRadius: 12, padding: 14, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Commencer maintenant →</button>
                <div style={{ textAlign: 'center', color: '#333', fontSize: 11, marginTop: 10, fontWeight: 300 }}>Sans engagement · Résiliable</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: 32 }}>
                <div style={{ fontSize: 10, color: '#444', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>Coach</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 42, lineHeight: 1, marginBottom: 20 }}>GRATUIT</div>
                <ul style={{ listStyle: 'none', marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>{['Dashboard clients illimité','Génération plans IA','Paiements Stripe','Calendrier séances','Analytics revenus','5% commission/client'].map(f=>(<li key={f} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, color: '#444', fontWeight: 300 }}><span style={{ color: '#333', fontSize: 11 }}>✦</span>{f}</li>))}</ul>
                <button onClick={()=>router.push('/coach-signup')} style={{ width: '100%', background: 'transparent', color: G, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: 14, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>Devenir coach →</button>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{ background: '#020202', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '40px 48px' }}>
            <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 40, marginBottom: 32 }}>
              <div><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><div style={{ width: 28, height: 28, background: G, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div><span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: '2px' }}>COACHPRO</span></div><div style={{ color: '#2a2a2a', fontSize: 12.5, lineHeight: 1.75, fontWeight: 300, maxWidth: 220 }}>Coaching fitness propulsé par l'IA.</div></div>
              {[{t:'Produit',l:['Fonctionnalités','Tarifs','Coachs']},{t:'Légal',l:['CGU','Confidentialité','RGPD']},{t:'Contact',l:['contact@moovx.ch','Support']}].map(col=>(<div key={col.t}><div style={{ fontSize: 10, color: G, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>{col.t}</div><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{col.l.map(l=><a key={l} href="#" style={{ color: '#2a2a2a', textDecoration: 'none', fontSize: 12.5, fontWeight: 300 }}>{l}</a>)}</div></div>))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#222', fontSize: 12, fontWeight: 300 }}>© 2026 CoachPro by MoovX · Genève</span><div style={{ display: 'flex', gap: 20 }}>{['CGU','Confidentialité'].map(l=><a key={l} href="#" style={{ color: '#222', fontSize: 12, textDecoration: 'none' }}>{l}</a>)}</div></div>
          </div>
        </div>

        {/* RIGHT: AUTH */}
        <div className="landing-right" style={{ background: '#0a0a0a', borderLeft: '1px solid rgba(201,168,76,0.1)', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg,${G},${GL})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
            <div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: '2px' }}>COACHPRO</div><div style={{ fontSize: 8, letterSpacing: '3px', color: G, textTransform: 'uppercase', opacity: 0.7, lineHeight: 1 }}>Elite Performance</div></div>
          </div>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, marginBottom: 24 }}>{(['login','register'] as const).map(m=>(<button key={m} onClick={()=>{setAuthMode(m);setRegStep(1);setError('')}} style={{ flex: 1, padding: 9, border: 'none', background: authMode===m?'#161616':'transparent', color: authMode===m?'#fff':'#555', fontSize: 13, cursor: 'pointer', borderRadius: 9, fontFamily: "'DM Sans',sans-serif" }}>{m==='login'?'Connexion':'Créer un compte'}</button>))}</div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 14 }}>{error}</div>}

          {authMode==='login' && <div>
            <button onClick={handleGoogle} style={btnGoogle}><GoogleIcon /> Continuer avec Google</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}><div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} /><span style={{ fontSize: 11.5, color: '#333' }}>ou</span><div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} /></div>
            <input style={inp} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
            <input style={inp} type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
            <button onClick={handleLogin} disabled={loading} style={btnGold}>{loading?'Connexion...':'Se connecter'}</button>
          </div>}

          {authMode==='register' && <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 22, justifyContent: 'center' }}>{[1,2,3].map(n=>(<div key={n} style={{ width: 28, height: 4, borderRadius: 2, background: regStep===n?G:regStep>n?'rgba(201,168,76,0.4)':'rgba(255,255,255,0.08)' }} />))}</div>
            {regStep===1 && <div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, textAlign: 'center' }}>Qui es-tu ? 👋</div>
              <div style={{ fontSize: 12, color: '#444', textAlign: 'center', marginBottom: 16 }}>Commence par te présenter</div>
              <input style={inp} placeholder="Ton prénom" value={prenom} onChange={e=>setPrenom(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0' }}>{(['homme','femme'] as const).map(g=>(<button key={g} onClick={()=>setGender(g)} style={{ padding: '18px 10px', borderRadius: 14, border: gender===g?'none':'1px solid rgba(201,168,76,0.2)', background: gender===g?`linear-gradient(135deg,${G},${GL})`:'rgba(255,255,255,0.02)', color: gender===g?'#000':'#666', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 28 }}>{g==='homme'?'👨':'👩'}</span><span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>{g}</span></button>))}</div>
              <button onClick={()=>prenom.trim()&&gender&&setRegStep(2)} style={btnGold}>Continuer →</button>
            </div>}
            {regStep===2 && <div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, textAlign: 'center' }}>Crée ton compte</div>
              <div style={{ fontSize: 12, color: '#444', textAlign: 'center', marginBottom: 16 }}>Accès immédiat</div>
              <button onClick={handleGoogle} style={btnGoogle}><GoogleIcon /> Continuer avec Google</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}><div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} /><span style={{ fontSize: 11.5, color: '#333' }}>ou</span><div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} /></div>
              <input style={inp} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
              <input style={inp} type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} />
              <button onClick={handleRegister} disabled={loading} style={btnGold}>{loading?'Création...':'Créer mon compte →'}</button>
              <div onClick={()=>setRegStep(1)} style={{ fontSize: 12, color: '#333', textAlign: 'center', cursor: 'pointer' }}>← Retour</div>
            </div>}
            {regStep===3 && <div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, textAlign: 'center' }}>Ton coach 🏆</div>
              <div style={{ fontSize: 12, color: '#444', textAlign: 'center', marginBottom: 16 }}>Il créera ton plan personnalisé</div>
              <div style={{ background: 'rgba(201,168,76,0.04)', border: '1.5px solid rgba(201,168,76,0.25)', borderRadius: 18, padding: 20, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '80%', height: 1, background: `linear-gradient(90deg,transparent,${G},transparent)` }} />
                <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#1a3a2a,#0d2010)', border: '2px solid rgba(201,168,76,0.3)', borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue'", fontSize: 22, color: G }}>FM</div>
                <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 4 }}>Marco Ferreira</div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 14 }}>Coach certifié · Genève 🇨🇭</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}><span style={{ color: G, fontSize: 13, letterSpacing: '1.5px' }}>★★★★★</span><span style={{ fontSize: 12, color: '#444' }}>4.9 · 50+ clients</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 18 }}>{['💪 Musculation','🥗 Nutrition','⚖️ Perte de poids','🏃 Cardio'].map(s=>(<span key={s} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '4px 11px', fontSize: 11, color: '#666' }}>{s}</span>))}</div>
                <button onClick={handleChooseCoach} disabled={loading} style={{ width: '100%', background: G, border: 'none', borderRadius: 12, padding: 13, color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{loading?'En cours...':'✓ Choisir ce coach'}</button>
              </div>
            </div>}
          </div>}

          <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', gap: 16 }}>{['🔒 Sécurisé','🇨🇭 Suisse','✓ Sans engagement'].map(b=>(<span key={b} style={{ fontSize: 11, color: '#222' }}>{b}</span>))}</div>
        </div>
      </div>
    </div>
  )
}
