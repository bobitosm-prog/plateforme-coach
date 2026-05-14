'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TrendingUp, Camera, Trophy, Flame, Droplet, Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'

gsap.registerPlugin(ScrollTrigger)

export default function TrackingSection() {
  const t = useTranslations('tracking')
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)

  const FEATURES = [
    {
      icon: TrendingUp,
      title: t('feature1_title'),
      desc: t('feature1_desc'),
    },
    {
      icon: Camera,
      title: t('feature2_title'),
      desc: t('feature2_desc'),
    },
    {
      icon: Trophy,
      title: t('feature3_title'),
      desc: t('feature3_desc'),
    },
    {
      icon: Flame,
      title: t('feature4_title'),
      desc: t('feature4_desc'),
    },
    {
      icon: Droplet,
      title: t('feature5_title'),
      desc: t('feature5_desc'),
    },
    {
      icon: Shield,
      title: t('feature6_title'),
      desc: t('feature6_desc'),
    },
  ]

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

      gsap.fromTo([eyebrowRef.current, headlineRef.current, ledeRef.current, featuresRef.current, ctaRef.current],
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
    <section ref={sectionRef} id="tracking" style={{
      position: 'relative',
      background: '#0a0807',
      color: '#fff',
      padding: 'clamp(80px, 12vw, 120px) 0',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '15%', right: '-15%',
        width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(212,168,67,0.07), transparent 60%)',
        pointerEvents: 'none',
      }} />

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

        {/* LEFT : Text */}
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
            margin: '0 0 24px',
            color: '#fff',
          }}>
            {t('headline_line1')}<br />
            <span style={{ color: 'var(--gold)' }}>{t('headline_line2')}</span>
          </h2>

          <p ref={ledeRef} style={{
            fontSize: 'clamp(14px, 1.5vw, 17px)', lineHeight: 1.6,
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 480, marginBottom: 48, fontWeight: 300,
          }}>
            {t('lede')}
          </p>

          {/* 6 features in 2 columns */}
          <div ref={featuresRef} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 20,
            marginBottom: 48,
          }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  style={{
                    padding: '18px 0',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    transition: 'border-color 0.3s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderTopColor = 'var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.borderTopColor = 'rgba(255,255,255,0.08)'}
                >
                  <Icon size={18} strokeWidth={1.5} style={{ color: 'var(--gold)', marginBottom: 10 }} />
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 16, letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: '#fff',
                    marginBottom: 4,
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
              {t('cta')}
            </Link>
          </div>
        </div>

        {/* RIGHT : Image + data cards */}
        <div ref={imageWrapRef} style={{
          position: 'relative',
          aspectRatio: '4/5',
          width: '100%',
          opacity: 0,
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid rgba(212,168,67,0.15)',
          }}>
            <Image
              src="/images/new/dashboard-3d.png"
              alt={t('image_alt')}
              fill
              quality={85}
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, transparent 50%)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Data card top-left : strength */}
          <div style={{
            position: 'absolute',
            top: 24, left: -16,
            background: 'rgba(20,18,9,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,168,67,0.25)',
            padding: '16px 20px',
            borderRadius: 4,
            zIndex: 3,
            minWidth: 180,
          }}>
            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}>
              {t('data_strength_label')}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32, color: 'var(--gold)',
              lineHeight: 1, letterSpacing: 1,
            }}>
              {t('data_strength_value')}
            </div>
            <div style={{
              fontSize: 11, color: '#34d399',
              marginTop: 6, letterSpacing: 0.5,
            }}>
              {t('data_strength_trend')}
            </div>
          </div>

          {/* Data card bottom-right : recovery */}
          <div style={{
            position: 'absolute',
            bottom: 32, right: -20,
            background: 'rgba(20,18,9,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,168,67,0.25)',
            padding: '16px 20px',
            borderRadius: 4,
            zIndex: 3,
            minWidth: 170,
          }}>
            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}>
              {t('data_recovery_label')}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32, color: 'var(--gold)',
              lineHeight: 1, letterSpacing: 1,
            }}>
              {t('data_recovery_value')}
            </div>
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.5)',
              marginTop: 6, letterSpacing: 0.5,
            }}>
              {t('data_recovery_detail')}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
