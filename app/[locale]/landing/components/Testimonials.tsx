'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Star, Quote } from 'lucide-react'
import { useTranslations } from 'next-intl'

gsap.registerPlugin(ScrollTrigger)

export default function Testimonials() {
  const t = useTranslations('testimonials')
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const medalRef = useRef<HTMLDivElement>(null)

  const TESTIMONIALS = [
    {
      initials: 'TM',
      name: t('card1_name'),
      location: t('card1_location'),
      age: t('card1_age'),
      program: t('card1_program'),
      stars: 5,
      quote: t('card1_quote'),
      metric: { value: t('card1_metric_value'), label: t('card1_metric_label') },
    },
    {
      initials: 'LB',
      name: t('card2_name'),
      location: t('card2_location'),
      age: t('card2_age'),
      program: t('card2_program'),
      stars: 5,
      quote: t('card2_quote'),
      metric: { value: t('card2_metric_value'), label: t('card2_metric_label') },
    },
    {
      initials: 'AR',
      name: t('card3_name'),
      location: t('card3_location'),
      age: t('card3_age'),
      program: t('card3_program'),
      stars: 5,
      quote: t('card3_quote'),
      metric: { value: t('card3_metric_value'), label: t('card3_metric_label') },
    },
  ]

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
              {t('eyebrow')}
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
              {t('headline_line1')}<br />
              <span style={{ color: 'var(--gold)' }}>{t('headline_line2')}</span><br />
              {t('headline_line3')}
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
              alt={t('medal_alt')}
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
          {TESTIMONIALS.map((item, i) => (
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
                {[...Array(item.stars)].map((_, j) => (
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
                {item.quote}
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
                  {item.initials}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 14,
                    letterSpacing: 1,
                    color: '#fff',
                    textTransform: 'uppercase',
                  }}>
                    {item.name}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 2,
                  }}>
                    {item.age} · {item.location}
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
                    {item.metric.value}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 4,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>
                    {item.metric.label}
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
                {item.program}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
