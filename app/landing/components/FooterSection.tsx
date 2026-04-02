'use client';

import React from 'react';
import Link from 'next/link';
import { useReveal } from './shared';

const LINKS = [
  { label: 'Application', href: '/login', type: 'internal' as const },
  { label: 'Tarifs', href: '#pricing', type: 'anchor' as const },
  { label: 'FAQ', href: '#faq', type: 'anchor' as const },
  { label: 'Contact', href: 'mailto:contact@moovx.ch', type: 'external' as const },
  { label: 'CGU', href: '/cgu', type: 'internal' as const },
  { label: 'Confidentialité', href: '/privacy', type: 'internal' as const },
];

export default function FooterSection() {
  const { ref, visible } = useReveal();

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = href.slice(1);
    if (id) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const linkStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--text-muted)',
    textDecoration: 'none',
    transition: 'color 0.2s',
  };

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
          {/* Brand row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <img
              src="/logo-moovx.png"
              alt="MoovX"
              width={24}
              height={24}
              style={{ borderRadius: 4 }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
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
                borderLeft: '1px solid var(--text-dim)',
                paddingLeft: 10,
              }}
            >
              Swiss Made · Swiss Quality
            </span>
          </div>
          {/* Copyright */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-dim)',
              margin: 0,
            }}
          >
            © 2026 MoovX · Genève, Suisse
          </p>
        </div>

        {/* Right: links */}
        <div
          className="footer-links"
          style={{
            display: 'flex',
            gap: 28,
          }}
        >
          {LINKS.map((link) => {
            if (link.type === 'internal') {
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  style={linkStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--gold)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  {link.label}
                </Link>
              );
            }

            return (
              <a
                key={link.label}
                href={link.href}
                onClick={
                  link.type === 'anchor'
                    ? (e) => handleAnchorClick(e, link.href)
                    : undefined
                }
                style={linkStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--gold)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                {link.label}
              </a>
            );
          })}
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 1024px) {
          .footer-inner {
            flex-direction: column !important;
            text-align: center !important;
            gap: 24px !important;
          }
          .footer-links {
            justify-content: center !important;
          }
        }
      `}</style>
    </footer>
  );
}
