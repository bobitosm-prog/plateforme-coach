'use client';

import React, { useState } from 'react';
import { useReveal } from './shared';

const FEATURES = [
  { num: '01', title: 'Analytics avancé', desc: "5 graphiques interactifs : poids, calories, macros, volume d'entraînement, hydratation. Export CSV.", emoji: '📊', size: 'large' },
  { num: '02', title: 'Photos avant/après', desc: 'Comparateur slider intégré. Superpose tes photos pour voir ta transformation en temps réel.', emoji: '📸', size: 'medium' },
  { num: '03', title: 'Records personnels', desc: 'Détection automatique des PR via la formule Epley. Historique complet de ta progression.', emoji: '🏆', size: 'medium' },
  { num: '04', title: 'Streak & gamification', desc: '7 badges à débloquer. Série de jours consécutifs.', emoji: '🔥', size: 'small' },
  { num: '05', title: 'Hydratation', desc: "Compteur d'eau quotidien avec objectif personnalisé.", emoji: '💧', size: 'small' },
  { num: '06', title: "Tes données", desc: 'Export CSV. Conformité RGPD. Hébergé en Europe.', emoji: '🔒', size: 'small' },
];

export default function TrackingSection() {
  const { ref, visible } = useReveal();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section
      id="tracking"
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 64px' }}>
        {/* Section header */}
        <div style={{ marginBottom: 56 }}>
          <span style={{
            display: 'inline-flex',
            fontFamily: 'var(--font-alt)', fontWeight: 700, fontSize: 11,
            letterSpacing: 2, color: 'var(--gold)', background: 'var(--gold-dim)',
            border: '1px solid var(--gold-rule)', padding: '5px 14px', textTransform: 'uppercase',
          }}>
            03 — Suivi
          </span>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: 2, lineHeight: 0.95, color: 'var(--text)', margin: '20px 0 0',
          }}>
            MESURE CHAQUE PROGRÈS
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 300, margin: '16px 0 0' }}>
            Graphiques, badges, photos — toute ta progression en un coup d&apos;œil
          </p>
        </div>

        {/* Bento grid */}
        <div className="tracking-bento">
          {FEATURES.map((f, i) => {
            const isHovered = hovered === i;
            const isLarge = f.size === 'large';
            const isMedium = f.size === 'medium';
            return (
              <div
                key={f.num}
                className={`tracking-bento-${f.size}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isHovered ? 'var(--surface-2)' : 'var(--surface)',
                  border: `1px solid ${isHovered ? 'var(--gold-rule)' : 'var(--text-dim)'}`,
                  borderRadius: 16,
                  padding: isLarge ? '40px 36px' : isMedium ? '32px 28px' : '24px 22px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Gold accent line */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                  background: 'linear-gradient(90deg, var(--gold), transparent)',
                  transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
                  transformOrigin: 'left', transition: 'transform 0.4s ease',
                }} />

                <div>
                  <div style={{
                    fontSize: isLarge ? 40 : isMedium ? 32 : 24,
                    marginBottom: isLarge ? 20 : 12,
                  }}>{f.emoji}</div>
                  <h3 style={{
                    fontFamily: 'var(--font-alt)', fontWeight: 800,
                    fontSize: isLarge ? 22 : isMedium ? 18 : 15,
                    letterSpacing: 1, textTransform: 'uppercase',
                    color: 'var(--text)', margin: 0,
                  }}>
                    {f.title}
                  </h3>
                  <p style={{
                    fontSize: isLarge ? 15 : 13,
                    color: 'var(--text-muted)', lineHeight: 1.6,
                    fontWeight: 300, margin: '8px 0 0',
                  }}>
                    {f.desc}
                  </p>
                </div>

                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isLarge ? 64 : isMedium ? 48 : 36,
                  color: isHovered ? 'rgba(212,168,67,0.15)' : 'rgba(212,168,67,0.06)',
                  lineHeight: 1, marginTop: isLarge ? 20 : 8,
                  transition: 'color 0.3s',
                  alignSelf: 'flex-end',
                }}>{f.num}</span>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .tracking-bento {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: auto auto;
          gap: 12px;
        }
        .tracking-bento-large {
          grid-column: span 2;
          grid-row: span 1;
        }
        .tracking-bento-medium {
          grid-column: span 1;
          grid-row: span 1;
        }
        .tracking-bento-small {
          grid-column: span 1;
          grid-row: span 1;
        }
        @media (max-width: 1024px) {
          .tracking-bento {
            grid-template-columns: repeat(2, 1fr);
          }
          .tracking-bento-large {
            grid-column: span 2;
          }
        }
        @media (max-width: 640px) {
          .tracking-bento {
            grid-template-columns: 1fr;
          }
          .tracking-bento-large {
            grid-column: span 1;
          }
          #tracking > div {
            padding: 80px 24px !important;
          }
        }
      `}</style>
    </section>
  );
}
