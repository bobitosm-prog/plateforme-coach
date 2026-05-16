'use client'
import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link, usePathname } from '@/i18n/routing'
import { colors } from '@/lib/design-tokens'
import { Menu, X } from 'lucide-react'

const LOCALES = [
  { code: 'fr' as const, flag: '🇫🇷', label: 'Français' },
  { code: 'en' as const, flag: '🇬🇧', label: 'English' },
  { code: 'de' as const, flag: '🇩🇪', label: 'Deutsch' },
]

export default function Navbar() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <>
      <style>{`
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 12px ${colors.goldRule}; }
          50% { box-shadow: 0 0 32px ${colors.goldRule}; }
        }
      `}</style>
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 40px)',
        transition: 'background 0.4s, border-color 0.4s',
        background: scrolled || open ? 'rgba(5,5,5,0.96)' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--gold-rule)' : '1px solid transparent',
        backdropFilter: scrolled || open ? 'blur(16px)' : 'none',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="https://app.moovx.ch/logo-moovx.png"
            alt="MoovX"
            style={{
              width: 32, height: 32, borderRadius: 6,
              animation: 'pulse-gold 3s ease-in-out infinite',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26, color: 'var(--gold)', letterSpacing: 3,
          }}>
            MOOVX
          </span>

          {/* Desktop only: Swiss Made + locale switcher */}
          <span className="nav-desktop-only" style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10, color: 'var(--text-muted)',
            paddingLeft: 12, borderLeft: '1px solid var(--text-dim)',
            letterSpacing: 1,
          }}>
            {t('swissMade')}
          </span>

          <div className="nav-desktop-only" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginLeft: 12, paddingLeft: 12,
            borderLeft: '1px solid rgba(255,255,255,0.1)',
          }}>
            {LOCALES
              .filter(l => l.code !== locale)
              .map(l => (
                <Link
                  key={l.code}
                  href={pathname}
                  locale={l.code}
                  aria-label={`Switch to ${l.label}`}
                  style={{
                    fontSize: 18, opacity: 0.55,
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                    display: 'inline-block', lineHeight: 1,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {l.flag}
                </Link>
              ))}
          </div>
        </div>

        {/* Desktop: CTAs */}
        <div className="nav-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/login" style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'transparent', color: 'var(--text)',
            fontFamily: 'var(--font-alt)', fontWeight: 700,
            fontSize: 13, letterSpacing: 1.5, padding: '8px 20px',
            border: '1px solid var(--gold-rule)',
            transition: 'all 0.3s', textDecoration: 'none',
          }}>
            {t('login')}
          </a>
          <a href="/register-client" style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'var(--gold)', color: '#0D0B08',
            fontFamily: 'var(--font-alt)', fontWeight: 800,
            fontSize: 13, letterSpacing: 1.5, padding: '8px 24px',
            border: 'none',
            transition: 'transform 0.2s, box-shadow 0.2s', textDecoration: 'none',
          }}>
            {t('start')}
          </a>
        </div>

        {/* Mobile: Burger button */}
        <button
          className="nav-mobile-only"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          style={{
            background: 'none', border: 'none',
            color: open ? 'var(--gold)' : '#fff',
            padding: 8, cursor: 'pointer',
          }}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      {/* Mobile: Overlay menu */}
      {open && (
        <div className="nav-mobile-only" style={{
          position: 'fixed',
          top: 60, left: 0, right: 0, bottom: 0,
          zIndex: 999,
          background: 'rgba(5,5,5,0.97)',
          backdropFilter: 'blur(20px)',
          padding: '32px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
          animation: 'navSlideIn 0.25s ease-out',
        }}>
          <a href="/login" onClick={() => setOpen(false)} style={{
            color: '#fff', textDecoration: 'none',
            fontFamily: 'var(--font-display)',
            fontSize: 20, letterSpacing: 2,
            textTransform: 'uppercase',
            padding: '16px 0',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            {t('login')}
          </a>

          <a href="/register-client" onClick={() => setOpen(false)} style={{
            background: 'var(--gold)', color: '#0D0B08',
            textDecoration: 'none',
            fontFamily: 'var(--font-display)',
            fontSize: 18, fontWeight: 700, letterSpacing: 3,
            textTransform: 'uppercase',
            padding: '16px 24px',
            textAlign: 'center',
          }}>
            {t('start')}
          </a>

          {/* Language flags */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 24,
            paddingTop: 24, paddingBottom: 8,
          }}>
            {LOCALES.map(l => (
              <Link
                key={l.code}
                href={pathname}
                locale={l.code}
                onClick={() => setOpen(false)}
                aria-label={`Switch to ${l.label}`}
                style={{
                  fontSize: 32,
                  opacity: l.code === locale ? 0.25 : 0.8,
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                  pointerEvents: l.code === locale ? 'none' : 'auto',
                }}
              >
                {l.flag}
              </Link>
            ))}
          </div>

          <span style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: 11, letterSpacing: 2,
            textAlign: 'center', textTransform: 'uppercase',
            fontFamily: 'var(--font-alt)',
            marginTop: 'auto',
          }}>
            {t('swissMade')}
          </span>
        </div>
      )}

      {/* Responsive visibility */}
      <style>{`
        @media (max-width: 767px) {
          .nav-desktop-only { display: none !important; }
        }
        @media (min-width: 768px) {
          .nav-mobile-only { display: none !important; }
        }
        @keyframes navSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
