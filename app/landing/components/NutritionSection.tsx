'use client';

import React from 'react';
import { RevealProps, Section, SectionTitle, FeatureGrid, NUTRITION_FEATURES } from './shared';

export default function NutritionSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef} id="nutrition">
      <Section>
        <SectionTitle title="NUTRITION INTELLIGENTE" subtitle="Plans alimentaires g&eacute;n&eacute;r&eacute;s par l'IA, adapt&eacute;s &agrave; tes macros exacts" visible={visible} />
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
          <div>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(28px, 4vw, 40px)', color: '#f8fafc', margin: '0 0 16px', letterSpacing: 2 }}>NUTRITION SUR MESURE</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#a0a0a0', lineHeight: 1.8, margin: 0 }}>L&apos;IA g&eacute;n&egrave;re des plans alimentaires personnalis&eacute;s adapt&eacute;s &agrave; tes macros exacts. Scanner code-barres, 170+ aliments fitness, recettes IA et liste de courses automatique. Coaching nutrition &agrave; Gen&egrave;ve propuls&eacute; par MoovX.</p>
          </div>
          <div className="col-image">
            <img src="https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80" alt="Meal prep fitness nutrition Gen&egrave;ve - MoovX coaching musculation" loading="lazy" style={{ width: '100%', borderRadius: 16 }} />
          </div>
        </div>
        <FeatureGrid features={NUTRITION_FEATURES} />
      </Section>
    </div>
  );
}
