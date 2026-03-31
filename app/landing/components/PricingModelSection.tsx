'use client';
import React from 'react';
import { RevealProps, Section, SectionTitle } from './shared';

const Check = ({ color = '#C9A84C' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8L7 11L12 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

export default function PricingModelSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef} id="pricing-model">
      <Section>
        <SectionTitle title="UN MODÈLE TRANSPARENT" subtitle="Zéro surprise. Tu sais exactement ce que tu paies." visible={visible} />
        <div className="section-two-col" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'stretch',
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
        }}>
          {/* CLIENTS */}
          <div style={{ background: 'rgba(13,13,13,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 20, padding: '40px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="12" r="6" stroke="#C9A84C" strokeWidth="1.5"/><path d="M6 28C6 22 10 18 16 18C22 18 26 22 26 28" stroke="#C9A84C" strokeWidth="1.5"/></svg>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#f8fafc', margin: 0, letterSpacing: 2 }}>POUR LES CLIENTS</h3>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 15, color: '#C9A84C', fontWeight: 700, margin: '0 0 12px' }}>Sans coach personnel :</h4>
              <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: '0 0 8px' }}>Tu t&apos;inscris librement et tu bénéficies de 10 jours d&apos;essai gratuit avec toutes les fonctionnalités.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {['CHF 10/mois', 'CHF 80/an', 'CHF 150 à vie'].map(p => (
                  <span key={p} style={{ fontSize: 13, color: '#C9A84C', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', padding: '6px 14px', borderRadius: 20 }}>{p}</span>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 20 }}>
              <h4 style={{ fontSize: 15, color: '#C9A84C', fontWeight: 700, margin: '0 0 12px' }}>Avec un coach personnel :</h4>
              <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: 0 }}>Ton coach t&apos;envoie un lien d&apos;invitation. Tu t&apos;inscris gratuitement et tu accèdes à toutes les fonctionnalités.</p>
              {['Accès plateforme gratuit', 'Toutes les fonctionnalités incluses', 'Paiement direct à ton coach via Stripe'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: t.includes('Accès') ? 12 : 6 }}><Check color="#4ade80" /><span style={{ fontSize: 13, color: '#4ade80' }}>{t}</span></div>
              ))}
            </div>
          </div>

          {/* COACHES */}
          <div style={{ background: 'rgba(13,13,13,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 20, padding: '40px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="12" cy="12" r="5" stroke="#C9A84C" strokeWidth="1.5"/><circle cx="22" cy="12" r="3" stroke="#C9A84C" strokeWidth="1.2"/><path d="M4 28C4 22 7 19 12 19C17 19 20 22 20 28" stroke="#C9A84C" strokeWidth="1.5"/><path d="M20 19C23 19 26 21 26 25" stroke="#C9A84C" strokeWidth="1.2"/></svg>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#f8fafc', margin: 0, letterSpacing: 2 }}>POUR LES COACHES</h3>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 15, color: '#C9A84C', fontWeight: 700, margin: '0 0 12px' }}>Abonnement Coach Pro :</h4>
              <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: '0 0 12px' }}>Accède à tous les outils professionnels de MoovX.</p>
              <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: '#C9A84C' }}>CHF 50</span>
                <span style={{ fontSize: 14, color: '#666' }}>/mois</span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 20, marginBottom: 24 }}>
              <h4 style={{ fontSize: 15, color: '#C9A84C', fontWeight: 700, margin: '0 0 12px' }}>Paiements clients :</h4>
              <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: '0 0 12px' }}>Tu fixes ton propre tarif. Tes clients paient directement via Stripe.</p>
              <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 12, padding: 20, marginTop: 16 }}>
                <p style={{ fontSize: 13, color: '#666', textAlign: 'center', margin: '0 0 16px' }}>Exemple : ton tarif = CHF 100/mois</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#4ade80' }}>CHF 97</div><div style={{ fontSize: 11, color: '#666' }}>Pour toi (97%)</div></div>
                  <div style={{ color: '#333', fontSize: 20 }}>+</div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#C9A84C' }}>CHF 3</div><div style={{ fontSize: 11, color: '#666' }}>Commission MoovX (3%)</div></div>
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 20 }}>
              <h4 style={{ fontSize: 15, color: '#C9A84C', fontWeight: 700, margin: '0 0 12px' }}>Ce qui est inclus :</h4>
              {['Dashboard de gestion clients', 'Plans nutrition IA pour tes clients', 'Programme musculation personnalisable', 'Messagerie temps réel', 'Clients illimités · Paiements Stripe'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Check /><span style={{ fontSize: 13, color: '#9ca3af' }}>{f}</span></div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment flow */}
        <div style={{
          maxWidth: 800, margin: '48px auto 0', background: 'rgba(13,13,13,0.7)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(201,168,76,0.1)', borderRadius: 16, padding: 32,
          opacity: visible ? 1 : 0, transition: 'opacity 0.6s 0.4s',
        }}>
          <h4 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: '#f8fafc', textAlign: 'center', margin: '0 0 24px', letterSpacing: 2 }}>COMMENT ÇA MARCHE</h4>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {[
              { icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="8" r="4" stroke="#C9A84C" strokeWidth="1.5"/><path d="M3 18C3 14 6 12 10 12C14 12 17 14 17 18" stroke="#C9A84C" strokeWidth="1.5"/></svg>, color: '#C9A84C', title: "Le client s'abonne", sub: 'Paiement sécurisé via Stripe' },
              { icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 5H18V15H2V5Z" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round"/><path d="M2 8H18" stroke="#C9A84C" strokeWidth="1.5"/></svg>, color: '#C9A84C', title: 'Stripe traite le paiement', sub: 'Automatique et sécurisé' },
              { icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10L8 13L15 6" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, color: '#4ade80', title: 'Le coach reçoit 97%', sub: 'Versement automatique' },
            ].map((step, i) => (
              <React.Fragment key={step.title}>
                {i > 0 && <div style={{ color: '#C9A84C', fontSize: 20 }}>&rarr;</div>}
                <div style={{ textAlign: 'center', flex: 1, minWidth: 150 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${step.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>{step.icon}</div>
                  <p style={{ fontSize: 13, color: '#f8fafc', fontWeight: 600, margin: '0 0 4px' }}>{step.title}</p>
                  <p style={{ fontSize: 11, color: '#666', margin: 0 }}>{step.sub}</p>
                </div>
              </React.Fragment>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#555', textAlign: 'center', margin: '24px 0 0' }}>Propulsé par Stripe Connect &middot; Paiements sécurisés &middot; Conformité européenne</p>
        </div>
      </Section>
    </div>
  );
}
