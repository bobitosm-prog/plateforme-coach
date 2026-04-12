'use client';

import React from 'react';
import { useReveal } from './shared';

const FEATURES = [
  { num: '01', title: 'Messagerie temps réel', desc: 'Chat direct avec chaque client. Read receipts et notifications push intégrées.', emoji: '💬' },
  { num: '02', title: 'Plans personnalisés', desc: 'Génère nutrition et programmes personnalisés pour chaque client en quelques secondes.', emoji: '📋' },
  { num: '03', title: 'Alertes inactifs', desc: "Détection automatique des clients qui ne s'entraînent plus depuis 3 jours.", emoji: '🔔' },
  { num: '04', title: 'Templates programmes', desc: "Crée tes programmes modèles et assigne-les en un clic.", emoji: '⚡' },
  { num: '05', title: 'Feedback vidéo', desc: "Le client filme, tu corriges la forme directement dans l'app.", emoji: '🎥' },
  { num: '06', title: 'Export CSV', desc: 'Clients, paiements, progressions — toutes tes données exportables.', emoji: '📊' },
];

export default function CoachingPro() {
  const { ref, visible } = useReveal();

  return (
    <section
      id="coaching"
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 64px 80px' }}>
        {/* Section header */}
        <div style={{ marginBottom: 40 }}>
          <span style={{
            display: 'inline-flex', fontFamily: 'var(--font-alt)', fontWeight: 700,
            fontSize: 11, letterSpacing: 2, color: 'var(--gold)', background: 'var(--gold-dim)',
            border: '1px solid var(--gold-rule)', padding: '5px 14px', textTransform: 'uppercase',
          }}>
            05 — Coaching Pro
          </span>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: 2, lineHeight: 0.95, color: 'var(--text)', margin: '20px 0 0',
          }}>
            OUTILS POUR LES COACHES
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 300, margin: '16px 0 0' }}>
            Dashboard complet, messagerie, plans personnalisés, feedback vidéo
          </p>
        </div>
      </div>

      {/* Horizontal scroll carousel — full width */}
      <div style={{
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        paddingLeft: 'max(64px, calc((100vw - 1280px) / 2 + 64px))',
        paddingRight: 32, paddingBottom: 8,
        display: 'flex', gap: 16,
        scrollSnapType: 'x mandatory',
        msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {FEATURES.map((f) => (
          <div
            key={f.num}
            style={{
              flex: '0 0 320px',
              scrollSnapAlign: 'start',
              background: 'var(--surface)',
              border: '1px solid var(--text-dim)',
              borderRadius: 16,
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 220,
              transition: 'border-color 0.3s, transform 0.3s',
              cursor: 'default',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-rule)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--text-dim)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.emoji}</div>
              <h3 style={{
                fontFamily: 'var(--font-alt)', fontWeight: 800, fontSize: 18,
                letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text)', margin: 0,
              }}>{f.title}</h3>
              <p style={{
                fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6,
                fontWeight: 300, margin: '10px 0 0',
              }}>{f.desc}</p>
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 48,
              color: 'rgba(212,168,67,0.06)', lineHeight: 1, marginTop: 16,
              alignSelf: 'flex-end',
            }}>{f.num}</span>
          </div>
        ))}
        {/* Spacer for last card to not hug edge */}
        <div style={{ flex: '0 0 32px' }} />
      </div>

      <div style={{ height: 80 }} />

      <style>{`
        #coaching > div:nth-child(2)::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          #coaching > div:first-child { padding: 80px 24px 80px !important; }
          #coaching > div:nth-child(2) { padding-left: 24px !important; }
          #coaching > div:nth-child(2) > div { flex: 0 0 280px !important; }
        }
      `}</style>
    </section>
  );
}
