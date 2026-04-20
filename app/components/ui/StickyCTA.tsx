'use client'

import { useKeyboardInset } from '../../hooks/useKeyboardInset'

interface StickyCTAProps {
  children: React.ReactNode
  zIndex?: number
}

/**
 * Fixed bottom bar that stays above the iOS keyboard and respects safe-area.
 * - Keyboard closed → bottom padding = env(safe-area-inset-bottom) + 12px
 * - Keyboard open  → bottom padding = keyboardInset + 12px
 */
export default function StickyCTA({ children, zIndex = 70 }: StickyCTAProps) {
  const keyboardInset = useKeyboardInset()
  const isKeyboardOpen = keyboardInset > 0

  return (
    <div
      className="sticky-cta"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex,
        padding: '12px 16px',
        paddingBottom: isKeyboardOpen ? keyboardInset + 12 : 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        background: 'linear-gradient(to top, #0D0B08 70%, transparent)',
      }}
    >
      {children}
    </div>
  )
}
