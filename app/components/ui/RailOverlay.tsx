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
 *
 * @param active - si false, le portal est rendu mais ne compte PAS dans overlayStore.
 *   Utile pour les composants montés en permanence qui gèrent leur visibilité en interne
 *   (ex: SessionDetailModal avec AnimatePresence, WorkoutCelebration avec visible prop).
 *   Par défaut true (comportement standard pour les overlays montés/démontés par {show && ...}).
 */
export function RailOverlay({ children, active = true }: { children: ReactNode; active?: boolean }) {
  useEffect(() => {
    if (!active) return
    overlayStore.register()
    return () => overlayStore.unregister()
  }, [active])
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
