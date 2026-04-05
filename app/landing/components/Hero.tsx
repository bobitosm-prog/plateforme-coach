'use client'
import Link from 'next/link'
import { useReveal, useCounter } from './shared'

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
  const eyebrow = useReveal()
  const title = useReveal()
  const sub = useReveal()
  const desc = useReveal()
  const btns = useReveal()
  const trust = useReveal()
  const stats = useReveal()

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
          padding: 120px 40px 80px 24px;
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
            color: 'rgba(201,168,76,0.04)',
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

        {/* Left: Content */}
        <div
          className="hero-content-col"
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '120px 60px 80px 64px',
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
              {'\ud83c\udde8\ud83c\udded'} Swiss Made · Genève
            </span>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: 'var(--gold-rule)' }} />
          </div>

          {/* Title */}
          <h1
            ref={title.ref}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(72px, 8.5vw, 120px)',
              lineHeight: 0.92,
              letterSpacing: 2,
              color: 'var(--text)',
              marginBottom: 8,
              ...revealStyle(title.visible, 0.08),
            }}
          >
            TRANSFORME
            <br />
            <span style={{ color: 'var(--gold)', display: 'block' }}>TON CORPS</span>
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
              Rejoins +1 200 utilisateurs à Genève &mdash; Dès CHF 10/mois
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
                color: '#050505',
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
          <StatItem target={89} label="Exercices<br/>guidés" />
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
            <rect x="1" y="1" width="14" height="22" rx="7" stroke="#C9A84C" strokeWidth="1.2" />
            <circle cx="8" cy="7" r="2.5" fill="#C9A84C">
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
