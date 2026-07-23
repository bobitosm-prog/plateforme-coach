'use client'

import React from 'react'
import { animate, useMotionValue } from 'framer-motion'
import { toast } from 'sonner'
import type { Badge } from '@/lib/check-badges'
import { checkAndShowReminder } from '@/lib/notifications'
import { resyncPushSubscription } from '@/lib/push-resync'
import type useClientDashboard from '@/app/hooks/useClientDashboard'
import { useOverlayOpen } from '@/app/hooks/useOverlayOpen'

const TAB_INDEX = { home: 0, training: 1, nutrition: 2, progress: 3, compte: 4 } as const
export const TAB_RAIL_KEYS = ['home', 'training', 'nutrition', 'progress', 'compte'] as const
const RAIL_SPRING = { type: 'spring' as const, stiffness: 380, damping: 30, mass: 0.8 }

type DashboardState = ReturnType<typeof useClientDashboard>
type TouchState = {
  startX: number
  startY: number
  baseX: number
  t0: number
  mode: 'pending' | 'horizontal' | 'rejected'
}

export function useDashboardClientRuntime(h: DashboardState) {
  const supabase = h.supabase
  const userId = h.session?.user?.id
  const [isDesktop, setIsDesktop] = React.useState(false)
  const overlayOpen = useOverlayOpen()
  const paymentHandled = React.useRef(false)
  const [celebrateBadge, setCelebrateBadge] = React.useState<Badge | null>(null)
  const badgeQueue = React.useRef<Badge[]>([])
  const visitedTabs = React.useRef(new Set<string>(['home']))
  const [lastRailIndex, setLastRailIndex] = React.useState(0)
  const [, forceRender] = React.useState(0)
  const [mainSize, setMainSize] = React.useState({ w: 0, h: 0 })
  const railRO = React.useRef<ResizeObserver | null>(null)
  const mainRef = React.useRef<HTMLElement | null>(null)
  const railX = useMotionValue(0)
  const touchState = React.useRef<TouchState | null>(null)
  const railDivRef = React.useRef<HTMLDivElement | null>(null)
  const pushResyncRan = React.useRef(false)

  const handleBadgesEarned = React.useCallback((badges: Badge[]) => {
    badgeQueue.current = badges.slice(1)
    setCelebrateBadge(badges[0])
  }, [])

  const handleBadgeClose = React.useCallback(async () => {
    try {
      await supabase.from('user_badges').update({ celebrated: true }).eq('user_id', userId).eq('celebrated', false)
    } catch (error) {
      console.error('[badge-celebration] flag error:', error)
    }
    setCelebrateBadge(badgeQueue.current.length > 0 ? badgeQueue.current.shift() ?? null : null)
  }, [supabase, userId])

  const measureMainRef = React.useCallback((element: HTMLElement | null) => {
    mainRef.current = element
    railRO.current?.disconnect()
    if (!element) return
    const measure = () => {
      const rect = element.getBoundingClientRect()
      setMainSize({ w: rect.width, h: rect.height })
    }
    measure()
    railRO.current = new ResizeObserver(measure)
    railRO.current.observe(element)
  }, [])

  const currentIndex = TAB_INDEX[h.activeTab as keyof typeof TAB_INDEX]
  const railIndex = currentIndex ?? lastRailIndex

  React.useEffect(() => {
    if (currentIndex !== undefined) setLastRailIndex(currentIndex)
  }, [currentIndex])

  React.useEffect(() => {
    if (mainSize.w === 0) return
    if (overlayOpen) {
      railX.set(0)
      return
    }
    const animation = animate(railX, -railIndex * mainSize.w, RAIL_SPRING)
    return () => animation.stop()
  }, [railIndex, mainSize.w, overlayOpen, railX])

  const onRailTouchStart = (event: React.TouchEvent) => {
    if (overlayOpen) return
    const touch = event.touches[0]
    let node = event.target as HTMLElement | null
    while (node && node !== document.body) {
      const overflowX = getComputedStyle(node).overflowX
      if (node.hasAttribute?.('data-no-tab-swipe') || ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 1)) return
      node = node.parentElement
    }
    if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return
    touchState.current = { startX: touch.clientX, startY: touch.clientY, baseX: railX.get(), t0: performance.now(), mode: 'pending' }
  }

  React.useEffect(() => {
    const element = railDivRef.current
    if (!element) return
    const handler = (event: TouchEvent) => {
      const state = touchState.current
      if (!state || state.mode === 'rejected') return
      const touch = event.touches[0]
      const dx = touch.clientX - state.startX
      const dy = touch.clientY - state.startY
      if (state.mode === 'pending') {
        const ax = Math.abs(dx)
        const ay = Math.abs(dy)
        if (ax > 12 && ax > ay * 1.5) state.mode = 'horizontal'
        else if (ay > 16 && ay > ax * 1.5) { state.mode = 'rejected'; return }
        else return
      }
      if (event.cancelable) event.preventDefault()
      const min = -4 * mainSize.w
      let x = state.baseX + dx
      if (x > 0) x *= 0.15
      else if (x < min) x = min + (x - min) * 0.15
      railX.set(x)
    }
    element.addEventListener('touchmove', handler, { passive: false })
    return () => element.removeEventListener('touchmove', handler)
  }, [mainSize.w, railX])

  const onRailTouchEnd = () => {
    if (overlayOpen) return
    const state = touchState.current
    touchState.current = null
    if (!state || state.mode !== 'horizontal') return
    const dx = railX.get() - state.baseX
    const velocity = (dx / Math.max(1, performance.now() - state.t0)) * 1000
    let target = railIndex
    if (dx < -mainSize.w * 0.25 || velocity < -500) target += 1
    else if (dx > mainSize.w * 0.25 || velocity > 500) target -= 1
    target = Math.max(0, Math.min(4, target)) as typeof railIndex
    if (target !== railIndex) h.setActiveTab(TAB_RAIL_KEYS[target])
    else animate(railX, -railIndex * mainSize.w, RAIL_SPRING)
  }

  React.useEffect(() => {
    if (TAB_RAIL_KEYS.includes(h.activeTab as (typeof TAB_RAIL_KEYS)[number]) && !visitedTabs.current.has(h.activeTab)) {
      visitedTabs.current.add(h.activeTab)
      forceRender(value => value + 1)
    }
  }, [h.activeTab])

  React.useEffect(() => {
    const element = mainRef.current
    if (!element) return
    const lock = () => { if (element.scrollLeft !== 0) element.scrollLeft = 0 }
    lock()
    element.addEventListener('scroll', lock, { passive: true })
    return () => element.removeEventListener('scroll', lock)
  }, [])

  React.useEffect(() => {
    if (paymentHandled.current) return
    const payment = new URLSearchParams(window.location.search).get('payment')
    if (!payment) return
    paymentHandled.current = true
    window.history.replaceState({}, '', window.location.pathname)
    if (payment === 'success') {
      toast.success('Paiement réussi ! Bienvenue sur MoovX Premium', { duration: 4000 })
      setTimeout(() => window.location.reload(), 2000)
    } else if (payment === 'cancel' || payment === 'cancelled') {
      toast.info('Paiement annulé. Tu peux réessayer quand tu veux.', { duration: 4000 })
    }
  }, [])

  React.useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth > 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  React.useEffect(() => {
    if (userId && h.profile) return checkAndShowReminder(userId, h.profile)
  }, [userId, h.profile, h.profile?.reminder_enabled])

  React.useEffect(() => {
    if (pushResyncRan.current || !userId) return
    pushResyncRan.current = true
    const id = setTimeout(() => resyncPushSubscription(supabase, userId), 1500)
    return () => clearTimeout(id)
  }, [supabase, userId])

  return {
    celebrateBadge, handleBadgeClose, handleBadgesEarned, isDesktop, mainSize, setIsDesktop,
    measureMainRef, onRailTouchEnd, onRailTouchStart, overlayOpen, railDivRef,
    railX, visitedTabs,
  }
}
