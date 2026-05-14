'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Sparkles, MessageCircle, Zap, Brain } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const EXAMPLE_QUESTIONS = [
  '« Crée-moi un plan force 4 semaines »',
  '« Quels exos pour les épaules en hypertrophie ? »',
  '« Comment ajuster mes macros pour la prise de masse ? »',
  '« Je n\'ai pas d\'haltères, alternative pour les biceps ? »',
  '« Plan de récupération après séance jambes intense »',
]

const FEATURES = [
  { icon: Brain,         title: 'Compréhension contextuelle', desc: 'Analyse ton historique pour des conseils personnalisés' },
  { icon: MessageCircle, title: 'Disponible 24/7',           desc: 'Pose tes questions à n\'importe quelle heure' },
  { icon: Zap,           title: 'Réponses instantanées',     desc: 'Programmes, exercices, nutrition — en quelques secondes' },
  { icon: Sparkles,      title: 'Apprend de toi',            desc: 'S\'améliore au fil de tes interactions et préférences' },
]

export default function CoachIaSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
  const questionsRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(imageWrapRef.current,
        { opacity: 0, scale: 1.08 },
        {
          opacity: 1, scale: 1, duration: 1.4, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.fromTo([eyebrowRef.current, headlineRef.current, ledeRef.current, questionsRef.current, featuresRef.current, ctaRef.current],
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="coach-ia" style={{
      position: 'relative',
      background: '#0D0B08',
      color: '#fff',
      padding: 'clamp(80px, 12vw, 120px) 0',
      overflow: 'hidden',
    }}>
      {/* Background : neurones image dimmed */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.15,
        pointerEvents: 'none',
      }}>
        <Image
          src="/images/new/ai-neurons.png"
          alt=""
          fill
          quality={75}
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 0%, #0D0B08 70%)',
        }} />
      </div>

      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 clamp(20px, 5vw, 48px)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'clamp(40px, 6vw, 80px)',
        alignItems: 'center',
        position: 'relative',
        zIndex: 2,
      }}>

        {/* LEFT : iPhone Athena AI */}
        <div ref={imageWrapRef} style={{
          position: 'relative',
          aspectRatio: '4/5',
          width: '100%',
          order: 1,
          opacity: 0,
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid rgba(212,168,67,0.15)',
            background: '#000',
          }}>
            <Image
              src="/images/new/app-athena-ai.png"
              alt="Interface Coach IA Athena — plan force 4 semaines personnalisé"
              fill
              quality={85}
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>

          {/* Data card top-right : status */}
          <div style={{
            position: 'absolute',
            top: 24, right: -20,
            background: 'rgba(20,18,9,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,168,67,0.25)',
            padding: '14px 18px',
            borderRadius: 4,
            zIndex: 3,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              color: 'var(--gold)',
              textTransform: 'uppercase',
            }}>
              <span className="coach-ia-pulse" style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#34d399',
              }} />
              IA active
            </div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
              marginTop: 4,
            }}>
              Réponse en 2.4s
            </div>
          </div>

          {/* Data card bottom-left : interactions */}
          <div style={{
            position: 'absolute',
            bottom: 32, left: -16,
            background: 'rgba(20,18,9,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,168,67,0.25)',
            padding: '14px 18px',
            borderRadius: 4,
            zIndex: 3,
            minWidth: 170,
          }}>
            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 6,
              textTransform: 'uppercase',
            }}>
              Cette semaine
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28, color: 'var(--gold)',
              lineHeight: 1, letterSpacing: 1,
            }}>
              47 <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>questions</span>
            </div>
          </div>
        </div>

        {/* RIGHT : Text + example questions */}
        <div style={{ order: 2 }}>
          <div ref={eyebrowRef} style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
            fontSize: 11, letterSpacing: 3,
            color: 'var(--gold)',
            marginBottom: 32,
            textTransform: 'uppercase',
          }}>
            <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
            04 — Coach personnel
          </div>

          <h2 ref={headlineRef} style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 7vw, 120px)',
            lineHeight: 0.9,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            margin: '0 0 24px',
            color: '#fff',
          }}>
            Ton coach<br />
            <span style={{ color: 'var(--gold)' }}>24 / 7.</span>
          </h2>

          <p ref={ledeRef} style={{
            fontSize: 'clamp(14px, 1.5vw, 17px)', lineHeight: 1.6,
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 480, marginBottom: 36, fontWeight: 300,
          }}>
            Athena, ton coach IA propulsé par l'expertise de nos certifiés.
            Demande-lui n'importe quoi sur l'entraînement, la nutrition,
            la récupération.
          </p>

          {/* Example questions pills */}
          <div ref={questionsRef} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 40,
            maxWidth: 540,
          }}>
            {EXAMPLE_QUESTIONS.map((q, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: '2px solid var(--gold)',
                fontSize: 13,
                color: 'rgba(255,255,255,0.75)',
                fontStyle: 'italic',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(212,168,67,0.06)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
              }}
              >
                {q}
              </div>
            ))}
          </div>

          {/* Mini features grid */}
          <div ref={featuresRef} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
            marginBottom: 40,
          }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i}>
                  <Icon size={16} strokeWidth={1.5} style={{ color: 'var(--gold)', marginBottom: 8 }} />
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 14, letterSpacing: 1,
                    color: '#fff',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                  }}>
                    {f.title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1.5,
                  }}>
                    {f.desc}
                  </div>
                </div>
              )
            })}
          </div>

          <div ref={ctaRef}>
            <Link
              href="#pricing"
              style={{
                background: 'var(--gold)',
                color: 'var(--bg, #0D0B08)',
                padding: '16px 32px',
                fontFamily: 'var(--font-display)',
                fontSize: 14, letterSpacing: 3,
                textTransform: 'uppercase',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 12,
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
              Parler à Athena →
            </Link>
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        .coach-ia-pulse {
          animation: coachIaPulse 2s infinite;
        }
        @keyframes coachIaPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </section>
  )
}
