'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Dumbbell, Flame, Activity, Trophy } from 'lucide-react'
import { useTranslations } from 'next-intl'

gsap.registerPlugin(ScrollTrigger)

export default function TrainingSection() {
  const t = useTranslations('training')
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
  const planRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)

  const PPL_DAYS = [
    { day: t('day1'), focus: t('focus1'), muscles: t('muscles1') },
    { day: t('day2'), focus: t('focus2'), muscles: t('muscles2') },
    { day: t('day3'), focus: t('focus3'), muscles: t('muscles3') },
    { day: t('day4'), focus: t('focus4'), muscles: t('muscles4') },
    { day: t('day5'), focus: t('focus5'), muscles: t('muscles5') },
    { day: t('day6'), focus: t('focus6'), muscles: t('muscles6') },
  ]

  const FEATURES = [
    { icon: Dumbbell, value: t('stat1_value'), label: t('stat1_label') },
    { icon: Activity, value: t('stat2_value'), label: t('stat2_label') },
    { icon: Flame,    value: t('stat3_value'), label: t('stat3_label') },
    { icon: Trophy,   value: t('stat4_value'), label: t('stat4_label') },
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

      gsap.fromTo([eyebrowRef.current, headlineRef.current, ledeRef.current, planRef.current, statsRef.current, ctaRef.current],
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
    <section ref={sectionRef} id="training" style={{
      position: 'relative',
      background: '#0D0B08',
      color: '#fff',
      padding: 'clamp(80px, 12vw, 120px) 0',
      overflow: 'hidden',
    }}>
      {/* Radial accent (left side — opposite from Nutrition) */}
      <div style={{
        position: 'absolute',
        top: '30%', left: '-10%',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(212,168,67,0.06), transparent 60%)',
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

        {/* LEFT : Image + data cards */}
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
          }}>
            <Image
              src="/images/new/runner-mountains.png"
              alt={t('image_alt')}
              fill
              quality={85}
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.5) 100%)',
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
            padding: '16px 20px',
            borderRadius: 4,
            zIndex: 3,
          }}>
            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}>
              {t('data_session_label')}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              color: 'var(--gold)',
              lineHeight: 1, letterSpacing: 1,
            }}>
              {t('data_session_value')}
            </div>
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.5)',
              marginTop: 6, letterSpacing: 0.5,
            }}>
              {t('data_session_detail')}
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
          }}>
            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 6,
              textTransform: 'uppercase',
            }}>
              {t('data_streak_label')}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 32, color: 'var(--gold)',
                lineHeight: 1, letterSpacing: 1,
              }}>{t('data_streak_value')}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{t('data_streak_unit')}</span>
            </div>
          </div>
        </div>

        {/* RIGHT : Text */}
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
            maxWidth: 480, marginBottom: 40, fontWeight: 300,
          }}>
            {t('lede')}
          </p>

          {/* PPL Week table */}
          <div ref={planRef} style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4,
            marginBottom: 40,
            overflow: 'hidden',
          }}>
            {PPL_DAYS.map((d, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '60px 100px 1fr',
                gap: 16,
                padding: '14px 20px',
                borderBottom: i < PPL_DAYS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                alignItems: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,168,67,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
                  fontSize: 10, letterSpacing: 2,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                }}>
                  {d.day}
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14, letterSpacing: 2,
                  color: 'var(--gold)',
                  textTransform: 'uppercase',
                }}>
                  {d.focus}
                </span>
                <span style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.55)',
                }}>
                  {d.muscles}
                </span>
              </div>
            ))}
          </div>

          {/* Mini stats row */}
          <div ref={statsRef} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 24,
            marginBottom: 40,
          }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i}>
                  <Icon size={18} strokeWidth={1.5} style={{ color: 'var(--gold)', marginBottom: 8 }} />
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 28, color: '#fff',
                    lineHeight: 1, letterSpacing: 1,
                  }}>
                    {f.value}
                  </div>
                  <div style={{
                    fontSize: 10, color: 'rgba(255,255,255,0.5)',
                    letterSpacing: 1, marginTop: 4,
                    textTransform: 'uppercase',
                  }}>
                    {f.label}
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
      </div>
    </section>
  )
}
