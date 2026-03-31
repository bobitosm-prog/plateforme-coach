'use client';

import React from 'react';
import { RevealProps, Section, SectionTitle, icons } from './shared';

export default function CoachIaSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef} id="coach-ia">
      <Section>
        <SectionTitle title="TON COACH IA PERSONNEL" subtitle="Pose n'importe quelle question fitness ou nutrition — &agrave; Gen&egrave;ve, disponible 24/7" visible={visible} />
        <div style={{
          maxWidth: 700,
          margin: '0 auto',
          background: '#111',
          border: '1px solid #1a1a1a',
          borderRadius: 16,
          padding: '48px 40px',
          textAlign: 'center',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
        }}>
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>{icons.robot}</div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            color: '#a0a0a0',
            lineHeight: 1.8,
            margin: '0 0 32px',
          }}>
            Le Coach IA de MoovX conna&icirc;t ton profil, tes objectifs, tes macros. Il te r&eacute;pond en fran&ccedil;ais, personnalis&eacute; et motivant. Disponible 24/7.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {[
              'Comment atteindre mes macros ?',
              'Quel exercice pour les pectoraux ?',
              'Remplacer un aliment du plan ?',
            ].map(q => (
              <span key={q} style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: '#C9A84C',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: 20,
                padding: '8px 16px',
                background: 'rgba(201,168,76,0.05)',
              }}>{q}</span>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
