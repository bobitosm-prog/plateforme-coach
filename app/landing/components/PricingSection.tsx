'use client';

import React from 'react';
import Link from 'next/link';
import { useReveal } from './shared';

const plans = [
  {
    name: 'Mensuel',
    currency: 'CHF',
    price: '10',
    period: '/mois',
    featured: false,
    btnLabel: 'Commencer',
    btnHref: '/register-client',
    features: [
      'Plans nutrition illimités',
      'Programme PPL 6 jours',
      'Cardio HIIT & LISS',
      'Scanner + Recettes + Coach personnel',
      '+ toutes les fonctionnalités',
    ],
  },
  {
    name: 'Annuel',
    currency: 'CHF',
    price: '80',
    period: '/an · soit CHF 6.67/mois',
    featured: true,
    badge: 'POPULAIRE',
    btnLabel: 'Commencer',
    btnHref: '/register-client',
    features: [
      'Plans nutrition illimités',
      'Programme PPL 6 jours',
      'Cardio HIIT & LISS',
      'Scanner + Recettes + Coach personnel',
      '+ toutes les fonctionnalités',
    ],
  },
  {
    name: 'À vie',
    currency: 'CHF',
    price: '150',
    period: 'paiement unique',
    featured: false,
    btnLabel: 'Commencer',
    btnHref: '/register-client',
    features: [
      'Plans nutrition illimités',
      'Programme PPL 6 jours',
      'Cardio HIIT & LISS',
      'Scanner + Recettes + Coach personnel',
      '+ toutes les fonctionnalités, pour toujours',
    ],
  },
  {
    name: 'Coach Pro',
    currency: 'CHF',
    price: '50',
    period: '/mois',
    featured: false,
    btnLabel: 'Devenir Coach',
    btnHref: '/register-client',
    features: [
      'Toutes fonctionnalités client',
      'Dashboard coach',
      'Clients illimités',
      'Messagerie + Plans personnalisés',
      'Paiements Stripe (97%)',
    ],
  },
];

export default function PricingSection() {
  const { ref, visible } = useReveal();

  return (
    <section id="pricing" ref={ref} style={{ background: 'var(--surface, #0D0C0B)' }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '80px 64px',
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
            Tarifs
          </span>
          <h2 style={{
            fontFamily: "var(--font-display, 'Bebas Neue'), sans-serif",
            fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: 2,
            lineHeight: 0.95,
            color: 'var(--text, #F0EDE8)',
            margin: '0 0 16px',
          }}>
            SIMPLE, TRANSPARENT
          </h2>
          <p style={{
            fontSize: 16,
            color: 'var(--text-muted, #8A8580)',
            fontWeight: 300,
            margin: 0,
          }}>
            Commence gratuitement, &eacute;volue &agrave; ton rythme
          </p>
        </div>

        {/* 4-column Bauhaus pricing grid */}
        <div className="pricing-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: 'var(--text-dim, #3D3B38)',
          border: '1px solid var(--text-dim, #3D3B38)',
          marginBottom: 40,
        }}>
          {plans.map((p, i) => (
            <div key={p.name} style={{
              background: p.featured ? 'var(--surface-2, #141310)' : 'var(--surface, #0D0C0B)',
              padding: p.featured ? '48px 32px' : '40px 28px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              opacity: visible ? 1 : 0,
              transform: visible ? `translateY(0)${p.featured ? ' scale(1.04)' : ''}` : 'translateY(24px)',
              transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms`,
              zIndex: p.featured ? 2 : 1,
              boxShadow: p.featured ? '0 0 40px rgba(212,168,67,0.12), 0 0 80px rgba(212,168,67,0.06)' : 'none',
              borderLeft: p.featured ? '2px solid var(--gold)' : undefined,
              borderRight: p.featured ? '2px solid var(--gold)' : undefined,
            }}>
              {p.badge && (
                <span style={{
                  position: 'absolute',
                  top: -1,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
                  fontWeight: 800,
                  fontSize: 10,
                  letterSpacing: 2,
                  background: 'var(--gold, #C9A84C)',
                  color: '#0D0B08',
                  padding: '4px 16px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  {p.badge}
                </span>
              )}

              {/* Currency */}
              <span style={{
                fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: 'var(--gold, #C9A84C)',
                letterSpacing: 1,
                marginTop: p.badge ? 16 : 0,
              }}>
                {p.currency}
              </span>

              {/* Price */}
              <span style={{
                fontFamily: "var(--font-display, 'Bebas Neue'), sans-serif",
                fontSize: 64,
                color: 'var(--text, #F0EDE8)',
                lineHeight: 1,
                margin: '4px 0 4px',
              }}>
                {p.price}
              </span>

              {/* Plan name */}
              <span style={{
                fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: 3,
                color: 'var(--text-muted, #8A8580)',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                {p.name}
              </span>

              {/* Period */}
              <span style={{
                fontSize: 13,
                color: 'var(--text-muted, #8A8580)',
                marginBottom: 20,
              }}>
                {p.period}
              </span>

              {/* Rule */}
              <div style={{
                height: 1,
                background: 'var(--text-dim, #3D3B38)',
                marginBottom: 20,
              }} />

              {/* Features */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                flex: 1,
                marginBottom: 28,
              }}>
                {p.features.map((f) => (
                  <div key={f} style={{
                    display: 'flex',
                    gap: 10,
                    fontSize: 13,
                    color: 'var(--text-muted, #8A8580)',
                    fontWeight: 300,
                    alignItems: 'flex-start',
                  }}>
                    <span style={{ color: 'var(--gold, #C9A84C)', flexShrink: 0 }}>&mdash;</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Button */}
              <Link href={p.btnHref} style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                padding: '14px 0',
                fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: 2,
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                ...(p.featured
                  ? {
                      background: 'var(--gold, #C9A84C)',
                      color: '#0D0B08',
                      border: '1px solid var(--gold, #C9A84C)',
                    }
                  : {
                      background: 'transparent',
                      color: 'var(--text, #F0EDE8)',
                      border: '1px solid var(--text-dim, #3D3B38)',
                    }
                ),
              }}>
                {p.btnLabel}
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom text */}
        <p style={{
          textAlign: 'center',
          fontSize: 14,
          color: 'var(--text-muted, #8A8580)',
          fontWeight: 300,
          margin: 0,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.7s ease 0.5s',
        }}>
          10 jours d&apos;essai gratuit &middot; Sans engagement &middot; Toutes fonctionnalit&eacute;s incluses
        </p>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .pricing-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .pricing-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
