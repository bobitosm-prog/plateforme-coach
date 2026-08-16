'use client';

import React from 'react';
import { useReveal } from './shared';

const CLIENT_CHECKS = [
  { text: 'Plans nutrition illimités', highlight: false },
  { text: 'Programme PPL 6 jours', highlight: false },
  { text: 'Scanner code-barres + recettes', highlight: false },
  { text: 'Coach personnel 24/7', highlight: false },
  { text: 'Analytics & suivi complet', highlight: false },
  { text: 'Si invité par un coach : accès ', highlight: false, suffix: 'gratuit', suffixHighlight: true },
];

const COACH_CHECKS = [
  'Dashboard de gestion clients',
  'Plans nutrition personnalisés pour tes clients',
  'Clients illimités',
  'Messagerie + Feedback vidéo',
  'Paiements Stripe automatiques',
];

export default function EconomicModel() {
  const { ref, visible } = useReveal();

  return (
    <section
      id="pricing-model"
      ref={ref}
      style={{
        background: 'var(--surface)',
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
            Transparence totale
          </span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: 2,
            lineHeight: 0.95,
            color: 'var(--text)',
            margin: '20px 0 0',
          }}>
            UN MODÈLE TRANSPARENT
          </h2>
          <p style={{
            fontSize: 16,
            color: 'var(--text-muted)',
            fontWeight: 300,
            margin: '16px 0 0',
          }}>
            Zéro surprise. Tu sais exactement ce que tu paies.
          </p>
        </div>

        {/* 2-column Bauhaus grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1,
          background: 'var(--text-dim)',
          border: '1px solid var(--text-dim)',
        }}>
          {/* LEFT — POUR LES CLIENTS */}
          <div style={{
            background: 'var(--surface)',
            padding: '48px 40px',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              letterSpacing: 2,
              color: 'var(--text)',
              margin: '0 0 20px',
            }}>
              POUR LES CLIENTS
            </h3>

            <p style={{
              fontSize: 14,
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              fontWeight: 300,
              margin: '0 0 24px',
            }}>
              Sans coach : abonnement MoovX direct. Avec coach : accès gratuit, tu paies uniquement ton coach.
            </p>

            {/* Price tags */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
              {['CHF 10/mois', 'CHF 80/an', 'CHF 150 à vie'].map(tag => (
                <span key={tag} style={{
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
                  {tag}
                </span>
              ))}
            </div>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {CLIENT_CHECKS.map((item) => (
                <div key={item.text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--green)', fontSize: 14, lineHeight: '1.7', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 300, lineHeight: 1.7 }}>
                    {item.text}
                    {item.suffix && (
                      <span style={{
                        color: 'var(--green)',
                        fontWeight: 700,
                      }}>
                        {item.suffix}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — POUR LES COACHES */}
          <div style={{
            background: 'var(--surface)',
            padding: '48px 40px',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              letterSpacing: 2,
              color: 'var(--text)',
              margin: '0 0 20px',
            }}>
              POUR LES COACHES
            </h3>

            {/* Price box */}
            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--gold-rule)',
              padding: 24,
              textAlign: 'center',
              marginBottom: 24,
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 64,
                color: 'var(--gold)',
                lineHeight: 1,
              }}>
                CHF 50
              </span>
              <br />
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                /mois &middot; Coach Pro
              </span>
            </div>

            <p style={{
              fontSize: 14,
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              fontWeight: 300,
              margin: '0 0 24px',
            }}>
              Tu fixes ton propre tarif. Tes clients paient directement via Stripe.
            </p>

            {/* Commission box */}
            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--text-dim)',
              padding: 24,
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: 16,
              marginBottom: 32,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 40,
                  color: 'var(--green)',
                  lineHeight: 1,
                }}>
                  97%
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Pour toi</div>
              </div>

              <div style={{ fontSize: 20, color: 'var(--text-dim)' }}>+</div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 40,
                  color: 'var(--gold)',
                  lineHeight: 1,
                }}>
                  3%
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Commission MoovX</div>
              </div>
            </div>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {COACH_CHECKS.map(item => (
                <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--green)', fontSize: 14, lineHeight: '1.7', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 300, lineHeight: 1.7 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 1024px) {
          #pricing-model > div > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          #pricing-model > div {
            padding: 80px 24px !important;
          }
        }
      `}</style>
    </section>
  );
}
