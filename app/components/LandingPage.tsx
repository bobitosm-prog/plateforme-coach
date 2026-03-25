'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const GOLD = '#C9A84C'
const GOLD_LIGHT = '#E8C96A'

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function AnimCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const { ref, visible } = useInView(0.5)
  useEffect(() => {
    if (!visible) return
    let start = 0
    const step = Math.ceil(target / 60)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setVal(target); clearInterval(timer) }
      else setVal(start)
    }, 16)
    return () => clearInterval(timer)
  }, [visible, target])
  return <span ref={ref}>{val}{suffix}</span>
}

function Section({ children, id }: { children: React.ReactNode; id?: string }) {
  const { ref, visible } = useInView()
  return (
    <div id={id} ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(40px)',
      transition: 'opacity 0.7s ease, transform 0.7s ease'
    }}>
      {children}
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const testimonials = [
    { name: 'Marc T.', role: 'Coach certifié IFBB, Genève', quote: 'CoachPro a transformé ma façon de coacher. Les plans IA me font gagner 2 heures par client. Mes résultats clients ont explosé.', result: '+12 clients en 2 mois', initials: 'MT', color: '#1a3a2a' },
    { name: 'Sarah M.', role: 'Cliente, Lausanne', quote: 'En 3 mois, j\'ai perdu 8 kg. Le plan alimentaire est tellement précis que c\'est bluffant. Et la liste de courses automatique, c\'est magique.', result: '-8 kg en 3 mois', initials: 'SM', color: '#1a2a3a' },
    { name: 'Lucas B.', role: 'Client, Zurich', quote: 'J\'avais essayé des dizaines d\'apps. CoachPro est la première qui combine vraiment coach humain et IA. Le game changer.', result: '+6 kg de muscle', initials: 'LB', color: '#2a1a3a' },
  ]

  const faqs = [
    { q: 'Comment fonctionne le paiement ?', a: 'Paiement sécurisé via Stripe. CHF 30/mois, résiliable à tout moment depuis ton profil. Aucun engagement, aucune surprise.' },
    { q: "L'IA remplace-t-elle mon coach ?", a: "Non — l'IA assiste ton coach humain. Il génère, supervise et valide chaque plan avant qu'il te soit envoyé. Le meilleur des deux mondes." },
    { q: 'Puis-je changer de coach ?', a: 'Oui, à tout moment. Contacte notre support et nous t\'assignons un nouveau coach sous 24h, en gardant ton historique.' },
    { q: 'Comment résilier ?', a: "Depuis ton profil → Mon abonnement → Résilier. Aucun frais de résiliation, ton accès reste actif jusqu'à la fin de la période payée." },
    { q: 'Mes données sont-elles sécurisées ?', a: 'Oui. Données stockées en Suisse via Supabase, chiffrées en transit et au repos. Conformité RGPD totale. Tes données t\'appartiennent.' },
  ]

  return (
    <div style={{ background: '#050505', color: '#fff', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', opacity: 0.025, pointerEvents: 'none', zIndex: 9999 }} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? 'rgba(5,5,5,0.92)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid rgba(201,168,76,0.12)' : 'none', transition: 'all 0.3s ease', padding: '0 5%' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div style={{ width: 36, height: 36, background: GOLD, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, lineHeight: 1 }}>COACHPRO</div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: GOLD, opacity: 0.8, textTransform: 'uppercase', lineHeight: 1 }}>Elite Performance</div>
            </div>
          </div>
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['Fonctionnalités', 'Tarifs', 'Coachs'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)} onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}>{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#ccc', padding: '8px 20px', borderRadius: 50, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#ccc' }}>Connexion</button>
            <button onClick={() => router.push('/register-client')} className="shimmer-btn" style={{ background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD_LIGHT} 50%, ${GOLD} 100%)`, backgroundSize: '200% auto', border: 'none', color: '#000', padding: '9px 22px', borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: 'pointer', animation: 'shimmer 3s linear infinite' }}>Commencer</button>
          </div>
        </div>
      </nav>

      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 5% 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.03, pointerEvents: 'none' }} viewBox="0 0 1200 800" preserveAspectRatio="none">
          {[0,1,2,3,4].map(i => <line key={i} x1={-100 + i * 300} y1={0} x2={200 + i * 300} y2={800} stroke={GOLD} strokeWidth={1} />)}
        </svg>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(201,168,76,0.4)', borderRadius: 50, padding: '6px 16px', marginBottom: 32, fontSize: 13, color: GOLD }}>
              <span style={{ animation: 'pulse 2s infinite' }}>✦</span> Propulsé par l'IA Claude d'Anthropic <span style={{ animation: 'pulse 2s infinite' }}>✦</span>
            </div>
            <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(60px, 8vw, 110px)', lineHeight: 0.95, margin: '0 0 24px', letterSpacing: 2 }}>
              <span style={{ display: 'block', opacity: 0, animation: 'slideUp 0.6s ease 0.1s forwards' }}>TRANSFORME</span>
              <span style={{ display: 'block', opacity: 0, animation: 'slideUp 0.6s ease 0.25s forwards' }}>TON CORPS.</span>
              <span style={{ display: 'block', color: GOLD, opacity: 0, animation: 'slideUp 0.6s ease 0.4s forwards' }}>DÉPASSE</span>
              <span style={{ display: 'block', color: GOLD, opacity: 0, animation: 'slideUp 0.6s ease 0.55s forwards' }}>TES LIMITES.</span>
            </h1>
            <p style={{ color: '#999', fontSize: 17, lineHeight: 1.7, marginBottom: 40, maxWidth: 480, fontWeight: 300 }}>
              CoachPro connecte athlètes et coaches d'élite avec des plans alimentaires et sportifs générés par IA. Basé sur <strong style={{ color: '#ccc' }}>3 484 aliments ANSES/Ciqual 2025</strong>. Résultats garantis.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 48 }}>
              <button onClick={() => router.push('/register-client')} className="shimmer-btn" style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`, backgroundSize: '200% auto', border: 'none', color: '#000', padding: '16px 36px', borderRadius: 50, fontSize: 16, fontWeight: 700, cursor: 'pointer', animation: 'shimmer 3s linear infinite', boxShadow: '0 0 40px rgba(201,168,76,0.3)' }}>🚀 Commencer — CHF 30/mois</button>
              <button onClick={() => document.getElementById('fonctionnalités')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#ddd', padding: '16px 28px', borderRadius: 50, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>▶ Voir comment ça marche</button>
            </div>
            <div style={{ display: 'flex', gap: 0 }}>
              {[{ val: 4.9, suffix: '/5 ⭐', label: 'Note moyenne' }, { val: 500, suffix: '+', label: 'Athlètes actifs' }, { val: 50, suffix: '+', label: 'Coachs certifiés' }].map((s, i) => (
                <div key={i} style={{ flex: 1, padding: '0 24px', borderLeft: i > 0 ? '1px solid rgba(201,168,76,0.2)' : 'none' }}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: GOLD, lineHeight: 1 }}><AnimCounter target={s.val} suffix={s.suffix} /></div>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-phone" style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 340, height: 340, background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', width: 280, background: '#0f0f0f', borderRadius: 40, border: '2px solid rgba(255,255,255,0.1)', padding: '12px 8px', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
              <div style={{ width: 100, height: 28, background: '#050505', borderRadius: 20, margin: '0 auto 8px', position: 'relative', zIndex: 2 }} />
              <div style={{ background: '#0a0a0a', borderRadius: 28, overflow: 'hidden', padding: 16, minHeight: 480 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div><div style={{ fontSize: 11, color: '#666' }}>Mercredi 25 Mars</div><div style={{ fontSize: 18, fontWeight: 600 }}>Bonjour, Sarah 👋</div></div>
                  <div style={{ width: 36, height: 36, background: GOLD, borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000' }}>S</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[{ icon: '⚖️', val: '62 kg', label: 'POIDS' }, { icon: '🎯', val: '55 kg', label: 'OBJECTIF' }].map((c, i) => (
                    <div key={i} style={{ background: '#1a1a1a', borderRadius: 14, padding: 12 }}>
                      <div style={{ fontSize: 16 }}>{c.icon}</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: i === 0 ? GOLD : '#fff' }}>{c.val}</div>
                      <div style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>{c.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 14, padding: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 11, color: GOLD, letterSpacing: 1, textTransform: 'uppercase' }}>Nutrition du jour</span><span style={{ fontSize: 11, color: '#666' }}>1420/1800 kcal</span></div>
                  <div style={{ height: 6, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: '79%', height: '100%', background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`, borderRadius: 3 }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    {[['120g', 'PROT', '#3b82f6'], ['180g', 'GLUC', '#22c55e'], ['48g', 'LIP', GOLD]].map(([v, l, c]) => (
                      <div key={l} style={{ textAlign: 'center' }}><div style={{ fontSize: 13, fontWeight: 600, color: c as string }}>{v}</div><div style={{ fontSize: 9, color: '#555', letterSpacing: 1 }}>{l}</div></div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 14, padding: 12 }}>
                  <div style={{ fontSize: 11, color: GOLD, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Programme du jour</div>
                  {['Squat — 4×8', 'Presse — 3×12', 'Fentes — 3×10'].map((ex, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < 2 ? '1px solid #222' : 'none' }}>
                      <span style={{ fontSize: 12, color: '#ccc' }}>{ex}</span><span style={{ fontSize: 10, background: '#2a2a2a', padding: '2px 8px', borderRadius: 6, color: '#888' }}>90s</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {[{ text: '🔥 -3kg ce mois', top: '15%', right: '-10%', delay: 0 }, { text: '✓ Plan validé IA', top: '45%', left: '-15%', delay: 0.5 }, { text: '💪 Séance today', bottom: '20%', right: '-8%', delay: 1 }].map((b, i) => (
              <div key={i} style={{ position: 'absolute', top: b.top, bottom: (b as any).bottom, left: (b as any).left, right: b.right, background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', backdropFilter: 'blur(10px)', animation: `float 3s ease-in-out ${b.delay}s infinite` }}>{b.text}</div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '20px 5%', overflow: 'hidden', background: 'rgba(201,168,76,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, animation: 'marquee 20s linear infinite', whiteSpace: 'nowrap' }}>
          {['FitClub Geneva', 'Sport Academy Zurich', 'Elite Performance', 'ProCoach Basel', 'Swiss Athletics', 'FitClub Geneva', 'Sport Academy Zurich', 'Elite Performance'].map((n, i) => (
            <span key={i} style={{ color: '#555', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>{n}</span>
          ))}
        </div>
      </div>

      <section id="fonctionnalités" style={{ padding: '120px 5%' }}>
        <Section>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ color: GOLD, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>Fonctionnalités</div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(40px, 5vw, 64px)', margin: 0, letterSpacing: 2 }}>TOUT CE DONT TU AS BESOIN</h2>
              <p style={{ color: '#666', marginTop: 16, fontSize: 16 }}>Une plateforme. Des résultats infinis.</p>
            </div>
            <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'auto auto', gap: 16 }}>
              <div className="glass-card" style={{ gridColumn: 'span 2', gridRow: 'span 2', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 24, padding: 40, transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: 'radial-gradient(circle, rgba(201,168,76,0.06), transparent)' }} />
                <div style={{ fontSize: 40, marginBottom: 20 }}>🥗</div>
                <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: GOLD, letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase' }}>Ciqual 2025</div>
                <h3 style={{ fontSize: 28, fontWeight: 600, marginBottom: 12, lineHeight: 1.2 }}>Nutrition IA<br />personnalisée</h3>
                <p style={{ color: '#777', lineHeight: 1.7, fontSize: 15 }}>Plans de 7 jours générés en 30 secondes basés sur tes macros et <strong style={{ color: '#aaa' }}>3 484 aliments ANSES/Ciqual 2025</strong>. Quantités exactes en grammes.</p>
                <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[{ meal: '🌅 Petit-déj', items: "Flocons d'avoine · Banane · Yaourt grec", kcal: '487 kcal' }, { meal: '☀️ Déjeuner', items: 'Poulet · Riz basmati · Brocoli', kcal: '612 kcal' }, { meal: '🌙 Dîner', items: 'Saumon · Patate douce · Épinards', kcal: '520 kcal' }].map((m, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><div style={{ fontSize: 12, color: GOLD, marginBottom: 2 }}>{m.meal}</div><div style={{ fontSize: 12, color: '#777' }}>{m.items}</div></div>
                      <div style={{ fontSize: 12, color: '#555', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8 }}>{m.kcal}</div>
                    </div>
                  ))}
                </div>
              </div>
              {[{ icon: '💪', title: 'Training sur mesure', desc: "Programmes adaptés à ton niveau, objectif et équipement disponible." }, { icon: '📊', title: 'Suivi en temps réel', desc: "Graphiques, photos avant/après, streak d'entraînement." }, { icon: '💬', title: 'Coach connecté', desc: 'Messagerie temps réel, retours instantanés de ton coach.' }, { icon: '🛒', title: 'Liste de courses auto', desc: 'Générée depuis ton plan, organisée par rayon supermarché.' }].map((f, i) => (
                <div key={i} className="glass-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 20, padding: 28, transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ color: '#666', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </section>

      <section style={{ padding: '100px 5%', background: '#0a0a0a' }}>
        <Section>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <div style={{ color: GOLD, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>Comment ça marche</div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(40px, 5vw, 64px)', margin: 0, letterSpacing: 2 }}>3 ÉTAPES VERS TES RÉSULTATS</h2>
            </div>
            <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 60, left: '17%', right: '17%', height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, opacity: 0.3 }} />
              {[{ icon: '🎯', title: 'Crée ton profil', time: '2 minutes', desc: "Objectifs, mensuration, préférences. L'IA apprend à te connaître." }, { icon: '⚡', title: 'Ton plan IA en 30s', time: '30 secondes', desc: "Nutrition 7 jours + programme entraînement. 100% personnalisé." }, { icon: '🏆', title: 'Progresse', time: 'Chaque jour', desc: 'Coche tes repas, suis ta progression, échange avec ton coach.' }].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '0 40px', position: 'relative' }}>
                  <div style={{ width: 80, height: 80, borderRadius: 50, background: i === 1 ? GOLD : 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, position: 'relative', zIndex: 1, animation: i === 1 ? 'pulse 2s infinite' : 'none' }}>{s.icon}</div>
                  <div style={{ fontSize: 11, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>{s.time}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>{s.title}</h3>
                  <p style={{ color: '#666', fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </section>

      <section id="tarifs" style={{ padding: '120px 5%' }}>
        <Section>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ color: GOLD, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>Tarifs</div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(40px, 5vw, 64px)', margin: 0, letterSpacing: 2 }}>SIMPLE ET TRANSPARENT</h2>
            </div>
            <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ background: 'rgba(201,168,76,0.04)', border: '2px solid rgba(201,168,76,0.5)', borderRadius: 28, padding: 40, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 20, right: 20, background: GOLD, color: '#000', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20, letterSpacing: 1 }}>POPULAIRE</div>
                <div style={{ fontSize: 12, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Athlète</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}><span style={{ fontSize: 11, color: '#777', alignSelf: 'flex-start', marginTop: 10 }}>CHF</span><span style={{ fontFamily: "'Bebas Neue'", fontSize: 72, lineHeight: 1, color: GOLD }}>30</span><span style={{ color: '#666', fontSize: 14 }}>/mois</span></div>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 28 }}>Tout inclus, sans surprise</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
                  {['Plan alimentaire IA 7 jours', 'Programme entraînement perso', '3 484 aliments ANSES/Ciqual', 'Suivi progression & photos', 'Messagerie coach temps réel', 'Liste de courses automatique', 'Calculateur BMR/TDEE'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ color: GOLD, fontSize: 14 }}>✦</span><span style={{ fontSize: 14, color: '#ccc' }}>{f}</span></div>
                  ))}
                </div>
                <button onClick={() => router.push('/register-client')} style={{ width: '100%', background: GOLD, color: '#000', border: 'none', borderRadius: 16, padding: '16px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Commencer maintenant →</button>
                <p style={{ textAlign: 'center', color: '#555', fontSize: 12, marginTop: 12 }}>Sans engagement · Résiliable à tout moment</p>
              </div>
              <div id="coachs" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, padding: 40 }}>
                <div style={{ fontSize: 12, color: '#888', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Coach</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}><span style={{ fontFamily: "'Bebas Neue'", fontSize: 72, lineHeight: 1 }}>GRATUIT</span></div>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 28 }}>*5% commission par client/mois</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
                  {['Dashboard clients illimité', 'Génération plans IA', 'Paiements Stripe automatisés', 'Calendrier & suivi séances', 'Messagerie temps réel', 'Analytics revenus en direct'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ color: '#555', fontSize: 14 }}>✦</span><span style={{ fontSize: 14, color: '#888' }}>{f}</span></div>
                  ))}
                </div>
                <button onClick={() => router.push('/coach-signup')} style={{ width: '100%', background: 'transparent', color: GOLD, border: '1px solid rgba(201,168,76,0.4)', borderRadius: 16, padding: '16px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Devenir coach →</button>
              </div>
            </div>
          </div>
        </Section>
      </section>

      <section style={{ padding: '100px 5%', background: '#070707' }}>
        <Section>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ color: GOLD, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>Témoignages</div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(40px, 5vw, 64px)', margin: 0, letterSpacing: 2 }}>ILS ONT TRANSFORMÉ LEUR VIE</h2>
            </div>
            <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {testimonials.map((t, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 32, transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 50, background: t.color, border: '2px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, flexShrink: 0 }}>{t.initials}</div>
                    <div><div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div><div style={{ fontSize: 12, color: '#666' }}>{t.role}</div></div>
                  </div>
                  <div style={{ color: GOLD, marginBottom: 14, fontSize: 16 }}>⭐⭐⭐⭐⭐</div>
                  <p style={{ color: '#999', fontSize: 14, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 20 }}>"{t.quote}"</p>
                  <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20, padding: '6px 14px', display: 'inline-block', fontSize: 12, color: GOLD, fontWeight: 600 }}>{t.result}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </section>

      <section style={{ padding: '100px 5%' }}>
        <Section>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ color: GOLD, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>FAQ</div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(40px, 5vw, 56px)', margin: 0, letterSpacing: 2 }}>TES QUESTIONS</h2>
            </div>
            {faqs.map((f, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#fff', padding: '22px 0', fontSize: 16, fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {f.q}
                  <span style={{ color: GOLD, fontSize: 20, transition: 'transform 0.3s', transform: faqOpen === i ? 'rotate(45deg)' : 'none', flexShrink: 0, marginLeft: 16 }}>+</span>
                </button>
                <div style={{ maxHeight: faqOpen === i ? 200 : 0, overflow: 'hidden', transition: 'max-height 300ms ease' }}>
                  <p style={{ fontSize: 14, color: '#777', lineHeight: 1.8, paddingBottom: 20, margin: 0 }}>{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </section>

      <section style={{ padding: '120px 5%', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Section>
          <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(48px, 7vw, 88px)', lineHeight: 0.95, letterSpacing: 2, marginBottom: 24 }}>PRÊT À DEVENIR<br /><span style={{ color: GOLD }}>LA MEILLEURE VERSION</span><br />DE TOI-MÊME ?</h2>
            <p style={{ color: '#777', fontSize: 17, marginBottom: 48, fontWeight: 300 }}>Rejoins 500+ athlètes qui ont transformé leur physique avec CoachPro.</p>
            <button onClick={() => router.push('/register-client')} className="shimmer-btn" style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`, backgroundSize: '200% auto', border: 'none', color: '#000', padding: '20px 56px', borderRadius: 50, fontSize: 18, fontWeight: 700, cursor: 'pointer', animation: 'shimmer 3s linear infinite', boxShadow: '0 0 60px rgba(201,168,76,0.3)', letterSpacing: 0.5 }}>🚀 COMMENCER MAINTENANT — CHF 30/MOIS</button>
            <p style={{ color: '#444', fontSize: 13, marginTop: 20 }}>✓ Sans engagement · ✓ Résiliable à tout moment · ✓ Support inclus</p>
          </div>
        </Section>
      </section>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '48px 5%', background: '#030303' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: GOLD, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
            <div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2 }}>COACHPRO</div><div style={{ fontSize: 9, letterSpacing: 3, color: '#555', textTransform: 'uppercase' }}>Elite Performance</div></div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {['CGU', 'Confidentialité', 'Contact'].map(l => (<a key={l} href="#" style={{ color: '#555', fontSize: 13, textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.color = GOLD)} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>{l}</a>))}
          </div>
          <div style={{ color: '#444', fontSize: 13 }}>© 2026 CoachPro by MoovX · contact@moovx.ch</div>
        </div>
      </footer>

      <style>{`
        @keyframes shimmer{0%{background-position:0% center}100%{background-position:200% center}}
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.1)}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media(max-width:768px){
          .desktop-nav{display:none!important}
          .hero-phone{display:none!important}
          .bento-grid{grid-template-columns:1fr!important}
          .bento-grid>*{grid-column:span 1!important;grid-row:span 1!important}
          .steps-grid{grid-template-columns:1fr!important;gap:40px!important}
          .steps-grid>div>div:first-child{position:relative!important}
          .pricing-grid{grid-template-columns:1fr!important}
          .testimonials-grid{grid-template-columns:1fr!important}
        }
      `}</style>
    </div>
  )
}
