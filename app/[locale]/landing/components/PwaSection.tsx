'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Apple, Smartphone, Zap } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const IOS_STEPS = [
  { n: '01', title: 'Ouvre Safari', detail: 'app.moovx.ch' },
  { n: '02', title: 'Bouton Partager', detail: 'icône en bas de Safari' },
  { n: '03', title: 'Sur l\'écran d\'accueil', detail: 'Tap pour confirmer' },
]

const ANDROID_STEPS = [
  { n: '01', title: 'Ouvre Chrome', detail: 'app.moovx.ch' },
  { n: '02', title: 'Menu ⋮', detail: '3 points en haut à droite' },
  { n: '03', title: 'Installer l\'application', detail: 'Confirme l\'installation' },
]

function StepCard({ steps, platform, icon: Icon, subtitle }: {
  steps: typeof IOS_STEPS
  platform: string
  icon: typeof Apple
  subtitle: string
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(212,168,67,0.2)',
      padding: 'clamp(24px, 4vw, 40px)',
      position: 'relative',
      transition: 'border-color 0.3s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(212,168,67,0.2)'}
    >
      {/* Platform header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 32, paddingBottom: 24,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          width: 56, height: 56,
          background: 'rgba(212,168,67,0.08)',
          border: '1px solid rgba(212,168,67,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={26} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32, letterSpacing: 1.5,
            color: '#fff', textTransform: 'uppercase',
            lineHeight: 1, marginBottom: 6,
          }}>
            {platform}
          </div>
          <div style={{
            fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
            fontSize: 10, letterSpacing: 2,
            color: 'var(--gold)', textTransform: 'uppercase',
          }}>
            {subtitle}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: 16,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
          }}>
            {/* Number with corners */}
            <div style={{
              width: 44, height: 44,
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(212,168,67,0.06)',
              border: '1px solid rgba(212,168,67,0.3)',
              flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 2, left: 2,
                width: 6, height: 6,
                borderTop: '1px solid var(--gold)',
                borderLeft: '1px solid var(--gold)',
              }} />
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 6, height: 6,
                borderBottom: '1px solid var(--gold)',
                borderRight: '1px solid var(--gold)',
              }} />
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18, color: 'var(--gold)',
                letterSpacing: 1,
              }}>
                {s.n}
              </span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14, letterSpacing: 1,
                color: '#fff', textTransform: 'uppercase',
                marginBottom: 2,
              }}>
                {s.title}
              </div>
              <div style={{
                fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
                fontSize: 10, letterSpacing: 1,
                color: 'rgba(255,255,255,0.5)',
              }}>
                {s.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PWASection() {
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
  const iosRef = useRef<HTMLDivElement>(null)
  const androidRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)

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

      gsap.fromTo([iosRef.current, androidRef.current],
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: iosRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.fromTo(featuresRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: featuresRef.current, start: 'top 90%', toggleActions: 'play none none reverse' },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="install" style={{
      position: 'relative',
      background: '#0a0807',
      color: '#fff',
      padding: 'clamp(80px, 12vw, 120px) 0',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        bottom: '10%', right: '-10%',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(212,168,67,0.05), transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 clamp(20px, 5vw, 48px)',
        position: 'relative',
      }}>

        {/* Header */}
        <div style={{ marginBottom: 80, maxWidth: 800 }}>
          <div ref={eyebrowRef} style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            fontFamily: 'var(--font-alt), "Barlow Condensed", monospace',
            fontSize: 11, letterSpacing: 3,
            color: 'var(--gold)',
            marginBottom: 32,
            textTransform: 'uppercase',
          }}>
            <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
            Application · PWA
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
            Installe MoovX<br />
            <span style={{ color: 'var(--gold)' }}>en 30 secondes.</span>
          </h2>

          <p ref={ledeRef} style={{
            fontSize: 'clamp(14px, 1.5vw, 17px)', lineHeight: 1.6,
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 540,
            fontWeight: 300,
          }}>
            Pas besoin d'App Store. Installation directe depuis ton navigateur,
            comme une vraie app native.
          </p>
        </div>

        {/* 2 platform cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 32,
          marginBottom: 48,
        }}>
          <div ref={iosRef} style={{ opacity: 0 }}>
            <StepCard
              steps={IOS_STEPS}
              platform="iPhone"
              icon={Apple}
              subtitle="Safari uniquement"
            />
          </div>
          <div ref={androidRef} style={{ opacity: 0 }}>
            <StepCard
              steps={ANDROID_STEPS}
              platform="Android"
              icon={Smartphone}
              subtitle="Chrome ou Edge"
            />
          </div>
        </div>

        {/* Features bar */}
        <div ref={featuresRef} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 24,
          padding: 'clamp(20px, 3vw, 32px) clamp(24px, 4vw, 40px)',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          opacity: 0,
        }}>
          {[
            { label: 'Hors-ligne', detail: 'Fonctionne sans connexion' },
            { label: 'Notifications', detail: 'Rappels personnalisés' },
            { label: 'Mises à jour auto', detail: 'Toujours dernière version' },
            { label: 'Léger', detail: 'Moins de 3 MB · pas d\'espace' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Zap size={16} strokeWidth={2} style={{
                color: 'var(--gold)', marginTop: 4, flexShrink: 0,
              }} />
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13, letterSpacing: 1.5,
                  color: '#fff', textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  {f.label}
                </div>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.5)',
                  lineHeight: 1.4,
                }}>
                  {f.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
