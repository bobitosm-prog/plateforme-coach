'use client';

import React, { useState } from 'react';
import { useReveal } from './shared';

const PILLS = [
  'Comment atteindre mes macros ?',
  'Quel exercice pour les pectoraux ?',
  'Remplacer un aliment du plan ?',
  'Combien de protéines post-training ?',
  'Programme cardio pour sécher ?',
];

export default function CoachIaSection() {
  const { ref, visible } = useReveal();
  const [hoveredPill, setHoveredPill] = useState<number | null>(null);

  return (
    <section
      id="coach-ia"
      ref={ref}
      style={{
        background: 'var(--surface)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 64px' }}>
        {/* Section header — centered */}
        <div style={{ marginBottom: 72, textAlign: 'center' }}>
          <span style={{
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
            margin: '0 auto',
          }}>
            04 — Coach personnel
          </span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: 2,
            lineHeight: 0.95,
            color: 'var(--text)',
            margin: '20px 0 0',
          }}>
            TON COACH PERSONNEL DISPONIBLE 24/7
          </h2>
          <p style={{
            fontSize: 16,
            color: 'var(--text-muted)',
            fontWeight: 300,
            margin: '16px 0 0',
          }}>
            Pose n&apos;importe quelle question — il connaît ton profil, tes macros, ton historique
          </p>
        </div>

        {/* Coach card */}
        <div style={{
          maxWidth: 720,
          margin: '0 auto',
          border: '1px solid var(--gold-rule)',
          background: 'var(--surface)',
        }}>
          {/* Card header */}
          <div style={{
            padding: '24px 36px',
            borderBottom: '1px solid var(--gold-rule)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            {/* Avatar */}
            <div style={{
              width: 44,
              height: 44,
              background: 'var(--gold-dim)',
              border: '1px solid var(--gold-rule)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="7" width="16" height="12" rx="3" stroke="#C9A84C" strokeWidth="1.2"/>
                <circle cx="8" cy="13" r="2" stroke="#C9A84C" strokeWidth="1"/>
                <circle cx="14" cy="13" r="2" stroke="#C9A84C" strokeWidth="1"/>
                <path d="M11 4V7" stroke="#C9A84C" strokeWidth="1.2"/>
                <circle cx="11" cy="3" r="1.5" stroke="#C9A84C" strokeWidth="1"/>
                <path d="M2 12H3M19 12H20" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Text */}
            <div>
              <h3 style={{
                fontFamily: 'var(--font-alt)',
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: 'var(--text)',
                margin: 0,
              }}>
                COACH MOOVX
              </h3>
              <p style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                margin: '4px 0 0',
              }}>
                Actif maintenant &middot; Disponible 24/7
              </p>
            </div>

            {/* Online status — right */}
            <div style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--green)',
                animation: 'pulse-green 2s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: 12,
                color: 'var(--green)',
                fontFamily: 'var(--font-alt)',
                fontWeight: 700,
              }}>
                EN LIGNE
              </span>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: 36 }}>
            <p style={{
              fontSize: 15,
              color: 'var(--text-muted)',
              lineHeight: 1.8,
              fontWeight: 300,
              margin: '0 0 28px',
              fontFamily: 'var(--font-body)',
            }}>
              Le Coach MoovX connaît ton profil, tes objectifs, tes macros et ton historique complet
              d&apos;entraînement. Il te répond en français, de manière personnalisée et motivante.
              Disponible 24 heures sur 24, 7 jours sur 7 — même à 5h du matin avant ta séance.
            </p>

            {/* Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {PILLS.map((pill, i) => {
                const isHovered = hoveredPill === i;
                return (
                  <span
                    key={pill}
                    onMouseEnter={() => setHoveredPill(i)}
                    onMouseLeave={() => setHoveredPill(null)}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: isHovered ? 'var(--gold)' : 'var(--text-muted)',
                      border: `1px solid ${isHovered ? 'var(--gold)' : 'var(--text-dim)'}`,
                      padding: '8px 18px',
                      fontWeight: 300,
                      background: isHovered ? 'var(--gold-dim)' : 'transparent',
                      transition: 'all 0.25s ease',
                      cursor: 'default',
                    }}
                  >
                    {pill}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse-green {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 768px) {
          #coach-ia > div {
            padding: 80px 24px !important;
          }
        }
      `}</style>
    </section>
  );
}
