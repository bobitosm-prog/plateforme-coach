'use client';

import React from 'react';
import { RevealProps, Section, SectionTitle } from './shared';

export default function GeneveSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef}>
      <Section>
        <SectionTitle title="COACHING FITNESS &Agrave; GEN&Egrave;VE" subtitle="La premi&egrave;re plateforme de coaching fitness suisse propuls&eacute;e par l'IA" visible={visible} />
        <div className="section-two-col" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
          alignItems: 'center',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
        }}>
          <div>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 17,
              color: '#a0a0a0',
              lineHeight: 1.8,
              margin: 0,
            }}>
              Bas&eacute; &agrave; Gen&egrave;ve, MoovX est la premi&egrave;re plateforme de coaching fitness suisse propuls&eacute;e par l&apos;intelligence artificielle. Que tu sois &agrave; Plainpalais, aux Eaux-Vives, &agrave; Carouge ou aux P&acirc;quis, ton coach IA t&apos;accompagne partout. Plans nutrition adapt&eacute;s aux produits suisses, programme musculation professionnel, suivi de progression complet. Commence ta transformation d&egrave;s aujourd&apos;hui.
            </p>
          </div>
          <div className="col-image">
            <img src="https://images.unsplash.com/photo-1573108037329-37aa135a142e?w=800&q=80" alt="Coaching fitness Gen&egrave;ve Suisse - MoovX nutrition musculation" loading="lazy" style={{ width: '100%', borderRadius: 16 }} />
          </div>
        </div>
      </Section>
    </div>
  );
}
