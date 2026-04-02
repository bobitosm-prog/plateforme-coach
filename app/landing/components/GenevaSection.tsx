'use client';

import React from 'react';
import { useReveal } from './shared';

export default function GenevaSection() {
  const { ref, visible } = useReveal();

  return (
    <section
      ref={ref}
      id="geneve"
      style={{
        background: 'var(--surface)',
        padding: '120px 64px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Section header centered */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
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
          Coaching Fitness Genève
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 5vw, 64px)',
            color: 'var(--text)',
            letterSpacing: 3,
            lineHeight: 1,
            margin: 0,
          }}
        >
          CONÇU POUR GENÈVE
        </h2>
      </div>

      {/* 2-column grid */}
      <div
        className="geneva-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 64,
          alignItems: 'center',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        {/* Left: text */}
        <div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 17,
              color: 'var(--text-muted)',
              lineHeight: 1.9,
              fontWeight: 300,
              margin: 0,
            }}
          >
            Basé à Genève, MoovX est la première plateforme de coaching fitness
            suisse propulsée par des experts certifiés. Que tu sois à
            Plainpalais, aux Eaux-Vives, à Carouge ou aux Pâquis, ton coach personnel
            t&apos;accompagne partout. Plans nutrition adaptés aux produits suisses,
            programme musculation professionnel, suivi de progression complet.
          </p>
        </div>

        {/* Right: image */}
        <div style={{ overflow: 'hidden', borderRadius: 0 }}>
          <img
            src="https://images.unsplash.com/photo-1573108037329-37aa135a142e?w=800&q=80"
            alt="Coaching fitness Genève"
            loading="lazy"
            style={{
              width: '100%',
              display: 'block',
              filter: 'grayscale(40%)',
            }}
          />
        </div>
      </div>

      {/* Responsive style */}
      <style>{`
        @media (max-width: 1024px) {
          .geneva-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
