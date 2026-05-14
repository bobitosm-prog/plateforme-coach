'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { UserPlus, ScanLine, Dumbbell, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

gsap.registerPlugin(ScrollTrigger)

const STEP_ICONS = [UserPlus, ScanLine, Dumbbell, TrendingUp]
const STEP_NUMBERS = ['01', '02', '03', '04']

export default function Steps() {
  const t = useTranslations('steps')

  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)

  const steps = [1, 2, 3, 4].map(i => ({
    n: STEP_NUMBERS[i - 1],
    icon: STEP_ICONS[i - 1],
    title: t(`step${i}_title`),
    desc: t(`step${i}_desc`),
    detail: t(`step${i}_detail`),
  }))

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

      gsap.fromTo(stepsRef.current?.querySelectorAll('[data-step]') || [],
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: stepsRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.fromTo('.step-connector',
        { scaleX: 0 },
        {
          scaleX: 1, duration: 1.5, ease: 'power3.out',
          scrollTrigger: { trigger: stepsRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="how-it-works" style={{
      position: 'relative',
      background: '#0a0807',
      color: '#fff',
      padding: 'clamp(80px, 12vw, 120px) 0',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '10%', right: '-15%',
        width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(212,168,67,0.06), transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 clamp(20px, 5vw, 48px)',
        position: 'relative',
      }}>

        <div style={{ textAlign: 'center', marginBottom: 96 }}>
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
            {t('headline_line1')} <span style={{ color: 'var(--gold)' }}>{t('headline_line2')}</span>
          </h2>

          <p ref={ledeRef} style={{
            fontSize: 'clamp(14px, 1.5vw, 17px)', lineHeight: 1.6,
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 540,
            margin: '0 auto',
            fontWeight: 300,
          }}>
            {t('lede')}
          </p>
        </div>

        <div ref={stepsRef} style={{ position: 'relative' }}>
          <div className="step-connector" style={{
            position: 'absolute',
            top: 56,
            left: '12.5%', right: '12.5%',
            height: 1,
            background: 'linear-gradient(90deg, transparent 0%, var(--gold) 20%, var(--gold) 80%, transparent 100%)',
            transformOrigin: 'left center',
            zIndex: 1,
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'clamp(20px, 3vw, 32px)',
            position: 'relative',
            zIndex: 2,
          }}>
            {steps.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} data-step style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 112, height: 112,
                    margin: '0 auto 32px',
                    background: '#0a0807',
                    border: '1px solid rgba(212,168,67,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', top: 4, left: 4, width: 12, height: 12, borderTop: '1px solid var(--gold)', borderLeft: '1px solid var(--gold)' }} />
                    <div style={{ position: 'absolute', bottom: 4, right: 4, width: 12, height: 12, borderBottom: '1px solid var(--gold)', borderRight: '1px solid var(--gold)' }} />
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 56, color: 'var(--gold)',
                      letterSpacing: 2, lineHeight: 1,
                    }}>
                      {s.n}
                    </span>
                  </div>

                  <Icon size={22} strokeWidth={1.5} style={{ color: 'var(--gold)', marginBottom: 16 }} />

                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(18px, 1.8vw, 24px)',
                    letterSpacing: 1.5, color: '#fff',
                    textTransform: 'uppercase',
                    marginBottom: 16, lineHeight: 1.2,
                  }}>
                    {s.title}
                  </h3>

                  <p style={{
                    fontSize: 13, lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.65)',
                    marginBottom: 20, minHeight: 80,
                  }}>
                    {s.desc}
                  </p>

                  <div style={{
                    display: 'inline-block',
                    fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
                    fontSize: 10, letterSpacing: 2,
                    color: 'var(--gold)', textTransform: 'uppercase',
                    padding: '6px 12px',
                    border: '1px solid rgba(212,168,67,0.25)',
                    background: 'rgba(212,168,67,0.04)',
                  }}>
                    {s.detail}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
