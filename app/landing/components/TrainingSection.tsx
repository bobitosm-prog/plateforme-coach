'use client';

import React from 'react';
import { useReveal } from './shared';

const PPL_ROWS = [
  { day: 'LUNDI', type: 'Push A', focus: 'Poitrine, Épaules, Triceps' },
  { day: 'MARDI', type: 'Pull A', focus: 'Dos, Biceps, Arrière épaules' },
  { day: 'MERCREDI', type: 'Legs A', focus: 'Quadriceps, Ischio, Mollets' },
  { day: 'JEUDI', type: 'Push B', focus: 'Poitrine, Épaules, Triceps' },
  { day: 'VENDREDI', type: 'Pull B', focus: 'Dos, Biceps, Trapèzes' },
  { day: 'SAMEDI', type: 'Legs B', focus: 'Fessiers, Ischio, Mollets' },
];

export default function TrainingSection() {
  const { ref, visible } = useReveal();

  return (
    <>
      <style>{`
        .training-ppl-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .training-ppl-table {
          width: 100%;
          border-collapse: collapse;
        }
        .training-ppl-table thead th {
          font-family: var(--font-alt);
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--gold);
          border-bottom: 1px solid var(--gold-rule);
          padding: 0 0 14px;
          text-align: left;
        }
        .training-ppl-table tbody tr {
          border-bottom: 1px solid var(--text-dim);
          transition: background 0.3s ease;
        }
        .training-ppl-table tbody tr:hover {
          background: var(--surface-2);
        }
        .training-ppl-table tbody td {
          padding: 16px 0;
        }
        .training-mini-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: var(--text-dim);
          border: 1px solid var(--text-dim);
          margin-top: 32px;
        }
        .training-mini-cell {
          background: var(--surface);
          padding: 28px 24px;
          text-align: center;
        }
        @media (max-width: 1024px) {
          .training-ppl-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <section
        ref={ref}
        id="training"
        style={{
          background: 'var(--surface)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '120px 64px',
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
              02 &mdash; Entra&icirc;nement
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
              PROGRAMME HYPERTROPHIE
            </h2>
            <p
              style={{
                fontSize: 16,
                color: 'var(--text-muted)',
                fontWeight: 300,
                margin: 0,
              }}
            >
              Push/Pull/Legs 6 jours + Cardio HIIT &amp; LISS int&eacute;gr&eacute;
            </p>
          </div>

          {/* PPL grid */}
          <div className="training-ppl-grid">
            {/* Left: PPL table */}
            <div>
              <table className="training-ppl-table">
                <thead>
                  <tr>
                    <th>Jour</th>
                    <th>Type</th>
                    <th>Focus Musculaire</th>
                  </tr>
                </thead>
                <tbody>
                  {PPL_ROWS.map((row) => (
                    <tr key={row.day}>
                      <td
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 20,
                          color: 'var(--text)',
                          letterSpacing: 1,
                        }}
                      >
                        {row.day}
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--font-alt)',
                            fontWeight: 800,
                            fontSize: 13,
                            letterSpacing: 1,
                            padding: '2px 10px',
                            background: 'var(--gold-dim)',
                            color: 'var(--gold)',
                          }}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: 14,
                          color: 'var(--text-muted)',
                          fontWeight: 300,
                        }}
                      >
                        {row.focus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right: description */}
            <div>
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
                Scientifiquement optimis&eacute;
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(32px, 4vw, 52px)',
                  letterSpacing: 2,
                  lineHeight: 0.95,
                  color: 'var(--text)',
                  margin: '0 0 20px',
                }}
              >
                89 EXERCICES GUID&Eacute;S EN FRAN&Ccedil;AIS
              </h3>
              <p
                style={{
                  fontSize: 15,
                  color: 'var(--text-muted)',
                  fontWeight: 300,
                  lineHeight: 1.7,
                  margin: '0 0 8px',
                }}
              >
                Chaque exercice est accompagn&eacute; d&apos;un guide visuel d&eacute;taill&eacute; en fran&ccedil;ais.
                Timer de repos intelligent, suivi des s&eacute;ries et r&eacute;p&eacute;titions,
                records personnels automatiques. Le programme PPL est con&ccedil;u pour maximiser
                l&apos;hypertrophie musculaire avec une progression scientifique.
              </p>

              {/* Mini Bauhaus grid */}
              <div className="training-mini-grid">
                <div className="training-mini-cell">
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(36px, 4vw, 48px)',
                      color: 'var(--gold)',
                      lineHeight: 1,
                      marginBottom: 8,
                    }}
                  >
                    89
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Exercices avec vid&eacute;os
                  </div>
                </div>
                <div className="training-mini-cell">
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(36px, 4vw, 48px)',
                      color: 'var(--gold)',
                      lineHeight: 1,
                      marginBottom: 8,
                    }}
                  >
                    14
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    S&eacute;ances HIIT &amp; LISS
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
