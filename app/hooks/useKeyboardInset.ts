'use client'

import { useState, useEffect } from 'react'

/**
 * Returns the height (px) hidden by the iOS virtual keyboard,
 * computed via window.visualViewport.
 * Returns 0 when the keyboard is closed or on non-supporting browsers.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function update() {
      if (!vv) return
      // Full layout height minus the visible viewport height gives
      // the portion hidden by the keyboard (+ any browser chrome shift).
      const hidden = window.innerHeight - vv.height
      setInset(hidden > 0 ? hidden : 0)
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
