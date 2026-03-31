'use client';

import React from 'react';
import { RevealProps, Section, SectionTitle, FeatureGrid, TRACKING_FEATURES } from './shared';

export default function TrackingSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef}>
      <Section>
        <SectionTitle title="SUIVI COMPLET" subtitle="Graphiques, badges, photos — mesure chaque progr&egrave;s" visible={visible} />
        <FeatureGrid features={TRACKING_FEATURES} />
      </Section>
    </div>
  );
}
