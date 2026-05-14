'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useTranslations } from 'next-intl'

gsap.registerPlugin(ScrollTrigger)

function Counter({ target, suffix, duration = 1800 }: { target: number; suffix: string; duration?: number }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const triggered = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !triggered.current) {
        triggered.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const elapsed = now - start
          const p = Math.min(elapsed / duration, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setVal(Math.round(target * ease))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])

  return <span ref={ref}>{val.toLocaleString('fr-CH')}{suffix}</span>
}

export default function Results() {
  const t = useTranslations('results')
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const quoteRef = useRef<HTMLDivElement>(null)

  const STATS = [
    { value: 1200, suffix: '+', label: t('stat1_label'), detail: t('stat1_detail') },
    { value: 12,   suffix: '',  label: t('stat2_label'), detail: t('stat2_detail') },
    { value: 96,   suffix: '%', label: t('stat3_label'), detail: t('stat3_detail') },
    { value: 7,    suffix: 'kg', label: t('stat4_label'), detail: t('stat4_detail') },
  ]

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(imageWrapRef.current,
        { opacity: 0, scale: 1.08 },
        {
          opacity: 1, scale: 1, duration: 1.6, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' },
        }
      )
      gsap.fromTo([eyebrowRef.current, headlineRef.current, statsRef.current, quoteRef.current],
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="results" style={{
      position: 'relative',
      background: '#0a0807',
      color: '#fff',
      padding: 'clamp(80px, 12vw, 120px) 0',
      overflow: 'hidden',
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 clamp(20px, 5vw, 48px)',
      }}>

        {/* Header centered */}
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
            {t('eyebrow')}
            <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
          </div>

          <h2 ref={headlineRef} style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 8vw, 140px)',
            lineHeight: 0.9,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            margin: 0,
            color: '#fff',
          }}>
            {t('headline_line1')}<br />
            <span style={{ color: 'var(--gold)' }}>{t('headline_line2')}</span>
          </h2>
        </div>

        {/* Transformation image full-bleed */}
        <div ref={imageWrapRef} style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          marginBottom: 64,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid rgba(212,168,67,0.15)',
          opacity: 0,
        }}>
          <Image
            src="/images/new/transformation.png"
            alt={t('image_alt')}
            fill
            quality={88}
            sizes="(max-width: 1400px) 100vw, 1400px"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />

          {/* Label avant */}
          <div style={{
            position: 'absolute',
            top: 32, left: 32,
            background: 'rgba(20,18,9,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.15)',
            padding: '12px 20px',
            zIndex: 3,
          }}>
            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase',
            }}>
              {t('before_label')}
            </div>
            <div style={{ fontSize: 13, color: '#fff', marginTop: 4 }}>
              {t('before_date')}
            </div>
          </div>

          {/* Label après */}
          <div style={{
            position: 'absolute',
            top: 32, right: 32,
            background: 'rgba(212,168,67,0.92)',
            color: '#0D0B08',
            padding: '12px 20px',
            zIndex: 3,
          }}>
            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase',
              opacity: 0.7,
            }}>
              {t('after_label')}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
              {t('after_date')}
            </div>
          </div>

          {/* Center divider line */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: '50%',
            width: 1,
            background: 'rgba(212,168,67,0.4)',
            zIndex: 2,
          }} />

          {/* Quote bottom */}
          <div ref={quoteRef} style={{
            position: 'absolute',
            bottom: 32, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20,18,9,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,168,67,0.25)',
            padding: '16px 28px',
            maxWidth: 520,
            textAlign: 'center',
            zIndex: 3,
          }}>
            <div style={{
              fontStyle: 'italic',
              fontSize: 14,
              color: '#fff',
              lineHeight: 1.5,
              marginBottom: 8,
            }}>
              {t('quote')}
            </div>
            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10, letterSpacing: 2,
              color: 'var(--gold)',
              textTransform: 'uppercase',
            }}>
              {t('quote_author')}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div ref={statsRef} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'clamp(24px, 4vw, 48px)',
          paddingTop: 48,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              paddingLeft: i > 0 ? 'clamp(16px, 3vw, 32px)' : 0,
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(40px, 5vw, 80px)',
                color: 'var(--gold)',
                lineHeight: 1,
                letterSpacing: 1,
                marginBottom: 12,
              }}>
                <Counter target={s.value} suffix={s.suffix} />
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                color: '#fff',
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                {s.label}
              </div>
              <div style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: 0.5,
              }}>
                {s.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
