'use client';

import React, { useState } from 'react';
import { useReveal } from './shared';

const FEATURES = [
  { num: '01', title: 'Analytics avancé', desc: "5 graphiques interactifs : poids, calories, macros, volume d'entraînement, hydratation. Export CSV." },
  { num: '02', title: 'Photos avant/après', desc: 'Comparateur slider intégré. Superpose tes photos pour voir ta transformation en temps réel.' },
  { num: '03', title: 'Records personnels', desc: 'Détection automatique des PR via la formule Epley. Historique complet de ta progression.' },
  { num: '04', title: 'Streak & gamification', desc: '7 badges à débloquer. Série de jours consécutifs. La motivation par les récompenses.' },
  { num: '05', title: 'Hydratation', desc: "Compteur d'eau quotidien avec objectif personnalisé selon ton poids et ton activité physique." },
  { num: '06', title: "Tes données t'appartiennent", desc: 'Export CSV complet à tout moment. Conformité RGPD. Hébergé en Europe sur Supabase.' },
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
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 64px' }}>
        {/* Section header */}
        <div style={{ marginBottom: 72 }}>
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
          }}>
            03 — Suivi
          </span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: 2,
            lineHeight: 0.95,
            color: 'var(--text)',
            margin: '20px 0 0',
          }}>
            MESURE CHAQUE PROGRÈS
          </h2>
          <p style={{
            fontSize: 16,
            color: 'var(--text-muted)',
            fontWeight: 300,
            margin: '16px 0 0',
          }}>
            Graphiques, badges, photos — toute ta progression en un coup d&apos;œil
          </p>
        </div>

        {/* Editorial grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1,
          background: 'var(--text-dim)',
          border: '1px solid var(--text-dim)',
        }}>
          {FEATURES.map((f, i) => {
            const isHovered = hovered === i;
            return (
              <div
                key={f.num}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isHovered ? 'var(--surface-2)' : 'var(--surface)',
                  padding: '40px 36px',
                  display: 'flex',
                  gap: 24,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'background 0.3s ease',
                }}
              >
                {/* Gold gradient bottom line (::before equivalent) */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'linear-gradient(90deg, var(--gold), transparent)',
                  transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
                  transformOrigin: 'left',
                  transition: 'transform 0.4s ease',
                }} />

                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 48,
                  color: isHovered ? 'var(--gold)' : 'var(--text-dim)',
                  transition: 'color 0.3s ease',
                  lineHeight: 1,
                }}>
                  {f.num}
                </span>

                <div>
                  <h3 style={{
                    fontFamily: 'var(--font-alt)',
                    fontWeight: 800,
                    fontSize: 20,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: 'var(--text)',
                    margin: 0,
                  }}>
                    {f.title}
                  </h3>
                  <p style={{
                    fontSize: 14,
                    color: 'var(--text-muted)',
                    lineHeight: 1.7,
                    fontWeight: 300,
                    margin: '8px 0 0',
                  }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 1024px) {
          #tracking > div > div:last-child {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          #tracking > div {
            padding: 80px 24px !important;
          }
        }
      `}</style>
    </section>
  );
}
