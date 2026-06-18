'use client'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { overlayStore } from '@/lib/overlay-store'

/**
 * Téléporte ses enfants vers document.body pour échapper au containing-block
 * créé par le transform:translateX du rail de navigation (app/page.tsx).
 * Un position:fixed dans un ancêtre transformé devient relatif à cet ancêtre,
 * pas au viewport — ce wrapper corrige ça pour tout overlay rendu dans une slide.
 * S'enregistre dans overlayStore pour bloquer la navigation pendant qu'un overlay est ouvert.
 * Usage : <RailOverlay><div style={{position:'fixed',inset:0,...}}>…</div></RailOverlay>
 */
export function RailOverlay({ children }: { children: ReactNode }) {
  useEffect(() => {
    overlayStore.register()
    return () => overlayStore.unregister()
  }, [])
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
