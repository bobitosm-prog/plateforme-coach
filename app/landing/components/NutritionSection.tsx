'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Calendar, ScanLine, Apple, ChefHat } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const FEATURES = [
  {
    icon: Calendar,
    title: 'Plans sur 7 jours',
    desc: 'Générés par nos experts certifiés, adaptés à tes macros exacts',
  },
  {
    icon: ScanLine,
    title: 'Scanner code-barres',
    desc: 'Identifie chaque produit suisse en un instant',
  },
  {
    icon: Apple,
    title: '170 aliments suisses',
    desc: 'Base de données spécifique au marché helvétique',
  },
  {
    icon: ChefHat,
    title: 'Recettes pro',
    desc: 'Sélection complète de recettes fitness équilibrées',
  },
]

export default function NutritionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
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
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      gsap.fromTo([
          eyebrowRef.current,
          headlineRef.current,
          ledeRef.current,
          featuresRef.current,
          ctaRef.current,
        ],
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="nutrition" style={{
      position: 'relative',
      background: '#0a0807',
      color: '#fff',
      padding: 'clamp(80px, 12vw, 120px) 0',
      overflow: 'hidden',
    }}>
      {/* Subtle radial accent */}
      <div style={{
        position: 'absolute',
        top: '20%', right: '-10%',
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

        {/* LEFT : Text */}
        <div>
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
          }}>
            <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
            01 — Nutrition
          </div>

          {/* Headline */}
          <h2 ref={headlineRef} style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 7vw, 120px)',
            lineHeight: 0.9,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            margin: '0 0 24px',
            color: '#fff',
          }}>
            Alimentation<br />
            <span style={{ color: 'var(--gold)' }}>sur mesure</span>
          </h2>

          {/* Lede */}
          <p ref={ledeRef} style={{
            fontSize: 'clamp(14px, 1.5vw, 17px)',
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 480,
            marginBottom: 48,
            fontWeight: 300,
          }}>
            Plans sur 7 jours générés par nos experts certifiés, adaptés à tes
            macros exacts. Scanne ton frigo, on crée ton plan.
          </p>

          {/* Features grid */}
          <div ref={featuresRef} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
            marginBottom: 48,
          }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  style={{
                    padding: '20px 0',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    transition: 'border-color 0.3s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderTopColor = 'var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.borderTopColor = 'rgba(255,255,255,0.08)'}
                >
                  <Icon
                    size={20}
                    style={{ color: 'var(--gold)', marginBottom: 12 }}
                    strokeWidth={1.5}
                  />
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 18,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: '#fff',
                    marginBottom: 6,
                  }}>
                    {f.title}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.55)',
                    lineHeight: 1.5,
                  }}>
                    {f.desc}
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA */}
          <div ref={ctaRef}>
            <Link
              href="#pricing"
              style={{
                background: 'var(--gold)',
                color: 'var(--bg, #0D0B08)',
                padding: '16px 32px',
                fontFamily: 'var(--font-display)',
                fontSize: 14,
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
                e.currentTarget.style.transform = 'translate(-2px, -2px)'
                e.currentTarget.style.boxShadow = '4px 4px 0 #B8902F'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translate(0, 0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Découvrir les plans →
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
          {/* Image bowl */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid rgba(212,168,67,0.15)',
          }}>
            <Image
              src="/images/new/nutrition-bowl.png"
              alt="Bowl saumon avocat brocolis quinoa — exemple de plan nutrition MoovX"
              fill
              quality={85}
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover' }}
            />
            {/* Subtle gradient overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, transparent 60%, rgba(0,0,0,0.4) 100%)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Data card top-left */}
          <div style={{
            position: 'absolute',
            top: 24, left: -16,
            background: 'rgba(20,18,9,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,168,67,0.25)',
            padding: '16px 20px',
            borderRadius: 4,
            minWidth: 180,
            zIndex: 3,
          }}>
            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10,
              letterSpacing: 2,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}>
              Bowl du jour
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              color: 'var(--gold)',
              lineHeight: 1,
              letterSpacing: 1,
            }}>
              1 247 <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>kcal</span>
            </div>
          </div>

          {/* Data card bottom-right */}
          <div style={{
            position: 'absolute',
            bottom: 32, right: -20,
            background: 'rgba(20,18,9,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,168,67,0.25)',
            padding: '14px 18px',
            borderRadius: 4,
            zIndex: 3,
          }}>
            <div style={{
              fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
              fontSize: 10,
              letterSpacing: 2,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 8,
              textTransform: 'uppercase',
            }}>
              Macros
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Macro label="P" value="142g" />
              <Macro label="G" value="80g" />
              <Macro label="L" value="65g" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--gold)',
        fontSize: 18,
        letterSpacing: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 2,
        marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  )
}
