'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { useReveal, useCounter } from './shared'
import { colors } from '../../../lib/design-tokens'

function StatItem({ target, label, first }: { target: number; label: string; first?: boolean }) {
  const { ref, value } = useCounter(target)
  return (
    <div
      ref={ref}
      style={{
        padding: '24px 0',
        borderBottom: '1px solid var(--text-dim)',
        borderTop: first ? '1px solid var(--text-dim)' : undefined,
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 52,
          color: 'var(--gold)',
          lineHeight: 1,
          minWidth: 80,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'var(--text-muted)',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          lineHeight: 1.4,
        }}
        dangerouslySetInnerHTML={{ __html: label }}
      />
    </div>
  )
}

export default function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const eyebrow = useReveal()
  const title = useReveal()
  const sub = useReveal()
  const desc = useReveal()
  const btns = useReveal()
  const trust = useReveal()
  const stats = useReveal()

  useEffect(() => {
    if (!titleRef.current) return

    // Helper : split chaque mot en spans de lettres
    const lines = titleRef.current.querySelectorAll('.split-line')
    const allChars: HTMLElement[] = []

    lines.forEach(line => {
      const text = line.textContent || ''
      line.innerHTML = ''
      for (const char of text) {
        const span = document.createElement('span')
        span.textContent = char === ' ' ? '\u00a0' : char
        span.style.display = 'inline-block'
        span.style.willChange = 'transform, opacity'
        line.appendChild(span)
        allChars.push(span)
      }
    })

    // Animation GSAP : chaque lettre apparait avec stagger
    gsap.fromTo(allChars,
      {
        opacity: 0,
        y: 60,
        rotateX: -90,
      },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.8,
        stagger: 0.04,
        ease: 'power3.out',
        delay: 0.2,
      }
    )

    // Cleanup
    return () => {
      gsap.killTweensOf(allChars)
    }
  }, [])

  const revealStyle = (visible: boolean, delay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(48px)',
    transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  })

  return (
    <>
      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        @keyframes phoneFloat {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-12px) rotate(-2deg); }
        }
        @keyframes phonePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes notchGlow {
          0%, 100% { box-shadow: 0 0 6px ${colors.goldDim}; }
          50% { box-shadow: 0 0 6px ${colors.goldRule}; }
        }
        .hero-section {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 380px;
          background: var(--bg);
        }
        .hero-stats-col {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 80px 40px 80px 24px;
          gap: 0;
        }
        .hero-diag-line {
          position: absolute;
          top: 0;
          right: 380px;
          width: 2px;
          height: 100%;
          background: linear-gradient(to bottom, transparent 0%, var(--gold) 30%, var(--gold) 70%, transparent 100%);
          opacity: 0.4;
        }
        .hero-phone-mockup {
          position: absolute;
          right: 120px;
          top: 50%;
          transform: translateY(-50%) rotate(-2deg);
          z-index: 5;
          width: 220px;
          height: 440px;
          border-radius: 36px;
          background: #0a0a0a;
          border: 2px solid ${colors.goldRule};
          box-shadow:
            0 0 0 1px ${colors.goldDim},
            0 30px 80px rgba(0,0,0,0.6),
            0 10px 30px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.04);
          overflow: hidden;
          animation: phoneFloat 4s ease-in-out infinite;
          pointer-events: none;
        }
        .hero-phone-notch {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 24px;
          background: #000;
          border-radius: 0 0 14px 14px;
          z-index: 2;
          animation: notchGlow 3s ease-in-out infinite;
        }
        .hero-phone-notch::after {
          content: '';
          position: absolute;
          top: 8px;
          right: 16px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: radial-gradient(circle, ${colors.goldRule} 0%, ${colors.goldDim} 60%, transparent 100%);
        }
        .hero-phone-screen {
          position: absolute;
          inset: 8px;
          border-radius: 28px;
          overflow: hidden;
          background: linear-gradient(160deg, #0c0b09 0%, #111010 40%, #0d0c0a 100%);
        }
        .hero-phone-screen-header {
          padding: 40px 18px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hero-phone-screen-logo {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--gold) 0%, #8b6914 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 11px;
          color: #0D0B08;
          font-weight: 900;
          letter-spacing: -0.5px;
        }
        .hero-phone-screen-title {
          font-family: var(--font-alt);
          font-size: 10px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .hero-phone-screen-bar {
          margin: 0 18px 10px;
          height: 4px;
          border-radius: 2px;
          background: ${colors.goldBorder};
          overflow: hidden;
        }
        .hero-phone-screen-bar-fill {
          height: 100%;
          width: 68%;
          border-radius: 2px;
          background: linear-gradient(90deg, var(--gold), #d4a843);
          animation: phonePulse 2.5s ease-in-out infinite;
        }
        .hero-phone-screen-card {
          margin: 0 14px 8px;
          padding: 12px 14px;
          border-radius: 12px;
          background: ${colors.goldDim};
          border: 1px solid ${colors.goldDim};
        }
        .hero-phone-screen-card-label {
          font-family: var(--font-body);
          font-size: 8px;
          color: var(--text-dim);
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .hero-phone-screen-card-value {
          font-family: var(--font-display);
          font-size: 22px;
          color: var(--gold);
          line-height: 1;
        }
        .hero-phone-screen-card-unit {
          font-family: var(--font-body);
          font-size: 9px;
          color: var(--text-muted);
          margin-left: 4px;
        }
        .hero-phone-screen-rows {
          margin: 6px 14px 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .hero-phone-screen-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.02);
        }
        .hero-phone-screen-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold);
          opacity: 0.6;
        }
        .hero-phone-screen-line {
          flex: 1;
          height: 3px;
          border-radius: 2px;
          background: rgba(255,255,255,0.06);
        }
        .hero-phone-screen-line-short {
          width: 30%;
          height: 3px;
          border-radius: 2px;
          background: ${colors.goldBorder};
        }
        .hero-phone-home {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.15);
        }
        .hero-bottom-divider {
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 80px;
          z-index: 4;
          clip-path: polygon(0 40%, 100% 0%, 100% 100%, 0% 100%);
          background: linear-gradient(90deg, ${colors.goldDim} 0%, ${colors.goldDim} 50%, transparent 100%);
          pointer-events: none;
        }
        .hero-bottom-divider::after {
          content: '';
          position: absolute;
          top: 40%;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, ${colors.goldRule} 0%, ${colors.goldDim} 60%, transparent 100%);
          transform: rotate(-1.5deg);
          transform-origin: top right;
        }
        @media (max-width: 1024px) {
          .hero-section {
            grid-template-columns: 1fr !important;
          }
          .hero-stats-col {
            display: none !important;
          }
          .hero-diag-line {
            display: none !important;
          }
          .hero-phone-mockup {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .hero-content-col {
            padding: 100px 24px 60px !important;
          }
        }
      `}</style>

      <div className="hero-section" id="hero">
        {/* Background image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80')",
            backgroundSize: 'cover',
            backgroundPosition: '60% center',
            opacity: 0.12,
            filter: 'grayscale(100%) contrast(1.2)',
          }}
        />

        {/* Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(105deg, #050505 40%, rgba(5,5,5,0.6) 65%, rgba(5,5,5,0.2) 100%)',
          }}
        />

        {/* Ghost text */}
        <div
          style={{
            position: 'absolute',
            bottom: '-0.05em',
            left: '-0.02em',
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(160px, 22vw, 320px)',
            color: colors.goldDim,
            letterSpacing: -2,
            lineHeight: 1,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          MOOVX
        </div>

        {/* Diagonal gold line */}
        <div className="hero-diag-line" />

        {/* Floating phone mockup */}
        <div className="hero-phone-mockup">
          <div className="hero-phone-notch" />
          <div className="hero-phone-screen">
            <div className="hero-phone-screen-header">
              <div className="hero-phone-screen-logo">M</div>
              <div className="hero-phone-screen-title">MoovX</div>
            </div>
            <div className="hero-phone-screen-bar">
              <div className="hero-phone-screen-bar-fill" />
            </div>
            <div className="hero-phone-screen-card">
              <div className="hero-phone-screen-card-label">Calories</div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="hero-phone-screen-card-value">1 847</span>
                <span className="hero-phone-screen-card-unit">/ 2 400 kcal</span>
              </div>
            </div>
            <div className="hero-phone-screen-card">
              <div className="hero-phone-screen-card-label">Workout</div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="hero-phone-screen-card-value">Push</span>
                <span className="hero-phone-screen-card-unit">Day A</span>
              </div>
            </div>
            <div className="hero-phone-screen-rows">
              <div className="hero-phone-screen-row">
                <div className="hero-phone-screen-dot" />
                <div className="hero-phone-screen-line" />
                <div className="hero-phone-screen-line-short" />
              </div>
              <div className="hero-phone-screen-row">
                <div className="hero-phone-screen-dot" />
                <div className="hero-phone-screen-line" />
                <div className="hero-phone-screen-line-short" />
              </div>
              <div className="hero-phone-screen-row">
                <div className="hero-phone-screen-dot" />
                <div className="hero-phone-screen-line" />
                <div className="hero-phone-screen-line-short" />
              </div>
            </div>
          </div>
          <div className="hero-phone-home" />
        </div>

        {/* Left: Content */}
        <div
          className="hero-content-col"
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '80px 60px 80px 64px',
          }}
        >
          {/* Eyebrow */}
          <div ref={eyebrow.ref} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, ...revealStyle(eyebrow.visible) }}>
            <span
              style={{
                display: 'inline-flex',
                fontFamily: 'var(--font-alt)',
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: 2,
                color: 'var(--gold)',
                background: 'var(--gold-dim)',
                border: '1px solid var(--gold-rule)',
                padding: '5px 14px',
                textTransform: 'uppercase',
              }}
            >
              {'\ud83c\udde8\ud83c\udded'} Swiss Made
            </span>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: 'var(--gold-rule)' }} />
          </div>

          {/* Title */}
          <h1
            ref={titleRef}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(72px, 8.5vw, 120px)',
              lineHeight: 0.92,
              letterSpacing: 2,
              color: 'var(--text)',
              marginBottom: 8,
              perspective: '600px',
            }}
          >
            <span className="split-line" style={{ display: 'block' }}>TRANSFORME</span>
            <span className="split-line" style={{ display: 'block', color: 'var(--gold)' }}>TON CORPS</span>
          </h1>

          {/* Subtitle */}
          <p
            ref={sub.ref}
            style={{
              fontFamily: 'var(--font-alt)',
              fontWeight: 900,
              fontSize: 'clamp(18px, 2.2vw, 28px)',
              letterSpacing: 8,
              color: 'var(--text-muted)',
              marginBottom: 32,
              textTransform: 'uppercase',
              ...revealStyle(sub.visible, 0.16),
            }}
          >
            DÉPASSE TES LIMITES
          </p>

          {/* Description */}
          <div ref={desc.ref} style={revealStyle(desc.visible, 0.24)}>
            <p
              style={{
                fontSize: 16,
                color: 'var(--text-muted)',
                lineHeight: 1.8,
                maxWidth: 520,
                marginBottom: 12,
                fontWeight: 300,
              }}
            >
              La première plateforme de coaching fitness suisse propulsée par des experts certifiés. Plans nutrition sur mesure, programme PPL 6 jours, scanner code-barres, recettes pro. Ton coach 24/7.
            </p>
            <p
              style={{
                fontFamily: 'var(--font-alt)',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 2,
                color: 'var(--gold)',
                marginBottom: 36,
                textTransform: 'uppercase',
              }}
            >
              Rejoins +1 200 utilisateurs &mdash; Dès CHF 10/mois
            </p>
          </div>

          {/* Buttons */}
          <div ref={btns.ref} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 48, ...revealStyle(btns.visible, 0.32) }}>
            <Link
              href="/register-client"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--gold)',
                color: '#0D0B08',
                fontFamily: 'var(--font-alt)',
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: 1.5,
                padding: '14px 36px',
                border: 'none',
                cursor: 'none',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',

                textDecoration: 'none',
              }}
            >
              Commencer &mdash; 10 jours gratuits
            </Link>
            <a
              href="#resultats"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'transparent',
                color: 'var(--text)',
                fontFamily: 'var(--font-alt)',
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: 1.5,
                padding: '13px 36px',
                border: '1px solid var(--gold-rule)',
                cursor: 'none',
                transition: 'all 0.3s',

                textDecoration: 'none',
              }}
            >
              Découvrir ↓
            </a>
          </div>

          {/* Trust line */}
          <p ref={trust.ref} style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: 0.5, ...revealStyle(trust.visible, 0.4) }}>
            <span style={{ color: 'var(--text-muted)' }}>{'\u2713'}</span> Sans engagement &nbsp;·&nbsp;
            <span style={{ color: 'var(--text-muted)' }}>{'\u2713'}</span> 10 jours gratuits &nbsp;·&nbsp;
            <span style={{ color: 'var(--text-muted)' }}>{'\u2713'}</span> 100% Swiss Made
          </p>
        </div>

        {/* Right: Stats */}
        <div
          ref={stats.ref}
          className="hero-stats-col"
          style={revealStyle(stats.visible, 0.16)}
        >
          <StatItem target={1200} label="Plans personnalisés<br/>générés" first />
          <StatItem target={163} label="Exercices<br/>guidés" />
          <StatItem target={170} label="Aliments<br/>fitness" />
          <StatItem target={22} label="Fonctionnal-<br/>ités" />

          {/* 24/7 - static, not animated */}
          <div
            style={{
              padding: '24px 0',
              borderBottom: '1px solid var(--text-dim)',
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 52,
                color: 'var(--gold)',
                lineHeight: 1,
                minWidth: 80,
              }}
            >
              24<span style={{ fontSize: '0.5em' }}>/7</span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--text-muted)',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                lineHeight: 1.4,
              }}
            >
              Coach personnel
              <br />
              disponible
            </div>
          </div>
        </div>

        {/* Angled section divider at bottom */}
        <div className="hero-bottom-divider" />

        {/* Scroll indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 64,
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation: 'bob 2.5s ease-in-out infinite',
          }}
        >
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
            <rect x="1" y="1" width="14" height="22" rx="7" stroke="#D4A843" strokeWidth="1.2" />
            <circle cx="8" cy="7" r="2.5" fill="#D4A843">
              <animate attributeName="cy" from="7" to="16" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </svg>
          <span
            style={{
              fontFamily: 'var(--font-alt)',
              fontSize: 11,
              letterSpacing: 3,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Scroll
          </span>
        </div>
      </div>
    </>
  )
}
