'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import gsap from 'gsap'
import { useTranslations } from 'next-intl'
import { useCounter } from './shared'

function HeroStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, value: count } = useCounter(value, 1800)
  return (
    <div ref={ref}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(36px, 5vw, 56px)',
        color: 'var(--gold)',
        lineHeight: 1,
        letterSpacing: 1,
      }}>
        {count}{suffix}
      </div>
      <div style={{
        marginTop: 8,
        fontSize: 11,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: 2,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  )
}

export default function Hero() {
  const t = useTranslations('hero')

  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const subRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)

  const STATS = [
    { value: 1200, suffix: '+', label: t('stat_users') },
    { value: 163,  suffix: '',  label: t('stat_exercises') },
    { value: 170,  suffix: '',  label: t('stat_foods') },
    { value: 24,   suffix: '/7', label: t('stat_coach') },
  ]

  const marqueeItems = t('marquee').split(' • ')

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(bgRef.current,
      { opacity: 0, scale: 1.08 },
      { opacity: 1, scale: 1, duration: 1.6 }
    )
    .fromTo(eyebrowRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.6 },
      '-=1.1'
    )
    .fromTo(headlineRef.current?.querySelectorAll('.hero-line') ?? [],
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 },
      '-=0.5'
    )
    .fromTo([subRef.current, ctaRef.current],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 },
      '-=0.6'
    )
    .fromTo(statsRef.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.6 },
      '-=0.3'
    )

    const onScroll = () => {
      if (!bgRef.current) return
      const y = window.scrollY * 0.3
      bgRef.current.style.transform = `translate3d(0, ${y}px, 0) scale(1.05)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      overflow: 'hidden',
      background: '#000',
      color: '#fff',
    }}>
      {/* Background image full-bleed */}
      <div ref={bgRef} style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        willChange: 'transform',
        opacity: 0,
      }}>
        <Image
          src="/images/new/hero-chalk.png"
          alt={t('hero_alt')}
          fill
          priority
          fetchPriority="high"
          quality={85}
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
        />
      </div>

      {/* Atmospheric overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        background: `
          linear-gradient(180deg,
            rgba(0,0,0,0.55) 0%,
            rgba(0,0,0,0.40) 35%,
            rgba(0,0,0,0.65) 80%,
            rgba(0,0,0,0.95) 100%
          ),
          radial-gradient(ellipse at 70% 30%,
            rgba(212,168,67,0.10),
            transparent 50%
          )
        `,
        pointerEvents: 'none',
      }} />

      {/* Grain texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 3,
        opacity: 0.04,
        pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '160px',
      }} />

      {/* Meta corner (top right) */}
      <div style={{
        position: 'absolute',
        top: 32, right: 48,
        zIndex: 10,
        textAlign: 'right',
        fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
        fontSize: 10,
        letterSpacing: 2,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 2,
      }}>
        <div style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
          <span className="hero-pulse-dot" style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--gold)',
          }} />
          {t('meta_status')}
        </div>
        <div>{t('meta_location')}</div>
        <div>v2.4.1</div>
      </div>

      {/* Main content */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        maxWidth: 1400,
        margin: '0 auto',
        padding: 'clamp(140px, 20vh, 200px) clamp(20px, 5vw, 48px) 60px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>

        {/* Eyebrow */}
        <div ref={eyebrowRef} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
          fontSize: 11,
          letterSpacing: 3,
          color: 'var(--gold)',
          marginBottom: 32,
          textTransform: 'uppercase',
          opacity: 0,
        }}>
          <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
          {t('eyebrow')}
        </div>

        {/* Massive headline */}
        <h1 ref={headlineRef} style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(64px, 14vw, 240px)',
          lineHeight: 0.85,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          margin: 0,
          marginBottom: 32,
        }}>
          <span className="hero-line" style={{ display: 'block', color: '#fff', opacity: 0 }}>
            {t('headline_line1')}
          </span>
          <span className="hero-line" style={{
            display: 'block',
            color: 'var(--gold)',
            paddingLeft: 'clamp(24px, 8vw, 160px)',
            opacity: 0,
          }}>
            {t('headline_line2')}
          </span>
        </h1>

        {/* Tagline + body */}
        <div ref={subRef} style={{ maxWidth: 560, marginBottom: 48, opacity: 0 }}>
          <span style={{
            display: 'block',
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(18px, 2.5vw, 24px)',
            letterSpacing: 2,
            color: 'var(--gold)',
            marginBottom: 16,
            textTransform: 'uppercase',
          }}>
            {t('subtitle')}
          </span>
          <span style={{
            fontSize: 'clamp(14px, 1.5vw, 17px)',
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.75)',
            fontWeight: 300,
          }}>
            {t('description')}
          </span>
        </div>

        {/* CTAs */}
        <div ref={ctaRef} style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          marginBottom: 64,
          flexWrap: 'wrap',
          opacity: 0,
        }}>
          <Link
            href="/register-client"
            style={{
              background: 'var(--gold)',
              color: 'var(--bg, #0D0B08)',
              padding: '20px 36px',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(13px, 1.2vw, 16px)',
              letterSpacing: 3,
              textTransform: 'uppercase',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#E6C364'
              e.currentTarget.style.transform = 'translate(-2px, -2px)'
              e.currentTarget.style.boxShadow = '4px 4px 0 #B8902F'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--gold)'
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {t('cta_primary')}
          </Link>

          <a
            href="#features"
            style={{
              color: '#fff',
              padding: '19px 24px',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(13px, 1.2vw, 16px)',
              letterSpacing: 3,
              textTransform: 'uppercase',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--gold)'
              e.currentTarget.style.color = 'var(--gold)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
              e.currentTarget.style.color = '#fff'
            }}
          >
            {t('cta_secondary')}
          </a>

          <span style={{
            marginLeft: 12,
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: 1,
          }}>
            {t('trust')}
          </span>
        </div>

        {/* Stats bar */}
        <div ref={statsRef} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'clamp(20px, 3vw, 40px)',
          paddingTop: 32,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 880,
          opacity: 0,
        }}>
          {STATS.map((s, i) => (
            <HeroStat key={i} {...s} />
          ))}
        </div>
      </div>

      {/* Bottom marquee */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        zIndex: 6,
        padding: '18px 0',
        background: 'rgba(0,0,0,0.6)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <div className="hero-marquee" style={{
          display: 'flex',
          gap: 48,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          letterSpacing: 4,
          color: 'rgba(255,255,255,0.4)',
        }}>
          {[0, 1].map(k => (
            <div key={k} style={{ display: 'flex', gap: 48 }}>
              {marqueeItems.map((item, i) => (
                <span key={i}>
                  {item}
                  {i < marqueeItems.length - 1 && <span style={{ color: 'var(--gold)', marginLeft: 48 }}>•</span>}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        .hero-pulse-dot {
          animation: heroPulseDot 2s infinite;
        }
        @keyframes heroPulseDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .hero-marquee {
          animation: heroMarquee 28s linear infinite;
        }
        @keyframes heroMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (max-width: 640px) {
          .hero-marquee { font-size: 11px !important; gap: 24px !important; }
        }
      `}</style>
    </section>
  )
}
