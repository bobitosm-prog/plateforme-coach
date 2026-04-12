'use client';

import React from 'react';
import { useReveal, useCounter } from './shared';

const STATS = [
  { target: 1200, suffix: '+', label: 'Plans personnalisés générés' },
  { target: 163, suffix: '', label: 'Exercices guidés' },
  { target: 170, suffix: '', label: 'Aliments fitness' },
  { target: 98, suffix: '%', label: 'Satisfaction client' },
];

function StatBox({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { ref, value } = useCounter(target);

  return (
    <div
      ref={ref}
      style={{
        background: 'var(--surface)',
        padding: '48px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        transition: 'background 0.3s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(56px, 5vw, 80px)',
          color: 'var(--gold)',
          lineHeight: 1,
          marginBottom: 12,
        }}
      >
        {value}{suffix}
      </div>
      <div
        style={{
          width: 40,
          height: 2,
          background: 'var(--gold)',
          marginBottom: 16,
        }}
      />
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function Results() {
  const { ref, visible } = useReveal();

  return (
    <section
      id="resultats"
      ref={ref}
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '120px 64px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <span
          style={{
            display: 'inline-flex',
            fontFamily: 'var(--font-alt)',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 2,
            color: 'var(--gold)',
            background: 'var(--gold-dim)',
            border: '1px solid var(--gold-rule)',
            padding: '5px 14px',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          R&eacute;sultats mesurables
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: 2,
            lineHeight: 0.95,
            color: 'var(--text)',
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          DES CHIFFRES QUI PARLENT
        </h2>
        <p
          style={{
            fontSize: 16,
            color: 'var(--text-muted)',
            fontWeight: 300,
            margin: 0,
          }}
        >
          L&apos;expertise au service de ta transformation physique
        </p>
      </div>

      {/* Stats grid */}
      <style>{`
        .results-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--text-dim);
          border: 1px solid var(--text-dim);
        }
        @media (max-width: 1024px) {
          .results-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .results-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div className="results-grid">
        {STATS.map((stat) => (
          <StatBox key={stat.label} target={stat.target} suffix={stat.suffix} label={stat.label} />
        ))}
      </div>
    </section>
  );
}
