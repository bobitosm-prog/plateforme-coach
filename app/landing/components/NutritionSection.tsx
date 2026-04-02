'use client';

import React from 'react';
import { useReveal } from './shared';

const FEATURES = [
  {
    num: '01',
    title: 'Plans 7 jours personnalisés',
    desc: "Nos experts génèrent un plan alimentaire complet adapté à tes calories, protéines, glucides et lipides. Régénération illimitée.",
  },
  {
    num: '02',
    title: '170 aliments fitness',
    desc: "Base curatée d'aliments essentiels : protéines, féculents, légumes, suppléments. Données Swiss vérifiées.",
  },
  {
    num: '03',
    title: 'Recettes fitness pro',
    desc: "Recettes adaptées à tes macros avec les aliments que tu as déjà chez toi. Goûteuses et performantes.",
  },
  {
    num: '04',
    title: 'Préférences respectées',
    desc: "Exclus les aliments que tu n'aimes pas. Notre système les ignore à chaque génération, toujours.",
  },
];

const HERO_TAGS = ['Plans 7 jours', 'Scanner code-barres', 'Recettes pro', 'Liste de courses'];

export default function NutritionSection() {
  const { ref, visible } = useReveal();

  return (
    <>
      <style>{`
        .nutrition-editorial-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          background: var(--text-dim);
          border: 1px solid var(--text-dim);
        }
        .nutrition-hero-card {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: var(--surface);
        }
        .nutrition-hero-img-wrap {
          overflow: hidden;
          border-left: 1px solid var(--text-dim);
        }
        .nutrition-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: grayscale(30%);
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          display: block;
        }
        .nutrition-hero-img-wrap:hover .nutrition-hero-img {
          transform: scale(1.05);
        }
        .nutrition-feat {
          background: var(--surface);
          padding: 40px 36px;
          display: flex;
          gap: 24px;
          position: relative;
          overflow: hidden;
          transition: background 0.3s ease;
        }
        .nutrition-feat::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--gold), transparent);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
        }
        .nutrition-feat:hover::before {
          transform: scaleX(1);
        }
        .nutrition-feat:hover {
          background: var(--surface-2);
        }
        .nutrition-feat:hover .nutrition-feat-num {
          color: var(--gold) !important;
        }
        @media (max-width: 1024px) {
          .nutrition-editorial-grid {
            grid-template-columns: 1fr;
          }
          .nutrition-hero-card {
            grid-template-columns: 1fr;
          }
          .nutrition-hero-img-wrap {
            border-left: none;
            border-top: 1px solid var(--text-dim);
          }
        }
      `}</style>
      <section
        ref={ref}
        id="nutrition"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '120px 64px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span
            style={{
              display: 'inline-flex',
              fontFamily: 'var(--font-alt)',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 2,
              color: 'var(--gold)',
              background: 'var(--gold-dim)',
              border: '1px solid var(--gold-rule)',
              padding: '5px 14px',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            01 &mdash; Nutrition
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(40px, 5vw, 64px)',
              letterSpacing: 2,
              lineHeight: 0.95,
              color: 'var(--text)',
              marginBottom: 16,
              marginTop: 0,
            }}
          >
            ALIMENTATION SUR MESURE
          </h2>
          <p
            style={{
              fontSize: 16,
              color: 'var(--text-muted)',
              fontWeight: 300,
              margin: 0,
            }}
          >
            Plans sur 7 jours g&eacute;n&eacute;r&eacute;s par nos experts, adapt&eacute;s &agrave; tes macros exacts
          </p>
        </div>

        {/* Editorial grid */}
        <div className="nutrition-editorial-grid">
          {/* Hero card */}
          <div className="nutrition-hero-card">
            <div style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignSelf: 'flex-start',
                  fontFamily: 'var(--font-alt)',
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: 2,
                  color: 'var(--gold)',
                  background: 'var(--gold-dim)',
                  border: '1px solid var(--gold-rule)',
                  padding: '5px 14px',
                  textTransform: 'uppercase',
                  marginBottom: 20,
                }}
              >
                Scanner int&eacute;gr&eacute;
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(36px, 4vw, 54px)',
                  letterSpacing: 2,
                  lineHeight: 0.95,
                  color: 'var(--text)',
                  margin: '0 0 20px',
                }}
              >
                SCANNE TON FRIGO, ON CR&Eacute;E TON PLAN
              </h3>
              <p
                style={{
                  fontSize: 15,
                  color: 'var(--text-muted)',
                  fontWeight: 300,
                  lineHeight: 1.7,
                  margin: '0 0 28px',
                }}
              >
                Photographie tes aliments ou scanne les codes-barres. Notre &eacute;quipe
                analyse ton frigo et g&eacute;n&egrave;re un plan nutritionnel complet sur 7 jours,
                parfaitement calibr&eacute; sur tes objectifs.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {HERO_TAGS.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: 'var(--font-alt)',
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: 1,
                      color: 'var(--gold)',
                      background: 'var(--gold-dim)',
                      border: '1px solid var(--gold-rule)',
                      padding: '4px 12px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="nutrition-hero-img-wrap">
              <img
                className="nutrition-hero-img"
                src="https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80"
                alt="Nutrition fitness meal prep"
                loading="lazy"
              />
            </div>
          </div>

          {/* Feature cells */}
          {FEATURES.map((feat) => (
            <div className="nutrition-feat" key={feat.num}>
              <div
                className="nutrition-feat-num"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 48,
                  color: 'var(--text-dim)',
                  lineHeight: 1,
                  flexShrink: 0,
                  transition: 'color 0.3s ease',
                }}
              >
                {feat.num}
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-alt)',
                    fontWeight: 800,
                    fontSize: 20,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: 'var(--text)',
                    margin: '0 0 10px',
                  }}
                >
                  {feat.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--text-muted)',
                    lineHeight: 1.7,
                    fontWeight: 300,
                    margin: 0,
                  }}
                >
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
