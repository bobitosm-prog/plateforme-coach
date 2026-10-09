'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Watch, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import styles from './HomeV2.module.css'
import { colors, btnSecondary } from '@/lib/app-design-tokens'
import { hasWatchWorkoutBridge, watchWorkout, type WatchWorkoutStatus } from '@/lib/training/watch-workout'

/** The Home check never starts a HealthKit workout. Readiness requires a live Watch reply. */
export default function WatchReadinessIndicator() {
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
  return <Dialog.Root>
    <Dialog.Trigger asChild>
      <button type="button" className={styles.watchIndicator} aria-label={`Apple Watch — ${t(status)}`}
        data-watch-status={status} style={{ color: status === 'ready' ? '#65cf8b' : '#ff8585' }}>
        <Watch size={22} aria-hidden="true" />
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.watchOverlay} />
      <Dialog.Content className={styles.watchDialog}>
        <Dialog.Title style={{ margin: '0 40px 12px 0', color: colors.gold, fontSize: 18 }}>Apple Watch</Dialog.Title>
        <strong role="status">{t(status)}</strong>
        <Dialog.Description style={{ fontSize: 14, margin: '10px 0 18px', lineHeight: 1.5, color: colors.textMuted }}>{t(`${status}_detail`)}</Dialog.Description>
        <button type="button" disabled={checking} onClick={() => void check(status === 'off')} style={{ ...btnSecondary, width: '100%' }}>
          {t(checking ? 'checking' : status === 'off' ? 'enable' : 'verify')}
        </button>
        <Dialog.Close asChild><button type="button" className={styles.watchClose} aria-label={t('close')}><X size={20} aria-hidden="true" /></button></Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
