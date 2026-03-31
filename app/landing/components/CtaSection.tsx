'use client';

import React from 'react';
import Link from 'next/link';
import { RevealProps } from './shared';

export default function CtaSection({ revealRef, visible }: RevealProps) {
  return (
    <div ref={revealRef}>
      <section style={{
        padding: '120px 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Gold orb */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(32px, 5vw, 56px)',
          color: '#f8fafc',
          margin: '0 0 16px',
          letterSpacing: 2,
          position: 'relative',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          PR&Ecirc;T &Agrave; TRANSFORMER TON CORPS ?
        </h2>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 17,
          color: '#6b7280',
          margin: '0 0 32px',
          position: 'relative',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s 0.15s',
        }}>
          Rejoins MoovX et commence ta transformation d&egrave;s aujourd&apos;hui.
        </p>
        <div style={{ position: 'relative', opacity: visible ? 1 : 0, transition: 'opacity 0.6s 0.3s' }}>
          <Link href="/register-client" className="gold-btn" style={{ fontSize: 16, padding: '16px 40px' }}>
            Commencer — 10 jours gratuits
          </Link>
        </div>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: '#555',
          marginTop: 16,
          position: 'relative',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s 0.45s',
        }}>
          Sans engagement &middot; R&eacute;siliable &agrave; tout moment
        </p>
      </section>
    </div>
  );
}
