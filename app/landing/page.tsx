'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

/* ───────────────────────── reveal-on-scroll hook ───────────────────────── */
function useReveal(threshold = 0.15) {
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
const icons = {
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

const iconKeys = Object.keys(icons) as (keyof typeof icons)[];

/* ───────────────────────── data ───────────────────────── */
const NUTRITION_FEATURES = [
  { icon: 'diamond' as const, title: 'Plans 7 jours personnalisés', desc: "L'IA génère un plan alimentaire complet adapté à tes calories, protéines, glucides et lipides." },
  { icon: 'grid' as const, title: 'Scanner code-barres', desc: "Scanne les aliments de ton frigo. L'IA crée tes plans avec les produits que tu as déjà." },
  { icon: 'hexagon' as const, title: 'Liste de courses auto', desc: "Générée depuis ton plan semaine. Organisée par rayon de supermarché." },
  { icon: 'flame' as const, title: 'Recettes fitness IA', desc: "Recettes adaptées à tes macros avec les 170 aliments fitness de la base." },
  { icon: 'circle' as const, title: '170 aliments fitness', desc: "Base curatée d'aliments essentiels. Protéines, féculents, légumes, fruits, suppléments." },
  { icon: 'star' as const, title: 'Préférences personnalisées', desc: "Choisis tes aliments favoris. L'IA les utilise en priorité." },
];

const TRAINING_FEATURES = [
  { icon: 'triangle' as const, title: 'Push Pull Legs 6 jours', desc: "Programme hypertrophie scientifique. Chaque muscle entraîné 2x/semaine." },
  { icon: 'bolt' as const, title: 'Cardio HIIT & LISS', desc: "8 séances HIIT + 6 séances LISS. Timer intégré avec intervalles work/rest." },
  { icon: 'octagon' as const, title: 'Timer de repos intelligent', desc: "Timer automatique entre les séries. Vibration quand c'est reparti." },
  { icon: 'camera' as const, title: '89 exercices avec vidéos', desc: "Base de 89 exercices en français. Description, muscles ciblés, conseils." },
  { icon: 'calendar' as const, title: 'Calendrier des séances', desc: "Vue semaine et mois. Séances auto-planifiées. Rappels push." },
  { icon: 'trophy' as const, title: 'Records personnels', desc: "Détection automatique des PR (formule Epley). Historique de progression." },
];

const TRACKING_FEATURES = [
  { icon: 'bars' as const, title: 'Analytics avancé', desc: "5 graphiques : poids, calories, macros, volume, hydratation. Export CSV." },
  { icon: 'camera' as const, title: 'Photos avant/après', desc: "Comparateur avec slider. Superpose tes photos." },
  { icon: 'drop' as const, title: 'Suivi hydratation', desc: "Compteur d'eau quotidien. Objectif personnalisé." },
  { icon: 'flame' as const, title: 'Streak & gamification', desc: "Compte tes jours d'affilée. 7 badges à débloquer." },
  { icon: 'ring' as const, title: 'Courbe de poids', desc: "Graphique interactif 30/60/90 jours. Tendance moyenne mobile." },
  { icon: 'download' as const, title: 'Export données', desc: "Télécharge tes stats en CSV. Tout est à toi." },
];

const COACHING_FEATURES = [
  { icon: 'chat' as const, title: 'Messagerie temps réel', desc: "Chat direct avec ton coach. Read receipts. Notifications." },
  { icon: 'users' as const, title: 'Plans personnalisés', desc: "Ton coach ajuste programme et nutrition selon tes progrès." },
  { icon: 'refresh' as const, title: 'Demandes de changement', desc: "Demande un nouveau plan. Ton coach régénère avec l'IA." },
];

const STEPS = [
  { num: '01', title: 'Crée ton profil', desc: '2 minutes. Objectifs, mensurations, préférences.' },
  { num: '02', title: 'Scanne ton frigo', desc: "L'IA apprend ce que tu manges." },
  { num: '03', title: 'Suis ton programme', desc: 'PPL 6 jours + nutrition. Valide tes repas et séances.' },
  { num: '04', title: 'Mesure tes progrès', desc: 'Graphiques, records, photos.' },
];

const PRICING = [
  { name: 'Mensuel', price: 'CHF 10', period: '/mois', badge: null, highlight: false },
  { name: 'Annuel', price: 'CHF 80', period: '/an', badge: 'Populaire', highlight: true },
  { name: 'À vie', price: 'CHF 150', period: '', badge: 'Meilleure offre', highlight: false },
  { name: 'Coach Pro', price: 'CHF 50', period: '/mois', badge: null, highlight: false },
];

const PRICING_CHECKLIST = [
  'Plans nutrition IA illimités',
  'Programme PPL 6 jours',
  'Cardio HIIT & LISS',
  'Scanner code-barres',
  'Recettes fitness IA',
  'Liste de courses auto',
  'Chat IA illimité',
  'Analytics & records',
  'Photos avant/après',
  'Badges & gamification',
  '89 exercices avec vidéos',
  'Calendrier & rappels',
];

const FAQ_DATA = [
  { q: "C'est quoi MoovX ?", a: "MoovX est une plateforme de coaching fitness suisse propulsée par l'intelligence artificielle. Elle combine nutrition personnalisée, entraînement hypertrophie PPL, suivi de progression et coaching connecté." },
  { q: "Comment fonctionne la nutrition IA ?", a: "L'IA analyse ton profil (poids, objectif, activité) et génère des plans alimentaires sur 7 jours respectant exactement tes macros. Tu peux scanner ton frigo pour qu'elle utilise tes produits." },
  { q: "Le scanner code-barres fonctionne comment ?", a: "Scanne le code-barres de tes produits avec la caméra de ton téléphone. MoovX identifie l'aliment via OpenFoodFacts et l'ajoute à ton journal." },
  { q: "C'est quoi le programme PPL ?", a: "Push/Pull/Legs est un split d'entraînement sur 6 jours optimisé pour l'hypertrophie. Push (poitrine, épaules, triceps), Pull (dos, biceps), Legs (jambes, fessiers). Chaque muscle est travaillé 2 fois par semaine." },
  { q: "Mes données sont sécurisées ?", a: "Oui. MoovX utilise Supabase avec chiffrement de bout en bout. Tes données sont hébergées en Europe et tu peux les exporter ou supprimer ton compte à tout moment." },
  { q: "Je peux essayer gratuitement ?", a: "Oui ! Tu bénéficies de 10 jours d'essai gratuit avec accès à toutes les fonctionnalités. Sans engagement, sans carte de crédit requise." },
  { q: "Comment installer l'app ?", a: "MoovX est une Progressive Web App (PWA). Sur iPhone : ouvre Safari, bouton Partager, Ajouter à l'écran d'accueil. Sur Android : Chrome, menu, Installer l'application." },
  { q: "C'est quoi le Coach IA ?", a: "Un assistant intelligent qui connaît ton profil, tes objectifs et tes macros. Pose-lui n'importe quelle question sur la nutrition ou l'entraînement, il te répond de manière personnalisée en français." },
];

/* ───────────────────────── Feature Card ───────────────────────── */
function FeatureCard({ icon, title, desc, delay = 0, visible }: { icon: keyof typeof icons; title: string; desc: string; delay?: number; visible: boolean }) {
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
function Section({ id, children, style }: { id?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section id={id} style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px', ...style }}>
      {children}
    </section>
  );
}

function SectionTitle({ title, subtitle, visible }: { title: string; subtitle: string; visible: boolean }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 60, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', color: '#f8fafc', margin: '0 0 12px', letterSpacing: 2 }}>{title}</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, color: '#C9A84C', margin: 0 }}>{subtitle}</p>
    </div>
  );
}

/* ───────────────────────── Feature Grid ───────────────────────── */
function FeatureGrid({ features, columns = 3 }: { features: { icon: keyof typeof icons; title: string; desc: string }[]; columns?: number }) {
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
function FaqItem({ q, a }: { q: string; a: string }) {
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

/* ───────────────────────── Main Page ───────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const heroRev = useReveal(0.05);
  const marqueeRev = useReveal(0.1);
  const nutritionRev = useReveal();
  const trainingRev = useReveal();
  const trackingRev = useReveal();
  const coachIaRev = useReveal();
  const coachingRev = useReveal();
  const stepsRev = useReveal();
  const pwaRev = useReveal();
  const pricingRev = useReveal();
  const faqRev = useReveal();
  const geneveRev = useReveal();
  const ctaRev = useReveal();

  const smoothScroll = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; background: #050505; }

        @keyframes marqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .gold-btn {
          background: linear-gradient(135deg, #C9A84C, #b8943f);
          color: #050505;
          border: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .gold-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(201,168,76,0.3);
        }

        .ghost-btn {
          background: transparent;
          color: #f8fafc;
          border: 1px solid #333;
          padding: 14px 32px;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: border-color 0.2s, color 0.2s;
        }
        .ghost-btn:hover {
          border-color: #C9A84C;
          color: #C9A84C;
        }

        .pricing-card {
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 16px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: border-color 0.3s, transform 0.3s;
        }
        .pricing-card:hover {
          border-color: rgba(201,168,76,0.3);
          transform: translateY(-4px);
        }
        .pricing-card.highlight {
          border-color: #C9A84C;
          box-shadow: 0 0 40px rgba(201,168,76,0.1);
        }

        @media (max-width: 768px) {
          .nav-links a { padding: 6px 12px !important; font-size: 12px !important; }
          .hero-stats { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .fg-grid { grid-template-columns: 1fr !important; }
          .hero-buttons { flex-direction: column !important; align-items: stretch !important; }
          .hero-buttons a, .hero-buttons button { width: 100% !important; text-align: center !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .pwa-grid { grid-template-columns: 1fr !important; }
          .coaching-grid { grid-template-columns: 1fr !important; }
          .pwa-badges { grid-template-columns: 1fr 1fr !important; }
          .section-two-col { grid-template-columns: 1fr !important; }
          .section-two-col .col-image { order: -1; }
          .footer-inner { flex-direction: column !important; text-align: center !important; gap: 24px !important; }
          .footer-links { justify-content: center !important; }
        }
      `}</style>

      {/* Grain overlay */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.015,
        pointerEvents: 'none',
        zIndex: 9999,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px 128px',
      }} />

      <div style={{ background: '#050505', minHeight: '100vh', color: '#f8fafc' }}>

        {/* ─── NAVBAR ─── */}
        <nav style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 1000,
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: scrolled ? 'rgba(5,5,5,0.95)' : 'transparent',
          borderBottom: scrolled ? '1px solid rgba(201,168,76,0.15)' : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          transition: 'all 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#C9A84C', letterSpacing: 3 }}>MOOVX</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6b7280', borderLeft: '1px solid #333', paddingLeft: 12 }}>Swiss Made &middot; Swiss Quality</span>
          </div>
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/login" className="ghost-btn" style={{ padding: '8px 20px', fontSize: 13 }}>Connexion</Link>
            <Link href="/register-client" className="gold-btn" style={{ padding: '8px 20px', fontSize: 13 }}>Commencer</Link>
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <div ref={heroRev.ref} style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '100px 24px 60px',
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}>
          {/* Dark overlay */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 0,
          }} />

          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(60px, 10vw, 120px)',
            color: '#f8fafc',
            margin: '0 0 8px',
            letterSpacing: 4,
            lineHeight: 1,
            position: 'relative',
            zIndex: 1,
            opacity: heroRev.visible ? 1 : 0,
            transform: heroRev.visible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            TRANSFORME TON CORPS
          </h1>

          <p style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(20px, 3vw, 32px)',
            color: '#C9A84C',
            margin: '0 0 24px',
            letterSpacing: 6,
            position: 'relative',
            zIndex: 1,
            opacity: heroRev.visible ? 1 : 0,
            transform: heroRev.visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
          }}>
            DÉPASSE TES LIMITES
          </p>

          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 17,
            color: '#6b7280',
            maxWidth: 560,
            lineHeight: 1.7,
            margin: '0 0 40px',
            position: 'relative',
            zIndex: 1,
            opacity: heroRev.visible ? 1 : 0,
            transform: heroRev.visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
          }}>
            Coaching fitness à Genève propulsé par l'intelligence artificielle. Nutrition personnalisée, entraînement hypertrophie, suivi complet.
          </p>

          <div className="hero-buttons" style={{
            display: 'flex',
            gap: 16,
            marginBottom: 48,
            position: 'relative',
            zIndex: 1,
            opacity: heroRev.visible ? 1 : 0,
            transform: heroRev.visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.45s',
          }}>
            <Link href="/register-client" className="gold-btn">Commencer — 10 jours gratuits</Link>
            <a href="#nutrition" onClick={(e) => smoothScroll(e, 'nutrition')} className="ghost-btn">Découvrir &darr;</a>
          </div>

          <div className="hero-stats" style={{
            display: 'flex',
            gap: 40,
            flexWrap: 'wrap',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
            opacity: heroRev.visible ? 1 : 0,
            transition: 'opacity 0.8s 0.6s',
          }}>
            {[
              { val: '170+', label: 'Aliments' },
              { val: '89', label: 'Exercices' },
              { val: '6 Jours', label: 'PPL' },
              { val: '100%', label: 'Swiss Made' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#C9A84C' }}>{s.val}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── MARQUEE ─── */}
        <div ref={marqueeRev.ref} style={{
          borderTop: '1px solid rgba(201,168,76,0.2)',
          borderBottom: '1px solid rgba(201,168,76,0.2)',
          padding: '16px 0',
          overflow: 'hidden',
          opacity: marqueeRev.visible ? 1 : 0,
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
                {'Nutrition IA \u2726 Push Pull Legs \u2726 Scanner Code-Barres \u2726 Recettes Fitness \u2726 Liste de Courses \u2726 Chat IA \u2726 HIIT & LISS \u2726 Records Personnels \u2726 Swiss Made \u2726 Coaching Connecté \u2726 '}
              </span>
            ))}
          </div>
        </div>

        {/* ─── NUTRITION IA ─── */}
        <div ref={nutritionRev.ref} id="nutrition">
          <Section>
            <SectionTitle title="NUTRITION INTELLIGENTE" subtitle="Plans alimentaires générés par l'IA, adaptés à tes macros exacts" visible={nutritionRev.visible} />
            <div className="section-two-col" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 40,
              alignItems: 'center',
              marginBottom: 40,
              opacity: nutritionRev.visible ? 1 : 0,
              transform: nutritionRev.visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
            }}>
              <div>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(28px, 4vw, 40px)', color: '#f8fafc', margin: '0 0 16px', letterSpacing: 2 }}>NUTRITION SUR MESURE</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#a0a0a0', lineHeight: 1.8, margin: 0 }}>L&apos;IA génère des plans alimentaires personnalisés adaptés à tes macros exacts. Scanner code-barres, 170+ aliments fitness, recettes IA et liste de courses automatique. Coaching nutrition à Genève propulsé par MoovX.</p>
              </div>
              <div className="col-image">
                <img src="https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80" alt="Meal prep fitness nutrition Genève - MoovX coaching musculation" loading="lazy" style={{ width: '100%', borderRadius: 16 }} />
              </div>
            </div>
            <FeatureGrid features={NUTRITION_FEATURES} />
          </Section>
        </div>

        {/* ─── ENTRAINEMENT ─── */}
        <div ref={trainingRev.ref} id="training">
          <Section>
            <SectionTitle title="ENTRAÎNEMENT HYPERTROPHIE" subtitle="Programme Push/Pull/Legs 6 jours + Cardio HIIT & LISS" visible={trainingRev.visible} />
            <div className="section-two-col" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 40,
              alignItems: 'center',
              marginBottom: 40,
              opacity: trainingRev.visible ? 1 : 0,
              transform: trainingRev.visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
            }}>
              <div className="col-image">
                <img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80" alt="Programme musculation PPL Genève - MoovX coaching fitness" loading="lazy" style={{ width: '100%', borderRadius: 16 }} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(28px, 4vw, 40px)', color: '#f8fafc', margin: '0 0 16px', letterSpacing: 2 }}>PROGRAMME PPL 6 JOURS</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#a0a0a0', lineHeight: 1.8, margin: 0 }}>Programme Push/Pull/Legs scientifique pour l&apos;hypertrophie. 89 exercices guidés, timer de repos intelligent, cardio HIIT &amp; LISS, records personnels automatiques. Entraînement musculation à Genève avec MoovX.</p>
              </div>
            </div>
            <FeatureGrid features={TRAINING_FEATURES} />
          </Section>
        </div>

        {/* ─── SUIVI & ANALYTICS ─── */}
        <div ref={trackingRev.ref}>
          <Section>
            <SectionTitle title="SUIVI COMPLET" subtitle="Graphiques, badges, photos — mesure chaque progrès" visible={trackingRev.visible} />
            <FeatureGrid features={TRACKING_FEATURES} />
          </Section>
        </div>

        {/* ─── COACH IA ─── */}
        <div ref={coachIaRev.ref} id="coach-ia">
          <Section>
            <SectionTitle title="TON COACH IA PERSONNEL" subtitle="Pose n'importe quelle question fitness ou nutrition — à Genève, disponible 24/7" visible={coachIaRev.visible} />
            <div style={{
              maxWidth: 700,
              margin: '0 auto',
              background: '#111',
              border: '1px solid #1a1a1a',
              borderRadius: 16,
              padding: '48px 40px',
              textAlign: 'center',
              opacity: coachIaRev.visible ? 1 : 0,
              transform: coachIaRev.visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
            }}>
              <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>{icons.robot}</div>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                color: '#a0a0a0',
                lineHeight: 1.8,
                margin: '0 0 32px',
              }}>
                Le Coach IA de MoovX connaît ton profil, tes objectifs, tes macros. Il te répond en français, personnalisé et motivant. Disponible 24/7.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {[
                  'Comment atteindre mes macros ?',
                  'Quel exercice pour les pectoraux ?',
                  'Remplacer un aliment du plan ?',
                ].map(q => (
                  <span key={q} style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: '#C9A84C',
                    border: '1px solid rgba(201,168,76,0.25)',
                    borderRadius: 20,
                    padding: '8px 16px',
                    background: 'rgba(201,168,76,0.05)',
                  }}>{q}</span>
                ))}
              </div>
            </div>
          </Section>
        </div>

        {/* ─── COACHING CONNECTE ─── */}
        <div ref={coachingRev.ref}>
          <Section>
            <SectionTitle title="COACHING PROFESSIONNEL" subtitle="Connecte-toi avec ton coach pour un suivi personnalisé" visible={coachingRev.visible} />
            <FeatureGrid features={COACHING_FEATURES} columns={3} />
          </Section>
        </div>

        {/* ─── COMMENT CA MARCHE ─── */}
        <div ref={stepsRev.ref} id="how">
          <Section>
            <SectionTitle title="COMMENT ÇA MARCHE" subtitle="4 étapes pour transformer ton corps" visible={stepsRev.visible} />
            <div className="steps-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
              position: 'relative',
            }}>
              {STEPS.map((s, i) => (
                <div key={s.num} style={{
                  textAlign: 'center',
                  opacity: stepsRev.visible ? 1 : 0,
                  transform: stepsRev.visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 120}ms`,
                }}>
                  <div style={{
                    width: 56, height: 56,
                    borderRadius: '50%',
                    border: '2px solid #C9A84C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 22,
                    color: '#C9A84C',
                  }}>{s.num}</div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      top: 28,
                      left: `calc(${(i + 0.5) * 25}% + 28px)`,
                      width: `calc(25% - 56px)`,
                      height: 2,
                      background: 'linear-gradient(90deg, #C9A84C, rgba(201,168,76,0.2))',
                    }} />
                  )}
                  <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16, color: '#f8fafc', margin: '0 0 8px' }}>{s.title}</h4>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ─── PWA INSTALL ─── */}
        <div ref={pwaRev.ref}>
          <Section>
            <SectionTitle title="INSTALLE MOOVX EN 30 SECONDES" subtitle="Pas besoin d'App Store. Installe depuis ton navigateur." visible={pwaRev.visible} />
            <div className="pwa-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
              maxWidth: 700,
              margin: '0 auto 40px',
              opacity: pwaRev.visible ? 1 : 0,
              transform: pwaRev.visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
            }}>
              {[
                { device: 'iPhone', steps: 'Safari → Partager → Écran d\'accueil' },
                { device: 'Android', steps: 'Chrome → Menu → Installer' },
              ].map(d => (
                <div key={d.device} style={{
                  background: '#0d0d0d',
                  border: '1px solid #1a1a1a',
                  borderRadius: 12,
                  padding: '28px 24px',
                  textAlign: 'center',
                }}>
                  <div style={{ marginBottom: 12 }}>{icons.phone}</div>
                  <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16, color: '#f8fafc', margin: '0 0 8px' }}>{d.device}</h4>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6b7280', margin: 0 }}>{d.steps}</p>
                </div>
              ))}
            </div>
            <div className="pwa-badges" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              maxWidth: 600,
              margin: '0 auto',
              opacity: pwaRev.visible ? 1 : 0,
              transition: 'opacity 0.6s 0.4s',
            }}>
              {['Plein écran', 'Notifications', 'Hors ligne', 'Mises à jour auto'].map(b => (
                <div key={b} style={{
                  textAlign: 'center',
                  padding: '12px',
                  border: '1px solid #1a1a1a',
                  borderRadius: 8,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: '#6b7280',
                }}>{b}</div>
              ))}
            </div>
          </Section>
        </div>

        {/* ─── PRICING ─── */}
        <div ref={pricingRev.ref} id="pricing">
          <Section>
            <SectionTitle title="TARIFS SIMPLES" subtitle="Commence gratuitement, évolue à ton rythme" visible={pricingRev.visible} />
            <div className="pricing-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 20,
              marginBottom: 40,
            }}>
              {PRICING.map((p, i) => (
                <div key={p.name} className={`pricing-card ${p.highlight ? 'highlight' : ''}`} style={{
                  opacity: pricingRev.visible ? 1 : 0,
                  transform: pricingRev.visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms`,
                  position: 'relative',
                  background: '#0d0d0d',
                  border: p.highlight ? '1px solid #C9A84C' : '1px solid #1a1a1a',
                  borderRadius: 16,
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column' as const,
                  alignItems: 'center',
                  boxShadow: p.highlight ? '0 0 40px rgba(201,168,76,0.1)' : 'none',
                }}>
                  {p.badge && (
                    <span style={{
                      position: 'absolute',
                      top: -12,
                      background: '#C9A84C',
                      color: '#050505',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 14px',
                      borderRadius: 20,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>{p.badge}</span>
                  )}
                  <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6b7280', margin: '8px 0 16px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>{p.name}</h3>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, color: '#f8fafc', lineHeight: 1 }}>{p.price}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{p.period}</div>
                  <div style={{ width: '100%', marginBottom: 24 }}>
                    {PRICING_CHECKLIST.slice(0, 6).map(item => (
                      <div key={item} style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: '#6b7280',
                        padding: '6px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {item}
                      </div>
                    ))}
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#555', padding: '6px 0' }}>+ 6 autres fonctionnalités</div>
                  </div>
                  <Link href="/register-client" className={p.highlight ? 'gold-btn' : 'ghost-btn'} style={{ width: '100%', textAlign: 'center', fontSize: 14, padding: '12px 0' }}>
                    {p.name === 'Coach Pro' ? 'Devenir Coach' : 'Commencer'}
                  </Link>
                </div>
              ))}
            </div>
            <p style={{
              textAlign: 'center',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: '#6b7280',
              opacity: pricingRev.visible ? 1 : 0,
              transition: 'opacity 0.6s 0.5s',
            }}>
              10 jours d'essai gratuit &middot; Sans engagement &middot; Toutes fonctionnalités incluses
            </p>
          </Section>
        </div>

        {/* ─── FAQ ─── */}
        <div ref={faqRev.ref} id="faq">
          <Section>
            <SectionTitle title="QUESTIONS FRÉQUENTES" subtitle="Tout ce que tu dois savoir sur MoovX" visible={faqRev.visible} />
            <div style={{
              maxWidth: 700,
              margin: '0 auto',
              opacity: faqRev.visible ? 1 : 0,
              transform: faqRev.visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
            }}>
              {FAQ_DATA.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </div>
          </Section>
        </div>

        {/* ─── SEO GENÈVE ─── */}
        <div ref={geneveRev.ref}>
          <Section>
            <SectionTitle title="COACHING FITNESS À GENÈVE" subtitle="La première plateforme de coaching fitness suisse propulsée par l'IA" visible={geneveRev.visible} />
            <div className="section-two-col" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 40,
              alignItems: 'center',
              opacity: geneveRev.visible ? 1 : 0,
              transform: geneveRev.visible ? 'translateY(0)' : 'translateY(20px)',
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
                  Basé à Genève, MoovX est la première plateforme de coaching fitness suisse propulsée par l&apos;intelligence artificielle. Que tu sois à Plainpalais, aux Eaux-Vives, à Carouge ou aux Pâquis, ton coach IA t&apos;accompagne partout. Plans nutrition adaptés aux produits suisses, programme musculation professionnel, suivi de progression complet. Commence ta transformation dès aujourd&apos;hui.
                </p>
              </div>
              <div className="col-image">
                <img src="https://images.unsplash.com/photo-1573108037329-37aa135a142e?w=800&q=80" alt="Coaching fitness Genève Suisse - MoovX nutrition musculation" loading="lazy" style={{ width: '100%', borderRadius: 16 }} />
              </div>
            </div>
          </Section>
        </div>

        {/* ─── CTA FINAL ─── */}
        <div ref={ctaRev.ref}>
          <section style={{
            padding: '120px 24px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Gold orb */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 600, height: 600,
              background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(32px, 5vw, 56px)',
              color: '#f8fafc',
              margin: '0 0 16px',
              letterSpacing: 2,
              position: 'relative',
              opacity: ctaRev.visible ? 1 : 0,
              transform: ctaRev.visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              PRÊT À TRANSFORMER TON CORPS ?
            </h2>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 17,
              color: '#6b7280',
              margin: '0 0 32px',
              position: 'relative',
              opacity: ctaRev.visible ? 1 : 0,
              transition: 'opacity 0.6s 0.15s',
            }}>
              Rejoins MoovX et commence ta transformation dès aujourd'hui.
            </p>
            <div style={{ position: 'relative', opacity: ctaRev.visible ? 1 : 0, transition: 'opacity 0.6s 0.3s' }}>
              <Link href="/register-client" className="gold-btn" style={{ fontSize: 16, padding: '16px 40px' }}>
                Commencer — 10 jours gratuits
              </Link>
            </div>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: '#555',
              marginTop: 16,
              position: 'relative',
              opacity: ctaRev.visible ? 1 : 0,
              transition: 'opacity 0.6s 0.45s',
            }}>
              Sans engagement &middot; Résiliable à tout moment
            </p>
          </section>
        </div>

        {/* ─── FOOTER ─── */}
        <footer style={{
          borderTop: '1px solid #1a1a1a',
          padding: '40px 24px',
        }}>
          <div className="footer-inner" style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#C9A84C', letterSpacing: 2 }}>MOOVX</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#6b7280' }}>Swiss Made &middot; Swiss Quality</span>
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#555', margin: 0 }}>
                &copy; 2026 MoovX &middot; Genève, Suisse
              </p>
            </div>
            <div className="footer-links" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Application', href: '/login' },
                { label: 'Tarifs', href: '#pricing' },
                { label: 'FAQ', href: '#faq' },
                { label: 'Contact', href: 'mailto:contact@moovx.ch' },
                { label: 'CGU', href: '#' },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={link.href.startsWith('#') ? (e) => { e.preventDefault(); const id = link.href.slice(1); if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); } : undefined}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: '#6b7280',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A84C'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
