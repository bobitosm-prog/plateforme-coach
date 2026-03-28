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

/* ───────────────────────── data ───────────────────────── */
const FEATURES = [
  { title: 'Nutrition IA', desc: 'Plans alimentaires personnalisés générés par intelligence artificielle. 170 aliments fitness.', shape: 'diamond' },
  { title: 'Push Pull Legs', desc: 'Programme d\'entraînement structuré sur 6 jours, adapté à ton niveau.', shape: 'circle' },
  { title: 'Suivi précis', desc: 'Poids, mensurations, photos — visualise ta progression semaine après semaine.', shape: 'square' },
  { title: 'Coach connecté', desc: 'Ton coach reçoit tes données en temps réel et ajuste ton plan.', shape: 'triangle' },
  { title: 'Liste de courses', desc: 'Génération automatique à partir de ton plan alimentaire. Un tap, c\'est prêt.', shape: 'hexagon' },
  { title: 'App installable', desc: 'Progressive Web App. Ajoute MOOVX à ton écran d\'accueil, zéro téléchargement.', shape: 'star' },
];

const PRICING = [
  { name: 'Mensuel', price: 'CHF 10', period: '/mois', badge: null, highlight: false },
  { name: 'Annuel', price: 'CHF 80', period: '/an', badge: 'Populaire', highlight: true },
  { name: 'A vie', price: 'CHF 150', period: '', badge: 'Meilleure offre', highlight: false },
  { name: 'Coach Pro', price: 'CHF 50', period: '/mois', badge: null, highlight: false },
];

const TESTIMONIALS = [
  { initials: 'L.M', name: 'Lucas M.', quote: 'J\'ai perdu 8 kg en 3 mois sans jamais avoir faim. Les plans IA sont incroyablement précis.', result: '-8 kg en 3 mois' },
  { initials: 'S.R', name: 'Sarah R.', quote: 'Enfin une app qui combine nutrition et entraînement de manière intelligente. Je recommande à 100%.', result: '+12 kg muscle' },
  { initials: 'N.B', name: 'Nicolas B.', quote: 'Le suivi par mon coach via l\'app change tout. On est connecté en permanence, c\'est motivant.', result: '-15% body fat' },
];

const FAQ_DATA = [
  { q: 'Combien coûte MOOVX ?', a: 'MOOVX est disponible dès CHF 10/mois. L\'abonnement annuel à CHF 80/an est le plus populaire. Une option à vie à CHF 150 est également disponible. Les coachs peuvent souscrire au plan Coach Pro à CHF 50/mois.' },
  { q: 'Est-ce une application à télécharger ?', a: 'MOOVX est une Progressive Web App (PWA). Tu y accèdes via ton navigateur puis tu l\'ajoutes à ton écran d\'accueil. Aucun téléchargement sur l\'App Store ou Google Play n\'est nécessaire.' },
  { q: 'L\'IA remplace-t-elle un vrai coach ?', a: 'Non. L\'IA génère tes plans alimentaires et d\'entraînement, mais ton coach a accès à toutes tes données et peut ajuster manuellement ton programme à tout moment. C\'est le meilleur des deux mondes.' },
  { q: 'Mes données sont-elles sécurisées ?', a: 'Oui. Toutes les données sont chiffrées et stockées sur des serveurs sécurisés. Nous respectons le RGPD et les lois suisses sur la protection des données (LPD). Tu peux supprimer ton compte à tout moment.' },
  { q: 'Y a-t-il une période d\'essai ?', a: 'Oui, tu bénéficies de 10 jours d\'essai gratuit à la création de ton compte. Aucune carte bancaire n\'est requise pour commencer.' },
  { q: 'Puis-je résilier à tout moment ?', a: 'Absolument. Tous nos abonnements sont sans engagement et résiliables en un clic depuis ton profil.' },
];

const PROBLEMS = [
  { title: 'Le problème', color: '#e05050', items: ['Plans génériques qui ignorent ton métabolisme', 'Pas de lien entre nutrition et entraînement', 'Progression impossible à mesurer'] },
  { title: 'Notre approche', color: '#C9A84C', items: ['IA calibrée sur 170 aliments fitness', 'Nutrition + training synchronisés', 'Suivi poids, mensurations, photos'] },
  { title: 'Le résultat', color: '#50c070', items: ['Un plan unique adapté à TON corps', 'Progrès visibles dès les premières semaines', 'Motivation constante, résultats durables'] },
];

