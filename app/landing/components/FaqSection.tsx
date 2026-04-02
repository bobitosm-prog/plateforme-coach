'use client';

import React, { useState } from 'react';
import { useReveal } from './shared';

const FAQ_DATA = [
  {
    q: "C'est quoi MoovX ?",
    a: "MoovX est une plateforme de coaching fitness suisse propulsée par l'intelligence artificielle. Elle combine nutrition personnalisée, entraînement hypertrophie PPL, suivi de progression et coaching connecté. Basée à Genève.",
  },
  {
    q: "Comment fonctionne la nutrition IA ?",
    a: "L'IA analyse ton profil (poids, objectif, activité) et génère des plans alimentaires sur 7 jours respectant exactement tes macros. Tu peux scanner ton frigo pour qu'elle utilise tes produits existants.",
  },
  {
    q: "Le scanner code-barres fonctionne comment ?",
    a: "Scanne le code-barres de tes produits avec la caméra. MoovX identifie l'aliment via OpenFoodFacts et l'intègre dans tes plans nutritionnels automatiquement.",
  },
  {
    q: "C'est quoi le programme PPL ?",
    a: "Push/Pull/Legs est un split d'entraînement sur 6 jours optimisé pour l'hypertrophie. Chaque muscle est travaillé 2 fois par semaine pour une croissance maximale.",
  },
  {
    q: "Mes données sont sécurisées ?",
    a: "Oui. MoovX utilise Supabase avec chiffrement. Tes données sont hébergées en Europe. Tu peux les exporter ou supprimer ton compte à tout moment. Conformité RGPD complète.",
  },
  {
    q: "Je peux essayer gratuitement ?",
    a: "Oui ! 10 jours d'essai gratuit avec accès à toutes les fonctionnalités. Sans engagement, sans carte de crédit requise.",
  },
  {
    q: "Comment installer l'app ?",
    a: "MoovX est une Progressive Web App. iPhone : Safari → Partager → Écran d'accueil. Android : Chrome → menu ⋮ → Installer. Pas besoin d'App Store.",
  },
  {
    q: "Comment fonctionnent les paiements pour les coaches ?",
    a: "Les coaches fixent leur propre tarif. Les clients paient via Stripe. Le coach reçoit 97% automatiquement, MoovX prélève 3% de commission.",
  },
  {
    q: "Les clients invités par un coach paient la plateforme ?",
    a: "Non. Les clients invités par un coach accèdent gratuitement à toutes les fonctionnalités MoovX. Ils paient uniquement le tarif de coaching fixé par leur coach.",
  },
  {
    q: "Je peux remplacer un exercice si je n'ai pas le matériel ?",
    a: "Oui. L'IA analyse tes contraintes et propose 3 alternatives adaptées en temps réel. Blessure, manque de matériel, durée réduite — tout est géré.",
  },
];

export default function FaqSection() {
  const { ref, visible } = useReveal();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(prev => (prev === index ? null : index));
  };

  return (
    <section
      ref={ref}
      id="faq"
      style={{
        padding: '120px 64px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Section header centered */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <span
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-alt)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            color: 'var(--gold)',
            textTransform: 'uppercase',
            border: '1px solid var(--gold-rule)',
            padding: '6px 16px',
            marginBottom: 24,
          }}
        >
          Questions fréquentes
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 5vw, 64px)',
            color: 'var(--text)',
            letterSpacing: 3,
            lineHeight: 1,
            margin: 0,
          }}
        >
          TOUT CE QUE TU DOIS SAVOIR
        </h2>
      </div>

      {/* FAQ list */}
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {FAQ_DATA.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              style={{
                borderBottom: '1px solid var(--text-dim)',
              }}
            >
              <button
                onClick={() => handleToggle(index)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px 0',
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'var(--text)',
                  textAlign: 'left' as const,
                }}
              >
                <span>{item.q}</span>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    minWidth: 28,
                    border: '1px solid var(--gold-rule)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--gold)',
                    fontSize: 18,
                    lineHeight: 1,
                    transition: 'transform 0.3s ease',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                    marginLeft: 16,
                  }}
                >
                  +
                </span>
              </button>
              <div
                style={{
                  maxHeight: isOpen ? 300 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.4s ease',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: 'var(--text-muted)',
                    lineHeight: 1.8,
                    fontWeight: 300,
                    paddingBottom: 24,
                    margin: 0,
                  }}
                >
                  {item.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
