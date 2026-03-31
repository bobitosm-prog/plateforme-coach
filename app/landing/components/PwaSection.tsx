'use client';

import React from 'react';
import { RevealProps, Section, SectionTitle } from './shared';

export default function PwaSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef}>
      <Section>
        <SectionTitle title="INSTALLE MOOVX EN 30 SECONDES" subtitle="Pas besoin d'App Store ni de Google Play. Installe directement depuis ton navigateur." visible={visible} />
        <div className="pwa-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          maxWidth: 800,
          margin: '0 auto 48px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
        }}>
          {/* iPhone */}
          <div style={{ background: 'rgba(13,13,13,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 20, padding: '36px 28px', textAlign: 'center', transition: 'border-color 0.3s' }}>
            <div style={{ marginBottom: 20 }}>
              <svg width="40" height="48" viewBox="0 0 170 170" fill="#C9A84C"><path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.2-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.28 2.13-9.54 3.24-12.8 3.35-4.92.21-9.84-1.96-14.75-6.52-3.13-2.73-7.05-7.41-11.76-14.04-5.05-7.08-9.2-15.29-12.46-24.65-3.5-10.1-5.25-19.9-5.25-29.38 0-10.87 2.35-20.24 7.05-28.09 3.69-6.31 8.6-11.3 14.75-14.95 6.15-3.66 12.8-5.53 19.97-5.71 3.92 0 9.06 1.21 15.43 3.59 6.36 2.39 10.44 3.6 12.24 3.6 1.34 0 5.87-1.42 13.56-4.25 7.27-2.63 13.41-3.72 18.44-3.29 13.62 1.1 23.85 6.47 30.64 16.14-12.18 7.38-18.22 17.73-18.12 31.02.09 10.34 3.86 18.95 11.29 25.79 3.36 3.18 7.11 5.64 11.28 7.39-.91 2.63-1.86 5.14-2.87 7.55zM119.04 7.01c0 8.1-2.96 15.67-8.86 22.67-7.12 8.32-15.73 13.13-25.07 12.37a25.2 25.2 0 01-.19-3.07c0-7.78 3.39-16.1 9.4-22.9 3-3.44 6.82-6.31 11.45-8.6 4.62-2.26 8.99-3.51 13.1-3.74.12 1.1.17 2.2.17 3.27z"/></svg>
            </div>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#f8fafc', margin: '0 0 8px', letterSpacing: 2 }}>iPHONE</h3>
            <p style={{ fontSize: 13, color: '#C9A84C', margin: '0 0 24px' }}>Avec Safari uniquement</p>
            <div style={{ textAlign: 'left', maxWidth: 260, margin: '0 auto' }}>
              {[
                { n: '1', title: 'Ouvre Safari', desc: <>Va sur <span style={{ color: '#C9A84C' }}>app.moovx.ch</span></> },
                { n: '2', title: 'Bouton Partager', desc: 'Appuie sur le bouton en bas de l\'écran' },
                { n: '3', title: 'Sur l\'écran d\'accueil', desc: <>Choisis <span style={{ color: '#C9A84C' }}>&laquo; Sur l&apos;écran d&apos;accueil &raquo;</span></> },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: s.n === '3' ? 0 : 20 }}>
                  <div style={{ minWidth: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: '#C9A84C' }}>{s.n}</div>
                  <div><p style={{ fontSize: 14, color: '#f8fafc', margin: '0 0 4px', fontWeight: 600 }}>{s.title}</p><p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{s.desc}</p></div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#555', margin: '24px 0 0', fontStyle: 'italic' }}>Fonctionne uniquement avec Safari, pas Chrome</p>
          </div>
          {/* Android */}
          <div style={{ background: 'rgba(13,13,13,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 20, padding: '36px 28px', textAlign: 'center', transition: 'border-color 0.3s' }}>
            <div style={{ marginBottom: 20 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#C9A84C"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/></svg>
            </div>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#f8fafc', margin: '0 0 8px', letterSpacing: 2 }}>ANDROID</h3>
            <p style={{ fontSize: 13, color: '#C9A84C', margin: '0 0 24px' }}>Avec Chrome ou Edge</p>
            <div style={{ textAlign: 'left', maxWidth: 260, margin: '0 auto' }}>
              {[
                { n: '1', title: 'Ouvre Chrome', desc: <>Va sur <span style={{ color: '#C9A84C' }}>app.moovx.ch</span></> },
                { n: '2', title: 'Menu \u22EE', desc: <>Appuie sur les <span style={{ color: '#C9A84C' }}>3 points</span> en haut à droite</> },
                { n: '3', title: 'Installer l\'application', desc: <>Ou <span style={{ color: '#C9A84C' }}>&laquo; Ajouter à l&apos;écran d&apos;accueil &raquo;</span></> },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: s.n === '3' ? 0 : 20 }}>
                  <div style={{ minWidth: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: '#C9A84C' }}>{s.n}</div>
                  <div><p style={{ fontSize: 14, color: '#f8fafc', margin: '0 0 4px', fontWeight: 600 }}>{s.title}</p><p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{s.desc}</p></div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#555', margin: '24px 0 0', fontStyle: 'italic' }}>Fonctionne aussi avec Edge et Samsung Internet</p>
          </div>
        </div>
        {/* Badges */}
        <div className="pwa-badges" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          maxWidth: 700,
          margin: '0 auto',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s 0.4s',
        }}>
          {[
            { label: 'Plein écran', sub: 'Comme une app native', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#C9A84C" strokeWidth="1.5"/></svg> },
            { label: 'Notifications', sub: "Rappels d'entraînement", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg> },
            { label: 'Hors ligne', sub: 'Accès sans internet', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { label: 'Mises à jour', sub: 'Automatiques, toujours', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 14C4 8.5 8.5 4 14 4C18 4 21.4 6.5 23 10" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/><path d="M20 14C20 19.5 15.5 24 10 24C6 24 2.6 21.5 1 18" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg> },
          ].map(b => (
            <div key={b.label} style={{ textAlign: 'center', padding: '16px 12px', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, background: 'rgba(201,168,76,0.03)' }}>
              <div style={{ marginBottom: 8 }}>{b.icon}</div>
              <p style={{ fontSize: 13, color: '#C9A84C', margin: 0, fontWeight: 600 }}>{b.label}</p>
              <p style={{ fontSize: 11, color: '#555', margin: '4px 0 0' }}>{b.sub}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
