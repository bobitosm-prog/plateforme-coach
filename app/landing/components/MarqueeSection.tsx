'use client';

import React from 'react';
import { RevealProps } from './shared';

export default function MarqueeSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef} style={{
      borderTop: '1px solid rgba(201,168,76,0.2)',
      borderBottom: '1px solid rgba(201,168,76,0.2)',
      padding: '16px 0',
      overflow: 'hidden',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.6s',
    }}>
      <div style={{
        display: 'flex',
        animation: 'marqueeScroll 30s linear infinite',
        whiteSpace: 'nowrap',
      }}>
        {[1, 2].map(n => (
          <span key={n} style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18,
            color: '#C9A84C',
            letterSpacing: 4,
            paddingRight: 0,
          }}>
            {'Nutrition IA \u2726 Push Pull Legs \u2726 Scanner Code-Barres \u2726 Recettes Fitness \u2726 Liste de Courses \u2726 Chat IA \u2726 HIIT & LISS \u2726 Records Personnels \u2726 Swiss Made \u2726 Coaching Connect\u00e9 \u2726 '}
          </span>
        ))}
      </div>
    </div>
  );
}
