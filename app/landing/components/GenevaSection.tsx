'use client';

import React from 'react';
import { useReveal } from './shared';

const STATS = [
  { value: '24/7', label: 'Coach disponible' },
  { value: '🇨🇭', label: 'Swiss Made' },
  { value: '∞', label: 'Accessible partout' },
];

export default function GenevaSection() {
  const { ref, visible } = useReveal();

  return (
    <section
      ref={ref}
      id="geneve"
      style={{
        padding: '80px 64px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        {/* Badge */}
        <span
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-alt)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            color: 'var(--gold)',
            textTransform: 'uppercase',
            border: '1px solid var(--gold-rule)',
            padding: '6px 16px',
            marginBottom: 24,
          }}
        >
          Coaching Fitness Suisse
        </span>

        {/* Title */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 5vw, 64px)',
            color: 'var(--text)',
            letterSpacing: 3,
            lineHeight: 1,
            margin: '0 0 32px',
          }}
        >
          DISPONIBLE PARTOUT
        </h2>

        {/* Description */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 17,
            color: 'var(--text-muted)',
            lineHeight: 1.9,
            fontWeight: 300,
            margin: '0 auto 48px',
            maxWidth: 680,
          }}
        >
          MoovX est une plateforme de coaching fitness suisse accessible partout dans le monde.
          Que tu sois en Suisse, en France ou ailleurs, ton coach personnel t&apos;accompagne 24/7.
          Plans nutrition adaptés, programme musculation professionnel, suivi de progression complet.
        </p>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 48,
          flexWrap: 'wrap',
        }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 40,
                color: 'var(--gold)',
                lineHeight: 1,
                marginBottom: 8,
              }}>{s.value}</div>
              <div style={{
                fontFamily: 'var(--font-alt)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #geneve { padding: 80px 24px !important; }
        }
      `}</style>
    </section>
  );
}
