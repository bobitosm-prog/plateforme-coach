'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Shield, Lock, Globe, Sparkles } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const VALUES = [
  { icon: Shield,    title: 'RGPD',                desc: 'Conformité européenne stricte' },
  { icon: Lock,      title: 'Hébergement Suisse',  desc: 'Datacenters en Suisse, chiffrés' },
  { icon: Globe,     title: 'Multilingue',         desc: 'FR · DE · EN — bientôt IT' },
  { icon: Sparkles,  title: 'Premium standard',    desc: 'Qualité Swiss-made dans chaque détail' },
]

export default function GenevaSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
  const valuesRef = useRef<HTMLDivElement>(null)
  const coordsRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(imageRef.current,
        { scale: 1.15 },
        {
          scale: 1, duration: 2, ease: 'power2.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 90%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.fromTo([eyebrowRef.current, headlineRef.current, ledeRef.current, valuesRef.current, coordsRef.current],
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="geneva" style={{
      position: 'relative',
      minHeight: '100vh',
      color: '#fff',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
    }}>
      {/* Full-bleed Geneva image */}
      <div ref={imageRef} style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
      }}>
        <Image
          src="/images/new/geneva-sunset.png"
          alt="Genève au coucher de soleil — Jet d'Eau, Lac Léman, Mont-Blanc"
          fill
          quality={90}
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
      </div>

      {/* Dark gradient overlay vertical */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(13,11,8,0.85) 0%, rgba(13,11,8,0.4) 40%, rgba(13,11,8,0.85) 100%)',
        zIndex: 1,
      }} />

      {/* Side gradients */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, rgba(13,11,8,0.6) 0%, transparent 30%, transparent 70%, rgba(13,11,8,0.6) 100%)',
        zIndex: 1,
      }} />

      <div style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: 1400,
        margin: '0 auto',
        padding: 'clamp(80px, 12vw, 120px) clamp(20px, 5vw, 48px)',
        width: '100%',
        textAlign: 'center',
      }}>

        <div ref={eyebrowRef} style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
          fontSize: 11, letterSpacing: 4,
          color: 'var(--gold)',
          marginBottom: 40,
          textTransform: 'uppercase',
        }}>
          <span style={{ width: 40, height: 1, background: 'var(--gold)' }} />
          Conçu en Suisse
          <span style={{ width: 40, height: 1, background: 'var(--gold)' }} />
        </div>

        <h2 ref={headlineRef} style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(56px, 10vw, 180px)',
          lineHeight: 0.9,
          letterSpacing: '-0.01em',
          textTransform: 'uppercase',
          margin: '0 0 32px',
          color: '#fff',
        }}>
          Genève.<br />
          <span style={{ color: 'var(--gold)' }}>L'excellence</span><br />
          par défaut.
        </h2>

        <p ref={ledeRef} style={{
          fontSize: 'clamp(15px, 1.5vw, 18px)', lineHeight: 1.7,
          color: 'rgba(255,255,255,0.85)',
          maxWidth: 720,
          margin: '0 auto 64px',
          fontWeight: 300,
          letterSpacing: 0.2,
        }}>
          MoovX est conçu et hébergé à Genève. Une plateforme suisse,
          taillée pour les standards les plus exigeants : confidentialité
          radicale, qualité dans chaque pixel, support en 3 langues.
        </p>

        {/* 4 values grid */}
        <div ref={valuesRef} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'clamp(16px, 3vw, 32px)',
          maxWidth: 1000,
          margin: '0 auto 80px',
        }}>
          {VALUES.map((v, i) => {
            const Icon = v.icon
            return (
              <div key={i} style={{
                textAlign: 'center',
                padding: 24,
                background: 'rgba(13,11,8,0.6)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(212,168,67,0.2)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--gold)'
                e.currentTarget.style.background = 'rgba(212,168,67,0.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(212,168,67,0.2)'
                e.currentTarget.style.background = 'rgba(13,11,8,0.6)'
              }}
              >
                <Icon size={28} strokeWidth={1.5} style={{ color: 'var(--gold)', marginBottom: 16 }} />
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 16, letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#fff',
                  marginBottom: 6,
                }}>
                  {v.title}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: 1.5,
                }}>
                  {v.desc}
                </div>
              </div>
            )
          })}
        </div>

        {/* GPS coordinates */}
        <div ref={coordsRef} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'clamp(12px, 2vw, 24px)',
          padding: '12px 24px',
          background: 'rgba(13,11,8,0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
          fontSize: 11,
          letterSpacing: 2,
          color: 'rgba(255,255,255,0.7)',
          textTransform: 'uppercase',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <span style={{ color: 'var(--gold)' }}>46.2044° N · 6.1432° E</span>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)' }} />
          <span>Geneva · Switzerland</span>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ color: 'var(--gold)' }}>v2.4.1</span>
        </div>
      </div>
    </section>
  )
}
