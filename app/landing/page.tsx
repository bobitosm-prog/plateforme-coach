'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const G = '#C9A84C'
const GL = '#F0D060'

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [faq, setFaq] = useState<number | null>(null)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const go = (path: string) => () => router.push(path)

  return (
    <div style={{ background: '#050505', color: '#fff', overflowY: 'auto', minHeight: '100vh', position: 'relative' }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        .bn{font-family:'Bebas Neue',sans-serif;letter-spacing:1.5px}
        .dm{font-family:'DM Sans',sans-serif}
        @keyframes fbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes slide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media(max-width:900px){.hero-grid-l{grid-template-columns:1fr !important}.phone-zone-l{display:none !important}.bento-l{grid-template-columns:1fr !important}.bento-l .bc-big-l{grid-column:span 1 !important;grid-row:span 1 !important}.how-grid-l{grid-template-columns:1fr !important;gap:40px !important}.how-grid-l .how-line-l{display:none !important}.price-grid-l{grid-template-columns:1fr !important}.testi-grid-l{grid-template-columns:1fr !important}.pwa-grid-l{grid-template-columns:1fr !important}.nav-links-l{display:none !important}.sec-pad{padding:60px 20px !important}.footer-grid-l{grid-template-columns:1fr 1fr !important}}
      `}</style>

      {/* NAV */}
      <nav className="dm" style={{ position: 'sticky', top: 0, zIndex: 200, background: scrolled ? 'rgba(5,5,5,0.95)' : 'rgba(5,5,5,0.88)', backdropFilter: 'blur(24px)', borderBottom: `1px solid rgba(201,168,76,${scrolled ? 0.1 : 0.05})`, padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ width: 34, height: 34, background: `linear-gradient(135deg,${G},${GL})`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}>⚡</div>
          <div><div className="bn" style={{ fontSize: 20 }}>COACHPRO</div><div style={{ fontSize: 7.5, letterSpacing: 3.5, color: G, textTransform: 'uppercase', lineHeight: 1, opacity: 0.8 }}>Elite Performance</div></div>
        </div>
        <div className="nav-links-l" style={{ display: 'flex', gap: 28 }}>
          {['Fonctionnalités', 'Tarifs', 'Témoignages'].map(l => <a key={l} href={`#${l.toLowerCase().replace('é', 'e')}`} style={{ color: '#777', textDecoration: 'none', fontSize: 13, fontWeight: 300 }}>{l}</a>)}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={go('/login')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#bbb', padding: '7px 18px', borderRadius: 40, fontSize: 12.5, cursor: 'pointer' }}>Connexion</button>
          <button onClick={go('/register-client')} style={{ background: G, border: 'none', color: '#000', padding: '8px 20px', borderRadius: 40, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Commencer</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="dm" style={{ minHeight: '96vh', display: 'flex', alignItems: 'center', padding: '70px 40px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 600, height: 600, background: 'radial-gradient(circle,rgba(201,168,76,0.06),transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.03) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        <div className="hero-grid-l" style={{ maxWidth: 1160, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 60, alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.06)', borderRadius: 40, padding: '5px 14px 5px 8px', marginBottom: 28 }}>
              <div style={{ width: 20, height: 20, background: 'rgba(201,168,76,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✦</div>
              <span style={{ fontSize: 11.5, color: G, letterSpacing: 0.5 }}>Propulsé par l'IA Claude d'Anthropic</span>
            </div>
            <h1 className="bn" style={{ fontSize: 'clamp(58px,7.5vw,100px)', lineHeight: 0.9, marginBottom: 24 }}>TRANSFORME<br />TON CORPS.<br /><span style={{ color: G }}>DÉPASSE</span><br /><span style={{ color: G }}>TES LIMITES.</span></h1>
            <p style={{ color: '#888', fontSize: 16, fontWeight: 300, lineHeight: 1.8, marginBottom: 36, maxWidth: 460 }}>CoachPro connecte athlètes et coaches d'élite avec des plans alimentaires et sportifs générés par IA. Basé sur <strong style={{ color: '#ccc', fontWeight: 400 }}>3 484 aliments ANSES/Ciqual 2025</strong>.</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 50, flexWrap: 'wrap' }}>
              <button onClick={go('/register-client')} style={{ background: `linear-gradient(135deg,${G},${GL})`, border: 'none', color: '#000', padding: '14px 32px', borderRadius: 40, fontSize: 14.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 30px rgba(201,168,76,0.25)' }}>🚀 Commencer — CHF 30/mois</button>
              <button onClick={() => document.getElementById('fonctionnalites')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', padding: '14px 28px', borderRadius: 40, fontSize: 14, cursor: 'pointer', fontWeight: 300 }}>▶ Voir la démo</button>
            </div>
            <div style={{ display: 'flex' }}>
              {[{ n: '4.9★', l: 'Note moyenne' }, { n: '500+', l: 'Athlètes actifs' }, { n: '50+', l: 'Coachs certifiés' }].map((s, i) => (
                <div key={i} style={{ padding: '0 28px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none', ...(i === 0 ? { paddingLeft: 0 } : {}) }}>
                  <div className="bn" style={{ fontSize: 36, color: G, lineHeight: 1 }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: 2, marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Phone */}
          <div className="phone-zone-l" style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 320, height: 320, background: 'radial-gradient(circle,rgba(201,168,76,0.1),transparent 65%)', pointerEvents: 'none' }} />
            {[{ t: '🔥 -3 kg ce mois', top: '10%', right: '-14%', d: 0 }, { t: '✓ Plan validé par IA', top: '44%', left: '-22%', d: 0.8 }, { t: '💪 Séance aujourd\'hui', bottom: '14%', right: '-12%', d: 1.6 }].map((b, i) => (
              <div key={i} style={{ position: 'absolute', top: b.top, bottom: (b as any).bottom, left: (b as any).left, right: b.right, background: 'rgba(14,14,14,0.96)', border: '1px solid rgba(201,168,76,0.22)', borderRadius: 20, padding: '7px 13px', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', zIndex: 2, animation: `fbob 3.2s ease-in-out ${b.d}s infinite` }}>{b.t}</div>
            ))}
            <div style={{ width: 268, background: 'linear-gradient(160deg,#1c1c1e,#0f0f0f)', borderRadius: 46, border: '1.5px solid rgba(255,255,255,0.1)', padding: '12px 9px', boxShadow: '0 40px 100px rgba(0,0,0,0.8)', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 90, height: 22, background: '#000', borderRadius: 16, margin: '0 auto 8px' }} />
              <div style={{ background: '#0a0a0a', borderRadius: 36, overflow: 'hidden', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div><div style={{ fontSize: 9.5, color: '#444', fontWeight: 300 }}>Mercredi 25 Mars</div><div style={{ fontSize: 16, fontWeight: 500 }}>Bonjour, Sarah 👋</div></div>
                  <div style={{ width: 32, height: 32, background: `linear-gradient(135deg,${G},${GL})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#000' }}>S</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 8 }}>
                  {[{ i: '⚖️', v: '62 kg', l: 'Poids', g: true }, { i: '🎯', v: '55 kg', l: 'Objectif', g: false }].map((c, j) => (
                    <div key={j} style={{ background: '#131313', borderRadius: 14, padding: '11px 12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: 13, marginBottom: 3 }}>{c.i}</div>
                      <div style={{ fontSize: 19, fontWeight: 500, color: c.g ? G : '#fff' }}>{c.v}</div>
                      <div style={{ fontSize: 8, color: '#3a3a3a', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 1 }}>{c.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#131313', borderRadius: 14, padding: '11px 12px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 8.5, color: G, letterSpacing: 2, textTransform: 'uppercase' }}>Nutrition du jour</span><span style={{ fontSize: 8.5, color: '#3a3a3a' }}>1 420 / 1 800 kcal</span></div>
                  <div style={{ height: 4, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}><div style={{ height: '100%', width: '79%', background: `linear-gradient(90deg,${G},${GL})`, borderRadius: 2 }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    {[['120g', 'Prot', '#60a5fa'], ['180g', 'Gluc', '#4ade80'], ['48g', 'Lip', G]].map(([v, l, c]) => (
                      <div key={l} style={{ textAlign: 'center' }}><div style={{ fontSize: 12, fontWeight: 500, color: c }}>{v}</div><div style={{ fontSize: 7.5, color: '#3a3a3a', textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div></div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#131313', borderRadius: 14, padding: '11px 12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 8.5, color: G, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Programme du jour</div>
                  {['Squat barre — 4×8', 'Presse — 3×12', 'Fentes — 3×10'].map((ex, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: i < 2 ? '1px solid #181818' : 'none' }}>
                      <span style={{ fontSize: 11, color: '#bbb' }}>{ex}</span><span style={{ fontSize: 9, background: '#1e1e1e', padding: '2px 7px', borderRadius: 5, color: '#555' }}>60s</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{ borderTop: '1px solid rgba(201,168,76,0.07)', borderBottom: '1px solid rgba(201,168,76,0.07)', background: 'rgba(201,168,76,0.012)', overflow: 'hidden', padding: '14px 0' }}>
        <div style={{ display: 'flex', gap: 52, animation: 'slide 20s linear infinite', whiteSpace: 'nowrap' }}>
          {['FitClub Geneva', 'Sport Academy Zurich', 'Elite Performance', 'ProCoach Lausanne', 'Swiss Athletics', 'FitClub Geneva', 'Sport Academy Zurich', 'Elite Performance'].map((n, i) => (
            <span key={i} style={{ color: '#2e2e2e', fontSize: 10.5, letterSpacing: 3.5, textTransform: 'uppercase', fontWeight: 500 }}>{i > 0 && <span style={{ color: 'rgba(201,168,76,0.3)', fontSize: 8, marginRight: 52 }}>✦</span>}{n}</span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section id="fonctionnalites" className="sec-pad dm" style={{ padding: '96px 40px', background: '#070707' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 10.5, color: G, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Fonctionnalités</div>
            <h2 className="bn" style={{ fontSize: 'clamp(40px,4.5vw,62px)', lineHeight: 0.95, marginBottom: 14 }}>TOUT CE DONT TU AS BESOIN</h2>
            <p style={{ color: '#5a5a5a', fontSize: 15, fontWeight: 300 }}>Une seule plateforme. Des résultats mesurables.</p>
          </div>
          <div className="bento-l" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            <div className="bc-big-l" style={{ gridColumn: 'span 2', gridRow: 'span 2', background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 22, padding: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 32, marginBottom: 18 }}>🥗</div>
              <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 18, padding: '3px 11px', fontSize: 9.5, color: G, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Ciqual 2025 · ANSES</div>
              <h3 style={{ fontSize: 26, fontWeight: 500, marginBottom: 10, lineHeight: 1.25 }}>Nutrition IA<br />ultra-personnalisée</h3>
              <p style={{ color: '#5a5a5a', fontSize: 13.5, lineHeight: 1.75, fontWeight: 300 }}>Plans 7 jours en 30 secondes. <strong style={{ color: '#aaa', fontWeight: 400 }}>3 484 aliments ANSES/Ciqual 2025</strong>. Quantités exactes en grammes.</p>
              <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[{ t: 'Petit-déjeuner', f: "Flocons d'avoine · Banane · Yaourt grec", k: '487 kcal' }, { t: 'Déjeuner', f: 'Blanc de poulet · Riz basmati · Brocoli', k: '612 kcal' }, { t: 'Dîner', f: 'Saumon · Patate douce · Épinards', k: '520 kcal' }].map((m, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 11, padding: '9px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div><div style={{ fontSize: 9, color: G, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{m.t}</div><div style={{ fontSize: 11.5, color: '#5a5a5a', fontWeight: 300 }}>{m.f}</div></div>
                    <div style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.04)', padding: '3px 9px', borderRadius: 7, color: '#444', whiteSpace: 'nowrap' }}>{m.k}</div>
                  </div>
                ))}
              </div>
            </div>
            {[{ i: '💪', t: 'Training sur mesure', d: 'Programmes adaptés à ton niveau, objectif et équipement.' }, { i: '📊', t: 'Suivi & Progression', d: "Graphiques, photos avant/après, streak d'entraînement." }, { i: '💬', t: 'Coach connecté', d: 'Messagerie temps réel. Retours instantanés.' }, { i: '🛒', t: 'Liste de courses auto', d: 'Générée depuis ton plan, organisée par rayon.' }].map((f, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 22, padding: 28 }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{f.i}</div>
                <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 10 }}>{f.t}</h3>
                <p style={{ color: '#5a5a5a', fontSize: 13.5, lineHeight: 1.75, fontWeight: 300, margin: 0 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sec-pad dm" style={{ padding: '96px 40px', background: '#080808' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 10.5, color: G, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Comment ça marche</div>
            <h2 className="bn" style={{ fontSize: 'clamp(40px,4.5vw,62px)', lineHeight: 0.95 }}>3 ÉTAPES VERS TES RÉSULTATS</h2>
          </div>
          <div className="how-grid-l" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, position: 'relative' }}>
            <div className="how-line-l" style={{ position: 'absolute', top: 40, left: '16%', right: '16%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.18),transparent)' }} />
            {[{ i: '🎯', t: 'Crée ton profil', time: '2 minutes', d: "Objectifs, mensurations, préférences alimentaires.", gold: false }, { i: '⚡', t: 'Plan IA instantané', time: '30 secondes', d: 'Nutrition 7 jours + programme entraînement sur mesure.', gold: true }, { i: '🏆', t: 'Progresse & Performe', time: 'Chaque jour', d: 'Coche tes repas, suis ta progression, échange avec ton coach.', gold: false }].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0 36px' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, position: 'relative', zIndex: 1, background: s.gold ? `linear-gradient(135deg,${G},${GL})` : 'rgba(201,168,76,0.07)', border: s.gold ? 'none' : '1px solid rgba(201,168,76,0.18)', boxShadow: s.gold ? '0 0 40px rgba(201,168,76,0.3)' : 'none' }}>{s.i}</div>
                <div style={{ fontSize: 9.5, color: G, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>{s.time}</div>
                <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 10 }}>{s.t}</h3>
                <p style={{ color: '#4a4a4a', fontSize: 13, lineHeight: 1.75, fontWeight: 300 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="tarifs" className="sec-pad dm" style={{ padding: '96px 40px', background: '#0d0d0d' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 10.5, color: G, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Tarifs</div>
            <h2 className="bn" style={{ fontSize: 'clamp(40px,4.5vw,62px)', lineHeight: 0.95, marginBottom: 14 }}>SIMPLE ET TRANSPARENT</h2>
          </div>
          <div className="price-grid-l" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ borderRadius: 26, padding: 40, background: 'rgba(201,168,76,0.04)', border: '1.5px solid rgba(201,168,76,0.4)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 20, right: 20, background: G, color: '#000', fontSize: 9.5, fontWeight: 700, padding: '4px 13px', borderRadius: 18, letterSpacing: 1, textTransform: 'uppercase' }}>Populaire</div>
              <div style={{ fontSize: 10, color: G, letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 18 }}>Athlète</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#666', alignSelf: 'flex-start', marginTop: 18 }}>CHF</span>
                <span className="bn" style={{ fontSize: 84, lineHeight: 1, color: G }}>30</span>
                <span style={{ color: '#555', fontSize: 13 }}>/mois</span>
              </div>
              <p style={{ color: '#444', fontSize: 12.5, marginBottom: 30, fontWeight: 300 }}>Tout inclus, sans surprise</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 34 }}>
                {['Plan alimentaire IA 7 jours', "Programme d'entraînement perso", '3 484 aliments ANSES/Ciqual', 'Suivi progression & photos', 'Messagerie coach temps réel', 'Liste de courses automatique', 'Calculateur BMR/TDEE'].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 13.5, color: '#ccc', fontWeight: 300 }}><span style={{ color: G, fontSize: 11 }}>✦</span> {f}</li>
                ))}
              </ul>
              <button onClick={go('/register-client')} style={{ width: '100%', background: G, color: '#000', border: 'none', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Commencer maintenant →</button>
              <p style={{ textAlign: 'center', color: '#333', fontSize: 11.5, marginTop: 12, fontWeight: 300 }}>Sans engagement · Résiliable à tout moment</p>
            </div>
            <div style={{ borderRadius: 26, padding: 40, background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 18 }}>Coach</div>
              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}><span className="bn" style={{ fontSize: 46, lineHeight: 1, letterSpacing: 1 }}>GRATUIT</span></div>
              <p style={{ color: '#444', fontSize: 12.5, marginBottom: 30, fontWeight: 300 }}>*5% commission par client/mois</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 34 }}>
                {['Dashboard clients illimité', 'Génération plans IA', 'Paiements Stripe automatisés', 'Calendrier & suivi séances', 'Messagerie temps réel', 'Analytics revenus en direct'].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 13.5, color: '#555', fontWeight: 300 }}><span style={{ color: '#333', fontSize: 11 }}>✦</span> {f}</li>
                ))}
              </ul>
              <button onClick={go('/coach-signup')} style={{ width: '100%', background: 'transparent', color: G, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 14, padding: 15, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>Devenir coach →</button>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="temoignages" className="sec-pad dm" style={{ padding: '96px 40px', background: '#060606' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 10.5, color: G, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Témoignages</div>
            <h2 className="bn" style={{ fontSize: 'clamp(40px,4.5vw,62px)', lineHeight: 0.95 }}>ILS ONT TRANSFORMÉ LEUR VIE</h2>
          </div>
          <div className="testi-grid-l" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {[
              { n: 'Marc T.', r: 'Coach IFBB, Genève', q: "CoachPro a transformé ma façon de travailler. Les plans IA me font gagner 2h par client.", res: '+12 clients', ini: 'MT', bg: '#1a3a2a' },
              { n: 'Sarah M.', r: 'Cliente, Lausanne', q: "En 3 mois, -8 kg. Le plan avec les vraies valeurs ANSES est bluffant.", res: '-8 kg en 3 mois', ini: 'SM', bg: '#1a2a3a' },
              { n: 'Lucas B.', r: 'Client, Zurich', q: "La seule app qui combine coach humain et IA. Game changer absolu.", res: '+6 kg muscle', ini: 'LB', bg: '#2a1a3a' },
            ].map((t, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 22, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: t.bg, border: '1.5px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, flexShrink: 0 }}>{t.ini}</div>
                  <div><div style={{ fontSize: 14.5, fontWeight: 500 }}>{t.n}</div><div style={{ fontSize: 11.5, color: '#444', fontWeight: 300 }}>{t.r}</div></div>
                </div>
                <div style={{ color: G, fontSize: 13, letterSpacing: 2, marginBottom: 14 }}>★★★★★</div>
                <p style={{ color: '#666', fontSize: 13.5, lineHeight: 1.8, fontStyle: 'italic', fontWeight: 300, marginBottom: 18 }}>"{t.q}"</p>
                <span style={{ display: 'inline-block', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 18, padding: '5px 13px', fontSize: 11.5, color: G, fontWeight: 500 }}>{t.res}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec-pad dm" style={{ padding: '96px 40px', background: '#060606' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 10.5, color: G, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>FAQ</div>
            <h2 className="bn" style={{ fontSize: 'clamp(40px,4.5vw,56px)', lineHeight: 0.95 }}>TES QUESTIONS</h2>
          </div>
          {[
            { q: 'Comment fonctionne le paiement ?', a: 'Paiement sécurisé via Stripe. CHF 30/mois, résiliable à tout moment. Aucun engagement.' },
            { q: "L'IA remplace-t-elle mon coach ?", a: "Non, l'IA assiste ton coach humain. Il supervise et valide chaque plan." },
            { q: 'Puis-je changer de coach ?', a: 'Oui, à tout moment. Nouveau coach sous 24h, historique conservé.' },
            { q: 'Comment résilier ?', a: "Depuis ton profil → Résilier. Aucun frais, accès jusqu'à la fin de la période." },
            { q: 'Données sécurisées ?', a: 'Données en Suisse via Supabase, chiffrées AES-256. RGPD total.' },
          ].map((f, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => setFaq(faq === i ? null : i)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#ddd', padding: '20px 0', fontSize: 15, fontWeight: 400, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {f.q}
                <span style={{ color: G, fontSize: 20, transition: 'transform 0.3s', transform: faq === i ? 'rotate(45deg)' : 'none', flexShrink: 0, marginLeft: 16 }}>+</span>
              </button>
              <div style={{ maxHeight: faq === i ? 200 : 0, overflow: 'hidden', transition: 'max-height 300ms ease' }}>
                <p style={{ color: '#555', fontSize: 13.5, lineHeight: 1.85, paddingBottom: 18, margin: 0, fontWeight: 300 }}>{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="dm" style={{ padding: '96px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse,rgba(201,168,76,0.07),transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>
          <h2 className="bn" style={{ fontSize: 'clamp(52px,6.5vw,86px)', lineHeight: 0.92, marginBottom: 22 }}>PRÊT À DEVENIR<br /><span style={{ color: G }}>LA MEILLEURE VERSION</span><br />DE TOI-MÊME ?</h2>
          <p style={{ color: '#555', fontSize: 16, fontWeight: 300, marginBottom: 44, lineHeight: 1.7 }}>Rejoins 500+ athlètes qui ont transformé leur physique avec CoachPro.</p>
          <button onClick={go('/register-client')} style={{ background: `linear-gradient(135deg,${G},${GL})`, border: 'none', color: '#000', padding: '18px 56px', borderRadius: 50, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 12px 50px rgba(201,168,76,0.3)' }}>🚀 Commencer maintenant — CHF 30/mois</button>
          <p style={{ color: '#2e2e2e', fontSize: 12.5, marginTop: 18, fontWeight: 300 }}>✓ Sans engagement · ✓ Résiliable · ✓ Support inclus</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="dm" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: '#020202' }}>
        <div className="footer-grid-l" style={{ maxWidth: 1160, margin: '0 auto', padding: '56px 40px 40px', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, background: `linear-gradient(135deg,${G},${GL})`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
              <div><div className="bn" style={{ fontSize: 19 }}>COACHPRO</div><div style={{ fontSize: 7.5, letterSpacing: 3, color: G, opacity: 0.6, textTransform: 'uppercase' }}>Elite Performance</div></div>
            </div>
            <p style={{ color: '#3a3a3a', fontSize: 13, lineHeight: 1.75, fontWeight: 300, maxWidth: 260, marginBottom: 20 }}>La plateforme de coaching fitness propulsée par l'IA.</p>
          </div>
          {[{ t: 'Produit', l: ['Fonctionnalités', 'Tarifs', 'Pour les coachs'] }, { t: 'Légal', l: ['CGU', 'Confidentialité', 'RGPD'] }, { t: 'Contact', l: ['contact@moovx.ch', 'Support client'] }].map((col, i) => (
            <div key={i}><div style={{ fontSize: 11, color: G, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 18, fontWeight: 400 }}>{col.t}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>{col.l.map(l => <a key={l} href="#" style={{ color: '#3a3a3a', textDecoration: 'none', fontSize: 13, fontWeight: 300 }}>{l}</a>)}</div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1160, margin: '0 auto' }}>
          <span style={{ color: '#2a2a2a', fontSize: 12, fontWeight: 300 }}>© 2026 CoachPro by MoovX · Genève, Suisse</span>
          <div style={{ display: 'flex', gap: 20 }}>{['CGU', 'Confidentialité'].map(l => <a key={l} href="#" style={{ color: '#2a2a2a', fontSize: 12, textDecoration: 'none', fontWeight: 300 }}>{l}</a>)}</div>
        </div>
      </footer>
    </div>
  )
}
