'use client';

import React, { useState, useEffect, useRef } from 'react';

/* ───────────────────────── reveal-on-scroll hook ───────────────────────── */
export function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ───────────────────────── SVG Icons ───────────────────────── */
export const icons = {
  diamond: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 2L26 14L14 26L2 14L14 2Z" stroke="#C9A84C" strokeWidth="1.5" fill="none"/></svg>
  ),
  circle: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="#C9A84C" strokeWidth="1.5"/></svg>
  ),
  hexagon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 2L25 8V20L14 26L3 20V8L14 2Z" stroke="#C9A84C" strokeWidth="1.5"/></svg>
  ),
  square: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="4" width="20" height="20" stroke="#C9A84C" strokeWidth="1.5" rx="2"/></svg>
  ),
  triangle: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 3L26 25H2L14 3Z" stroke="#C9A84C" strokeWidth="1.5"/></svg>
  ),
  star: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 2L17 10.5H26L19 16L21.5 25L14 19.5L6.5 25L9 16L2 10.5H11L14 2Z" stroke="#C9A84C" strokeWidth="1.5"/></svg>
  ),
  octagon: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M10 2H18L26 10V18L18 26H10L2 18V10L10 2Z" stroke="#C9A84C" strokeWidth="1.5"/></svg>
  ),
  cross: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 4V24M4 14H24" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
  ring: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="10" stroke="#C9A84C" strokeWidth="1.5"/><circle cx="14" cy="14" r="5" stroke="#C9A84C" strokeWidth="1"/></svg>
  ),
  bolt: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M16 2L6 16H14L12 26L22 12H14L16 2Z" stroke="#C9A84C" strokeWidth="1.5"/></svg>
  ),
  grid: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="9" height="9" stroke="#C9A84C" strokeWidth="1.2" rx="1"/><rect x="16" y="3" width="9" height="9" stroke="#C9A84C" strokeWidth="1.2" rx="1"/><rect x="3" y="16" width="9" height="9" stroke="#C9A84C" strokeWidth="1.2" rx="1"/><rect x="16" y="16" width="9" height="9" stroke="#C9A84C" strokeWidth="1.2" rx="1"/></svg>
  ),
  bars: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="16" width="4" height="10" stroke="#C9A84C" strokeWidth="1.2" rx="1"/><rect x="12" y="8" width="4" height="18" stroke="#C9A84C" strokeWidth="1.2" rx="1"/><rect x="20" y="4" width="4" height="22" stroke="#C9A84C" strokeWidth="1.2" rx="1"/></svg>
  ),
  camera: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="8" width="22" height="16" rx="2" stroke="#C9A84C" strokeWidth="1.5"/><circle cx="14" cy="16" r="4" stroke="#C9A84C" strokeWidth="1.5"/><path d="M10 8L12 4H16L18 8" stroke="#C9A84C" strokeWidth="1.5"/></svg>
  ),
  drop: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 3C14 3 6 13 6 18C6 22.4 9.6 26 14 26C18.4 26 22 22.4 22 18C22 13 14 3 14 3Z" stroke="#C9A84C" strokeWidth="1.5"/></svg>
  ),
  flame: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 2C14 2 8 10 8 16C8 19.3 10.7 22 14 22C17.3 22 20 19.3 20 16C20 10 14 2 14 2Z" stroke="#C9A84C" strokeWidth="1.5"/><path d="M14 14C14 14 12 17 12 18.5C12 19.6 12.9 20.5 14 20.5C15.1 20.5 16 19.6 16 18.5C16 17 14 14 14 14Z" stroke="#C9A84C" strokeWidth="1"/></svg>
  ),
  trophy: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M8 4H20V12C20 15.3 17.3 18 14 18C10.7 18 8 15.3 8 12V4Z" stroke="#C9A84C" strokeWidth="1.5"/><path d="M8 7H5C5 10 6 12 8 12" stroke="#C9A84C" strokeWidth="1.2"/><path d="M20 7H23C23 10 22 12 20 12" stroke="#C9A84C" strokeWidth="1.2"/><path d="M11 22H17" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 18V22" stroke="#C9A84C" strokeWidth="1.5"/></svg>
  ),
  download: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 4V18M14 18L9 13M14 18L19 13" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 22V24H24V22" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  robot: (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="8" y="12" width="24" height="20" rx="4" stroke="#C9A84C" strokeWidth="1.5"/><circle cx="15" cy="22" r="2.5" stroke="#C9A84C" strokeWidth="1.2"/><circle cx="25" cy="22" r="2.5" stroke="#C9A84C" strokeWidth="1.2"/><path d="M16 28H24" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round"/><path d="M20 6V12" stroke="#C9A84C" strokeWidth="1.5"/><circle cx="20" cy="5" r="2" stroke="#C9A84C" strokeWidth="1.2"/><path d="M4 20H8M32 20H36" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
  chat: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 6H24V20H10L4 24V6Z" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="10" cy="13" r="1" fill="#C9A84C"/><circle cx="14" cy="13" r="1" fill="#C9A84C"/><circle cx="18" cy="13" r="1" fill="#C9A84C"/></svg>
  ),
  users: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="10" cy="10" r="4" stroke="#C9A84C" strokeWidth="1.5"/><circle cx="20" cy="10" r="3" stroke="#C9A84C" strokeWidth="1.2"/><path d="M2 24C2 20 5.6 17 10 17C14.4 17 18 20 18 24" stroke="#C9A84C" strokeWidth="1.5"/><path d="M18 17C21 17 24 19 24 22" stroke="#C9A84C" strokeWidth="1.2"/></svg>
  ),
  refresh: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 14C4 8.5 8.5 4 14 4C18 4 21.4 6.5 23 10" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/><path d="M24 14C24 19.5 19.5 24 14 24C10 24 6.6 21.5 5 18" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/><path d="M20 10H24V6" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 18H4V22" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  calendar: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="6" width="22" height="19" rx="2" stroke="#C9A84C" strokeWidth="1.5"/><path d="M3 12H25" stroke="#C9A84C" strokeWidth="1.5"/><path d="M9 3V6M19 3V6" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
  shield: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 3L4 8V14C4 20 8.5 25 14 26C19.5 25 24 20 24 14V8L14 3Z" stroke="#C9A84C" strokeWidth="1.5"/></svg>
  ),
  phone: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="7" y="2" width="14" height="24" rx="3" stroke="#C9A84C" strokeWidth="1.5"/><path d="M12 22H16" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round"/></svg>
  ),
};

