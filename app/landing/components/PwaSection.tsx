'use client';

import React from 'react';
import { useReveal } from './shared';

const badges = [
  {
    title: 'Plein écran',
    desc: 'Comme une app native',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
      </svg>
    ),
  },
  {
    title: 'Notifications',
    desc: "Rappels d'entraînement",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    title: 'Hors ligne',
    desc: 'Accès sans internet',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    title: 'Mises à jour',
    desc: 'Automatiques toujours',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
];

export default function PWASection() {
  const { ref, visible } = useReveal();

  return (
    <section id="pwa" ref={ref}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '120px 64px',
      }}>
        {/* Section header */}
        <div style={{
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
            Application
          </span>
          <h2 style={{
            fontFamily: "var(--font-display, 'Bebas Neue'), sans-serif",
            fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: 2,
            lineHeight: 0.95,
            color: 'var(--text, #F0EDE8)',
            margin: '0 0 16px',
          }}>
            INSTALLE MOOVX EN 30 SECONDES
          </h2>
          <p style={{
            fontSize: 16,
            color: 'var(--text-muted, #8A8580)',
            fontWeight: 300,
            margin: 0,
          }}>
            Pas besoin d&apos;App Store. Installe directement depuis ton navigateur.
          </p>
        </div>

        {/* 2-column Bauhaus grid */}
        <div className="pwa-install-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1,
          background: 'var(--text-dim, #3D3B38)',
          border: '1px solid var(--text-dim, #3D3B38)',
          marginBottom: 1,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
        }}>
          {/* iPhone card */}
          <div style={{
            background: 'var(--surface, #0D0C0B)',
            padding: '48px 40px',
          }}>
            <div style={{ marginBottom: 24 }}>
              <svg width="36" height="44" viewBox="0 0 170 170" fill="#D4A843"><path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.2-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.28 2.13-9.54 3.24-12.8 3.35-4.92.21-9.84-1.96-14.75-6.52-3.13-2.73-7.05-7.41-11.76-14.04-5.05-7.08-9.2-15.29-12.46-24.65-3.5-10.1-5.25-19.9-5.25-29.38 0-10.87 2.35-20.24 7.05-28.09 3.69-6.31 8.6-11.3 14.75-14.95 6.15-3.66 12.8-5.53 19.97-5.71 3.92 0 9.06 1.21 15.43 3.59 6.36 2.39 10.44 3.6 12.24 3.6 1.34 0 5.87-1.42 13.56-4.25 7.27-2.63 13.41-3.72 18.44-3.29 13.62 1.1 23.85 6.47 30.64 16.14-12.18 7.38-18.22 17.73-18.12 31.02.09 10.34 3.86 18.95 11.29 25.79 3.36 3.18 7.11 5.64 11.28 7.39-.91 2.63-1.86 5.14-2.87 7.55z"/></svg>
            </div>
            <h3 style={{
              fontFamily: "var(--font-display, 'Bebas Neue'), sans-serif",
              fontSize: 32,
              letterSpacing: 2,
              color: 'var(--text, #F0EDE8)',
              margin: '0 0 4px',
            }}>
              iPHONE
            </h3>
            <p style={{
              fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--gold, #C9A84C)',
              letterSpacing: 1,
              textTransform: 'uppercase',
              margin: '0 0 32px',
            }}>
              Safari uniquement
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
              {[
                { n: '1', title: 'Ouvre Safari', desc: 'app.moovx.ch' },
                { n: '2', title: 'Bouton Partager', desc: '' },
                { n: '3', title: "Sur l'écran d'accueil", desc: '' },
              ].map((s) => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    minWidth: 36,
                    height: 36,
                    background: 'var(--gold-dim, rgba(201,168,76,0.15))',
                    border: '1px solid var(--gold-rule, rgba(201,168,76,0.25))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "var(--font-display, 'Bebas Neue'), sans-serif",
                    fontSize: 18,
                    color: 'var(--gold, #C9A84C)',
                  }}>
                    {s.n}
                  </div>
                  <div>
                    <span style={{
                      fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
                      fontWeight: 700,
                      fontSize: 15,
                      textTransform: 'uppercase',
                      color: 'var(--text, #F0EDE8)',
                    }}>
                      {s.title}
                    </span>
                    {s.desc && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: 13,
                        color: 'var(--text-muted, #8A8580)',
                      }}>
                        ({s.desc})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p style={{
              fontSize: 11,
              color: 'var(--text-dim, #3D3B38)',
              margin: 0,
            }}>
              Fonctionne uniquement avec Safari, pas Chrome
            </p>
          </div>

          {/* Android card */}
          <div style={{
            background: 'var(--surface, #0D0C0B)',
            padding: '48px 40px',
          }}>
            <div style={{ marginBottom: 24 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#D4A843"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5S11 23.33 11 22.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/></svg>
            </div>
            <h3 style={{
              fontFamily: "var(--font-display, 'Bebas Neue'), sans-serif",
              fontSize: 32,
              letterSpacing: 2,
              color: 'var(--text, #F0EDE8)',
              margin: '0 0 4px',
            }}>
              ANDROID
            </h3>
            <p style={{
              fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--gold, #C9A84C)',
              letterSpacing: 1,
              textTransform: 'uppercase',
              margin: '0 0 32px',
            }}>
              Chrome ou Edge
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
              {[
                { n: '1', title: 'Ouvre Chrome', desc: 'app.moovx.ch' },
                { n: '2', title: 'Menu \u22EE', desc: '3 points' },
                { n: '3', title: "Installer l'application", desc: '' },
              ].map((s) => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    minWidth: 36,
                    height: 36,
                    background: 'var(--gold-dim, rgba(201,168,76,0.15))',
                    border: '1px solid var(--gold-rule, rgba(201,168,76,0.25))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "var(--font-display, 'Bebas Neue'), sans-serif",
                    fontSize: 18,
                    color: 'var(--gold, #C9A84C)',
                  }}>
                    {s.n}
                  </div>
                  <div>
                    <span style={{
                      fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
                      fontWeight: 700,
                      fontSize: 15,
                      textTransform: 'uppercase',
                      color: 'var(--text, #F0EDE8)',
                    }}>
                      {s.title}
                    </span>
                    {s.desc && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: 13,
                        color: 'var(--text-muted, #8A8580)',
                      }}>
                        ({s.desc})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p style={{
              fontSize: 11,
              color: 'var(--text-dim, #3D3B38)',
              margin: 0,
            }}>
              Fonctionne aussi avec Edge et Samsung Internet
            </p>
          </div>
        </div>

        {/* 4 badges Bauhaus grid */}
        <div className="pwa-badge-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: 'var(--text-dim, #3D3B38)',
          border: '1px solid var(--text-dim, #3D3B38)',
          marginTop: 1,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
        }}>
          {badges.map((b) => (
            <div key={b.title} className="pwa-badge-item" style={{
              background: 'var(--surface, #0D0C0B)',
              padding: '24px 20px',
              textAlign: 'center',
              transition: 'background 0.3s ease',
              cursor: 'default',
            }}>
              <div style={{ marginBottom: 12 }}>
                {b.icon}
              </div>
              <p style={{
                fontFamily: "var(--font-alt, 'Barlow Condensed'), sans-serif",
                fontWeight: 700,
                fontSize: 14,
                color: 'var(--gold, #C9A84C)',
                letterSpacing: 1,
                textTransform: 'uppercase',
                margin: '0 0 4px',
              }}>
                {b.title}
              </p>
              <p style={{
                fontSize: 12,
                color: 'var(--text-muted, #8A8580)',
                fontWeight: 300,
                margin: 0,
              }}>
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .pwa-badge-item:hover {
          background: var(--surface-2, #141310) !important;
        }
        @media (max-width: 1024px) {
          .pwa-install-grid {
            grid-template-columns: 1fr !important;
          }
          .pwa-badge-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}
