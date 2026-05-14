'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Star, Quote } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const TESTIMONIALS = [
  {
    initials: 'TM',
    name: 'Thomas M.',
    location: 'Plainpalais',
    age: 34,
    program: 'Hypertrophie · 6 mois',
    stars: 5,
    quote: 'En 6 mois, j\'ai gagné 7 kg de muscle sec. Le programme PPL et les conseils nutrition d\'Athena ont tout changé. Je n\'ai jamais été aussi constant.',
    metric: { value: '+7kg', label: 'masse maigre' },
  },
  {
    initials: 'LB',
    name: 'Léa B.',
    location: 'Pâquis',
    age: 28,
    program: 'Perte de poids · 4 mois',
    stars: 5,
    quote: 'Les recettes fitness sont incroyables. Adaptées à mes macros, avec les ingrédients que j\'ai déjà. Jamais été aussi constante dans ma diète.',
    metric: { value: '-9kg', label: 'sur 4 mois' },
  },
  {
    initials: 'AR',
    name: 'Alexandre R.',
    location: 'Carouge',
    age: 41,
    program: 'Remise en forme · 3 mois',
    stars: 5,
    quote: 'À 41 ans, je pensais qu\'il était trop tard. Mon coach Alexandre a tout adapté à ma vie de famille. Aujourd\'hui je cours 10K sans m\'arrêter.',
    metric: { value: '10K', label: 'sans s\'arrêter' },
  },
]

export default function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const medalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(medalRef.current,
        { opacity: 0, scale: 0.85, rotate: -8 },
        {
          opacity: 1, scale: 1, rotate: 0, duration: 1.4, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.fromTo([eyebrowRef.current, headlineRef.current],
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.fromTo(cardsRef.current?.children || [],
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: cardsRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="testimonials" style={{
      position: 'relative',
      background: '#0D0B08',
      color: '#fff',
      padding: 'clamp(80px, 12vw, 120px) 0',
      overflow: 'hidden',
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 clamp(20px, 5vw, 48px)',
        position: 'relative',
      }}>

        {/* Header with medal on right */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: 'clamp(32px, 5vw, 64px)',
          alignItems: 'center',
          marginBottom: 80,
        }}>
          <div>
            <div ref={eyebrowRef} style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 11, letterSpacing: 3,
              color: 'var(--gold)',
              marginBottom: 32,
              textTransform: 'uppercase',
            }}>
              <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
              Témoignages
            </div>

            <h2 ref={headlineRef} style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(48px, 7vw, 120px)',
              lineHeight: 0.9,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              margin: 0,
              color: '#fff',
            }}>
              Ils ont<br />
              <span style={{ color: 'var(--gold)' }}>transformé</span><br />
              leur corps.
            </h2>
          </div>

          {/* Medal image */}
          <div ref={medalRef} style={{
            position: 'relative',
            aspectRatio: '1/1',
            width: '100%',
            maxWidth: 360,
            marginLeft: 'auto',
            opacity: 0,
          }}>
            <Image
              src="/images/new/medal-gold.png"
              alt="Médaille MoovX — Discipline, Dedication, Transformation"
              fill
              quality={85}
              sizes="(max-width: 768px) 60vw, 360px"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* 3 testimonials grid */}
        <div ref={cardsRef} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}>
          {TESTIMONIALS.map((t, i) => (
            <article key={i} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(212,168,67,0.15)',
              padding: 'clamp(20px, 3vw, 32px)',
              position: 'relative',
              transition: 'all 0.3s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--gold)'
              e.currentTarget.style.background = 'rgba(212,168,67,0.04)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(212,168,67,0.15)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
            }}
            >
              <Quote size={28} strokeWidth={1} style={{
                color: 'var(--gold)',
                opacity: 0.4,
                marginBottom: 16,
              }} />

              {/* Stars */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                marginBottom: 20,
              }}>
                {[...Array(t.stars)].map((_, j) => (
                  <Star key={j} size={14} fill="var(--gold)" stroke="var(--gold)" />
                ))}
              </div>

              {/* Quote */}
              <p style={{
                fontSize: 14, lineHeight: 1.6,
                color: 'rgba(255,255,255,0.85)',
                fontStyle: 'italic',
                marginBottom: 28,
                minHeight: 130,
              }}>
                « {t.quote} »
              </p>

              {/* Author */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{
                  width: 44, height: 44,
                  background: 'rgba(212,168,67,0.15)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  letterSpacing: 1,
                  color: 'var(--gold)',
                  flexShrink: 0,
                }}>
                  {t.initials}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 14,
                    letterSpacing: 1,
                    color: '#fff',
                    textTransform: 'uppercase',
                  }}>
                    {t.name}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 2,
                  }}>
                    {t.age} ans · {t.location}
                  </div>
                </div>

                {/* Metric */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 20,
                    color: 'var(--gold)',
                    letterSpacing: 0.5,
                    lineHeight: 1,
                  }}>
                    {t.metric.value}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 4,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>
                    {t.metric.label}
                  </div>
                </div>
              </div>

              {/* Program tag */}
              <div style={{
                marginTop: 16,
                fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
                fontSize: 10,
                color: 'rgba(212,168,67,0.7)',
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}>
                {t.program}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
