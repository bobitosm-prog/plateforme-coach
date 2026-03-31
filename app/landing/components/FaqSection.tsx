'use client';

import React from 'react';
import { RevealProps, Section, SectionTitle, FaqItem, FAQ_DATA } from './shared';

export default function FaqSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef} id="faq">
      <Section>
        <SectionTitle title="QUESTIONS FR&Eacute;QUENTES" subtitle="Tout ce que tu dois savoir sur MoovX" visible={visible} />
        <div style={{
          maxWidth: 700,
          margin: '0 auto',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
        }}>
          {FAQ_DATA.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </Section>
    </div>
  );
}
