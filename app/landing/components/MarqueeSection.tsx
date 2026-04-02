'use client';

import React from 'react';
import { useReveal } from './shared';

const MARQUEE_TEXT = 'Nutrition IA \u2726 Push Pull Legs \u2726 Scanner Code-Barres \u2726 Recettes Fitness \u2726 Chat IA \u2726 HIIT & LISS \u2726 Records Personnels \u2726 Feedback Vid\u00e9o \u2726 Swiss Made \u2726 Coaching Connect\u00e9 \u2726 ';

export default function MarqueeSection() {
  const { ref, visible } = useReveal();

  return (
    <>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        ref={ref}
        style={{
          borderTop: '1px solid var(--gold-rule)',
          borderBottom: '1px solid var(--gold-rule)',
          padding: '14px 0',
          background: 'var(--surface)',
          overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            animation: 'marquee 35s linear infinite',
          }}
        >
          {[0, 1].map((n) => (
            <span
              key={n}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                letterSpacing: 4,
                color: 'var(--gold)',
                flexShrink: 0,
              }}
            >
              {MARQUEE_TEXT.split('\u2726').map((segment, i, arr) => (
                <React.Fragment key={i}>
                  {segment}
                  {i < arr.length - 1 && (
                    <span style={{ color: 'var(--text-dim)' }}>{'\u2726'}</span>
                  )}
                </React.Fragment>
              ))}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
