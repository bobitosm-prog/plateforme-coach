import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import HeroStats from './HeroStats'
import HeroAnimation from './HeroAnimation'

export default async function Hero() {
  const t = await getTranslations('hero')

  const STATS = [
    { value: 163,  suffix: '',  label: t('stat_exercises') },
    { value: 170,  suffix: '',  label: t('stat_foods') },
    { value: 24,   suffix: '/7', label: t('stat_coach') },
  ]

  const marqueeItems = t('marquee').split(' • ')

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      overflow: 'hidden',
      background: '#000',
      color: '#fff',
    }}>
      {/* Background image — CSS fade-in for LCP, GSAP handles parallax via HeroAnimation */}
      <style>{`
        @keyframes heroFadeIn { from { opacity: 0; transform: scale(1.08); } to { opacity: 1; transform: scale(1); } }
        .hero-bg-container { animation: heroFadeIn 1.2s ease-out 0.1s both; }
        @keyframes heroContentIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .hero-content-animate { animation: heroContentIn 0.8s ease-out 0.4s both; }
        .hero-content-animate-delay { animation: heroContentIn 0.8s ease-out 0.6s both; }
        .hero-content-animate-delay2 { animation: heroContentIn 0.8s ease-out 0.8s both; }
      `}</style>
      <div className="hero-bg-container" style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        willChange: 'transform',
      }}>
        <Image
          src="/images/new/hero-chalk.png"
          alt={t('hero_alt')}
          fill
          priority
          fetchPriority="high"
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

      {/* Meta corner */}
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
        <div>v2.8.0</div>
      </div>

      {/* Main content — SSR'd, visible immediately in HTML */}
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
        <div className="hero-content-animate" style={{
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
          {t('eyebrow')}
        </div>

        {/* Headline */}
        <h1 className="hero-content-animate" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(64px, 14vw, 240px)',
          lineHeight: 0.85,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          margin: 0,
          marginBottom: 32,
        }}>
          <span style={{ display: 'block', color: '#fff' }}>
            {t('headline_line1')}
          </span>
          <span style={{
            display: 'block',
            color: 'var(--gold)',
            paddingLeft: 'clamp(24px, 8vw, 160px)',
          }}>
            {t('headline_line2')}
          </span>
        </h1>

        {/* Subtitle + description */}
        <div className="hero-content-animate-delay" style={{ maxWidth: 560, marginBottom: 48 }}>
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
        <div className="hero-content-animate-delay" style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          marginBottom: 64,
          flexWrap: 'wrap',
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
        <div className="hero-content-animate-delay2" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'clamp(20px, 3vw, 40px)',
          paddingTop: 32,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 880,
        }}>
          <HeroStats stats={STATS} />
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

      {/* Client-only: scroll parallax */}
      <HeroAnimation />
    </section>
  )
}
