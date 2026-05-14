'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Award, UserCheck, Video, Target } from 'lucide-react'
import { useTranslations } from 'next-intl'

gsap.registerPlugin(ScrollTrigger)

export default function CoachingPro() {
  const t = useTranslations('coachingPro')
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
  const specsRef = useRef<HTMLDivElement>(null)
  const credentialsRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)

  const COACH_SPECS = [
    { icon: Award, title: t('spec1_title'), desc: t('spec1_desc') },
    { icon: UserCheck, title: t('spec2_title'), desc: t('spec2_desc') },
    { icon: Video, title: t('spec3_title'), desc: t('spec3_desc') },
    { icon: Target, title: t('spec4_title'), desc: t('spec4_desc') },
  ]

  const CREDENTIALS = [
    t('credential1'),
    t('credential2'),
    t('credential3'),
    t('credential4'),
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
      gsap.fromTo([eyebrowRef.current, headlineRef.current, ledeRef.current, specsRef.current, credentialsRef.current, ctaRef.current],
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
    <section ref={sectionRef} id="coaching-pro" style={{
      position: 'relative',
      background: '#0D0B08',
      color: '#fff',
      padding: 'clamp(80px, 12vw, 120px) 0',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '20%', left: '-10%',
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
            <span style={{ color: 'var(--gold)' }}>{t('headline_line2')}</span><br />
            {t('headline_line3')}
          </h2>

          <p ref={ledeRef} style={{
            fontSize: 'clamp(14px, 1.5vw, 17px)', lineHeight: 1.6,
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 480, marginBottom: 48, fontWeight: 300,
          }}>
            {t('lede')}
          </p>

          {/* 4 specs grid 2x2 */}
          <div ref={specsRef} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 20,
            marginBottom: 40,
          }}>
            {COACH_SPECS.map((s, i) => {
              const Icon = s.icon
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
                    {s.title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1.5,
                  }}>
                    {s.desc}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Credentials tags */}
          <div ref={credentialsRef} style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 40,
          }}>
            {CREDENTIALS.map((c, i) => (
              <span key={i} style={{
                fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
                fontSize: 10,
                letterSpacing: 2,
                color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase',
                padding: '6px 12px',
                border: '1px solid rgba(212,168,67,0.3)',
                background: 'rgba(212,168,67,0.04)',
              }}>
                {c}
              </span>
            ))}
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
              src="/images/new/coach-tablet.png"
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

          {/* Data card top-right */}
          <div style={{
            position: 'absolute',
            top: 24, right: -20,
            background: 'rgba(20,18,9,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,168,67,0.25)',
            padding: '14px 18px',
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
              {t('data_next_label')}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20, color: '#fff',
              lineHeight: 1.2, letterSpacing: 0.5,
            }}>
              {t('data_next_day')}
            </div>
            <div style={{
              fontSize: 11, color: 'var(--gold)',
              marginTop: 4, letterSpacing: 0.5,
            }}>
              {t('data_next_detail')}
            </div>
          </div>

          {/* Data card bottom-left */}
          <div style={{
            position: 'absolute',
            bottom: 32, left: -16,
            background: 'rgba(20,18,9,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,168,67,0.25)',
            padding: '14px 18px',
            borderRadius: 4,
            zIndex: 3,
            minWidth: 180,
          }}>
            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              color: 'var(--gold)',
              marginBottom: 6,
              textTransform: 'uppercase',
            }}>
              {t('data_coach_label')}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18, color: '#fff',
              letterSpacing: 1, marginBottom: 2,
            }}>
              {t('data_coach_name')}
            </div>
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.5)',
            }}>
              {t('data_coach_xp')}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
