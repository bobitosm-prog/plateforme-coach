'use client'
import { useSyncExternalStore } from 'react'
import { overlayStore } from '@/lib/overlay-store'

export function useOverlayOpen(): boolean {
  const count = useSyncExternalStore(
    overlayStore.subscribe,
    overlayStore.getSnapshot,
    () => 0
  )
  return count > 0
}
