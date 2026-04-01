'use client';

import React from 'react';
import { RevealProps, Section, SectionTitle, FeatureCard } from './shared';

const ADVANCED_FEATURES: { icon: 'refresh' | 'bolt' | 'shield' | 'grid' | 'camera' | 'download'; title: string; desc: string }[] = [
  { icon: 'refresh', title: 'Remplacement intelligent', desc: "Pas de mat\u00e9riel ? Blessure ? L'IA te propose 3 alternatives adapt\u00e9es \u00e0 tes contraintes en temps r\u00e9el." },
  { icon: 'bolt', title: 'Adapte ta s\u00e9ance', desc: "T'as que 30 minutes ? L'IA raccourcit ton programme en gardant les exercices essentiels." },
  { icon: 'shield', title: 'Alertes d\u00e9crochage', desc: "Le coach voit en temps r\u00e9el quels clients n'ont pas fait de s\u00e9ance depuis 3 jours." },
  { icon: 'grid', title: 'Templates de programmes', desc: "Le coach cr\u00e9e des programmes mod\u00e8les et les assigne \u00e0 ses clients en un clic." },
  { icon: 'camera', title: 'Feedback vid\u00e9o', desc: "Le client filme son ex\u00e9cution, le coach commente et corrige la forme." },
  { icon: 'download', title: 'Export CSV', desc: "Le coach exporte la liste clients, les paiements et les progressions en CSV." },
];

export default function AdvancedFeaturesSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef}>
      <Section>
        <SectionTitle title="FONCTIONNALIT&Eacute;S AVANC&Eacute;ES" subtitle="Les outils que les autres n'ont pas encore" visible={visible} />
        <div className="fg-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          width: '100%',
        }}>
          {ADVANCED_FEATURES.map((f, i) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} delay={i * 80} visible={visible} />
          ))}
        </div>
      </Section>
    </div>
  );
}
