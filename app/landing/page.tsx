'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Menu, X, ChevronDown } from 'lucide-react'

const GOLD = '#C9A84C'

function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return visible
}

function FadeIn({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useOnScreen(ref)
  return <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>{children}</div>
}

export default function LandingPage() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const featRef = useRef<HTMLDivElement>(null)

  return (
    <div style={{ background: '#0A0A0A', color: '#fff', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');.bn{font-family:'Bebas Neue',sans-serif;letter-spacing:.04em}`}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: GOLD, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} color="#000" fill="#000" strokeWidth={2.5} />
            </div>
            <span className="bn" style={{ fontSize: '1.3rem', color: '#fff' }}>COACHPRO</span>
          </div>
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a onClick={() => featRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{ color: '#9CA3AF', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'none' }}>Fonctionnalités</a>
            <a href="#pricing" style={{ color: '#9CA3AF', fontSize: '0.85rem', textDecoration: 'none' }}>Tarifs</a>
            <a href="#coaches" style={{ color: '#9CA3AF', fontSize: '0.85rem', textDecoration: 'none' }}>Coachs</a>
            <button onClick={() => router.push('/')} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>Se connecter</button>
            <button onClick={() => router.push('/register-client')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: GOLD, color: '#000', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>Commencer</button>
          </div>
          <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menuOpen && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a onClick={() => { featRef.current?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }} style={{ color: '#9CA3AF', fontSize: '0.9rem', cursor: 'pointer' }}>Fonctionnalités</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>Tarifs</a>
            <button onClick={() => router.push('/')} style={{ padding: '10px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer' }}>Se connecter</button>
            <button onClick={() => router.push('/register-client')} style={{ padding: '10px', borderRadius: 8, border: 'none', background: GOLD, color: '#000', cursor: 'pointer', fontWeight: 700 }}>Commencer</button>
          </div>
        )}
      </nav>

      <style>{`
        @media(max-width:768px){
          .nav-links{display:none !important}
          .nav-hamburger{display:flex !important}
          .hero-grid{flex-direction:column !important;text-align:center}
          .hero-title{font-size:3.2rem !important}
          .pricing-grid{flex-direction:column !important}
          .feat-row{flex-direction:column !important}
        }
      `}</style>

      {/* ═══ HERO ═══ */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px 60px' }}>
        <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
          <div style={{ flex: 1 }}>
            <div className="animate-pulse-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: `${GOLD}15`, border: `1px solid ${GOLD}30`, marginBottom: 24, fontSize: '0.78rem', color: GOLD, fontWeight: 600 }}>
              Propulsé par l'IA Claude
            </div>
            <h1 className="bn hero-title" style={{ fontSize: '4.5rem', lineHeight: 0.95, margin: '0 0 20px', color: '#fff' }}>
              TON COACH PERSO.<br />TON PLAN PARFAIT.<br /><span style={{ color: GOLD }}>TES RÉSULTATS.</span>
            </h1>
            <p style={{ fontSize: '1.05rem', color: '#9CA3AF', lineHeight: 1.7, margin: '0 0 32px', maxWidth: 480 }}>
              CoachPro connecte coaches et athlètes avec des plans alimentaires et sportifs générés par IA, adaptés à ton corps et tes objectifs.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/register-client')} style={{ padding: '14px 28px', borderRadius: 12, border: 'none', background: GOLD, color: '#000', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>Commencer gratuitement</button>
              <button onClick={() => featRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{ padding: '14px 28px', borderRadius: 12, border: '1px solid #333', background: 'transparent', color: '#ccc', fontSize: '1rem', cursor: 'pointer' }}>Voir la démo</button>
            </div>
            <div style={{ display: 'flex', gap: 28, marginTop: 32, fontSize: '0.85rem', color: '#6B7280' }}>
              <span>⭐ <strong style={{ color: '#fff' }}>4.9/5</strong></span>
              <span>👥 <strong style={{ color: '#fff' }}>500+</strong> athlètes</span>
              <span>🏆 <strong style={{ color: '#fff' }}>50+</strong> coachs</span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 280, height: 560, background: '#111', borderRadius: 36, border: '3px solid #222', padding: '12px 8px', position: 'relative', overflow: 'hidden', boxShadow: `0 40px 80px rgba(0,0,0,0.5), 0 0 60px ${GOLD}15` }}>
              <div style={{ background: '#0A0A0A', borderRadius: 28, height: '100%', padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: '0.65rem', color: GOLD, fontWeight: 700, letterSpacing: '0.1em' }}>COACHPRO</div>
                <div style={{ background: '#1A1A1A', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: '0.6rem', color: '#6B7280', marginBottom: 6 }}>NUTRITION DU JOUR</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.8rem', color: GOLD }}>2 100 kcal</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {[{ l: 'P', v: '140g', c: '#3B82F6' }, { l: 'G', v: '220g', c: '#22C55E' }, { l: 'L', v: '58g', c: '#F97316' }].map(m => (
                      <div key={m.l} style={{ flex: 1, background: '#0A0A0A', borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: m.c }}>{m.v}</div>
                        <div style={{ fontSize: '0.5rem', color: '#6B7280' }}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#1A1A1A', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: '0.6rem', color: '#6B7280', marginBottom: 6 }}>PROGRAMME</div>
                  {['Squat', 'Développé couché', 'Tractions'].map(ex => (
                    <div key={ex} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.7rem' }}>
                      <span style={{ color: '#F8FAFC' }}>{ex}</span>
                      <span style={{ color: '#6B7280' }}>4×10</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30`, borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#000' }}>C</div>
                  <div style={{ fontSize: '0.65rem', color: '#F8FAFC' }}>Bravo ! Tu progresses bien 💪</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section ref={featRef} style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        <FadeIn>
          <h2 className="bn" style={{ fontSize: '2.8rem', textAlign: 'center', margin: '0 0 48px' }}>TOUT CE QU'IL TE FAUT</h2>
        </FadeIn>
        {[
          { emoji: '🥗', title: 'Plans alimentaires IA personnalisés', desc: 'Notre IA génère un plan de 7 jours basé sur tes macros, tes préférences et la base de données ANSES/Ciqual 2025 (3484 aliments).' },
          { emoji: '💪', title: "Programmes d'entraînement sur mesure", desc: "Chaque programme est adapté à ton niveau, ton objectif et ton équipement disponible." },
          { emoji: '📊', title: 'Suivi et progression en temps réel', desc: "Graphiques de progression, photos avant/après, mensurations et streak d'entraînement." },
          { emoji: '💬', title: 'Communication directe avec ton coach', desc: 'Messagerie intégrée, retours en temps réel et ajustements de ton programme.' },
        ].map((f, i) => (
          <FadeIn key={i}>
            <div className="feat-row" style={{ display: 'flex', gap: 40, alignItems: 'center', marginBottom: 48, flexDirection: i % 2 === 1 ? 'row-reverse' : 'row' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{f.emoji}</div>
                <h3 className="bn" style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ color: '#9CA3AF', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 360, height: 200, background: '#111', borderRadius: 16, border: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>{f.emoji}</div>
              </div>
            </div>
          </FadeIn>
        ))}
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{ background: '#0D0D0D', padding: '60px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn><h2 className="bn" style={{ fontSize: '2.8rem', textAlign: 'center', margin: '0 0 48px' }}>COMMENT ÇA MARCHE</h2></FadeIn>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { n: '1', emoji: '🎯', title: 'Tu crées ton profil', desc: 'Renseigne tes objectifs, mensurations et préférences alimentaires en 2 minutes.' },
              { n: '2', emoji: '🤖', title: "L'IA prépare ton plan", desc: "Ton coach génère un plan alimentaire et sportif 100% personnalisé grâce à l'IA." },
              { n: '3', emoji: '🏆', title: 'Tu progresses', desc: 'Suis ta progression, coche tes repas et entraînements, atteins tes objectifs.' },
            ].map(s => (
              <FadeIn key={s.n} className="">
                <div style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 20, padding: 28, width: 320, textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{s.emoji}</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: GOLD, letterSpacing: '0.1em', marginBottom: 4 }}>ÉTAPE {s.n}</div>
                  <h3 className="bn" style={{ fontSize: '1.4rem', margin: '0 0 8px' }}>{s.title}</h3>
                  <p style={{ color: '#9CA3AF', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        <FadeIn><h2 className="bn" style={{ fontSize: '2.8rem', textAlign: 'center', margin: '0 0 48px' }}>TARIFS SIMPLES</h2></FadeIn>
        <div className="pricing-grid" style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
          {/* Athlete */}
          <FadeIn>
            <div style={{ background: '#111', border: `2px solid ${GOLD}40`, borderRadius: 24, padding: 32, width: 340, position: 'relative' }}>
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: GOLD, color: '#000', padding: '4px 16px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em' }}>POPULAIRE</div>
              <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>👤</div>
              <h3 className="bn" style={{ fontSize: '1.6rem', margin: '0 0 4px' }}>ATHLÈTE</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '12px 0 20px' }}>
                <span className="bn" style={{ fontSize: '3rem', color: GOLD }}>CHF 30</span>
                <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>/mois</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {['Plan alimentaire IA', 'Programme sport', 'Suivi progression', 'Chat avec ton coach', 'Base Ciqual 3484', 'Liste de courses'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#ccc' }}>
                    <span style={{ color: '#22C55E' }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/register-client')} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: GOLD, color: '#000', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>Commencer maintenant</button>
            </div>
          </FadeIn>
          {/* Coach */}
          <FadeIn>
            <div id="coaches" style={{ background: '#111', border: '1px solid #222', borderRadius: 24, padding: 32, width: 340 }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>🏋️</div>
              <h3 className="bn" style={{ fontSize: '1.6rem', margin: '0 0 4px' }}>COACH</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '12px 0 20px' }}>
                <span className="bn" style={{ fontSize: '3rem', color: '#fff' }}>Gratuit</span>
                <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>*</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {['Dashboard clients', 'Génération plans IA', 'Paiements Stripe', 'Calendrier séances', 'Messagerie', 'Suivi nutrition'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#ccc' }}>
                    <span style={{ color: '#22C55E' }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/coach-signup')} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #333', background: 'transparent', color: '#ccc', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>Devenir coach</button>
              <p style={{ fontSize: '0.7rem', color: '#6B7280', textAlign: 'center', marginTop: 8 }}>*5% commission par client</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section style={{ background: '#0D0D0D', padding: '60px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn><h2 className="bn" style={{ fontSize: '2.8rem', textAlign: 'center', margin: '0 0 48px' }}>ILS EN PARLENT</h2></FadeIn>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { q: "CoachPro a transformé ma façon de coacher. Les plans IA font gagner 2h par client.", a: 'Marc T.', r: 'Coach certifié IFBB, Genève' },
              { q: "En 3 mois, -8kg. Le plan alimentaire est tellement précis que c'est bluffant.", a: 'Sarah M.', r: 'Cliente' },
              { q: "La liste de courses générée automatiquement depuis mon plan, c'est un game changer.", a: 'Lucas B.', r: 'Client' },
            ].map((t, i) => (
              <FadeIn key={i}>
                <div style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 20, padding: 24, width: 320 }}>
                  <div style={{ color: GOLD, fontSize: '0.85rem', marginBottom: 8 }}>⭐⭐⭐⭐⭐</div>
                  <p style={{ color: '#ddd', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 16px', fontStyle: 'italic' }}>"{t.q}"</p>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{t.a}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{t.r}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px' }}>
        <FadeIn><h2 className="bn" style={{ fontSize: '2.8rem', textAlign: 'center', margin: '0 0 36px' }}>QUESTIONS FRÉQUENTES</h2></FadeIn>
        {[
          { q: 'Comment fonctionne le paiement ?', a: 'Tu t\'abonnes à CHF 30/mois via Stripe. Le paiement est sécurisé et résiliable à tout moment.' },
          { q: 'Puis-je changer de coach ?', a: 'Oui, tu peux changer de coach à tout moment depuis ton profil.' },
          { q: "L'IA remplace-t-elle le coach ?", a: "Non, l'IA est un outil qui aide ton coach à créer des plans plus précis et personnalisés." },
          { q: 'Comment résilier ?', a: 'Tu peux résilier depuis ton profil ou contacter le support. Aucun engagement.' },
          { q: 'Les données sont-elles sécurisées ?', a: 'Oui, nous utilisons Supabase avec chiffrement et conformité RGPD.' },
        ].map((f, i) => (
          <FadeIn key={i}>
            <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ width: '100%', padding: '16px 0', background: 'none', border: 'none', borderBottom: '1px solid #1A1A1A', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>{f.q}</span>
              <ChevronDown size={18} color="#6B7280" style={{ transform: faqOpen === i ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
            </button>
            {faqOpen === i && <p style={{ fontSize: '0.85rem', color: '#9CA3AF', lineHeight: 1.6, padding: '8px 0 16px', margin: 0 }}>{f.a}</p>}
          </FadeIn>
        ))}
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section style={{ background: `linear-gradient(180deg, ${GOLD}08, ${GOLD}03)`, padding: '80px 24px', textAlign: 'center' }}>
        <FadeIn>
          <h2 className="bn" style={{ fontSize: '3rem', margin: '0 0 12px' }}>PRÊT À TRANSFORMER TON CORPS ?</h2>
          <p style={{ color: '#9CA3AF', fontSize: '1rem', margin: '0 0 32px' }}>Rejoins 500+ athlètes qui ont déjà transformé leur physique avec CoachPro</p>
          <button onClick={() => router.push('/register-client')} style={{ padding: '16px 40px', borderRadius: 14, border: 'none', background: GOLD, color: '#000', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}>Commencer maintenant — CHF 30/mois</button>
          <p style={{ color: '#6B7280', fontSize: '0.78rem', marginTop: 12 }}>✓ Sans engagement · ✓ Résiliable à tout moment</p>
        </FadeIn>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: '1px solid #1A1A1A', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, background: GOLD, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={14} color="#000" fill="#000" /></div>
          <span className="bn" style={{ fontSize: '1.1rem' }}>COACHPRO</span>
          <span style={{ color: '#4B5563', fontSize: '0.72rem', marginLeft: 4 }}>Elite Performance</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16, fontSize: '0.78rem' }}>
          <a href="#" style={{ color: '#6B7280', textDecoration: 'none' }}>CGU</a>
          <a href="#" style={{ color: '#6B7280', textDecoration: 'none' }}>Confidentialité</a>
          <a href="mailto:contact@moovx.ch" style={{ color: '#6B7280', textDecoration: 'none' }}>Contact</a>
        </div>
        <p style={{ color: '#4B5563', fontSize: '0.72rem', margin: 0 }}>© 2026 CoachPro by MoovX</p>
      </footer>
    </div>
  )
}
