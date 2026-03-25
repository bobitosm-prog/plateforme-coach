'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function LandingPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [step, setStep] = useState(1)
  const [gender, setGender] = useState<'homme'|'femme'|null>(null)
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => { if (session) router.replace('/') }) }, [])

  const handleGoogle = async () => { await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/' } }) }
  const handleLogin = async () => { setLoading(true); setError(''); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setError(error.message); else router.push('/'); setLoading(false) }
  const handleRegister = async () => { setLoading(true); setError(''); const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: prenom, gender } } }); if (error) { setError(error.message); setLoading(false); return }; if (data.session) setStep(3); else setError('Vérifie ton email et clique sur le lien de confirmation.'); setLoading(false) }
  const handleChooseCoach = async () => { setLoading(true); setError(''); try { const { data: { session } } = await supabase.auth.getSession(); if (!session?.user) { setError('Session expirée. Reconnecte-toi.'); setLoading(false); return }; const { data: coach } = await supabase.from('profiles').select('id').eq('email', 'fe.ma@bluewin.ch').single(); if (coach) { await supabase.from('coach_clients').upsert({ coach_id: coach.id, client_id: session.user.id }, { onConflict: 'client_id' }); await supabase.from('profiles').update({ role: 'client', full_name: prenom || null, gender: gender || null }).eq('id', session.user.id) }; router.push('/onboarding') } catch { router.push('/onboarding') } finally { setLoading(false) } }

  const G = '#C9A84C'
  const field: React.CSSProperties = { width:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'11px 13px', color:'#fff', fontSize:13, fontFamily:"'DM Sans',sans-serif", marginBottom:10, outline:'none' }
  const btnMain: React.CSSProperties = { width:'100%', background:G, border:'none', borderRadius:10, padding:13, color:'#000', fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", marginBottom:12, opacity: loading ? 0.7 : 1 }
  const btnGoogle: React.CSSProperties = { width:'100%', padding:11, borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', color:'#bbb', fontSize:13, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:16 }
  const GoogleIcon = () => <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>

  return (
    <div style={{ background:'#060606', color:'#fff', fontFamily:"'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,200;0,300;0,400;0,500;0,600;1,300&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box}input::placeholder{color:#333}input:focus{border-color:rgba(201,168,76,0.4)!important}@keyframes livepulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media(max-width:960px){.page-wrap{grid-template-columns:1fr!important}.auth-sidebar{position:relative!important;height:auto!important;border-left:none!important;border-top:1px solid rgba(201,168,76,0.08)!important}.feat-grid{grid-template-columns:repeat(2,1fr)!important}.how-steps{grid-template-columns:1fr!important}.proof-grid{grid-template-columns:1fr!important}.price-grid{grid-template-columns:1fr!important}.footer-main{grid-template-columns:1fr 1fr!important}.hero-body{grid-template-columns:1fr!important}}`}</style>

      <div className="page-wrap" style={{ display:'grid', gridTemplateColumns:'1fr 400px', minHeight:'100vh' }}>
        <div style={{ overflowX:'hidden' }}>

          {/* HERO */}
          <section style={{ padding:'80px 56px 64px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}><div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', border:'1px solid rgba(201,168,76,0.04)', top:-200, right:-200 }} /><div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', border:'1px solid rgba(201,168,76,0.03)', top:-100, right:-100 }} /><div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(201,168,76,0.06) 1px,transparent 1px)', backgroundSize:'32px 32px', WebkitMaskImage:'radial-gradient(ellipse 80% 80% at 80% 50%,black,transparent)' } as any} /></div>
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:32 }}><div style={{ width:32, height:1, background:G }} /><span style={{ fontSize:11, color:G, letterSpacing:'4px', textTransform:'uppercase' }}>Coaching d'élite · Genève · Suisse</span></div>
              <h1 style={{ fontFamily:"'Bebas Neue'", lineHeight:0.88, letterSpacing:'-0.5px', marginBottom:24 }}>
                <span style={{ display:'block', fontSize:'clamp(72px,9vw,120px)' }}>ATTEINS</span>
                <span style={{ display:'block', fontSize:'clamp(72px,9vw,120px)' }}>TES OBJECTIFS.</span>
                <span style={{ display:'block', fontSize:'clamp(72px,9vw,120px)', color:'transparent', WebkitTextStroke:'1px rgba(201,168,76,0.35)' } as any}>DÉPASSE</span>
                <span style={{ display:'block', fontSize:'clamp(72px,9vw,120px)', color:G }}>TES LIMITES.</span>
              </h1>
              <div className="hero-body" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'end', marginTop:48 }}>
                <p style={{ fontSize:15, color:'#555', fontWeight:300, lineHeight:1.85, maxWidth:380 }}>Plans alimentaires et sportifs générés par IA en 30 secondes. Basé sur <strong style={{ color:'#888', fontWeight:400 }}>3 484 aliments ANSES/Ciqual 2025</strong>. Ton coach personnel. Résultats garantis.</p>
                <div style={{ border:'1px solid rgba(255,255,255,0.05)', borderRadius:16, overflow:'hidden', display:'grid', gridTemplateColumns:'repeat(3,1fr)' }}>
                  {[['500+','Athlètes'],['4.9','Note'],['50+','Coachs']].map(([n,l],i) => (<div key={l} style={{ padding:'20px 16px', textAlign:'center', borderRight: i<2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}><div style={{ fontFamily:"'Bebas Neue'", fontSize:36, color:G, lineHeight:1, letterSpacing:1 }}>{n}</div><div style={{ fontSize:10, color:'#333', textTransform:'uppercase', letterSpacing:'2px', marginTop:4, fontWeight:300 }}>{l}</div></div>))}
                </div>
              </div>
            </div>
          </section>

          <div style={{ height:1, background:'linear-gradient(90deg,transparent,rgba(201,168,76,0.1),transparent)' }} />

          {/* FEATURES */}
          <section style={{ padding:'72px 56px', background:'#0d0d0d' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:48 }}><div><div style={{ fontSize:10, color:G, letterSpacing:'4px', textTransform:'uppercase', marginBottom:12 }}>Fonctionnalités</div><div style={{ fontFamily:"'Bebas Neue'", fontSize:'clamp(36px,4vw,52px)', letterSpacing:'1px', lineHeight:1 }}>CE QUE TU OBTIENS</div></div><div style={{ fontFamily:"'Bebas Neue'", fontSize:80, color:'rgba(201,168,76,0.05)', lineHeight:1, letterSpacing:'-2px' }}>06</div></div>
            <div className="feat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:'rgba(255,255,255,0.04)', borderRadius:20, overflow:'hidden' }}>
              {[['01','🥗','Nutrition IA personnalisée','Plans 7 jours en 30s. 3 484 aliments ANSES/Ciqual.','Ciqual 2025'],['02','💪','Training sur mesure','Programmes adaptés à ton niveau et équipement.','IA générative'],['03','📊','Suivi de progression','Graphiques, photos avant/après, streak quotidien.','Temps réel'],['04','💬','Coach connecté','Messagerie directe. Retours et ajustements personnalisés.','Messagerie'],['05','🛒','Liste de courses auto','Générée depuis ton plan. Quantités exactes sur 7 jours.','Automatique'],['06','📱','App sans App Store','Progressive Web App. Installe en 2s depuis Safari/Chrome.','PWA']].map(([num,icon,title,desc,tag]) => (<div key={num} style={{ background:'#0d0d0d', padding:'32px 28px' }}><div style={{ fontFamily:"'Bebas Neue'", fontSize:13, color:'rgba(201,168,76,0.3)', letterSpacing:'2px', marginBottom:20 }}>{num}</div><div style={{ width:44, height:44, background:'rgba(201,168,76,0.06)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:16 }}>{icon}</div><div style={{ fontSize:15, fontWeight:500, marginBottom:8, lineHeight:1.3 }}>{title}</div><div style={{ fontSize:12.5, color:'#444', lineHeight:1.7, fontWeight:300, marginBottom:14 }}>{desc}</div><div style={{ display:'inline-block', fontSize:9.5, color:G, letterSpacing:'2px', textTransform:'uppercase', borderBottom:'1px solid rgba(201,168,76,0.2)', paddingBottom:2 }}>{tag}</div></div>))}
            </div>
          </section>

          {/* HOW */}
          <section style={{ padding:'72px 56px' }}>
            <div style={{ fontSize:10, color:G, letterSpacing:'4px', textTransform:'uppercase', marginBottom:12 }}>Processus</div>
            <div style={{ fontFamily:"'Bebas Neue'", fontSize:'clamp(36px,4vw,52px)', letterSpacing:'1px', marginBottom:48, lineHeight:1 }}>EN 3 ÉTAPES SIMPLES</div>
            <div className="how-steps" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0, position:'relative' }}>
              <div style={{ position:'absolute', top:28, left:'16%', right:'16%', height:1, background:'linear-gradient(90deg,rgba(201,168,76,0.15),rgba(201,168,76,0.15))' }} />
              {[['01','2 min','Crée ton profil','Objectifs, mensurations, préférences alimentaires.',false],['02','30 sec','Reçois ton plan IA','Plan nutritionnel 7 jours + programme entraînement.',true],['03','Chaque jour','Progresse & Performe','Suis tes repas, valide tes séances, échange avec ton coach.',false]].map(([num,time,title,desc,active]) => (<div key={num as string} style={{ padding:'0 32px', position:'relative', zIndex:1 }}><div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}><div style={{ width:56, height:56, borderRadius:'50%', background: active ? G : '#0d0d0d', border: active ? `1px solid ${G}` : '1px solid rgba(201,168,76,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue'", fontSize:22, color: active ? '#000' : G, flexShrink:0, boxShadow: active ? '0 0 0 6px rgba(201,168,76,0.08)' : 'none' }}>{num}</div><div style={{ fontSize:10, color:'#333', letterSpacing:'2px', textTransform:'uppercase', fontWeight:300 }}>{time as string}</div></div><div style={{ fontSize:17, fontWeight:500, marginBottom:10, lineHeight:1.3 }}>{title as string}</div><div style={{ fontSize:13, color:'#444', lineHeight:1.75, fontWeight:300 }}>{desc as string}</div></div>))}
            </div>
          </section>

          {/* TESTIMONIALS */}
          <section style={{ padding:'72px 56px', background:'#0d0d0d' }}>
            <div style={{ fontSize:10, color:G, letterSpacing:'4px', textTransform:'uppercase', marginBottom:12 }}>Témoignages</div>
            <div style={{ fontFamily:"'Bebas Neue'", fontSize:'clamp(36px,4vw,52px)', letterSpacing:'1px', lineHeight:1, marginBottom:48 }}>DES RÉSULTATS RÉELS</div>
            <div className="proof-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {[{init:'MT',bg:'#112210',name:'Marc T.',role:'Coach IFBB · Genève',quote:'Les plans IA me font gagner 2h par client.',result:'+12 clients'},{init:'SM',bg:'#101a28',name:'Sarah M.',role:'Cliente · Lausanne',quote:'8 kg perdus en 3 mois. Précision bluffante.',result:'-8 kg'},{init:'LB',bg:'#1a1028',name:'Lucas B.',role:'Client · Zurich',quote:'Coach humain + IA. Le vrai game changer.',result:'+6 kg muscle'}].map(t => (<div key={t.name} style={{ borderRadius:20, padding:28, border:'1px solid rgba(255,255,255,0.05)', background:'#0a0a0a', position:'relative', overflow:'hidden' }}><div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(201,168,76,0.15),transparent)' }} /><div style={{ width:48, height:48, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:15, marginBottom:16, background:t.bg }}>{t.init}</div><div style={{ fontSize:14, fontWeight:500, marginBottom:2 }}>{t.name}</div><div style={{ fontSize:11.5, color:'#333', marginBottom:14, fontWeight:300 }}>{t.role}</div><div style={{ color:G, fontSize:11, letterSpacing:'3px', marginBottom:12 }}>★★★★★</div><div style={{ fontSize:13, color:'#4a4a4a', lineHeight:1.8, fontStyle:'italic', fontWeight:300, marginBottom:16 }}>"{t.quote}"</div><div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11.5, color:G, fontWeight:500 }}><div style={{ width:16, height:1, background:G }} />{t.result}</div></div>))}
            </div>
          </section>

          {/* PRICING */}
          <section style={{ padding:'72px 56px' }}>
            <div style={{ fontSize:10, color:G, letterSpacing:'4px', textTransform:'uppercase', marginBottom:12 }}>Tarifs</div>
            <div style={{ fontFamily:"'Bebas Neue'", fontSize:'clamp(36px,4vw,52px)', letterSpacing:'1px', lineHeight:1, marginBottom:48 }}>TRANSPARENT ET SIMPLE</div>
            <div className="price-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ borderRadius:22, padding:36, border:'1.5px solid rgba(201,168,76,0.25)', background:'rgba(201,168,76,0.02)', position:'relative' }}>
                <div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)', background:G, color:'#000', fontSize:9, fontWeight:700, padding:'4px 16px', borderRadius:'0 0 10px 10px', letterSpacing:'1.5px', textTransform:'uppercase' }}>Le plus populaire</div>
                <div style={{ fontSize:10, color:G, letterSpacing:'4px', textTransform:'uppercase', marginBottom:20, marginTop:16 }}>Athlète</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:6 }}><span style={{ fontSize:14, color:'#555', marginTop:14 }}>CHF</span><span style={{ fontFamily:"'Bebas Neue'", fontSize:80, lineHeight:1, color:G }}>30</span><span style={{ fontSize:14, color:'#333', fontWeight:300 }}>/mois</span></div>
                <div style={{ fontSize:13, color:'#333', fontWeight:300, marginBottom:28 }}>Tout inclus, sans engagement</div>
                <ul style={{ listStyle:'none', marginBottom:32 }}>{['Plan alimentaire IA 7 jours','Programme entraînement perso','3 484 aliments ANSES/Ciqual','Suivi progression & photos','Messagerie coach temps réel','Liste de courses automatique'].map(f => (<li key={f} style={{ fontSize:13, fontWeight:300, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', gap:12, color:'#ccc' }}><div style={{ width:16, height:16, borderRadius:'50%', background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:G, flexShrink:0 }}>✓</div>{f}</li>))}</ul>
                <button onClick={() => { setMode('register'); window.scrollTo(0, 0) }} style={{ width:'100%', background:G, border:'none', borderRadius:12, padding:15, fontSize:14, fontWeight:500, cursor:'pointer', color:'#000' }}>Commencer maintenant</button>
                <div style={{ fontSize:11, color:'#2a2a2a', textAlign:'center', marginTop:10, fontWeight:300 }}>Résiliable à tout moment</div>
              </div>
              <div style={{ borderRadius:22, padding:36, border:'1px solid rgba(255,255,255,0.06)', background:'#0a0a0a' }}>
                <div style={{ fontSize:10, color:'#333', letterSpacing:'4px', textTransform:'uppercase', marginBottom:20 }}>Coach</div>
                <div style={{ fontFamily:"'Bebas Neue'", fontSize:44, lineHeight:1, marginBottom:6, letterSpacing:1 }}>GRATUIT</div>
                <div style={{ fontSize:13, color:'#333', fontWeight:300, marginBottom:28 }}>5% commission par client/mois</div>
                <ul style={{ listStyle:'none', marginBottom:32 }}>{['Dashboard clients illimité','Génération plans IA','Paiements Stripe automatisés','Calendrier & séances','Analytics revenus'].map(f => (<li key={f} style={{ fontSize:13, fontWeight:300, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', gap:12, color:'#333' }}><div style={{ width:16, height:16, borderRadius:'50%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#333', flexShrink:0 }}>✓</div>{f}</li>))}</ul>
                <button onClick={() => router.push('/coach-signup')} style={{ width:'100%', background:'transparent', color:G, border:'1px solid rgba(201,168,76,0.2)', borderRadius:12, padding:15, fontSize:13.5, fontWeight:500, cursor:'pointer' }}>Devenir coach</button>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer style={{ padding:'56px 56px 40px', background:'#030303', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
            <div className="footer-main" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:48, marginBottom:40 }}>
              <div><div style={{ fontFamily:"'Bebas Neue'", fontSize:20, letterSpacing:'2.5px', display:'flex', alignItems:'center', gap:10, marginBottom:14 }}><div style={{ width:30, height:30, background:G, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>⚡</div>COACHPRO</div><div style={{ fontSize:13, color:'#2a2a2a', lineHeight:1.75, fontWeight:300, maxWidth:240 }}>Coaching fitness propulsé par l'IA. Conçu pour athlètes et coaches d'élite.</div></div>
              {[{t:'Produit',l:['Fonctionnalités','Tarifs','Coachs','PWA']},{t:'Légal',l:['CGU','Confidentialité','RGPD']},{t:'Contact',l:['contact@moovx.ch','Support','Devenir coach']}].map(col => (<div key={col.t}><div style={{ fontSize:10, color:G, letterSpacing:'3px', textTransform:'uppercase', marginBottom:16 }}>{col.t}</div><div style={{ display:'flex', flexDirection:'column', gap:10 }}>{col.l.map(l => <a key={l} href="#" style={{ color:'#2a2a2a', textDecoration:'none', fontSize:13, fontWeight:300 }}>{l}</a>)}</div></div>))}
            </div>
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:24, display:'flex', justifyContent:'space-between', alignItems:'center' }}><span style={{ fontSize:12, color:'#1e1e1e', fontWeight:300 }}>© 2026 CoachPro by MoovX · Genève</span><div style={{ display:'flex', gap:20 }}>{['CGU','Confidentialité'].map(l => <a key={l} href="#" style={{ fontSize:12, color:'#1e1e1e', textDecoration:'none' }}>{l}</a>)}</div></div>
          </footer>
        </div>

        {/* AUTH */}
        <div className="auth-sidebar" style={{ background:'#080808', borderLeft:'1px solid rgba(201,168,76,0.08)', position:'sticky', top:0, height:'100vh', overflowY:'auto', padding:'32px 28px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}><div style={{ width:36, height:36, background:G, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>⚡</div><div><div style={{ fontFamily:"'Bebas Neue'", fontSize:22, letterSpacing:'2px' }}>COACHPRO</div><div style={{ fontSize:7.5, letterSpacing:'4px', color:G, textTransform:'uppercase', opacity:0.6, lineHeight:1 }}>Elite Performance</div></div></div>
          <div style={{ display:'flex', background:'rgba(255,255,255,0.03)', borderRadius:10, padding:3, marginBottom:24, border:'1px solid rgba(255,255,255,0.06)' }}>{(['login','register'] as const).map(m => (<button key={m} onClick={() => { setMode(m); setStep(1); setError('') }} style={{ flex:1, padding:9, border:'none', background: mode===m ? '#141414' : 'transparent', color: mode===m ? '#fff' : '#444', fontSize:12.5, cursor:'pointer', borderRadius:8, fontFamily:"'DM Sans',sans-serif" }}>{m==='login'?'Connexion':"S'inscrire"}</button>))}</div>
          {error && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'10px 13px', fontSize:12.5, color:'#f87171', marginBottom:14 }}>{error}</div>}

          {mode==='login' && <div><button onClick={handleGoogle} style={btnGoogle}><GoogleIcon />Continuer avec Google</button><div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}><div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }} /><span style={{ fontSize:11, color:'#2a2a2a', fontWeight:300 }}>ou par email</span><div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }} /></div><input style={field} type="email" placeholder="Adresse email" value={email} onChange={e=>setEmail(e.target.value)} /><input style={field} type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} /><button onClick={handleLogin} disabled={loading} style={btnMain}>{loading?'Connexion...':'Se connecter'}</button></div>}

          {mode==='register' && <div>
            <div style={{ display:'flex', gap:5, justifyContent:'center', marginBottom:20 }}>{[1,2,3].map(n => (<div key={n} style={{ height:3, borderRadius:2, width: step===n?24:16, background: step===n?G:step>n?'rgba(201,168,76,0.35)':'rgba(255,255,255,0.07)', transition:'all 0.3s' }} />))}</div>
            {step===1 && <div><div style={{ fontSize:14, fontWeight:500, marginBottom:3, textAlign:'center' }}>Bienvenue 👋</div><div style={{ fontSize:12, color:'#333', textAlign:'center', marginBottom:16, fontWeight:300 }}>Commence par te présenter</div><input style={field} placeholder="Ton prénom" value={prenom} onChange={e=>setPrenom(e.target.value)} /><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, margin:'14px 0' }}>{(['homme','femme'] as const).map(g => (<button key={g} onClick={()=>setGender(g)} style={{ padding:'16px 8px', borderRadius:12, border: gender===g?'none':'1px solid rgba(201,168,76,0.15)', background: gender===g?G:'rgba(255,255,255,0.02)', color: gender===g?'#000':'#555', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}><span style={{ fontSize:24 }}>{g==='homme'?'👨':'👩'}</span><span style={{ fontSize:11, fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' }}>{g}</span></button>))}</div><button onClick={()=>prenom.trim()&&gender&&setStep(2)} style={btnMain}>Continuer →</button></div>}
            {step===2 && <div><div style={{ fontSize:14, fontWeight:500, marginBottom:3, textAlign:'center' }}>Crée ton compte</div><div style={{ fontSize:12, color:'#333', textAlign:'center', marginBottom:16, fontWeight:300 }}>Accès immédiat</div><button onClick={handleGoogle} style={btnGoogle}><GoogleIcon />Continuer avec Google</button><div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}><div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }} /><span style={{ fontSize:11, color:'#2a2a2a' }}>ou</span><div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }} /></div><input style={field} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /><input style={field} type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} /><button onClick={handleRegister} disabled={loading} style={btnMain}>{loading?'Création...':'Créer mon compte →'}</button><div onClick={()=>setStep(1)} style={{ textAlign:'center', fontSize:11.5, color:'#2a2a2a', cursor:'pointer' }}>← Retour</div></div>}
            {step===3 && <div><div style={{ fontSize:14, fontWeight:500, marginBottom:3, textAlign:'center' }}>Ton coach 🏆</div><div style={{ fontSize:12, color:'#333', textAlign:'center', marginBottom:16, fontWeight:300 }}>Il créera ton plan personnalisé</div><div style={{ background:'rgba(201,168,76,0.03)', border:'1px solid rgba(201,168,76,0.18)', borderRadius:16, padding:20, textAlign:'center', position:'relative', overflow:'hidden', marginBottom:14 }}><div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'80%', height:1, background:`linear-gradient(90deg,transparent,${G},transparent)` }} /><div style={{ width:60, height:60, borderRadius:'50%', background:'linear-gradient(135deg,#1a3a2a,#0a1a10)', border:'2px solid rgba(201,168,76,0.25)', margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue'", fontSize:20, color:G }}>FM</div><div style={{ fontSize:16, fontWeight:500, marginBottom:3 }}>Marco Ferreira</div><div style={{ fontSize:11.5, color:'#444', fontWeight:300, marginBottom:12 }}>Coach certifié · Genève 🇨🇭</div><div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:12 }}><span style={{ color:G, fontSize:12, letterSpacing:'1.5px' }}>★★★★★</span><span style={{ fontSize:11.5, color:'#333' }}>4.9 · 50+ clients</span></div><div style={{ display:'flex', flexWrap:'wrap', gap:5, justifyContent:'center', marginBottom:16 }}>{['💪 Musculation','🥗 Nutrition','⚖️ Perte de poids','🏃 Cardio'].map(s => (<span key={s} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'3px 10px', fontSize:10.5, color:'#444' }}>{s}</span>))}</div><button onClick={handleChooseCoach} disabled={loading} style={{ width:'100%', background:G, border:'none', borderRadius:10, padding:13, color:'#000', fontSize:13.5, fontWeight:600, cursor:'pointer' }}>{loading?'En cours...':'✓ Choisir Marco'}</button></div></div>}
          </div>}

          <div style={{ display:'flex', justifyContent:'center', gap:14, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.04)', marginTop:16 }}>{['🔒 SSL','🇨🇭 Données CH','✓ RGPD'].map(b => (<span key={b} style={{ fontSize:10.5, color:'#1e1e1e', fontWeight:300 }}>{b}</span>))}</div>
        </div>
      </div>
    </div>
  )
}
