'use client'
import React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useReveal } from './shared'

export default function FooterSection() {
  const t = useTranslations('footer')
  const { ref, visible } = useReveal()

  const LINKS = [
    { label: t('app'), href: '/login', type: 'internal' as const },
    { label: t('pricing'), href: '#pricing', type: 'anchor' as const },
    { label: t('faq'), href: '#faq', type: 'anchor' as const },
    { label: t('contact'), href: 'mailto:contact@moovx.ch', type: 'external' as const },
    { label: t('terms'), href: '/cgu', type: 'internal' as const },
    { label: t('privacy'), href: '/privacy', type: 'internal' as const },
  ]

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const id = href.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const linkStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--text-muted)',
    textDecoration: 'none',
    transition: 'color 0.2s',
  }

  return (
    <footer
      ref={ref}
      style={{
        borderTop: '1px solid var(--text-dim)',
        padding: '40px 64px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s ease',
      }}
    >
      <div
        className="footer-inner"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Left */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <img src="/logo-moovx.png" alt="MoovX" width={24} height={24} style={{ borderRadius: 4 }} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22, color: 'var(--gold)', letterSpacing: 3,
            }}>
              MOOVX
            </span>
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10, color: 'var(--text-muted)',
              borderLeft: '1px solid var(--text-dim)', paddingLeft: 10,
            }}>
              {t('tagline')}
            </span>
          </div>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12, color: 'var(--text-dim)', margin: 0,
          }}>
            {t('copyright')}
          </p>
        </div>

        {/* Right: links */}
        <div className="footer-links" style={{ display: 'flex', gap: 28 }}>
          {LINKS.map((link) => {
            if (link.type === 'internal') {
              return (
                <Link key={link.label} href={link.href} style={linkStyle}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  {link.label}
                </Link>
              )
            }
            return (
              <a key={link.label} href={link.href}
                onClick={link.type === 'anchor' ? (e) => handleAnchorClick(e, link.href) : undefined}
                style={linkStyle}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                {link.label}
              </a>
            )
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .footer-inner { flex-direction: column !important; text-align: center !important; gap: 24px !important; }
          .footer-links { justify-content: center !important; }
        }
      `}</style>
    </footer>
  )
}
