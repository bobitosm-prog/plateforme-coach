'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { BG_BASE, GOLD, GOLD_DIM, GOLD_RULE, TEXT_MUTED, FONT_ALT, FONT_DISPLAY } from '@/lib/design-tokens'
import { WP_ITEM_H } from '../../hooks/useCoachDashboard'

export default function CoachSessionWheelPicker({ items, value, onChange, label, width = 72 }: { items: string[]; value: string; onChange(value: string): void; label?: string; width?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialIndex = Math.max(0, items.indexOf(value))
  const initialIndexRef = useRef(initialIndex)
  const [activeIndex, setActiveIndex] = useState(initialIndex)

  useEffect(() => { if (ref.current) ref.current.scrollTop = initialIndexRef.current * WP_ITEM_H }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function onScroll() {
    if (!ref.current) return
    const index = Math.max(0, Math.min(items.length - 1, Math.round(ref.current.scrollTop / WP_ITEM_H)))
    setActiveIndex(index)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(items[index]), 80)
  }

  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    {label && <div style={{ fontFamily: FONT_ALT, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: TEXT_MUTED, marginBottom: 4, height: 14 }}>{label}</div>}
    <div style={{ position: 'relative', height: WP_ITEM_H * 5, width, overflow: 'hidden', borderRadius: 12, background: BG_BASE }}>
      <div style={{ position: 'absolute', top: WP_ITEM_H * 2, height: WP_ITEM_H, left: 0, right: 0, background: GOLD_DIM, borderTop: `1px solid ${GOLD_RULE}`, borderBottom: `1px solid ${GOLD_RULE}`, pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ position: 'absolute', inset: '0 0 auto', height: WP_ITEM_H * 2, background: `linear-gradient(to bottom, ${BG_BASE} 40%, transparent)`, pointerEvents: 'none', zIndex: 3 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: WP_ITEM_H * 2, background: `linear-gradient(to top, ${BG_BASE} 40%, transparent)`, pointerEvents: 'none', zIndex: 3 }} />
      <div ref={ref} onScroll={onScroll} style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' } as CSSProperties}>
        <div style={{ height: WP_ITEM_H * 2 }} />
        {items.map((item, index) => <div key={item} onClick={() => { setActiveIndex(index); onChange(item); ref.current?.scrollTo({ top: index * WP_ITEM_H, behavior: 'smooth' }) }} style={{ height: WP_ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center', cursor: 'pointer', userSelect: 'none', fontFamily: FONT_DISPLAY, fontWeight: index === activeIndex ? 700 : 400, fontSize: index === activeIndex ? '1.35rem' : '1rem', color: index === activeIndex ? GOLD : TEXT_MUTED } as CSSProperties}>{item}</div>)}
        <div style={{ height: WP_ITEM_H * 2 }} />
      </div>
    </div>
  </div>
}
