'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { colors } from '@/lib/design-tokens'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <style>{`
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 12px ${colors.goldRule}; }
          50% { box-shadow: 0 0 32px ${colors.goldRule}; }
        }
        @media (max-width: 640px) {
          .landing-nav { padding: 0 20px !important; }
          .landing-nav .nav-btn-ghost { padding: 6px 14px !important; font-size: 11px !important; }
          .landing-nav .nav-btn-gold { padding: 6px 16px !important; font-size: 11px !important; }
        }
      `}</style>
      <nav
        className="landing-nav"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          transition: 'background 0.4s, border-color 0.4s',
          background: scrolled ? 'rgba(5,5,5,0.96)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--gold-rule)' : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="https://app.moovx.ch/logo-moovx.png"
            alt="MoovX"
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              animation: 'pulse-gold 3s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              color: 'var(--gold)',
              letterSpacing: 3,
            }}
          >
            MOOVX
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              color: 'var(--text-muted)',
              paddingLeft: 12,
              borderLeft: '1px solid var(--text-dim)',
              letterSpacing: 1,
            }}
          >
            Swiss Made
          </span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/login"
            className="nav-btn-ghost"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'transparent',
              color: 'var(--text)',
              fontFamily: 'var(--font-alt)',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1.5,
              padding: '8px 20px',
              border: '1px solid var(--gold-rule)',
              cursor: 'none',
              transition: 'all 0.3s',
              
              textDecoration: 'none',
            }}
          >
            Connexion
          </Link>
          <Link
            href="/register-client"
            className="nav-btn-gold"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--gold)',
              color: '#0D0B08',
              fontFamily: 'var(--font-alt)',
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: 1.5,
              padding: '8px 24px',
              border: 'none',
              cursor: 'none',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
              
              textDecoration: 'none',
            }}
          >
            Commencer
          </Link>
        </div>
      </nav>
    </>
  )
}
