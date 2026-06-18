'use client'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Téléporte ses enfants vers document.body pour échapper au containing-block
 * créé par le transform:translateX du rail de navigation (app/page.tsx).
 * Un position:fixed dans un ancêtre transformé devient relatif à cet ancêtre,
 * pas au viewport — ce wrapper corrige ça pour tout overlay rendu dans une slide.
 * Usage : <RailOverlay><div style={{position:'fixed',inset:0,...}}>…</div></RailOverlay>
 */
export function RailOverlay({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
