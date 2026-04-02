'use client';

import React from 'react';
import { useReveal } from './shared';

const testimonials = [
  { quote: "MoovX a révolutionné ma nutrition. En 3 mois, j'ai perdu 8kg tout en gardant ma masse musculaire. Les plans sont parfaitement adaptés.", author: 'Marc D.', location: 'Genève' },
  { quote: "Le programme PPL est exactement ce qu'il me fallait. Le timer de repos et le suivi des PR me motivent à chaque séance. Top qualité suisse !", author: 'Julie K.', location: 'Carouge' },
  { quote: "Le scanner code-barres est génial. Je scanne mon frigo et MoovX me crée un plan complet. La liste de courses automatique est un game changer.", author: 'Thomas R.', location: 'Eaux-Vives' },
  { quote: "Meilleure app fitness que j'ai testée. Le coach répond à toutes mes questions. CHF 10/mois c'est vraiment donné pour ce niveau de qualité.", author: 'Sarah M.', location: 'Plainpalais' },
  { quote: "En tant que coach, MoovX me permet de gérer mes clients efficacement. La messagerie et les plans personnalisés sont un duo imbattable.", author: 'Alex P.', location: 'Coach Pro' },
  { quote: "Les recettes fitness sont incroyables. Adaptées à mes macros, avec les ingrédients que j'ai déjà. Jamais été aussi constant dans ma diète.", author: 'Léa B.', location: 'Pâquis' },
];

const allTestimonials = [...testimonials, ...testimonials];

export default function Testimonials() {
  const { ref, visible } = useReveal();

  return (
    <section id="testimonials" ref={ref} style={{ overflow: 'hidden' }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '120px 64px',
      }}>
        {/* Section header centered */}
        <div style={{
          textAlign: 'center',
          marginBottom: 72,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <span style={{
            display: 'inline-flex',
            fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 2,
            color: 'var(--gold, #C9A84C)',
            background: 'var(--gold-dim, rgba(201,168,76,0.15))',
            border: '1px solid var(--gold-rule, rgba(201,168,76,0.25))',
            padding: '5px 14px',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            Témoignages
          </span>
          <h2 style={{
            fontFamily: "var(--font-display, 'Bebas Neue'), sans-serif",
            fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: 2,
            lineHeight: 0.95,
            color: 'var(--text, #F0EDE8)',
            margin: '0 0 16px',
          }}>
            ILS ONT TRANSFORM&Eacute; LEUR CORPS
          </h2>
          <p style={{
            fontSize: 16,
            color: 'var(--text-muted, #8A8580)',
            fontWeight: 300,
            margin: 0,
          }}>
            La communaut&eacute; MoovX &agrave; Gen&egrave;ve
          </p>
        </div>

        {/* Marquee */}
        <div style={{
          overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.7s ease 0.3s',
        }}>
          <div style={{
            display: 'flex',
            animation: 'marquee 45s linear infinite',
            width: 'max-content',
          }}>
            {allTestimonials.map((t, i) => (
              <div key={i} style={{
                minWidth: 360,
                background: 'var(--surface, #0D0C0B)',
                border: '1px solid var(--text-dim, #3D3B38)',
                borderLeft: '3px solid var(--gold, #C9A84C)',
                padding: '32px 28px',
                margin: '0 12px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}>
                <div style={{
                  letterSpacing: 3,
                  color: 'var(--gold, #C9A84C)',
                  fontSize: 12,
                }}>
                  ★★★★★
                </div>
                <p style={{
                  fontSize: 14,
                  color: 'var(--text-muted, #8A8580)',
                  fontStyle: 'italic',
                  fontWeight: 300,
                  lineHeight: 1.8,
                  margin: 0,
                  flex: 1,
                }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <span style={{
                  fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  color: 'var(--gold, #C9A84C)',
                  letterSpacing: 1,
                }}>
                  {t.author} — {t.location}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