export type IconKey = keyof typeof icons;

/* ───────────────────────── data ───────────────────────── */
export const NUTRITION_FEATURES = [
  { icon: 'diamond' as const, title: 'Plans 7 jours personnalis\u00e9s', desc: "L'IA g\u00e9n\u00e8re un plan alimentaire complet adapt\u00e9 \u00e0 tes calories, prot\u00e9ines, glucides et lipides." },
  { icon: 'grid' as const, title: 'Scanner code-barres', desc: "Scanne les aliments de ton frigo. L'IA cr\u00e9e tes plans avec les produits que tu as d\u00e9j\u00e0." },
  { icon: 'hexagon' as const, title: 'Liste de courses auto', desc: "G\u00e9n\u00e9r\u00e9e depuis ton plan semaine. Organis\u00e9e par rayon de supermarch\u00e9." },
  { icon: 'flame' as const, title: 'Recettes fitness IA', desc: "Recettes adapt\u00e9es \u00e0 tes macros avec les 170 aliments fitness de la base." },
  { icon: 'circle' as const, title: '170 aliments fitness', desc: "Base curat\u00e9e d'aliments essentiels. Prot\u00e9ines, f\u00e9culents, l\u00e9gumes, fruits, suppl\u00e9ments." },
  { icon: 'star' as const, title: 'Pr\u00e9f\u00e9rences personnalis\u00e9es', desc: "Choisis tes aliments favoris. L'IA les utilise en priorit\u00e9." },
];

export const TRAINING_FEATURES = [
  { icon: 'triangle' as const, title: 'Push Pull Legs 6 jours', desc: "Programme hypertrophie scientifique. Chaque muscle entra\u00een\u00e9 2x/semaine." },
  { icon: 'bolt' as const, title: 'Cardio HIIT & LISS', desc: "8 s\u00e9ances HIIT + 6 s\u00e9ances LISS. Timer int\u00e9gr\u00e9 avec intervalles work/rest." },
  { icon: 'octagon' as const, title: 'Timer de repos intelligent', desc: "Timer automatique entre les s\u00e9ries. Vibration quand c'est reparti." },
  { icon: 'camera' as const, title: '89 exercices avec vid\u00e9os', desc: "Base de 89 exercices en fran\u00e7ais. Description, muscles cibl\u00e9s, conseils." },
  { icon: 'calendar' as const, title: 'Calendrier des s\u00e9ances', desc: "Vue semaine et mois. S\u00e9ances auto-planifi\u00e9es. Rappels push." },
  { icon: 'trophy' as const, title: 'Records personnels', desc: "D\u00e9tection automatique des PR (formule Epley). Historique de progression." },
];

