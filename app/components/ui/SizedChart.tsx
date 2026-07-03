'use client'
import React, { useState, useRef, useCallback } from 'react'
import { ResponsiveContainer } from 'recharts'

/**
 * Callback-ref + ResizeObserver hook: returns true when the observed element has width > 0.
 * Prevents Recharts "width(0)/height(0)" warnings on keep-alive hidden tabs.
 * Pattern: attach rootRef to the component's root div, pass hasSize to SizedContainer.
 */
export function useHasSize(): { rootRef: (node: HTMLDivElement | null) => void; hasSize: boolean } {
  const [hasSize, setHasSize] = useState(false)
  const roRef = useRef<ResizeObserver | null>(null)
  const rootRef = useCallback((node: HTMLDivElement | null) => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null }
    if (!node) return
    roRef.current = new ResizeObserver(([entry]) => {
      setHasSize(entry.contentRect.width > 0)
    })
    roRef.current.observe(node)
    setHasSize(node.offsetWidth > 0)
  }, [])
  return { rootRef, hasSize }
}

/**
 * Gate for ResponsiveContainer: renders a height-matched placeholder when
 * the container has no width (keep-alive hidden tab), avoiding Recharts warnings.
 */
export function SizedContainer({ hasSize, height, children }: { hasSize: boolean; height: number; children: React.ReactNode }) {
  if (!hasSize) return <div style={{ height }} />
  return <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
}
