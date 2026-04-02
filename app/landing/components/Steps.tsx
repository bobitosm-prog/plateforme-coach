'use client';

import React from 'react';
import { useReveal } from './shared';

const steps = [
  { num: '01', title: 'Crée ton profil', desc: '2 minutes. Objectifs, mensurations, préférences alimentaires et niveau fitness.' },
  { num: '02', title: 'Scanne ton frigo', desc: "L'IA apprend ce que tu manges et adapte tous tes plans en conséquence." },
  { num: '03', title: 'Suis ton programme', desc: 'PPL 6 jours + nutrition personnalisée. Valide tes repas et tes séances.' },
  { num: '04', title: 'Mesure tes résultats', desc: 'Graphiques de progression, records personnels, photos avant/après.' },
];

export default function Steps() {
  const { ref, visible } = useReveal();

  return (
    <section id="how" ref={ref} style={{ background: 'var(--surface, #0D0C0B)' }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '120px 64px',
      }}>
        {/* Section header centered */}
        <div style={{
          textAlign: 'center',
          marginBottom: 72,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <span style={{
            display: 'inline-flex',
            fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 2,
            color: 'var(--gold, #C9A84C)',
            background: 'var(--gold-dim, rgba(201,168,76,0.15))',
            border: '1px solid var(--gold-rule, rgba(201,168,76,0.25))',
            padding: '5px 14px',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            Simple &amp; rapide
          </span>
          <h2 style={{
            fontFamily: "var(--font-display, 'Bebas Neue'), sans-serif",
            fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: 2,
            lineHeight: 0.95,
            color: 'var(--text, #F0EDE8)',
            margin: '0 0 16px',
          }}>
            PR&Ecirc;T EN 4 &Eacute;TAPES
          </h2>
          <p style={{
            fontSize: 16,
            color: 'var(--text-muted, #8A8580)',
            fontWeight: 300,
            margin: 0,
          }}>
            Ta transformation commence maintenant
          </p>
        </div>

        {/* Steps grid */}
        <div className="steps-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 32,
          position: 'relative',
        }}>
          {/* Connecting gold line */}
          <div className="steps-line" style={{
            position: 'absolute',
            top: 32,
            left: 'calc(12.5% + 32px)',
            right: 'calc(12.5% + 32px)',
            height: 1,
            background: 'linear-gradient(90deg, var(--gold-rule, rgba(201,168,76,0.25)), var(--gold, #C9A84C), var(--gold-rule, rgba(201,168,76,0.25)))',
            zIndex: 0,
          }} />

          {steps.map((s, i) => (
            <div key={s.num} style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(24px)',
              transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 120}ms`,
            }}>
              <div className="step-num" style={{
                width: 64,
                height: 64,
                margin: '0 auto 24px',
                border: '1px solid var(--gold-rule, rgba(201,168,76,0.25))',
                background: 'var(--surface, #0D0C0B)',
                fontFamily: "var(--font-display, 'Bebas Neue'), sans-serif",
                fontSize: 24,
                color: 'var(--gold, #C9A84C)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                cursor: 'default',
              }}>
                {s.num}
              </div>
              <h4 style={{
                fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
                fontWeight: 800,
                fontSize: 17,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'var(--text, #F0EDE8)',
                margin: '0 0 12px',
              }}>
                {s.title}
              </h4>
              <p style={{
                fontSize: 13,
                color: 'var(--text-muted, #8A8580)',
                fontWeight: 300,
                lineHeight: 1.6,
                margin: 0,
              }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .step-num:hover {
          background: var(--gold, #C9A84C) !important;
          color: #050505 !important;
        }
        @media (max-width: 1024px) {
          .steps-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .steps-line {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .steps-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
