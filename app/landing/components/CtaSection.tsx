'use client';

import React from 'react';
import Link from 'next/link';
import { useReveal } from './shared';

export default function CtaSection() {
  const { ref, visible } = useReveal();

  return (
    <section
      ref={ref}
      id="cta"
      style={{
        width: '100%',
        padding: '120px 64px',
        textAlign: 'center' as const,
        position: 'relative' as const,
        overflow: 'hidden',
      }}
    >
      {/* Ghost text */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(120px, 18vw, 240px)',
          color: 'rgba(201,168,76,0.03)',
          pointerEvents: 'none' as const,
          letterSpacing: 4,
          whiteSpace: 'nowrap' as const,
          userSelect: 'none' as const,
          lineHeight: 1,
        }}
      >
        MOOVX
      </div>

      {/* Tag */}
      <span
        style={{
          display: 'inline-block',
          fontFamily: 'var(--font-alt)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 2,
          color: 'var(--gold)',
          textTransform: 'uppercase' as const,
          border: '1px solid var(--gold-rule)',
          padding: '6px 16px',
          margin: '0 auto 32px',
          position: 'relative' as const,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Commence maintenant
      </span>

      {/* Heading */}
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(48px, 7vw, 96px)',
          color: 'var(--text)',
          letterSpacing: 3,
          lineHeight: 0.95,
          margin: '0 0 24px',
          position: 'relative' as const,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
        }}
      >
        PRÊT À TRANSFORMER TON CORPS ?
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          color: 'var(--text-muted)',
          fontWeight: 300,
          margin: '0 0 40px',
          position: 'relative' as const,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s ease 0.2s',
        }}
      >
        Rejoins MoovX et commence ta transformation dès aujourd&apos;hui.
      </p>

      {/* CTA Button */}
      <div
        style={{
          position: 'relative' as const,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
          marginBottom: 20,
        }}
      >
        <Link
          href="/register-client"
          style={{
            display: 'inline-block',
            background: 'var(--gold)',
            color: '#0D0B08',
            fontFamily: 'var(--font-alt)',
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: 1.5,
            padding: '18px 56px',
            textDecoration: 'none',
            textTransform: 'uppercase' as const,
            
          }}
        >
          Commencer — 10 jours gratuits
        </Link>
      </div>

      {/* Fine print */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--text-dim)',
          margin: 0,
          position: 'relative' as const,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s ease 0.4s',
        }}
      >
        Sans engagement · Résiliable à tout moment · 100% Swiss Made
      </p>
    </section>
  );
}
