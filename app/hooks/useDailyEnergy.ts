'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  dailyEnergy,
  hasDailyEnergyBridge,
  type DailyEnergy,
} from '@/lib/health/daily-energy'

/** Health data stays on this device. Invalidate responses when the date/account changes. */
export function useDailyEnergy(account: string, date: string) {
  const [data, setData] = useState<DailyEnergy | null>(null)
  const [busy, setBusy] = useState(false)
  const [available, setAvailable] = useState(false)
  const generation = useRef(0)
  const pending = useRef(false)
  const request = useCallback(
    async (action: 'read' | 'connect' | 'disconnect') => {
      if (pending.current || !account) return
      pending.current = true
      setBusy(true)
      const current = generation.current
      const result = await dailyEnergy(action, account, date)
      if (current !== generation.current) return
      setData(result)
      setBusy(false)
      pending.current = false
    },
    [account, date],
  )
  useEffect(() => {
    generation.current++
    pending.current = false
    setData(null)
    setBusy(false)
    setAvailable(hasDailyEnergyBridge())
    if (hasDailyEnergyBridge()) void request('read')
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        if (hasDailyEnergyBridge()) void request('read')
      } else {
        generation.current++
        pending.current = false
        setData(null)
        setBusy(false)
      }
    }
    document.addEventListener('visibilitychange', refresh)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && hasDailyEnergyBridge())
        void request('read')
    }, 60000)
    return () => {
      generation.current++
      pending.current = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [request])
  return { data, busy, available, request }
}