/* ───────────────────────── shapes for feature icons ───────────────────────── */
function GoldShape({ shape }: { shape: string }) {
  const s = 36;
  const color = '#C9A84C';
  const svgs: Record<string, React.ReactNode> = {
    diamond: <svg width={s} height={s} viewBox="0 0 36 36"><rect x="8" y="8" width="20" height="20" rx="2" transform="rotate(45 18 18)" fill="none" stroke={color} strokeWidth="1.5" /></svg>,
    circle: <svg width={s} height={s} viewBox="0 0 36 36"><circle cx="18" cy="18" r="10" fill="none" stroke={color} strokeWidth="1.5" /></svg>,
    square: <svg width={s} height={s} viewBox="0 0 36 36"><rect x="8" y="8" width="20" height="20" rx="2" fill="none" stroke={color} strokeWidth="1.5" /></svg>,
    triangle: <svg width={s} height={s} viewBox="0 0 36 36"><polygon points="18,6 30,30 6,30" fill="none" stroke={color} strokeWidth="1.5" /></svg>,
    hexagon: <svg width={s} height={s} viewBox="0 0 36 36"><polygon points="18,4 31,11 31,25 18,32 5,25 5,11" fill="none" stroke={color} strokeWidth="1.5" /></svg>,
    star: <svg width={s} height={s} viewBox="0 0 36 36"><polygon points="18,4 21,14 32,14 23,20 26,31 18,24 10,31 13,20 4,14 15,14" fill="none" stroke={color} strokeWidth="1.5" /></svg>,
  };
  return <div style={{ marginBottom: 16 }}>{svgs[shape] ?? svgs.diamond}</div>;
}

