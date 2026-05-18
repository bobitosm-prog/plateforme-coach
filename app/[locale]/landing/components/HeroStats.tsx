'use client'

import { useCounter } from './shared'

export default function HeroStats({ stats }: { stats: Array<{ value: number; suffix: string; label: string }> }) {
  return (
    <>
      {stats.map((s, i) => (
        <HeroStat key={i} {...s} />
      ))}
    </>
  )
}

function HeroStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, value: count } = useCounter(value, 1800)
  return (
    <div ref={ref}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(36px, 5vw, 56px)',
        color: 'var(--gold)',
        lineHeight: 1,
        letterSpacing: 1,
      }}>
        {count}{suffix}
      </div>
      <div style={{
        marginTop: 8,
        fontSize: 11,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: 2,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  )
}
