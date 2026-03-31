'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useReveal } from './components/shared';

import MarqueeSection from './components/MarqueeSection';
import NutritionSection from './components/NutritionSection';
import TrainingSection from './components/TrainingSection';
import TrackingSection from './components/TrackingSection';
import CoachIaSection from './components/CoachIaSection';
import CoachingSection from './components/CoachingSection';
import PricingModelSection from './components/PricingModelSection';
import StepsSection from './components/StepsSection';
import PwaSection from './components/PwaSection';
import PricingSection from './components/PricingSection';
import FaqSection from './components/FaqSection';
import GeneveSection from './components/GeneveSection';
import CtaSection from './components/CtaSection';
import FooterSection from './components/FooterSection';

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
  const pricingModelRev = useReveal();
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
      {/* Google Fonts & Global Styles */}
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
            <img src="/logo-moovx.png" alt="MoovX Logo coaching fitness Genève" width={36} height={36} style={{ borderRadius: 8 }} />
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
          padding: '80px 24px 40px',
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 0 }} />
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(48px, 8vw, 100px)', color: '#f8fafc', margin: '0 0 8px', letterSpacing: 4, lineHeight: 0.95, position: 'relative', zIndex: 1, opacity: heroRev.visible ? 1 : 0, transform: heroRev.visible ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            TRANSFORME TON CORPS
          </h1>
          <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(16px, 2.5vw, 26px)', color: '#C9A84C', margin: '0 0 16px', letterSpacing: 6, position: 'relative', zIndex: 1, opacity: heroRev.visible ? 1 : 0, transform: heroRev.visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s' }}>
            D&Eacute;PASSE TES LIMITES
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, color: '#9ca3af', maxWidth: 620, lineHeight: 1.8, margin: '0 auto 20px', position: 'relative', zIndex: 1, opacity: heroRev.visible ? 1 : 0, transform: heroRev.visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s' }}>
            La premi&egrave;re plateforme de coaching fitness suisse propuls&eacute;e par l&apos;intelligence artificielle. Plans nutrition sur mesure, programme musculation PPL 6 jours, scanner code-barres, recettes IA, suivi complet. Ton coach personnel, dans ta poche, 24/7.
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#C9A84C', fontWeight: 600, letterSpacing: 1, margin: '0 0 28px', position: 'relative', zIndex: 1, opacity: heroRev.visible ? 1 : 0, transition: 'opacity 0.8s 0.35s' }}>
            Rejoins +1,200 utilisateurs &agrave; Gen&egrave;ve — D&egrave;s CHF 10/mois
          </p>
          <div className="hero-buttons" style={{ display: 'flex', gap: 16, marginBottom: 32, position: 'relative', zIndex: 1, opacity: heroRev.visible ? 1 : 0, transform: heroRev.visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.45s' }}>
            <Link href="/register-client" className="gold-btn">Commencer — 10 jours gratuits</Link>
            <a href="#nutrition" onClick={(e) => smoothScroll(e, 'nutrition')} className="ghost-btn">D&eacute;couvrir &darr;</a>
          </div>
          <div className="hero-stats" style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 1, opacity: heroRev.visible ? 1 : 0, transition: 'opacity 0.8s 0.6s' }}>
            {[
              { val: '170+', label: 'Aliments' },
              { val: '89', label: 'Exercices' },
              { val: '6 Jours', label: 'PPL' },
              { val: '8', label: 'HIIT' },
              { val: '24/7', label: 'Coach IA' },
              { val: '100%', label: 'Swiss' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#C9A84C' }}>{s.val}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#555', marginTop: 20, letterSpacing: 0.5, position: 'relative', zIndex: 1, opacity: heroRev.visible ? 1 : 0, transition: 'opacity 0.8s 0.7s' }}>
            &#10003; Sans engagement &middot; &#10003; 10 jours gratuits &middot; &#10003; Annulable &agrave; tout moment &middot; &#10003; 100% Swiss Made
          </p>
        </div>

        <MarqueeSection revealRef={marqueeRev.ref} visible={marqueeRev.visible} />
        <NutritionSection revealRef={nutritionRev.ref} visible={nutritionRev.visible} />
        <TrainingSection revealRef={trainingRev.ref} visible={trainingRev.visible} />
        <TrackingSection revealRef={trackingRev.ref} visible={trackingRev.visible} />
        <CoachIaSection revealRef={coachIaRev.ref} visible={coachIaRev.visible} />
        <CoachingSection revealRef={coachingRev.ref} visible={coachingRev.visible} />
        <PricingModelSection revealRef={pricingModelRev.ref} visible={pricingModelRev.visible} />
        <StepsSection revealRef={stepsRev.ref} visible={stepsRev.visible} />
        <PwaSection revealRef={pwaRev.ref} visible={pwaRev.visible} />
        <PricingSection revealRef={pricingRev.ref} visible={pricingRev.visible} />
        <FaqSection revealRef={faqRev.ref} visible={faqRev.visible} />
        <GeneveSection revealRef={geneveRev.ref} visible={geneveRev.visible} />
        <CtaSection revealRef={ctaRev.ref} visible={ctaRev.visible} />
        <FooterSection />

      </div>
    </>
  );
}
