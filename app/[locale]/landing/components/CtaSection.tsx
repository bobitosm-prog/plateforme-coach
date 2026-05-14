'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Star, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

gsap.registerPlugin(ScrollTrigger)

export default function CtaSection() {
  const t = useTranslations('cta')
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
  const ctasRef = useRef<HTMLDivElement>(null)
  const proofRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(imageRef.current,
        { scale: 1.15, opacity: 0 },
        {
          scale: 1, opacity: 1, duration: 2, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 90%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.fromTo([eyebrowRef.current, headlineRef.current, ledeRef.current, ctasRef.current, proofRef.current],
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="cta-final" style={{
      position: 'relative',
      minHeight: '100vh',
      color: '#fff',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
    }}>
      {/* Background full-bleed victory image */}
      <div ref={imageRef} style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        opacity: 0,
      }}>
        <Image
          src="/images/new/victory.png"
          alt={t('image_alt')}
          fill
          quality={90}
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
      </div>

      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          linear-gradient(180deg, rgba(13,11,8,0.75) 0%, rgba(13,11,8,0.5) 50%, rgba(13,11,8,0.95) 100%),
          radial-gradient(ellipse at 70% 50%, rgba(212,168,67,0.15) 0%, transparent 60%)
        `,
        zIndex: 1,
      }} />

      {/* Side fade for text readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, rgba(13,11,8,0.85) 0%, rgba(13,11,8,0.3) 50%, transparent 100%)',
        zIndex: 1,
      }} />

      <div style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: 1400,
        margin: '0 auto',
        padding: 'clamp(80px, 12vw, 120px) clamp(20px, 5vw, 48px)',
        width: '100%',
      }}>

        <div style={{ maxWidth: 800 }}>
          <div ref={eyebrowRef} style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
            fontSize: 11, letterSpacing: 4,
            color: 'var(--gold)',
            marginBottom: 40,
            textTransform: 'uppercase',
          }}>
            <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
            {t('eyebrow')}
          </div>

          <h2 ref={headlineRef} style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(52px, 9vw, 160px)',
            lineHeight: 0.9,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            margin: '0 0 32px',
            color: '#fff',
          }}>
            {t('headline_line1')}<br />
            <span style={{ color: 'var(--gold)' }}>{t('headline_line2')}</span><br />
            {t('headline_line3')}<br />
            {t('headline_line4')}
          </h2>

          <p ref={ledeRef} style={{
            fontSize: 'clamp(15px, 1.5vw, 19px)', lineHeight: 1.6,
            color: 'rgba(255,255,255,0.85)',
            maxWidth: 580,
            marginBottom: 56,
            fontWeight: 300,
          }}>
            {t('lede_part1')} <strong style={{ color: '#fff', fontWeight: 600 }}>
            {t('lede_part2')}</strong>
          </p>

          {/* Dual CTAs */}
          <div ref={ctasRef} style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 64,
          }}>
            <Link
              href="/register-client"
              style={{
                background: 'var(--gold)',
                color: 'var(--bg, #0D0B08)',
                padding: '20px 40px',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(13px, 1.2vw, 16px)', letterSpacing: 3,
                textTransform: 'uppercase',
                textDecoration: 'none',
                fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 12,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translate(-3px, -3px)'
                e.currentTarget.style.boxShadow = '6px 6px 0 #B8902F'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translate(0, 0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {t('primary_cta')}
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>

            <Link
              href="#pricing"
              style={{
                background: 'transparent',
                color: '#fff',
                padding: '20px 40px',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(13px, 1.2vw, 16px)', letterSpacing: 3,
                textTransform: 'uppercase',
                textDecoration: 'none',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'inline-flex', alignItems: 'center', gap: 12,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--gold)'
                e.currentTarget.style.color = 'var(--gold)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                e.currentTarget.style.color = '#fff'
              }}
            >
              {t('secondary_cta')}
            </Link>
          </div>

          {/* Social proof */}
          <div ref={proofRef} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(12px, 2vw, 24px)',
            flexWrap: 'wrap',
            paddingTop: 32,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <Star key={i} size={16} fill="var(--gold)" stroke="var(--gold)" />
              ))}
              <span style={{
                fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
                fontSize: 12, color: '#fff', marginLeft: 6, letterSpacing: 1,
              }}>
                {t('proof_rating')}
              </span>
            </div>

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />

            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 12, color: 'rgba(255,255,255,0.7)', letterSpacing: 1,
            }}>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{t('proof_count')}</span> {t('proof_count_label')}
            </div>

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />

            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 12, color: 'rgba(255,255,255,0.7)', letterSpacing: 1,
            }}>
              {t('proof_made')}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
