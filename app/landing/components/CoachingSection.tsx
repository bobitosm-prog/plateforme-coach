'use client';

import React from 'react';
import { RevealProps, Section, SectionTitle, FeatureGrid, COACHING_FEATURES } from './shared';

export default function CoachingSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef}>
      <Section>
        <SectionTitle title="COACHING PROFESSIONNEL" subtitle="Connecte-toi avec ton coach pour un suivi personnalis&eacute;" visible={visible} />
        <FeatureGrid features={COACHING_FEATURES} columns={3} />
      </Section>
    </div>
  );
}