export const TRACKING_FEATURES = [
  { icon: 'bars' as const, title: 'Analytics avanc\u00e9', desc: "5 graphiques : poids, calories, macros, volume, hydratation. Export CSV." },
  { icon: 'camera' as const, title: 'Photos avant/apr\u00e8s', desc: "Comparateur avec slider. Superpose tes photos." },
  { icon: 'drop' as const, title: 'Suivi hydratation', desc: "Compteur d'eau quotidien. Objectif personnalis\u00e9." },
  { icon: 'flame' as const, title: 'Streak & gamification', desc: "Compte tes jours d'affil\u00e9e. 7 badges \u00e0 d\u00e9bloquer." },
  { icon: 'ring' as const, title: 'Courbe de poids', desc: "Graphique interactif 30/60/90 jours. Tendance moyenne mobile." },
  { icon: 'download' as const, title: 'Export donn\u00e9es', desc: "T\u00e9l\u00e9charge tes stats en CSV. Tout est \u00e0 toi." },
];

export const COACHING_FEATURES = [
  { icon: 'chat' as const, title: 'Messagerie temps r\u00e9el', desc: "Chat direct avec ton coach. Read receipts. Notifications." },
  { icon: 'users' as const, title: 'Plans personnalis\u00e9s', desc: "Ton coach ajuste programme et nutrition selon tes progr\u00e8s." },
  { icon: 'refresh' as const, title: 'Demandes de changement', desc: "Demande un nouveau plan. Ton coach r\u00e9g\u00e9n\u00e8re avec l'IA." },
];

export const STEPS = [
  { num: '01', title: 'Cr\u00e9e ton profil', desc: '2 minutes. Objectifs, mensurations, pr\u00e9f\u00e9rences.' },
  { num: '02', title: 'Scanne ton frigo', desc: "L'IA apprend ce que tu manges." },
  { num: '03', title: 'Suis ton programme', desc: 'PPL 6 jours + nutrition. Valide tes repas et s\u00e9ances.' },
  { num: '04', title: 'Mesure tes progr\u00e8s', desc: 'Graphiques, records, photos.' },
];

export const PRICING = [
  { name: 'Mensuel', price: 'CHF 10', period: '/mois', badge: null, highlight: false },
  { name: 'Annuel', price: 'CHF 80', period: '/an', badge: 'Populaire', highlight: true },
  { name: '\u00c0 vie', price: 'CHF 150', period: '', badge: 'Meilleure offre', highlight: false },
  { name: 'Coach Pro', price: 'CHF 50', period: '/mois', badge: null, highlight: false },
];

export const PRICING_CHECKLIST = [
  'Plans nutrition IA illimit\u00e9s',
  'Programme PPL 6 jours',
  'Cardio HIIT & LISS',
  'Scanner code-barres',
  'Recettes fitness IA',
  'Liste de courses auto',
  'Chat IA illimit\u00e9',
  'Analytics & records',
  'Photos avant/apr\u00e8s',
  'Badges & gamification',
  '89 exercices avec vid\u00e9os',
  'Calendrier & rappels',
];

