'use client';

import React from 'react';

export default function FooterSection() {
  return (
    <footer style={{
      borderTop: '1px solid #1a1a1a',
      padding: '40px 24px',
    }}>
      <div className="footer-inner" style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#C9A84C', letterSpacing: 2 }}>MOOVX</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6b7280' }}>Swiss Made &middot; Swiss Quality</span>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#555', margin: 0 }}>
            &copy; 2026 MoovX &middot; Gen&egrave;ve, Suisse
          </p>
        </div>
        <div className="footer-links" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Application', href: '/login' },
            { label: 'Tarifs', href: '#pricing' },
            { label: 'FAQ', href: '#faq' },
            { label: 'Contact', href: 'mailto:contact@moovx.ch' },
            { label: 'CGU', href: '#' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              onClick={link.href.startsWith('#') ? (e) => { e.preventDefault(); const id = link.href.slice(1); if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); } : undefined}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: '#6b7280',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A84C'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
