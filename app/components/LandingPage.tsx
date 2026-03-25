'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Menu, X, ChevronDown, Play } from 'lucide-react'

const G = '#C9A84C'
const GH = '#E8C96A'

function useFadeIn(ref: React.RefObject<HTMLElement | null>) {
  const [v, setV] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true) }, { threshold: 0.1 })
    o.observe(ref.current)
    return () => o.disconnect()
  }, [ref])
  return v
}

function Fade({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const r = useRef<HTMLDivElement>(null)
  const v = useFadeIn(r)
  return <div ref={r} className={className} style={{ opacity: v ? 1 : 0, transform: v ? 'translateY(0)' : 'translateY(30px)', transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms` }}>{children}</div>
}

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0)
  const r = useRef<HTMLSpanElement>(null)
  const started = useFadeIn(r)
  useEffect(() => {
    if (!started) return
    let i = 0
    const step = Math.max(1, Math.floor(to / 40))
    const id = setInterval(() => { i = Math.min(i + step, to); setN(i); if (i >= to) clearInterval(id) }, 30)
    return () => clearInterval(id)
  }, [started, to])
  return <span ref={r}>{n}{suffix}</span>
}

export default function LandingPage() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [faq, setFaq] = useState<number | null>(null)
  const featRef = useRef<HTMLDivElement>(null)

  return (
    <div style={{ background: '#050505', color: '#fff', fontFamily: "'DM Sans',sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,300&display=swap');
        .bn{font-family:'Bebas Neue',sans-serif;letter-spacing:.04em}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes float1{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-12px) rotate(1deg)}}
        @keyframes float2{0%,100%{transform:translateY(0) rotate(1deg)}50%{transform:translateY(-8px) rotate(-1deg)}}
        @keyframes float3{0%,100%{transform:translateY(-4px)}50%{transform:translateY(6px)}}
        .shimmer-btn{background:linear-gradient(90deg,${G} 0%,${GH} 50%,${G} 100%);background-size:200% auto;transition:transform 150ms,box-shadow 200ms;}
        .shimmer-btn:hover{animation:shimmer 2s linear infinite;box-shadow:0 8px 40px rgba(201,168,76,0.35);transform:translateY(-1px)}
        .glass{background:rgba(255,255,255,0.025);backdrop-filter:blur(20px);border:1px solid rgba(201,168,76,0.1);transition:border-color 300ms,transform 300ms,box-shadow 300ms}
        .glass:hover{border-color:rgba(201,168,76,0.35);transform:translateY(-4px);box-shadow:0 12px 40px rgba(201,168,76,0.08)}
        .grain{position:relative}.grain::before{content:'';position:absolute;inset:0;opacity:.025;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
        @media(max-width:768px){.dt{display:none!important}.mob-show{display:flex!important}.hero-t{font-size:14vw!important}.bento{grid-template-columns:1fr!important}.bento>*{grid-column:span 1!important;grid-row:span 1!important}.tl-h{flex-direction:column!important}.pricing-g{flex-direction:column!important;align-items:center!important}}
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: G, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={16} color="#000" fill="#000" strokeWidth={2.5} /></div>
            <span className="bn" style={{ fontSize: '1.4rem' }}>COACHPRO</span>
            <span className="dt" style={{ fontSize: '0.5rem', color: `${G}80`, letterSpacing: '0.3em', textTransform: 'uppercase', marginLeft: 4 }}>Elite Performance</span>
          </div>
          <div className="dt" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <a onClick={() => featRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{ color: '#888', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500, transition: 'color 200ms' }} onMouseEnter={e => (e.target as HTMLElement).style.color = G} onMouseLeave={e => (e.target as HTMLElement).style.color = '#888'}>Fonctionnalités</a>
            <a href="#pricing" style={{ color: '#888', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 500 }}>Tarifs</a>
            <a href="#coaches" style={{ color: '#888', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 500 }}>Coachs</a>
          </div>
          <div className="dt" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/')} style={{ padding: '9px 20px', borderRadius: 999, border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500 }}>Connexion</button>
            <button onClick={() => router.push('/register-client')} className="shimmer-btn" style={{ padding: '9px 22px', borderRadius: 999, border: 'none', color: '#000', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>Commencer</button>
          </div>
          <button className="mob-show" onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
        </div>
        {menuOpen && <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid #1a1a1a' }}>
          <a onClick={() => { featRef.current?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }} style={{ color: '#aaa', cursor: 'pointer' }}>Fonctionnalités</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} style={{ color: '#aaa' }}>Tarifs</a>
          <button onClick={() => router.push('/')} style={{ padding: '12px', borderRadius: 10, border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer' }}>Connexion</button>
          <button onClick={() => router.push('/register-client')} className="shimmer-btn" style={{ padding: '12px', borderRadius: 10, border: 'none', color: '#000', cursor: 'pointer', fontWeight: 700 }}>Commencer</button>
        </div>}
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="grain" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, background: `radial-gradient(circle, ${G}08 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 28px 60px', display: 'flex', alignItems: 'center', gap: 60, position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1 }}>
            <Fade>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 999, background: `${G}10`, border: `1px solid ${G}25`, marginBottom: 28, fontSize: '0.75rem', color: G, fontWeight: 500 }}>
                ✦ Propulsé par l'Intelligence Artificielle Claude ✦
              </div>
            </Fade>
            <Fade delay={100}><h1 className="bn hero-t" style={{ fontSize: '5.5rem', lineHeight: 0.92, margin: '0 0 24px', color: '#fff' }}>TRANSFORME<br />TON CORPS.<br />DÉPASSE<br /><span style={{ color: G }}>TES LIMITES.</span></h1></Fade>
            <Fade delay={200}><p style={{ fontSize: '1.05rem', color: '#777', lineHeight: 1.7, margin: '0 0 36px', maxWidth: 480, fontWeight: 300 }}>CoachPro connecte athlètes et coaches d'élite avec des plans alimentaires et sportifs générés par IA, basés sur 3484 aliments ANSES/Ciqual.</p></Fade>
            <Fade delay={300}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => router.push('/register-client')} className="shimmer-btn" style={{ padding: '16px 32px', borderRadius: 999, border: 'none', color: '#000', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>Commencer — CHF 30/mois</button>
                <button onClick={() => featRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{ padding: '16px 28px', borderRadius: 999, border: '1px solid #333', background: 'transparent', color: '#aaa', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}><Play size={16} /> Comment ça marche</button>
              </div>
            </Fade>
            <Fade delay={400}>
              <div style={{ display: 'flex', gap: 0, marginTop: 40 }}>
                {[{ v: 4.9, s: '/5 Note', p: '⭐' }, { v: 500, s: '+ Athlètes', p: '👥' }, { v: 50, s: '+ Coachs', p: '🏆' }].map((s, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? `1px solid ${G}20` : 'none', padding: '0 16px' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: "'Bebas Neue',sans-serif" }}>{s.p} <Counter to={s.v} /></div>
                    <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>{s.s}</div>
                  </div>
                ))}
              </div>
            </Fade>
          </div>
          {/* Phone mockup */}
          <div className="dt" style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', width: 400, height: 400, background: `radial-gradient(circle, ${G}12 0%, transparent 70%)`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
            <div style={{ width: 280, height: 560, background: '#111', borderRadius: 40, border: '2px solid #222', padding: '10px 6px', position: 'relative', boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 80px ${G}08` }}>
              <div style={{ background: '#0A0A0A', borderRadius: 34, height: '100%', padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.6rem', color: '#555' }}>9:41</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Bonjour, Sarah 👋</div>
                <div className="glass" style={{ borderRadius: 14, padding: 12 }}>
                  <div style={{ fontSize: '0.55rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Nutrition du jour</div>
                  <div className="bn" style={{ fontSize: '1.6rem', color: G }}>2 100 kcal</div>
                  <div style={{ height: 4, borderRadius: 2, background: '#222', marginTop: 6, overflow: 'hidden' }}><div style={{ width: '68%', height: '100%', background: `linear-gradient(90deg, ${G}, ${GH})`, borderRadius: 2 }} /></div>
                </div>
                <div className="glass" style={{ borderRadius: 14, padding: 12 }}>
                  <div style={{ fontSize: '0.55rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Programme</div>
                  {['Squat — 4×10', 'Dév. couché — 3×8', 'Tractions — 3×8'].map(e => (
                    <div key={e} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '0.68rem', color: '#ccc' }}><span>{e.split('—')[0]}</span><span style={{ color: '#555' }}>{e.split('—')[1]}</span></div>
                  ))}
                </div>
              </div>
            </div>
            {/* Floating badges */}
            <div style={{ position: 'absolute', top: 60, right: -20, animation: 'float1 4s ease-in-out infinite', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '6px 12px', fontSize: '0.68rem', color: '#22C55E', fontWeight: 600 }}>🔥 -3kg ce mois</div>
            <div style={{ position: 'absolute', bottom: 140, left: -30, animation: 'float2 5s ease-in-out infinite', background: `${G}15`, border: `1px solid ${G}30`, borderRadius: 12, padding: '6px 12px', fontSize: '0.68rem', color: G, fontWeight: 600 }}>✓ Plan validé par IA</div>
            <div style={{ position: 'absolute', bottom: 60, right: -10, animation: 'float3 3.5s ease-in-out infinite', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 12, padding: '6px 12px', fontSize: '0.68rem', color: '#F97316', fontWeight: 600 }}>💪 Séance aujourd'hui</div>
          </div>
        </div>
      </section>

      {/* ═══ BENTO FEATURES ═══ */}
      <section ref={featRef} style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 28px' }}>
        <Fade><h2 className="bn" style={{ fontSize: '3.2rem', textAlign: 'center', margin: 0 }}>TOUT CE DONT TU AS BESOIN</h2></Fade>
        <Fade delay={100}><p style={{ textAlign: 'center', color: G, fontSize: '0.85rem', fontWeight: 500, marginTop: 8, marginBottom: 48, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Une plateforme. Des résultats infinis.</p></Fade>
        <div className="bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: 'minmax(180px, auto)', gap: 16 }}>
          {[
            { emoji: '🥗', title: 'NUTRITION IA', desc: 'Plans 7 jours générés en 30s. Base ANSES/Ciqual 2025, 3484 aliments.', span: '1/3', rSpan: '1/3' },
            { emoji: '💪', title: 'TRAINING SUR MESURE', desc: 'Programmes adaptés à ton niveau, objectif et équipement.', span: '3/4', rSpan: '1/2' },
            { emoji: '📊', title: 'SUIVI TEMPS RÉEL', desc: 'Graphiques, photos avant/après, streak, mensurations.', span: '3/4', rSpan: '2/3' },
            { emoji: '💬', title: 'COACH CONNECTÉ', desc: 'Messagerie temps réel, retours instantanés.', span: '1/2', rSpan: '3/4' },
            { emoji: '🛒', title: 'LISTE DE COURSES', desc: 'Générée automatiquement depuis ton plan hebdomadaire.', span: '2/3', rSpan: '3/4' },
          ].map((f, i) => (
            <Fade key={i} delay={i * 80}>
              <div className="glass" style={{ borderRadius: 20, padding: 28, gridColumn: f.span, gridRow: f.rSpan, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>{f.emoji}</div>
                <h3 className="bn" style={{ fontSize: '1.4rem', margin: '0 0 6px', color: '#eee' }}>{f.title}</h3>
                <p style={{ color: '#777', fontSize: '0.85rem', lineHeight: 1.6, margin: 0, fontWeight: 300 }}>{f.desc}</p>
              </div>
            </Fade>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{ background: '#0A0A0A', padding: '80px 28px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Fade><h2 className="bn" style={{ fontSize: '3.2rem', textAlign: 'center', margin: '0 0 48px' }}>3 ÉTAPES VERS TES RÉSULTATS</h2></Fade>
          <div className="tl-h" style={{ display: 'flex', gap: 0, alignItems: 'flex-start', justifyContent: 'center' }}>
            {[
              { n: '①', emoji: '🎯', title: 'CRÉE TON PROFIL', desc: 'Objectifs, mensurations, préférences. L\'IA apprend à te connaître en 2 min.' },
              { n: '②', emoji: '⚡', title: 'TON PLAN IA EN 30s', desc: 'Nutrition 7 jours + programme entraînement. 100% personnalisé.' },
              { n: '③', emoji: '🏆', title: 'PROGRESSE', desc: 'Coche tes repas, suis ta progression, échange avec ton coach.' },
            ].map((s, i) => (
              <Fade key={i} delay={i * 120}>
                <div style={{ flex: 1, textAlign: 'center', padding: '0 20px', position: 'relative' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${G}12`, border: `2px solid ${G}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.6rem' }}>{s.emoji}</div>
                  <div style={{ fontSize: '0.65rem', color: G, letterSpacing: '0.2em', marginBottom: 4 }}>ÉTAPE {i + 1}</div>
                  <h3 className="bn" style={{ fontSize: '1.3rem', margin: '0 0 8px' }}>{s.title}</h3>
                  <p style={{ color: '#777', fontSize: '0.82rem', lineHeight: 1.6, margin: 0, fontWeight: 300 }}>{s.desc}</p>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 28px' }}>
        <Fade><h2 className="bn" style={{ fontSize: '3.2rem', textAlign: 'center', margin: '0 0 48px' }}>SIMPLE ET TRANSPARENT</h2></Fade>
        <div className="pricing-g" style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
          <Fade>
            <div style={{ background: 'rgba(201,168,76,0.03)', border: `2px solid ${G}30`, borderRadius: 28, padding: '36px 32px', width: 360, position: 'relative' }}>
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: G, color: '#000', padding: '5px 18px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em' }}>POPULAIRE</div>
              <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>👤</div>
              <h3 className="bn" style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>ATHLÈTE</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '0 0 6px' }}><span className="bn" style={{ fontSize: '3.2rem', color: G }}>CHF 30</span><span style={{ color: '#555' }}>/mois</span></div>
              <p style={{ color: '#666', fontSize: '0.78rem', margin: '0 0 20px' }}>Tout inclus, sans surprise</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {['Plan alimentaire IA 7 jours', 'Programme entraînement personnalisé', '3484 aliments ANSES/Ciqual', 'Suivi progression & photos', 'Messagerie coach temps réel', 'Liste de courses automatique', 'Calculateur BMR/TDEE'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: '#bbb' }}><span style={{ color: G }}>✦</span>{f}</div>
                ))}
              </div>
              <button onClick={() => router.push('/register-client')} className="shimmer-btn" style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', color: '#000', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>Commencer maintenant →</button>
              <p style={{ fontSize: '0.68rem', color: '#555', textAlign: 'center', marginTop: 10 }}>Sans engagement · Résiliable à tout moment</p>
            </div>
          </Fade>
          <Fade delay={100}>
            <div id="coaches" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid #222', borderRadius: 28, padding: '36px 32px', width: 360 }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>🏋️</div>
              <h3 className="bn" style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>COACH</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '0 0 6px' }}><span className="bn" style={{ fontSize: '3.2rem' }}>GRATUIT</span><span style={{ color: '#555' }}>*</span></div>
              <p style={{ color: '#666', fontSize: '0.78rem', margin: '0 0 20px' }}>*5% commission par client</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {['Dashboard clients illimité', 'Génération plans IA', 'Paiements Stripe automatisés', 'Calendrier & suivi séances', 'Messagerie temps réel', 'Analytics revenus'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: '#bbb' }}><span style={{ color: '#22C55E' }}>✦</span>{f}</div>
                ))}
              </div>
              <button onClick={() => router.push('/coach-signup')} style={{ width: '100%', padding: '15px', borderRadius: 14, border: `1px solid ${G}40`, background: 'transparent', color: G, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>Devenir coach →</button>
            </div>
          </Fade>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section style={{ background: '#0A0A0A', padding: '80px 28px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Fade><h2 className="bn" style={{ fontSize: '3.2rem', textAlign: 'center', margin: '0 0 48px' }}>ILS EN PARLENT</h2></Fade>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { q: "CoachPro a transformé ma façon de coacher. Les plans IA font gagner 2h par client.", n: 'Marc T.', r: 'Coach IFBB, Genève', b: '-2h/client' },
              { q: "En 3 mois, -8kg. Le plan alimentaire est tellement précis que c'est bluffant.", n: 'Sarah M.', r: 'Cliente', b: '-8kg en 3 mois' },
              { q: "La liste de courses automatique depuis mon plan, c'est un game changer absolu.", n: 'Lucas B.', r: 'Client', b: 'Game changer' },
            ].map((t, i) => (
              <Fade key={i} delay={i * 100}>
                <div className="glass" style={{ borderRadius: 20, padding: 28, width: 340 }}>
                  <div style={{ color: G, fontSize: '0.82rem', marginBottom: 10, letterSpacing: 2 }}>★★★★★</div>
                  <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic', fontWeight: 300 }}>"{t.q}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.n}</div>
                      <div style={{ fontSize: '0.72rem', color: '#555' }}>{t.r}</div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: 8, background: `${G}15`, border: `1px solid ${G}25`, fontSize: '0.65rem', color: G, fontWeight: 600 }}>{t.b}</span>
                  </div>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '80px 28px' }}>
        <Fade><h2 className="bn" style={{ fontSize: '3.2rem', textAlign: 'center', margin: '0 0 40px' }}>QUESTIONS FRÉQUENTES</h2></Fade>
        {[
          { q: 'Comment fonctionne le paiement ?', a: 'Abonnement mensuel CHF 30 via Stripe. Paiement sécurisé, résiliable à tout moment depuis ton profil.' },
          { q: "L'IA remplace-t-elle mon coach ?", a: "Non. L'IA est un outil puissant qui aide ton coach à créer des plans plus précis et personnalisés, plus rapidement." },
          { q: 'Puis-je changer de coach ?', a: 'Oui, tu peux changer de coach à tout moment depuis les paramètres de ton profil.' },
          { q: 'Comment résilier mon abonnement ?', a: 'Depuis ton profil ou en contactant le support. Aucun engagement, aucuns frais cachés.' },
          { q: 'Mes données sont-elles sécurisées ?', a: 'Oui. Infrastructure Supabase avec chiffrement, hébergement européen, conformité RGPD.' },
        ].map((f, i) => (
          <Fade key={i} delay={i * 50}>
            <div style={{ borderBottom: '1px solid #1A1A1A' }}>
              <button onClick={() => setFaq(faq === i ? null : i)} style={{ width: '100%', padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#eee', textAlign: 'left' }}>{f.q}</span>
                <ChevronDown size={18} color="#555" style={{ transform: faq === i ? 'rotate(180deg)' : 'none', transition: 'transform 250ms', flexShrink: 0, marginLeft: 12 }} />
              </button>
              <div style={{ maxHeight: faq === i ? 200 : 0, overflow: 'hidden', transition: 'max-height 300ms ease' }}>
                <p style={{ fontSize: '0.85rem', color: '#777', lineHeight: 1.7, padding: '0 0 18px', margin: 0, fontWeight: 300 }}>{f.a}</p>
              </div>
            </div>
          </Fade>
        ))}
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="grain" style={{ position: 'relative', padding: '100px 28px', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: `radial-gradient(circle, ${G}0A 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Fade><h2 className="bn" style={{ fontSize: '3.5rem', margin: '0 0 16px', lineHeight: 0.95 }}>PRÊT À DEVENIR<br />LA MEILLEURE VERSION<br /><span style={{ color: G }}>DE TOI-MÊME ?</span></h2></Fade>
          <Fade delay={100}><p style={{ color: '#666', fontSize: '1rem', margin: '0 0 36px', fontWeight: 300 }}>Rejoins 500+ athlètes qui transforment leur physique avec CoachPro</p></Fade>
          <Fade delay={200}><button onClick={() => router.push('/register-client')} className="shimmer-btn" style={{ padding: '18px 40px', borderRadius: 999, border: 'none', color: '#000', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}>COMMENCER MAINTENANT — CHF 30/MOIS</button></Fade>
          <Fade delay={300}><p style={{ color: '#555', fontSize: '0.78rem', marginTop: 16 }}>✓ Sans engagement · ✓ Résiliable · ✓ Support inclus</p></Fade>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: '1px solid #1A1A1A', padding: '40px 28px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 22, height: 22, background: G, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={12} color="#000" fill="#000" /></div>
          <span className="bn" style={{ fontSize: '1rem' }}>COACHPRO</span>
        </div>
        <div style={{ fontSize: '0.55rem', color: `${G}60`, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>Elite Performance</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16, fontSize: '0.75rem' }}>
          <a href="#" style={{ color: '#555', textDecoration: 'none' }}>CGU</a>
          <a href="#" style={{ color: '#555', textDecoration: 'none' }}>Confidentialité</a>
          <a href="mailto:contact@moovx.ch" style={{ color: '#555', textDecoration: 'none' }}>Contact</a>
        </div>
        <p style={{ color: '#333', fontSize: '0.7rem', margin: 0 }}>© 2026 CoachPro by MoovX. Tous droits réservés.</p>
      </footer>
    </div>
  )
}
