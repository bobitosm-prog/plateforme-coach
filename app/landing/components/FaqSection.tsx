'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Plus, MessageCircle } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const FAQS = [
  {
    q: 'C\'est quoi MoovX ?',
    a: 'MoovX est une plateforme suisse complète qui combine programme d\'entraînement personnalisé, nutrition adaptée, coach IA Athena disponible 24/7, et suivi humain par des coachs certifiés. Conçue et hébergée à Genève, elle s\'adresse aux athlètes amateurs, sportifs débutants et professionnels du coaching.',
  },
  {
    q: 'Comment fonctionne la nutrition experte ?',
    a: 'Tu scannes ton frigo ou tes codes-barres alimentaires. Notre IA Athena analyse tes ingrédients disponibles, ton historique nutritionnel, et tes macros cibles pour générer des recettes personnalisées en temps réel. Plus de 500 recettes adaptables, suivi des micronutriments, et alertes intelligentes.',
  },
  {
    q: 'Le scanner code-barres fonctionne comment ?',
    a: 'Active la caméra de ton téléphone, vise le code-barres. En moins d\'une seconde, l\'app reconnaît le produit (base de données de 2.5M références), affiche les macros et micronutriments, et le suggère pour tes prochains repas selon tes objectifs. Fonctionne sur tous les produits avec EAN-13.',
  },
  {
    q: 'C\'est quoi le programme PPL ?',
    a: 'PPL = Push / Pull / Legs. C\'est une méthode d\'entraînement éprouvée organisée sur 6 jours : 2 séances Push (pecs, épaules, triceps), 2 séances Pull (dos, biceps), 2 séances Legs (jambes complètes). 163 exercices guidés en vidéo, adaptables selon ton niveau et ton équipement.',
  },
  {
    q: 'Mes données sont sécurisées ?',
    a: 'Oui. Tes données sont hébergées en Suisse sur des serveurs conformes nLPD (équivalent suisse RGPD), chiffrées de bout en bout en AES-256. Aucune donnée n\'est revendue ni partagée avec des tiers. Tu peux exporter ou supprimer tes données à tout moment depuis ton profil.',
  },
  {
    q: 'Je peux essayer gratuitement ?',
    a: '14 jours d\'essai 100% gratuit, sans carte bancaire, sans engagement. Tu accèdes à toutes les fonctionnalités : programmes, nutrition, scanner, Athena IA, analytics. Si MoovX te plaît, tu choisis ton abonnement. Sinon, ton compte se désactive automatiquement.',
  },
]

function FaqItem({ q, a, isOpen, onToggle, index }: {
  q: string; a: string; isOpen: boolean; onToggle: () => void; index: number
}) {
  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      transition: 'all 0.3s',
    }}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: 'clamp(20px, 3vw, 32px) 0',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(12px, 2vw, 24px)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.3s',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
          fontSize: 11, letterSpacing: 2,
          color: isOpen ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
          minWidth: 32,
          transition: 'color 0.3s',
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>

        <span style={{
          flex: 1,
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(18px, 2vw, 28px)',
          letterSpacing: 0.5,
          color: isOpen ? '#fff' : 'rgba(255,255,255,0.85)',
          textTransform: 'uppercase',
          lineHeight: 1.2,
          transition: 'color 0.3s',
        }}>
          {q}
        </span>

        <div style={{
          width: 40, height: 40,
          border: `1px solid ${isOpen ? 'var(--gold)' : 'rgba(255,255,255,0.2)'}`,
          background: isOpen ? 'var(--gold)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s',
          flexShrink: 0,
        }}>
          <Plus
            size={18}
            strokeWidth={2}
            style={{
              color: isOpen ? '#0D0B08' : 'var(--gold)',
              transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
          />
        </div>
      </button>

      <div style={{
        overflow: 'hidden',
        maxHeight: isOpen ? '500px' : '0px',
        opacity: isOpen ? 1 : 0,
        transition: 'max-height 0.4s ease, opacity 0.3s ease',
      }}>
        <div style={{
          paddingLeft: 'clamp(44px, 5vw, 56px)',
          paddingRight: 'clamp(48px, 6vw, 64px)',
          paddingBottom: 32,
          fontSize: 15,
          lineHeight: 1.7,
          color: 'rgba(255,255,255,0.7)',
          maxWidth: 800,
        }}>
          {a}
        </div>
      </div>
    </div>
  )
}

export default function FaqSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const accordionRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  const [openIndex, setOpenIndex] = useState<number | null>(0)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo([eyebrowRef.current, headlineRef.current],
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.fromTo(accordionRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: accordionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.fromTo(ctaRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: ctaRef.current, start: 'top 90%', toggleActions: 'play none none reverse' },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="faq" style={{
      position: 'relative',
      background: '#0D0B08',
      color: '#fff',
      padding: 'clamp(80px, 12vw, 120px) 0',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '15%', left: '-10%',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(212,168,67,0.05), transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 clamp(20px, 5vw, 48px)',
        position: 'relative',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div ref={eyebrowRef} style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
            fontSize: 11, letterSpacing: 3,
            color: 'var(--gold)',
            marginBottom: 32,
            textTransform: 'uppercase',
          }}>
            <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
            Questions fréquentes
            <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
          </div>

          <h2 ref={headlineRef} style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 6vw, 100px)',
            lineHeight: 0.95,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            margin: 0,
            color: '#fff',
          }}>
            Tout ce que tu<br />
            <span style={{ color: 'var(--gold)' }}>dois savoir.</span>
          </h2>
        </div>

        {/* Accordion */}
        <div ref={accordionRef} style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 64,
          opacity: 0,
        }}>
          {FAQS.map((f, i) => (
            <FaqItem
              key={i}
              q={f.q}
              a={f.a}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              index={i}
            />
          ))}
        </div>

        {/* CTA Contact */}
        <div ref={ctaRef} style={{
          padding: 'clamp(24px, 4vw, 40px) clamp(24px, 4vw, 48px)',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(212,168,67,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
          flexWrap: 'wrap',
          opacity: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 56, height: 56,
              background: 'rgba(212,168,67,0.08)',
              border: '1px solid rgba(212,168,67,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <MessageCircle size={24} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20, letterSpacing: 1,
                color: '#fff', textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                Une autre question ?
              </div>
              <div style={{
                fontSize: 13, color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.5,
              }}>
                Notre équipe répond en moins de 2h en semaine.
              </div>
            </div>
          </div>

          <Link
            href="mailto:hello@moovx.ch"
            style={{
              background: 'var(--gold)',
              color: '#0D0B08',
              padding: '14px 28px',
              fontFamily: 'var(--font-display)',
              fontSize: 13, letterSpacing: 2.5,
              textTransform: 'uppercase',
              textDecoration: 'none',
              fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 10,
              transition: 'all 0.2s',
              flexShrink: 0,
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
            Contacter le support
          </Link>
        </div>
      </div>
    </section>
  )
}
