'use client'
import React from 'react'
import { useTranslations } from 'next-intl'
import { useReveal } from './shared'

export default function MarqueeSection() {
  const t = useTranslations('marquee')
  const { ref, visible } = useReveal()

  const segments = t('text').split('✦')

  return (
    <>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        ref={ref}
        style={{
          borderTop: '1px solid var(--gold-rule)',
          borderBottom: '1px solid var(--gold-rule)',
          padding: '14px 0',
          background: 'var(--surface)',
          overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            animation: 'marquee 35s linear infinite',
          }}
        >
          {[0, 1].map((n) => (
            <span
              key={n}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                letterSpacing: 4,
                color: 'var(--gold)',
                flexShrink: 0,
              }}
            >
              {segments.map((segment, i) => (
                <React.Fragment key={i}>
                  {segment}
                  {i < segments.length - 1 && (
                    <span style={{ color: 'var(--text-dim)' }}>✦</span>
                  )}
                </React.Fragment>
              ))}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