export const FAQ_DATA = [
  { q: "C'est quoi MoovX ?", a: "MoovX est une plateforme de coaching fitness suisse propuls\u00e9e par l'intelligence artificielle. Elle combine nutrition personnalis\u00e9e, entra\u00eenement hypertrophie PPL, suivi de progression et coaching connect\u00e9." },
  { q: "Comment fonctionne la nutrition IA ?", a: "L'IA analyse ton profil (poids, objectif, activit\u00e9) et g\u00e9n\u00e8re des plans alimentaires sur 7 jours respectant exactement tes macros. Tu peux scanner ton frigo pour qu'elle utilise tes produits." },
  { q: "Le scanner code-barres fonctionne comment ?", a: "Scanne le code-barres de tes produits avec la cam\u00e9ra de ton t\u00e9l\u00e9phone. MoovX identifie l'aliment via OpenFoodFacts et l'ajoute \u00e0 ton journal." },
  { q: "C'est quoi le programme PPL ?", a: "Push/Pull/Legs est un split d'entra\u00eenement sur 6 jours optimis\u00e9 pour l'hypertrophie. Push (poitrine, \u00e9paules, triceps), Pull (dos, biceps), Legs (jambes, fessiers). Chaque muscle est travaill\u00e9 2 fois par semaine." },
  { q: "Mes donn\u00e9es sont s\u00e9curis\u00e9es ?", a: "Oui. MoovX utilise Supabase avec chiffrement de bout en bout. Tes donn\u00e9es sont h\u00e9berg\u00e9es en Europe et tu peux les exporter ou supprimer ton compte \u00e0 tout moment." },
  { q: "Je peux essayer gratuitement ?", a: "Oui ! Tu b\u00e9n\u00e9ficies de 10 jours d'essai gratuit avec acc\u00e8s \u00e0 toutes les fonctionnalit\u00e9s. Sans engagement, sans carte de cr\u00e9dit requise." },
  { q: "Comment installer l'app ?", a: "MoovX est une Progressive Web App (PWA). Sur iPhone : ouvre Safari, bouton Partager, Ajouter \u00e0 l'\u00e9cran d'accueil. Sur Android : Chrome, menu, Installer l'application." },
  { q: "C'est quoi le Coach IA ?", a: "Un assistant intelligent qui conna\u00eet ton profil, tes objectifs et tes macros. Pose-lui n'importe quelle question sur la nutrition ou l'entra\u00eenement, il te r\u00e9pond de mani\u00e8re personnalis\u00e9e en fran\u00e7ais." },
  { q: "Comment fonctionnent les paiements pour les coaches ?", a: "Les coaches fixent librement leur tarif mensuel. Les clients paient directement via Stripe. Le paiement est automatiquement transf\u00e9r\u00e9 sur le compte du coach, apr\u00e8s d\u00e9duction de 3% de commission MoovX. Les coaches re\u00e7oivent donc 97% du montant." },
  { q: "Les clients invit\u00e9s par un coach doivent payer la plateforme ?", a: "Non. Les clients invit\u00e9s par un coach acc\u00e8dent gratuitement \u00e0 toutes les fonctionnalit\u00e9s de MoovX. Ils paient uniquement le tarif de coaching fix\u00e9 par leur coach. Les clients sans coach paient l'abonnement MoovX standard (d\u00e8s CHF 10/mois)." },
  { q: "Je peux remplacer un exercice si j'ai pas le mat\u00e9riel ?", a: "Oui ! L'IA analyse tes contraintes (pas de mat\u00e9riel, blessure, manque de temps) et te propose 3 alternatives adapt\u00e9es en temps r\u00e9el. Tu choisis celle qui te convient et elle remplace l'exercice dans ta s\u00e9ance." },
  { q: "Mon coach peut voir mes vid\u00e9os d'exercice ?", a: "Oui ! Tu peux filmer ton ex\u00e9cution directement depuis l'app et l'envoyer \u00e0 ton coach. Il re\u00e7oit la vid\u00e9o, la regarde et te donne un feedback personnalis\u00e9 pour corriger ta forme." },
];

/* ───────────────────────── Feature Card ───────────────────────── */
export function FeatureCard({ icon, title, desc, delay = 0, visible }: { icon: IconKey; title: string; desc: string; delay?: number; visible: boolean }) {
  return (
    <div style={{
      background: '#0d0d0d',
      border: '1px solid #1a1a1a',
      borderRadius: 12,
      padding: '28px 24px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(30px)',
      transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)';
      e.currentTarget.style.boxShadow = '0 8px 30px rgba(201,168,76,0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = '#1a1a1a';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{ marginBottom: 16 }}>{icons[icon]}</div>
      <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 17, color: '#f8fafc', margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

/* ───────────────────────── Section wrapper ───────────────────────── */
export function Section({ id, children, style }: { id?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section id={id} style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px', ...style }}>
      {children}
    </section>
  );
}

export function SectionTitle({ title, subtitle, visible }: { title: string; subtitle: string; visible: boolean }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 60, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', color: '#f8fafc', margin: '0 0 12px', letterSpacing: 2 }}>{title}</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, color: '#C9A84C', margin: 0 }}>{subtitle}</p>
    </div>
  );
}

/* ───────────────────────── Feature Grid ───────────────────────── */
export function FeatureGrid({ features, columns = 3 }: { features: { icon: IconKey; title: string; desc: string }[]; columns?: number }) {
  const rev = useReveal();
  return (
    <div ref={rev.ref} className="fg-grid" style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 20,
      width: '100%',
    }}>
      {features.map((f, i) => (
        <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} delay={i * 80} visible={rev.visible} />
      ))}
    </div>
  );
}

/* ───────────────────────── FAQ Accordion ───────────────────────── */
export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #1a1a1a' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 16,
          fontWeight: 600,
          color: '#f8fafc',
          textAlign: 'left',
        }}
      >
        {q}
        <span style={{ color: '#C9A84C', fontSize: 22, transform: open ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.3s', flexShrink: 0, marginLeft: 16 }}>+</span>
      </button>
      <div style={{
        maxHeight: open ? 300 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.4s ease',
      }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.7, paddingRight: 40 }}>{a}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── RevealProps type ───────────────────────── */
export interface RevealProps {
  revealRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
}