/* ───────────────────────── component ───────────────────────── */
export default function LandingPage() {
  /* hero stagger */
  const [heroReady, setHeroReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHeroReady(true), 100); return () => clearTimeout(t); }, []);

  /* FAQ accordion */
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const toggleFaq = useCallback((i: number) => setOpenFaq(prev => prev === i ? null : i), []);

  /* reveal refs */
  const marqueeR = useReveal();
  const problemR = useReveal();
  const featuresR = useReveal();
  const howR = useReveal();
  const installR = useReveal();
  const pricingR = useReveal();
  const testR = useReveal();
  const faqR = useReveal();
  const ctaR = useReveal();

  return (
    <>
      {/* ── global styles ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        .lp { --gold: #C9A84C; --gold-light: #F0D060; --bg: #050505; --bg2: #0a0a0a; --card: #0d0d0d; --border: #141414; --divider: rgba(201,168,76,0.06); font-family: var(--font-body, 'DM Sans', sans-serif); color: #fff; background: linear-gradient(180deg, #050505 0%, #0a0a0a 100%); overflow-x: hidden; }
        .lp h1, .lp h2, .lp h3, .lp .display { font-family: var(--font-display, 'Bebas Neue', sans-serif); }

        /* grain overlay */
        .grain { position: fixed; inset: 0; pointer-events: none; z-index: 9999; opacity: 0.015; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-repeat: repeat; background-size: 200px; }

        /* reveal */
        .rv { opacity: 0; transform: translateY(32px); transition: opacity 0.8s cubic-bezier(.16,1,.3,1), transform 0.8s cubic-bezier(.16,1,.3,1); }
        .rv.show { opacity: 1; transform: translateY(0); }

        /* hero stagger children */
        .hs > * { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .hs.ready > *:nth-child(1) { opacity: 1; transform: translateY(0); transition-delay: 0s; }
        .hs.ready > *:nth-child(2) { opacity: 1; transform: translateY(0); transition-delay: 0.12s; }
        .hs.ready > *:nth-child(3) { opacity: 1; transform: translateY(0); transition-delay: 0.12s; }
        .hs.ready > *:nth-child(4) { opacity: 1; transform: translateY(0); transition-delay: 0.24s; }
        .hs.ready > *:nth-child(5) { opacity: 1; transform: translateY(0); transition-delay: 0.36s; }
        .hs.ready > *:nth-child(6) { opacity: 1; transform: translateY(0); transition-delay: 0.48s; }
        .hs.ready > *:nth-child(7) { opacity: 1; transform: translateY(0); transition-delay: 0.6s; }

        /* marquee */
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-track { display: flex; width: max-content; animation: marquee 40s linear infinite; }

        /* gold shimmer button */
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .btn-gold { display: inline-flex; align-items: center; justify-content: center; padding: 16px 36px; border: none; border-radius: 6px; font-family: var(--font-body, 'DM Sans', sans-serif); font-weight: 600; font-size: 15px; letter-spacing: 0.03em; color: #000; cursor: pointer; text-decoration: none; background: linear-gradient(105deg, #C9A84C 0%, #F0D060 40%, #C9A84C 60%, #F0D060 100%); background-size: 200% 100%; animation: shimmer 4s ease-in-out infinite; transition: transform 0.2s, box-shadow 0.2s; }
        .btn-gold:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(201,168,76,0.25); }

        .btn-ghost { display: inline-flex; align-items: center; justify-content: center; padding: 16px 36px; border: 1px solid rgba(201,168,76,0.3); border-radius: 6px; font-family: var(--font-body, 'DM Sans', sans-serif); font-weight: 500; font-size: 15px; color: #C9A84C; cursor: pointer; background: transparent; text-decoration: none; transition: border-color 0.3s, background 0.3s; }
        .btn-ghost:hover { border-color: #C9A84C; background: rgba(201,168,76,0.05); }

        /* feature card */
        .feat-card { background: #0d0d0d; border: 1px solid #141414; border-radius: 10px; padding: 36px 28px; transition: transform 0.35s cubic-bezier(.16,1,.3,1), border-color 0.35s, box-shadow 0.35s; }
        .feat-card:hover { transform: translateY(-4px); border-color: rgba(201,168,76,0.35); box-shadow: 0 4px 24px rgba(201,168,76,0.08); }

        /* pricing card */
        .price-card { background: #0d0d0d; border: 1px solid #141414; border-radius: 12px; padding: 40px 28px; text-align: center; transition: transform 0.35s cubic-bezier(.16,1,.3,1), border-color 0.35s; }
        .price-card:hover { transform: translateY(-4px); }
        .price-card.pop { border-color: rgba(201,168,76,0.5); transform: scale(1.04); box-shadow: 0 0 40px rgba(201,168,76,0.08); }
        .price-card.pop:hover { transform: scale(1.04) translateY(-4px); }

        /* testimonial */
        .testi-card { background: #0a0a0a; border: 1px solid #141414; border-radius: 10px; padding: 36px 28px; }

        /* faq */
        .faq-item { border-bottom: 1px solid rgba(201,168,76,0.06); }
        .faq-q { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; cursor: pointer; font-weight: 500; font-size: 17px; color: #ccc; transition: color 0.2s; background: none; border: none; width: 100%; text-align: left; font-family: inherit; }
        .faq-q:hover { color: #C9A84C; }
        .faq-a { overflow: hidden; transition: max-height 0.4s ease, opacity 0.4s ease; max-height: 0; opacity: 0; }
        .faq-a.open { max-height: 300px; opacity: 1; }

        /* divider */
        .divider { width: 100%; height: 1px; background: rgba(201,168,76,0.06); }

        /* section */
        .section { padding: 120px 24px; max-width: 1200px; margin: 0 auto; }
        .section-title { font-size: clamp(32px, 5vw, 56px); letter-spacing: 0.04em; text-align: center; margin-bottom: 64px; }

        @media (max-width: 768px) {
          .section { padding: 60px 20px; }
          .section-title { margin-bottom: 40px; }
          .hero-btns { flex-direction: column; gap: 12px !important; }
          .hero-btns a, .hero-btns button { width: 100%; }
          .grid-2x3 { grid-template-columns: 1fr !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-4 { grid-template-columns: 1fr !important; }
          .steps { flex-direction: column !important; gap: 40px !important; }
          .step-line { display: none !important; }
          .hero-stats { flex-direction: column; gap: 16px !important; }
          .price-card.pop { transform: scale(1); }
          .price-card.pop:hover { transform: translateY(-4px); }
          .install-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="lp">
        {/* grain */}
        <div className="grain" />

        {/* ═══════════════ 1. HERO ═══════════════ */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 24px 40px', position: 'relative', background: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(201,168,76,0.04) 0%, transparent 70%)' }}>
          <div className={`hs ${heroReady ? 'ready' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #C9A84C, #F0D060)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 22, color: '#000', fontWeight: 700 }}>M</div>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.12em', color: '#fff' }}>MOOVX</span>
                <div style={{ fontSize: 10, letterSpacing: '0.16em', color: '#555', fontWeight: 300, marginTop: -2 }}>Swiss Made &middot; Swiss Quality</div>
              </div>
            </div>

            {/* Title */}
            <h1 className="display" style={{ fontSize: 'clamp(60px, 10vw, 120px)', lineHeight: 0.95, letterSpacing: '0.03em', marginBottom: 16 }}>TRANSFORME TON CORPS</h1>

            {/* Gold subtitle */}
            <p className="display" style={{ fontSize: 'clamp(20px, 3vw, 32px)', color: '#C9A84C', letterSpacing: '0.1em', marginBottom: 28 }}>D&Eacute;PASSE TES LIMITES</p>

            {/* Body */}
            <p style={{ maxWidth: 560, color: '#666', fontWeight: 300, fontSize: 16, lineHeight: 1.7, marginBottom: 40 }}>
              Plans alimentaires et entra&icirc;nement g&eacute;n&eacute;r&eacute;s par l&rsquo;intelligence artificielle. 170&nbsp;aliments fitness. R&eacute;sultats mesurables.
            </p>

            {/* Buttons */}
            <div className="hero-btns" style={{ display: 'flex', gap: 16, marginBottom: 64 }}>
              <Link href="/register-client" className="btn-gold">Commencer &mdash; D&egrave;s CHF&nbsp;10/mois</Link>
              <a href="#features" className="btn-ghost">D&eacute;couvrir &darr;</a>
            </div>

            {/* Stats */}
            <div className="hero-stats" style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
              {[['170+', 'Aliments'], ['6 Jours', 'Training'], ['100%', 'Swiss Made']].map(([val, label], i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#C9A84C', letterSpacing: '0.04em' }}>{val}</div>
                  <div style={{ fontSize: 12, color: '#555', fontWeight: 300, letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="divider" />

        {/* ═══════════════ 2. MARQUEE ═══════════════ */}
        <div ref={marqueeR.ref} className={`rv ${marqueeR.visible ? 'show' : ''}`} style={{ overflow: 'hidden', padding: '18px 0', borderTop: '1px solid rgba(201,168,76,0.06)', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
          <div className="marquee-track">
            {[0, 1].map(k => (
              <span key={k} style={{ fontSize: 13, letterSpacing: '0.12em', color: '#1a1a1a', fontWeight: 400, whiteSpace: 'nowrap', paddingRight: 80 }}>
                {'Nutrition IA \u2726 Push Pull Legs \u2726 170 aliments fitness \u2726 Suivi progression \u2726 Coach connect\u00e9 \u2726 Swiss Made \u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'}
                {'Nutrition IA \u2726 Push Pull Legs \u2726 170 aliments fitness \u2726 Suivi progression \u2726 Coach connect\u00e9 \u2726 Swiss Made \u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'}
              </span>
            ))}
          </div>
        </div>

        {/* ═══════════════ 3. PROBLEM / SOLUTION ═══════════════ */}
        <div className="divider" />
        <div ref={problemR.ref} className={`rv ${problemR.visible ? 'show' : ''}`}>
          <div className="section">
            <h2 className="section-title">POURQUOI MOOVX&nbsp;?</h2>
            <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
              {PROBLEMS.map((col, i) => (
                <div key={i} style={{ background: '#0a0a0a', border: '1px solid #141414', borderRadius: 10, padding: '36px 28px' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.06em', color: col.color, marginBottom: 24 }}>{col.title}</h3>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {col.items.map((item, j) => (
                      <li key={j} style={{ fontSize: 15, fontWeight: 300, color: '#999', lineHeight: 1.6, paddingLeft: 16, borderLeft: `2px solid ${col.color}30` }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* ═══════════════ 4. FEATURES ═══════════════ */}
        <div ref={featuresR.ref} className={`rv ${featuresR.visible ? 'show' : ''}`} id="features">
          <div className="section">
            <h2 className="section-title">TOUT CE DONT TU AS BESOIN</h2>
            <div className="grid-2x3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {FEATURES.map((f, i) => (
                <div key={i} className="feat-card">
                  <GoldShape shape={f.shape} />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.06em', marginBottom: 10, color: '#eee' }}>{f.title}</h3>
                  <p style={{ fontSize: 14, fontWeight: 300, color: '#777', lineHeight: 1.7 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* ═══════════════ 5. HOW IT WORKS ═══════════════ */}
        <div ref={howR.ref} className={`rv ${howR.visible ? 'show' : ''}`}>
          <div className="section">
            <h2 className="section-title">COMMENT &Ccedil;A MARCHE</h2>
            <div className="steps" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, position: 'relative' }}>
              {['Cr\u00e9e ton profil', 'Plan IA instantan\u00e9', 'Progresse chaque jour'].map((step, i) => (
                <React.Fragment key={i}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, flex: '0 0 200px', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', border: '1.5px solid #C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 22, color: '#C9A84C' }}>{i + 1}</div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: '#ccc', letterSpacing: '0.02em' }}>{step}</span>
                  </div>
                  {i < 2 && <div className="step-line" style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(201,168,76,0.3), rgba(201,168,76,0.08))', minWidth: 40, maxWidth: 160 }} />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* ═══════════════ 5b. INSTALL PWA ═══════════════ */}
        <div ref={installR.ref} className={`rv ${installR.visible ? 'show' : ''}`}>
          <div className="section">
            <h2 className="section-title">INSTALLE MOOVX EN 30 SECONDES</h2>
            <p style={{ textAlign: 'center', color: '#666', fontSize: 15, fontWeight: 300, maxWidth: 500, margin: '0 auto 48px' }}>
              Pas besoin d&apos;App Store. Installe directement depuis ton navigateur.
            </p>
            <div className="install-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 800, margin: '0 auto' }}>
              {/* iOS */}
              <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 20, padding: '36px 28px' }}>
                <svg width="28" height="34" viewBox="0 0 28 34" fill="none" style={{ marginBottom: 20 }}>
                  <path d="M23.2 11.3c-.12.08-3.2 1.84-3.2 5.63 0 4.4 3.86 5.95 3.97 5.99-.02.07-.62 2.11-2.04 4.18-1.25 1.81-2.55 3.62-4.53 3.62s-2.49-1.15-4.78-1.15c-2.23 0-3.02 1.19-4.84 1.19s-3.05-1.67-4.53-3.71C1.02 24.1 0 20.2 0 16.5c0-5.92 3.84-9.05 7.63-9.05 2.01 0 3.69 1.32 4.95 1.32 1.21 0 3.1-1.4 5.4-1.4.87 0 4 .08 5.32 3.43zM18.8 1.65c.96-1.13 1.65-2.7 1.65-4.27 0-.22-.02-.44-.05-.62-1.57.06-3.44 1.05-4.57 2.36-.88 1.02-1.72 2.59-1.72 4.19 0 .24.04.47.06.55.1.02.27.04.44.04 1.41 0 3.2-.95 4.19-2.25z" fill="#fff"/>
                </svg>
                <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: '#F8FAFC', marginBottom: 24 }}>Sur iPhone</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {[
                    ['Ouvre app.moovx.ch dans Safari', '🌐'],
                    ['Appuie sur le bouton Partager ⬆️', '📤'],
                    ['Choisis « Sur l\u2019\u00e9cran d\u2019accueil »', '📲'],
                  ].map(([text, icon], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#C9A84C', fontFamily: 'var(--font-display)', flexShrink: 0 }}>{i + 1}</div>
                      <span style={{ fontSize: 14, color: '#aaa', fontWeight: 400, lineHeight: 1.6 }}>{text}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#444', marginTop: 20, fontStyle: 'italic' }}>Fonctionne uniquement avec Safari, pas Chrome.</p>
              </div>

              {/* Android */}
              <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 20, padding: '36px 28px' }}>
                <svg width="28" height="32" viewBox="0 0 28 32" fill="none" style={{ marginBottom: 20 }}>
                  <path d="M1.54 10.34c-.85 0-1.54.74-1.54 1.65v8.24c0 .91.69 1.65 1.54 1.65s1.54-.74 1.54-1.65v-8.24c0-.91-.69-1.65-1.54-1.65zm4.23-.62v13.73c0 .85.65 1.55 1.44 1.55h1.57v4.14c0 .91.69 1.65 1.54 1.65s1.54-.74 1.54-1.65V25h2.28v4.14c0 .91.69 1.65 1.54 1.65s1.54-.74 1.54-1.65V25h1.57c.79 0 1.44-.7 1.44-1.55V9.72H5.77zm20.69.62c-.85 0-1.54.74-1.54 1.65v8.24c0 .91.69 1.65 1.54 1.65s1.54-.74 1.54-1.65v-8.24c0-.91-.69-1.65-1.54-1.65zM17.75 1.29l1.47-2.7a.31.31 0 00-.13-.42.29.29 0 00-.4.14L17.2 1.03C16.26.62 15.18.38 14 .38s-2.26.24-3.2.65L9.31-1.69a.29.29 0 00-.4-.14.31.31 0 00-.13.42l1.47 2.7C7.62 2.68 5.93 5.26 5.77 8.3h16.46c-.16-3.04-1.85-5.62-4.48-7.01zM10.42 5.52a.82.82 0 01-.81-.83c0-.46.36-.83.81-.83s.81.37.81.83-.36.83-.81.83zm7.16 0a.82.82 0 01-.81-.83c0-.46.36-.83.81-.83s.81.37.81.83-.36.83-.81.83z" fill="#78C257"/>
                </svg>
                <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: '#F8FAFC', marginBottom: 24 }}>Sur Android</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {[
                    ['Ouvre app.moovx.ch dans Chrome', '🌐'],
                    ['Appuie sur le menu \u22ee (3 points en haut)', '⋮'],
                    ['Choisis « Installer l\u2019application »', '📲'],
                  ].map(([text], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#C9A84C', fontFamily: 'var(--font-display)', flexShrink: 0 }}>{i + 1}</div>
                      <span style={{ fontSize: 14, color: '#aaa', fontWeight: 400, lineHeight: 1.6 }}>{text}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#444', marginTop: 20, fontStyle: 'italic' }}>Fonctionne avec Chrome, Edge, Samsung Internet.</p>
              </div>
            </div>

            {/* PWA badges */}
            <p style={{ textAlign: 'center', color: '#555', fontSize: 14, fontWeight: 300, maxWidth: 600, margin: '36px auto 20px', lineHeight: 1.7 }}>
              Une fois install&eacute;e, MoovX fonctionne comme une app native : plein &eacute;cran, notifications, acc&egrave;s hors ligne.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10 }}>
              {['Plein écran', 'Notifications', 'Hors ligne', 'Mises à jour auto'].map(b => (
                <span key={b} style={{ fontSize: 12, fontWeight: 500, color: '#C9A84C', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 20, padding: '6px 16px' }}>✓ {b}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* ═══════════════ 6. PRICING ═══════════════ */}
        <div ref={pricingR.ref} className={`rv ${pricingR.visible ? 'show' : ''}`}>
          <div className="section">
            <h2 className="section-title">TARIFS SIMPLES</h2>
            <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, alignItems: 'center' }}>
              {PRICING.map((p, i) => (
                <div key={i} className={`price-card ${p.highlight ? 'pop' : ''}`}>
                  {p.badge && (
                    <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#000', background: 'linear-gradient(105deg, #C9A84C, #F0D060)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>{p.badge}</div>
                  )}
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.06em', color: '#ccc', marginBottom: 12 }}>{p.name}</h3>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: '#fff', letterSpacing: '0.02em' }}>
                    {p.price}<span style={{ fontSize: 16, color: '#666', fontWeight: 300, fontFamily: 'var(--font-body)' }}>{p.period}</span>
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <Link href="/register-client" className="btn-gold" style={{ width: '100%', fontSize: 13, padding: '12px 20px' }}>Commencer</Link>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: 40, fontSize: 14, fontWeight: 300, color: '#555', letterSpacing: '0.02em' }}>
              &#10003; Sans engagement &middot; &#10003; R&eacute;siliable &middot; &#10003; 10&nbsp;jours d&rsquo;essai gratuit
            </p>
          </div>
        </div>

        <div className="divider" />

        {/* ═══════════════ 7. TESTIMONIALS ═══════════════ */}
        <div ref={testR.ref} className={`rv ${testR.visible ? 'show' : ''}`}>
          <div className="section">
            <h2 className="section-title">ILS EN PARLENT</h2>
            <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="testi-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 16, color: '#C9A84C', letterSpacing: '0.04em' }}>{t.initials}</div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: '#ccc' }}>{t.name}</span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 300, color: '#888', lineHeight: 1.7, marginBottom: 20 }}>&ldquo;{t.quote}&rdquo;</p>
                  <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: '#C9A84C', background: 'rgba(201,168,76,0.08)', borderRadius: 20, padding: '5px 14px' }}>{t.result}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* ═══════════════ 8. FAQ ═══════════════ */}
        <div ref={faqR.ref} className={`rv ${faqR.visible ? 'show' : ''}`}>
          <div className="section" style={{ maxWidth: 760 }}>
            <h2 className="section-title">QUESTIONS FR&Eacute;QUENTES</h2>
            <div>
              {FAQ_DATA.map((item, i) => (
                <div key={i} className="faq-item">
                  <button className="faq-q" onClick={() => toggleFaq(i)}>
                    <span>{item.q}</span>
                    <span style={{ fontSize: 22, color: '#C9A84C', transition: 'transform 0.3s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)', flexShrink: 0, marginLeft: 16 }}>+</span>
                  </button>
                  <div className={`faq-a ${openFaq === i ? 'open' : ''}`}>
                    <p style={{ fontSize: 14, fontWeight: 300, color: '#777', lineHeight: 1.7, paddingBottom: 24 }}>{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* ═══════════════ 9. FINAL CTA ═══════════════ */}
        <div ref={ctaR.ref} className={`rv ${ctaR.visible ? 'show' : ''}`}>
          <section style={{ padding: '120px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* gold orb */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 className="display" style={{ fontSize: 'clamp(36px, 7vw, 80px)', letterSpacing: '0.04em', marginBottom: 32 }}>PR&Ecirc;T &Agrave; COMMENCER&nbsp;?</h2>
              <Link href="/register-client" className="btn-gold" style={{ fontSize: 16, padding: '18px 44px' }}>Commencer maintenant &mdash; 10&nbsp;jours gratuits</Link>
            </div>
          </section>
        </div>

        <div className="divider" />

        {/* ═══════════════ 10. FOOTER ═══════════════ */}
        <footer style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #C9A84C, #F0D060)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, color: '#000', fontWeight: 700 }}>M</div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.12em', color: '#fff' }}>MOOVX</span>
          </div>
          <p style={{ fontSize: 11, letterSpacing: '0.14em', color: '#444', fontWeight: 300, marginBottom: 24 }}>Swiss Made &middot; Swiss Quality</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 28, flexWrap: 'wrap' }}>
            <Link href="/register-client" style={{ fontSize: 13, color: '#666', textDecoration: 'none', fontWeight: 400, transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')} onMouseLeave={e => (e.currentTarget.style.color = '#666')}>Application</Link>
            <Link href="/login" style={{ fontSize: 13, color: '#666', textDecoration: 'none', fontWeight: 400, transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')} onMouseLeave={e => (e.currentTarget.style.color = '#666')}>Connexion</Link>
            <a href="mailto:contact@moovx.ch" style={{ fontSize: 13, color: '#666', textDecoration: 'none', fontWeight: 400, transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')} onMouseLeave={e => (e.currentTarget.style.color = '#666')}>Contact</a>
            <a href="#" style={{ fontSize: 13, color: '#666', textDecoration: 'none', fontWeight: 400, transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')} onMouseLeave={e => (e.currentTarget.style.color = '#666')}>CGU</a>
          </div>
          <p style={{ fontSize: 12, color: '#333', fontWeight: 300 }}>&copy; 2026 MOOVX. Tous droits r&eacute;serv&eacute;s.</p>
        </footer>
      </div>
    </>
  );
}
