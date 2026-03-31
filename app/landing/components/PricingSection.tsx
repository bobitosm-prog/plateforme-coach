'use client';

import React from 'react';
import Link from 'next/link';
import { RevealProps, Section, SectionTitle, PRICING, PRICING_CHECKLIST } from './shared';

export default function PricingSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef} id="pricing">
      <Section>
        <SectionTitle title="TARIFS SIMPLES" subtitle="Commence gratuitement, &eacute;volue &agrave; ton rythme" visible={visible} />
        <div className="pricing-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          marginBottom: 40,
        }}>
          {PRICING.map((p, i) => (
            <div key={p.name} className={`pricing-card ${p.highlight ? 'highlight' : ''}`} style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms`,
              position: 'relative',
              background: '#0d0d0d',
              border: p.highlight ? '1px solid #C9A84C' : '1px solid #1a1a1a',
              borderRadius: 16,
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              boxShadow: p.highlight ? '0 0 40px rgba(201,168,76,0.1)' : 'none',
            }}>
              {p.badge && (
                <span style={{
                  position: 'absolute',
                  top: -12,
                  background: '#C9A84C',
                  color: '#050505',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 14px',
                  borderRadius: 20,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>{p.badge}</span>
              )}
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6b7280', margin: '8px 0 16px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>{p.name}</h3>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, color: '#f8fafc', lineHeight: 1 }}>{p.price}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{p.period}</div>
              <div style={{ width: '100%', marginBottom: 24 }}>
                {PRICING_CHECKLIST.slice(0, 6).map(item => (
                  <div key={item} style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: '#6b7280',
                    padding: '6px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {item}
                  </div>
                ))}
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#555', padding: '6px 0' }}>+ 6 autres fonctionnalit&eacute;s</div>
              </div>
              <Link href="/register-client" className={p.highlight ? 'gold-btn' : 'ghost-btn'} style={{ width: '100%', textAlign: 'center', fontSize: 14, padding: '12px 0' }}>
                {p.name === 'Coach Pro' ? 'Devenir Coach' : 'Commencer'}
              </Link>
            </div>
          ))}
        </div>
        <p style={{
          textAlign: 'center',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          color: '#6b7280',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s 0.5s',
        }}>
          10 jours d&apos;essai gratuit &middot; Sans engagement &middot; Toutes fonctionnalit&eacute;s incluses
        </p>
      </Section>
    </div>
  );
}
