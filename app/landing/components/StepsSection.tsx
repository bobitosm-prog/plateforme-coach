'use client';

import React from 'react';
import { RevealProps, Section, SectionTitle, STEPS } from './shared';

export default function StepsSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef} id="how">
      <Section>
        <SectionTitle title="COMMENT &Ccedil;A MARCHE" subtitle="4 &eacute;tapes pour transformer ton corps" visible={visible} />
        <div className="steps-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 24,
          position: 'relative',
        }}>
          {STEPS.map((s, i) => (
            <div key={s.num} style={{
              textAlign: 'center',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 120}ms`,
            }}>
              <div style={{
                width: 56, height: 56,
                borderRadius: '50%',
                border: '2px solid #C9A84C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 22,
                color: '#C9A84C',
              }}>{s.num}</div>
              {i < STEPS.length - 1 && (
                <div style={{
                  position: 'absolute',
                  top: 28,
                  left: `calc(${(i + 0.5) * 25}% + 28px)`,
                  width: `calc(25% - 56px)`,
                  height: 2,
                  background: 'linear-gradient(90deg, #C9A84C, rgba(201,168,76,0.2))',
                }} />
              )}
              <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16, color: '#f8fafc', margin: '0 0 8px' }}>{s.title}</h4>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
