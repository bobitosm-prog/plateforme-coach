'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Watch, ChevronRight } from 'lucide-react'
import { colors } from '@/lib/design-tokens'
import { hasWatchWorkoutBridge, watchWorkout, type WatchWorkoutStatus } from '@/lib/training/watch-workout'

/** The Home check never starts a HealthKit workout. Readiness requires a live Watch reply. */
export default function WatchReadinessCard() {
  const t = useTranslations('watch_readiness')
  const [state, setState] = useState<WatchWorkoutStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const inFlight = useRef(false)
  const mounted = useRef(false)
  async function check(enable = false) {
    if (inFlight.current) return
    inFlight.current = true
    setChecking(true)
    try {
      const result = await watchWorkout(enable ? 'configure' : 'readiness')
      if (mounted.current) setState(result)
    } finally {
      inFlight.current = false
      if (mounted.current) setChecking(false)
    }
  }
  useEffect(() => {
    mounted.current = true
    if (!hasWatchWorkoutBridge()) return () => { mounted.current = false }
    setState({ enabled: false, status: 'checking' })
    void check()
    const refresh = () => { if (document.visibilityState === 'visible') void check() }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    const timer = setInterval(refresh, 15000)
    return () => {
      mounted.current = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  if (!state) return null
  const known = ['ready', 'permission', 'busy', 'checking', 'install', 'off']
  const status = known.includes(state.status) ? state.status : 'unverified'
  return <section aria-label="Apple Watch" style={{ marginBottom: 18, padding: 16, borderRadius: 20, background: colors.surface2, border: `1px solid ${colors.goldBorder}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Watch aria-hidden="true" size={20} style={{ color: colors.gold, flexShrink: 0 }} />
      <strong role="status">{t(status)}</strong>
    </div>
    <p style={{ fontSize: 14, margin: '10px 0', lineHeight: 1.5 }}>{t(`${status}_detail`)}</p>
    <button type="button" disabled={checking} onClick={() => void check(status === 'off')}
      style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', color: colors.gold }}>
      {t(checking ? 'checking' : status === 'off' ? 'enable' : 'verify')}
      <ChevronRight aria-hidden="true" size={18} />
    </button>
  </section>
}
