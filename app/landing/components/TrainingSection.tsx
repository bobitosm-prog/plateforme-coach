'use client';

import React from 'react';
import { RevealProps, Section, SectionTitle, FeatureGrid, TRAINING_FEATURES } from './shared';

export default function TrainingSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef} id="training">
      <Section>
        <SectionTitle title="ENTRA&Icirc;NEMENT HYPERTROPHIE" subtitle="Programme Push/Pull/Legs 6 jours + Cardio HIIT &amp; LISS" visible={visible} />
        <div className="section-two-col" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
          alignItems: 'center',
          marginBottom: 40,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
        }}>
          <div className="col-image">
            <img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80" alt="Programme musculation PPL Gen&egrave;ve - MoovX coaching fitness" loading="lazy" style={{ width: '100%', borderRadius: 16 }} />
          </div>
          <div>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(28px, 4vw, 40px)', color: '#f8fafc', margin: '0 0 16px', letterSpacing: 2 }}>PROGRAMME PPL 6 JOURS</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#a0a0a0', lineHeight: 1.8, margin: 0 }}>Programme Push/Pull/Legs scientifique pour l&apos;hypertrophie. 89 exercices guid&eacute;s, timer de repos intelligent, cardio HIIT &amp; LISS, records personnels automatiques. Entra&icirc;nement musculation &agrave; Gen&egrave;ve avec MoovX.</p>
          </div>
        </div>
        <FeatureGrid features={TRAINING_FEATURES} />
      </Section>
    </div>
  );
}
