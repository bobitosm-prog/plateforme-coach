'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Check, Sparkles, Crown } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const CLIENT_FEATURES = [
  'Plans nutrition illimités',
  'Programme PPL 6 jours',
  'Scanner code-barres + recettes',
  'Coach IA Athena 24/7',
  'Analytics & suivi complet',
  'Photos avant/après privées',
]

const CLIENT_PLANS = [
  { price: 'CHF 10', period: '/mois', label: 'Mensuel', popular: false },
  { price: 'CHF 80', period: '/an', label: 'Annuel', popular: true, save: '−33%' },
  { price: 'CHF 150', period: 'à vie', label: 'Lifetime', popular: false },
]

const COACH_FEATURES = [
  'Dashboard de gestion clients illimité',
  'Plans nutrition personnalisés',
  'Visio 1-to-1 intégrée',
  'Paiements directs via Stripe',
  'Programmes personnalisés',
  'Analytics business mensuelles',
]

export default function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
  const clientCardRef = useRef<HTMLDivElement>(null)
  const coachCardRef = useRef<HTMLDivElement>(null)
  const guaranteeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo([eyebrowRef.current, headlineRef.current, ledeRef.current],
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.fromTo([clientCardRef.current, coachCardRef.current],
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: clientCardRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.fromTo(guaranteeRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: guaranteeRef.current, start: 'top 90%', toggleActions: 'play none none reverse' },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="pricing" style={{
      position: 'relative',
      background: '#0D0B08',
      color: '#fff',
      padding: 'clamp(80px, 12vw, 120px) 0',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '20%', left: '-15%',
        width: 800, height: 800,
        background: 'radial-gradient(circle, rgba(212,168,67,0.06), transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 clamp(20px, 5vw, 48px)',
        position: 'relative',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <div ref={eyebrowRef} style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
            fontSize: 11, letterSpacing: 3,
            color: 'var(--gold)',
            marginBottom: 32,
            textTransform: 'uppercase',
          }}>
            <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
            Transparence totale
            <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
          </div>

          <h2 ref={headlineRef} style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 8vw, 140px)',
            lineHeight: 0.9,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            margin: '0 0 24px',
            color: '#fff',
          }}>
            Un modèle<br />
            <span style={{ color: 'var(--gold)' }}>transparent.</span>
          </h2>

          <p ref={ledeRef} style={{
            fontSize: 'clamp(14px, 1.5vw, 17px)', lineHeight: 1.6,
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 540,
            margin: '0 auto',
            fontWeight: 300,
          }}>
            Zéro surprise. Zéro frais cachés. Tu sais exactement ce que tu paies.
          </p>
        </div>

        {/* Two cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 32,
          marginBottom: 64,
        }}>

          {/* CLIENT CARD */}
          <div ref={clientCardRef} style={{
            position: 'relative',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(212,168,67,0.2)',
            padding: 'clamp(28px, 4vw, 48px)',
            opacity: 0,
          }}>
            <div style={{
              position: 'absolute',
              top: -1, right: 32,
              background: 'var(--gold)',
              color: '#0D0B08',
              padding: '6px 16px',
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>
              Recommandé
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Sparkles size={20} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
              <div style={{
                fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
                fontSize: 11, letterSpacing: 3,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
              }}>
                Pour les clients
              </div>
            </div>

            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 4vw, 56px)',
              letterSpacing: 1,
              color: '#fff',
              textTransform: 'uppercase',
              margin: '0 0 16px',
              lineHeight: 1,
            }}>
              Accès complet
            </h3>

            <p style={{
              fontSize: 14, color: 'rgba(255,255,255,0.65)',
              marginBottom: 32, lineHeight: 1.6,
            }}>
              Sans coach : abonnement direct.<br />
              <span style={{ color: 'var(--gold)' }}>Avec coach invité : accès gratuit.</span>
            </p>

            {/* 3 price pills */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 32,
            }}>
              {CLIENT_PLANS.map((p, i) => (
                <div key={i} style={{
                  padding: 16,
                  border: p.popular
                    ? '1px solid var(--gold)'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: p.popular ? 'rgba(212,168,67,0.08)' : 'transparent',
                  textAlign: 'center',
                  position: 'relative',
                }}>
                  {p.save && (
                    <div style={{
                      position: 'absolute',
                      top: -10, left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#34d399',
                      color: '#0D0B08',
                      fontSize: 9, letterSpacing: 1,
                      padding: '2px 8px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
                    }}>
                      {p.save}
                    </div>
                  )}
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22, color: p.popular ? 'var(--gold)' : '#fff',
                    letterSpacing: 1, lineHeight: 1, marginBottom: 6,
                  }}>
                    {p.price}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>
                    {p.period}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
                    fontSize: 9, letterSpacing: 2,
                    color: p.popular ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
                    marginTop: 8, textTransform: 'uppercase',
                  }}>
                    {p.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Features */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'grid', gap: 12 }}>
              {CLIENT_FEATURES.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                  <Check size={16} strokeWidth={2.5} style={{ color: 'var(--gold)', marginTop: 3, flexShrink: 0 }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/register-client"
              style={{
                display: 'block',
                background: 'var(--gold)', color: '#0D0B08',
                padding: '16px 24px',
                fontFamily: 'var(--font-display)',
                fontSize: 14, letterSpacing: 3,
                textTransform: 'uppercase', textDecoration: 'none',
                fontWeight: 700, textAlign: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translate(-2px, -2px)'
                e.currentTarget.style.boxShadow = '4px 4px 0 #B8902F'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translate(0, 0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Commencer — 14 jours gratuits
            </Link>
          </div>

          {/* COACH CARD */}
          <div ref={coachCardRef} style={{
            position: 'relative',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(212,168,67,0.2)',
            padding: 'clamp(28px, 4vw, 48px)',
            opacity: 0,
          }}>
            <div style={{
              position: 'absolute',
              top: -1, right: 32,
              background: 'rgba(212,168,67,0.15)',
              color: 'var(--gold)',
              padding: '6px 16px',
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              fontWeight: 700,
              border: '1px solid var(--gold)',
              textTransform: 'uppercase',
            }}>
              Pro
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Crown size={20} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
              <div style={{
                fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
                fontSize: 11, letterSpacing: 3,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
              }}>
                Pour les coachs
              </div>
            </div>

            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 4vw, 56px)',
              letterSpacing: 1, color: '#fff',
              textTransform: 'uppercase',
              margin: '0 0 16px', lineHeight: 1,
            }}>
              Coach Pro
            </h3>

            <p style={{
              fontSize: 14, color: 'rgba(255,255,255,0.65)',
              marginBottom: 32, lineHeight: 1.6,
            }}>
              Tu fixes ton propre tarif. Tes clients paient directement via Stripe.
            </p>

            {/* Big price + split */}
            <div style={{
              padding: 32,
              background: 'rgba(212,168,67,0.06)',
              border: '1px solid rgba(212,168,67,0.2)',
              textAlign: 'center',
              marginBottom: 32,
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(40px, 6vw, 80px)',
                color: 'var(--gold)',
                letterSpacing: 1, lineHeight: 1,
              }}>
                CHF 50
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 8 }}>
                /mois · Abonnement Coach Pro
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                gap: 20, marginTop: 24, paddingTop: 24,
                borderTop: '1px solid rgba(212,168,67,0.2)',
              }}>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 32, color: '#34d399', lineHeight: 1,
                  }}>
                    97<span style={{ fontSize: 18 }}>%</span>
                  </div>
                  <div style={{
                    fontSize: 10, letterSpacing: 2,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 6, textTransform: 'uppercase',
                  }}>
                    Pour toi
                  </div>
                </div>
                <div style={{ alignSelf: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 20 }}>+</div>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 32, color: 'var(--gold)', lineHeight: 1,
                  }}>
                    3<span style={{ fontSize: 18 }}>%</span>
                  </div>
                  <div style={{
                    fontSize: 10, letterSpacing: 2,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 6, textTransform: 'uppercase',
                  }}>
                    Commission MoovX
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'grid', gap: 12 }}>
              {COACH_FEATURES.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                  <Check size={16} strokeWidth={2.5} style={{ color: 'var(--gold)', marginTop: 3, flexShrink: 0 }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/onboarding-coach"
              style={{
                display: 'block',
                background: 'transparent', color: '#fff',
                padding: '16px 24px',
                fontFamily: 'var(--font-display)',
                fontSize: 14, letterSpacing: 3,
                textTransform: 'uppercase', textDecoration: 'none',
                fontWeight: 700, textAlign: 'center',
                border: '1px solid var(--gold)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--gold)'
                e.currentTarget.style.color = '#0D0B08'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#fff'
              }}
            >
              Devenir Coach Pro
            </Link>
          </div>
        </div>

        {/* Guarantee footer */}
        <div ref={guaranteeRef} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(16px, 3vw, 32px)',
          flexWrap: 'wrap',
          padding: '24px 32px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
          opacity: 0,
        }}>
          {[
            { label: 'Sans engagement', detail: 'Annule quand tu veux' },
            { label: '14 jours d\'essai', detail: '100% gratuit, sans CB' },
            { label: 'Paiement sécurisé', detail: 'Stripe · Twint · CB' },
            { label: 'RGPD Suisse', detail: 'Données hébergées en CH' },
          ].map((g, i) => (
            <div key={i} style={{ textAlign: 'center', flex: '1 1 auto', minWidth: 140 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14, letterSpacing: 1.5,
                color: 'var(--gold)',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                {g.label}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>
                {g.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
