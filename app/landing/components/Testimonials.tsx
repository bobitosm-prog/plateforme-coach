'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useReveal } from './shared';

const testimonials = [
  { quote: "MoovX a révolutionné ma nutrition. En 3 mois, j'ai perdu 8kg tout en gardant ma masse musculaire. Les plans sont parfaitement adaptés.", author: 'Marc D.', location: 'Genève' },
  { quote: "Le programme PPL est exactement ce qu'il me fallait. Le timer de repos et le suivi des PR me motivent à chaque séance. Top qualité suisse !", author: 'Julie K.', location: 'Carouge' },
  { quote: "Le scanner code-barres est génial. Je scanne mon frigo et MoovX me crée un plan complet. La liste de courses automatique est un game changer.", author: 'Thomas R.', location: 'Eaux-Vives' },
  { quote: "Meilleure app fitness que j'ai testée. Le coach répond à toutes mes questions. CHF 10/mois c'est vraiment donné pour ce niveau de qualité.", author: 'Sarah M.', location: 'Plainpalais' },
  { quote: "En tant que coach, MoovX me permet de gérer mes clients efficacement. La messagerie et les plans personnalisés sont un duo imbattable.", author: 'Alex P.', location: 'Coach Pro' },
  { quote: "Les recettes fitness sont incroyables. Adaptées à mes macros, avec les ingrédients que j'ai déjà. Jamais été aussi constant dans ma diète.", author: 'Léa B.', location: 'Pâquis' },
];

export default function Testimonials() {
  const { ref, visible } = useReveal();
  const [active, setActive] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setActive(p => (p + 1) % testimonials.length), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) };
  }, []);

  function goTo(i: number) {
    setActive(i);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setActive(p => (p + 1) % testimonials.length), 5000);
  }

  const t = testimonials[active];

  return (
    <section id="testimonials" ref={ref}>
      <div style={{
        maxWidth: 900, margin: '0 auto', padding: '80px 64px',
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Section header */}
        <span style={{
          display: 'inline-flex', fontFamily: 'var(--font-alt)', fontWeight: 700,
          fontSize: 11, letterSpacing: 2, color: 'var(--gold)',
          background: 'var(--gold-dim)', border: '1px solid var(--gold-rule)',
          padding: '5px 14px', textTransform: 'uppercase', marginBottom: 20,
        }}>
          Témoignages
        </span>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)',
          letterSpacing: 2, lineHeight: 0.95, color: 'var(--text)', margin: '0 0 48px',
        }}>
          ILS ONT TRANSFORMÉ LEUR CORPS
        </h2>

        {/* Large gold quotation mark */}
        <div style={{
          fontFamily: 'Georgia, serif', fontSize: 120, lineHeight: 0.5,
          color: 'var(--gold)', opacity: 0.25, marginBottom: 16, userSelect: 'none',
        }}>&ldquo;</div>

        {/* Active testimonial */}
        <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p
            key={active}
            style={{
              fontSize: 'clamp(18px, 2.5vw, 24px)',
              color: 'var(--text)',
              fontStyle: 'italic',
              fontWeight: 300,
              lineHeight: 1.7,
              margin: '0 auto',
              maxWidth: 700,
              animation: 'fadeQuote 0.5s ease',
            }}
          >
            {t.quote}
          </p>
        </div>

        {/* Author */}
        <div style={{ marginTop: 32 }}>
          <span style={{
            fontFamily: 'var(--font-alt)', fontWeight: 800, fontSize: 16,
            color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase',
          }}>
            {t.author}
          </span>
          <span style={{ color: 'var(--text-dim)', margin: '0 10px' }}>—</span>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)',
          }}>
            {t.location}
          </span>
        </div>

        {/* Stars */}
        <div style={{ marginTop: 12, letterSpacing: 4, color: 'var(--gold)', fontSize: 14 }}>
          ★★★★★
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 32 }}>
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: active === i ? 28 : 8, height: 8, borderRadius: 4,
                background: active === i ? 'var(--gold)' : 'var(--text-dim)',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeQuote {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          #testimonials > div { padding: 80px 24px !important; }
        }
      `}</style>
    </section>
  );
}
