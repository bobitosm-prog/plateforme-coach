'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion, useMotionValue, animate as fmAnimate } from 'framer-motion'
import {
  Home, Dumbbell, UtensilsCrossed, TrendingUp, Sparkles,
  User, Plus, ChevronRight, Search, X,
} from 'lucide-react'

import useClientDashboard, { type Tab } from '../hooks/useClientDashboard'
import useInitialGeneration from '../hooks/useInitialGeneration'
import Paywall from '../components/Paywall'
import { STANDARD_TRIAL_DAYS } from '@/lib/constants'
import ClientIntlProvider from '../../components/ClientIntlProvider'
import PostAuthFatalState from '../../components/auth/PostAuthFatalState'
import InitialGenerationStatus from '../../components/initial-generation/InitialGenerationStatus'
import BadgeCelebration from '../components/BadgeCelebration'
import type { Badge } from '../../lib/check-badges'
import FeedbackTab from '../components/client/FeedbackTab'
import ChatAI from '../components/ChatAI'
import BarcodeScanner from '../components/BarcodeScanner'
import { cache } from '../../lib/cache'
import { useOverlayOpen } from '../hooks/useOverlayOpen'
import { resyncPushSubscription } from '../../lib/push-resync'
import type { ActiveWorkoutDraft } from '../../lib/training/active-workout-draft'

import WorkoutSession from '../components/WorkoutSession'
import WeightModal from '../components/modals/WeightModal'
import MeasureModal from '../components/modals/MeasureModal'
import BmrModal from '../components/modals/BmrModal'
import ObjectiveModal from '../components/modals/ObjectiveModal'
import HomeTab from '../components/tabs/HomeTab'
import useHomeDashboardModel from '../hooks/useHomeDashboardModel'
import TrainingTab from '../components/tabs/TrainingTab'
import NutritionTab from '../components/tabs/NutritionTab'
import ProgressTab from '../components/tabs/ProgressTab'
import ProfileTab from '../components/tabs/ProfileTab'
import MessagesTab from '../components/tabs/MessagesTab'
import PreferencesSection from '../components/tabs/profile/PreferencesSection'
import AccountSection from '../components/tabs/profile/AccountSection'
import GoalsSection from '../components/tabs/profile/GoalsSection'
import NutritionProgramSection from '../components/tabs/profile/NutritionProgramSection'
import TrainingProgramSection from '../components/tabs/profile/TrainingProgramSection'
import AccountTab from '../components/tabs/AccountTab'
import { getSessionForDay } from '../../lib/get-today-session'
import { getHomeDayWindow } from '../../lib/home/home-date'

import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
  MEAL_TYPES, Z_FAB, Z_NAV, Z_MODAL,
} from '../../lib/design-tokens'
import { useClientPermissions } from '../../lib/use-client-permissions'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

const CoachDashboard = dynamic(() => import('./coach/page'), { ssr: false })

import { checkAndShowReminder } from '../../lib/notifications'

/** Micro-component for translated nav label — must be rendered INSIDE ClientIntlProvider */
function NavAccountLabel() {
  const tc = useTranslations('common')
  return <>{tc('navAccount')}</>
}

/** Wrapper: PR toasts + pushes newBadges to global queue — rendered INSIDE ClientIntlProvider */
function WorkoutSessionWithCelebrations({ draft, onDraftChange, onFinish, onClose, onNavigateHome, onNavigateProgress, onBadgesEarned, rirTrackingEnabled }: {
  draft: ActiveWorkoutDraft
  onDraftChange: (draft: ActiveWorkoutDraft) => void
  onFinish: (data: any, draft?: ActiveWorkoutDraft) => Promise<{
    newPRs: { exercise: string; value: number }[]
    newBadges: Badge[]
    secondary: Promise<{ newPRs: { exercise: string; value: number }[]; newBadges: Badge[] }>
  }>
  onClose: () => void
  onNavigateHome: () => void
  onNavigateProgress: () => void
  onBadgesEarned: (badges: Badge[]) => void
  rirTrackingEnabled?: boolean
}) {
  const t = useTranslations('training_tab')
  const handleFinish = React.useCallback(async (data: any, submittedDraft?: ActiveWorkoutDraft) => {
    const result = await onFinish(data, submittedDraft ?? draft)
    void result.secondary.then(({ newPRs: prs, newBadges }) => {
      if (prs.length === 1) {
        toast.success(t('calendar.toasts.newPR', { exercise: prs[0].exercise, value: prs[0].value }), { duration: 5000 })
      } else if (prs.length > 1) {
        const list = prs.map(p => `${p.exercise} ${p.value}kg`).join(' \u00b7 ')
        toast.success(t('calendar.toasts.newPRMultiple', { count: prs.length, list }), { duration: 6000 })
      }
      if (newBadges.length) onBadgesEarned(newBadges)
    })
    return result
  }, [onFinish, draft, t, onBadgesEarned])
  return <WorkoutSession draft={draft} onDraftChange={onDraftChange} onFinish={handleFinish} onClose={onClose} onNavigateHome={onNavigateHome} onNavigateProgress={onNavigateProgress} rirTrackingEnabled={rirTrackingEnabled} />
}

const TAB_INDEX = { home: 0, training: 1, nutrition: 2, progress: 3, compte: 4 } as const
const TAB_RAIL_KEYS = ['home', 'training', 'nutrition', 'progress', 'compte'] as const

export default function CoachApp() {
  const h = useClientDashboard()
  const initialGen = useInitialGeneration(h.session?.user?.id, h.profile, h.supabase, {
    capabilities: h.capabilities,
    coachRelationStatus: h.coachRelationStatus,
    coachId: h.coachId,
  })
  const perms = useClientPermissions(h.session?.user?.id, h.supabase)
  const overlayOpen = useOverlayOpen()
  const paymentHandled = React.useRef(false)

  // ── Badge celebration queue (global — survives workout unmount) ──
  const [celebrateBadge, setCelebrateBadge] = React.useState<Badge | null>(null)
  const badgeQueue = React.useRef<Badge[]>([])
  const handleBadgesEarned = React.useCallback((badges: Badge[]) => {
    badgeQueue.current = badges.slice(1)
    setCelebrateBadge(badges[0])
  }, [])
  const handleBadgeClose = React.useCallback(async () => {
    // Mark ALL uncelebrated as celebrated (same pattern as ProfileTab L.528)
    try {
      await h.supabase.from('user_badges').update({ celebrated: true }).eq('user_id', h.session?.user?.id).eq('celebrated', false)
    } catch (e) { console.error('[badge-celebration] flag error:', e) }
    if (badgeQueue.current.length > 0) {
      setCelebrateBadge(badgeQueue.current.shift()!)
    } else {
      setCelebrateBadge(null)
    }
  }, [h.supabase, h.session?.user?.id])

  // ── Rail horizontal: lazy keep-alive ──
  const visitedTabs = React.useRef(new Set<string>(['home']))
  const lastRailIndex = React.useRef(0)
  const [, forceRender] = React.useState(0)
  const [mainSize, setMainSize] = React.useState({ w: 0, h: 0 })
  const railRO = React.useRef<ResizeObserver | null>(null)
  const measureMainRef = React.useCallback((el: HTMLElement | null) => {
    h.mainRef.current = el
    railRO.current?.disconnect()
    if (!el) return
    const measure = () => { const r = el.getBoundingClientRect(); setMainSize({ w: r.width, h: r.height }) }
    measure()
    railRO.current = new ResizeObserver(measure)
    railRO.current.observe(el)
  }, [])
  const idx = TAB_INDEX[h.activeTab as keyof typeof TAB_INDEX]
  if (idx !== undefined) lastRailIndex.current = idx
  const railIndex = idx ?? lastRailIndex.current
  // ── S2-v2 : drag par détection d'intention ──
  const railX = useMotionValue(0)
  const RAIL_SPRING = { type: 'spring' as const, stiffness: 380, damping: 30, mass: 0.8 }
  React.useEffect(() => {
    if (mainSize.w === 0) return
    if (overlayOpen) {
      // Quand un overlay est ouvert, neutraliser le transform immédiatement
      // (pas d'animation) pour supprimer le containing-block CSS.
      railX.set(0)
      return
    }
    const anim = fmAnimate(railX, -railIndex * mainSize.w, RAIL_SPRING)
    return () => anim.stop()
  }, [railIndex, mainSize.w, overlayOpen])
  const touchState = React.useRef<{ startX: number, startY: number, baseX: number, t0: number, mode: 'pending'|'horizontal'|'rejected' } | null>(null)
  const railDivRef = React.useRef<HTMLDivElement | null>(null)
  const inHorizontalScroller = (el: HTMLElement | null): boolean => {
    let node = el
    while (node && node !== document.body) {
      if (node.hasAttribute?.('data-no-tab-swipe')) return true
      const style = getComputedStyle(node)
      const ox = style.overflowX
      if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 1) return true
      node = node.parentElement
    }
    return false
  }
  const onRailTouchStart = (e: React.TouchEvent) => {
    if (overlayOpen) return
    const t = e.touches[0]
    if (inHorizontalScroller(e.target as HTMLElement)) return
    if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return
    touchState.current = { startX: t.clientX, startY: t.clientY, baseX: railX.get(), t0: performance.now(), mode: 'pending' }
  }
  // touchmove handler registered via addEventListener({ passive: false }) to allow preventDefault
  React.useEffect(() => {
    const el = railDivRef.current
    if (!el) return
    const handler = (e: TouchEvent) => {
      const s = touchState.current
      if (!s || s.mode === 'rejected') return
      const t = e.touches[0]
      const dx = t.clientX - s.startX, dy = t.clientY - s.startY
      if (s.mode === 'pending') {
        const ax = Math.abs(dx), ay = Math.abs(dy)
        if (ax > 12 && ax > ay * 1.5) s.mode = 'horizontal'
        else if (ay > 16 && ay > ax * 1.5) { s.mode = 'rejected'; return }
        else return
      }
      if (e.cancelable) e.preventDefault()
      const min = -4 * mainSize.w, max = 0
      let x = s.baseX + dx
      if (x > max) x = max + (x - max) * 0.15
      else if (x < min) x = min + (x - min) * 0.15
      railX.set(x)
    }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => { el.removeEventListener('touchmove', handler) }
  }, [mainSize.w])
  const onRailTouchEnd = () => {
    if (overlayOpen) return
    const s = touchState.current
    touchState.current = null
    if (!s || s.mode !== 'horizontal') return
    const dx = railX.get() - s.baseX
    const dt = Math.max(1, performance.now() - s.t0)
    const vx = (dx / dt) * 1000
    const D = mainSize.w * 0.25, V = 500
    let target = railIndex
    if (dx < -D || vx < -V) target = railIndex + 1
    else if (dx > D || vx > V) target = railIndex - 1
    target = Math.max(0, Math.min(4, target)) as typeof railIndex
    if (target !== railIndex) h.setActiveTab(TAB_RAIL_KEYS[target] as any)
    else fmAnimate(railX, -railIndex * mainSize.w, RAIL_SPRING)
  }
  // Mark active tab as visited (triggers render to mount it)
  React.useEffect(() => {
    if (TAB_RAIL_KEYS.includes(h.activeTab as any) && !visitedTabs.current.has(h.activeTab)) {
      visitedTabs.current.add(h.activeTab)
      forceRender(n => n + 1)
    }
  }, [h.activeTab])
  // Pré-montage progressif : seulement les voisins de l'onglet actif,
  // après un délai plancher (le boot d'abord, les voisins ensuite)
  React.useEffect(() => {
    const curIdx = TAB_INDEX[h.activeTab as keyof typeof TAB_INDEX]
    if (curIdx === undefined) return
    const neighbors = [TAB_RAIL_KEYS[curIdx - 1], TAB_RAIL_KEYS[curIdx + 1]].filter(Boolean) as string[]
    const missing = neighbors.filter(t => !visitedTabs.current.has(t))
    if (missing.length === 0) return
    const mount = () => {
      missing.forEach(t => visitedTabs.current.add(t))
      forceRender(n => n + 1)
    }
    // Délai plancher 3s puis idle (laisse le boot finir même sur machine rapide)
    const timer = setTimeout(() => {
      if ('requestIdleCallback' in window) (window as any).requestIdleCallback(mount, { timeout: 2000 })
      else mount()
    }, 3000)
    return () => clearTimeout(timer)
  }, [h.activeTab])
  // Verrou anti-scroll horizontal du conteneur du rail (scrollIntoView internes)
  React.useEffect(() => {
    const el = h.mainRef.current
    if (!el) return
    const lock = () => { if (el.scrollLeft !== 0) el.scrollLeft = 0 }
    lock()
    el.addEventListener('scroll', lock, { passive: true })
    return () => el.removeEventListener('scroll', lock)
  }, [])

  // Handle Stripe return (?payment=success or ?payment=cancel)
  React.useEffect(() => {
    if (paymentHandled.current) return
    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    if (!payment) return
    paymentHandled.current = true

    // Clean URL immediately
    window.history.replaceState({}, '', window.location.pathname)

    if (payment === 'success') {
      toast.success('Paiement réussi ! Bienvenue sur MoovX Premium', { duration: 4000 })
      // Give webhook 2s to update DB, then hard reload to re-fetch profile
      setTimeout(() => window.location.reload(), 2000)
    } else if (payment === 'cancel' || payment === 'cancelled') {
      toast.info('Paiement annulé. Tu peux réessayer quand tu veux.', { duration: 4000 })
    }
  }, [])

  const homeProgramSession = React.useMemo(() => {
    const localDate = getHomeDayWindow().localDateKey
    const [year, month, day] = localDate.split('-').map(Number)
    const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    const mondayIndex = jsDay === 0 ? 6 : jsDay - 1
    if (h.planningDays?.length) {
      const value = getSessionForDay(h.planningDays, mondayIndex)
      return { title: value.name, exercises: value.exercises, isRest: value.type === 'rest', source: 'custom_program' as const }
    }
    if (h.todayCoachDay) return {
      title: h.todayCoachDay.day_name || h.todayCoachDay.name || '',
      exercises: h.todayCoachDay.exercises || [],
      isRest: Boolean(h.todayCoachDay.repos),
      source: 'coach_program' as const,
    }
    return null
  }, [h.planningDays, h.todayCoachDay])

  const homeBase = React.useMemo(() => ({
    identity: {
      firstName: h.firstName || '', avatar: h.displayAvatar ?? null,
      streak: h.streak ?? 0, state: h.profile ? 'ready' as const : 'loading' as const,
    },
    training: { state: h.loading ? 'loading' as const : 'empty' as const, hasProgram: Boolean(h.planningDays?.length || h.coachProgram) },
    nutrition: {
      caloriesConsumed: null, caloriesTarget: h.calorieGoal ?? null,
      macrosTarget: { protein: h.profile?.protein_goal ?? null, carbs: h.profile?.carbs_goal ?? null, fat: h.profile?.fat_goal ?? null },
      hasPlan: Boolean(h.coachMealPlan),
    },
    recovery: { sourceDataAvailable: false },
    hydration: { consumedMl: null, targetMl: h.profile?.water_goal ?? null },
    progression: {
      currentWeight: h.currentWeight ?? null,
      previousWeight: h.weightHistory30?.length > 1
        ? h.weightHistory30[h.weightHistory30.length - 2].poids
        : null,
      sessionsThisWeek: h.completedThisWeek?.size ?? null,
      adherence: (h.scheduledSessions?.filter((session: { session_type?: string }) => !['rest', 'repos'].includes(session.session_type ?? '')).length ?? 0) > 0
        ? Math.min(1, (h.completedThisWeek?.size ?? 0) / h.scheduledSessions.filter((session: { session_type?: string }) => !['rest', 'repos'].includes(session.session_type ?? '')).length)
        : null,
      latestPR: h.personalRecords?.[0] ?? null,
    },
    diagnostic: { latest: h.latestDiagnostic ?? null, canGenerate: true },
    coach: {
      relationStatus: h.coachRelationStatus,
      coachId: h.coachId ?? null,
      lastMessage: h.messages?.length ? h.messages[h.messages.length - 1] : null,
    },
    capabilities: h.capabilities,
    freshness: 'mixed' as const,
  }), [h])

  const homeTrainingSource = React.useMemo(() => ({
    scheduledSessions: h.scheduledSessions ?? [],
    programSession: homeProgramSession,
    workoutSessions: h.wSessions ?? [],
    nextSession: h.nextSession ?? null,
    weeklyCompleted: h.completedThisWeek?.size ?? 0,
    weeklyPlanned: h.scheduledSessions?.length ?? 0,
    hasProgram: Boolean(h.planningDays?.length || h.coachProgram),
    state: h.loading ? 'loading' as const : 'ready' as const,
  }), [h.coachProgram, h.completedThisWeek, h.loading, h.nextSession, h.planningDays, h.scheduledSessions, h.wSessions, homeProgramSession])

  const homeModel = useHomeDashboardModel({
    enabled: h.userRole === 'client' && Boolean(h.session?.user?.id),
    supabase: h.supabase,
    userId: h.session?.user?.id,
    base: homeBase,
    trainingSource: homeTrainingSource,
  })

  // Check and schedule workout reminders
  React.useEffect(() => {
    if (h.session?.user?.id && h.profile) {
      const cleanup = checkAndShowReminder(h.session.user.id, h.profile)
      return cleanup
    }
  }, [h.session?.user?.id, h.profile?.reminder_enabled])

  // Silent push subscription re-sync (repair stale/expired subs)
  const pushResyncRan = React.useRef(false)
  React.useEffect(() => {
    if (pushResyncRan.current) return
    if (!h.session?.user?.id) return
    pushResyncRan.current = true
    const uid = h.session.user.id
    const id = setTimeout(() => {
      resyncPushSubscription(h.supabase, uid)
    }, 1500)
    return () => clearTimeout(id)
  }, [h.session?.user?.id, h.supabase])

  /* ── Loading splash ── */
  if (!h.mounted || h.loading || (h.session && (!h.roleChecked || h.postAuthProfileState === 'loading'))) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#0D0B08', gap: 24 }}>
      <img src="/logo-moovx.png" alt="MoovX" width={80} height={80} style={{ borderRadius: 20, filter: 'drop-shadow(0 0 30px rgba(212,168,67,0.3))' }} />
      <div style={{ width: 32, height: 32, border: '3px solid #222', borderTopColor: '#D4A843', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  /* ── Not authenticated → /login (same-origin, préserve le conteneur PWA iOS) ── */
  if (!h.session && !h.loading) {
    h.router.replace('/login')
    return null
  }

  if (h.postAuthProfileState === 'error' || h.postAuthProfileState === 'missing') return (
    <ClientIntlProvider>
      <PostAuthFatalState state={h.postAuthProfileState} onRetry={h.retryPostAuth} />
    </ClientIntlProvider>
  )

  /* ── Coach role → render coach dashboard directly (no redirect) ── */
  if (h.userRole === 'coach') return <CoachDashboard initialSession={h.session} />

  /* ── Trial expired OR no subscription → paywall ── */
  if (h.profile && !h.isSubActive) return (
    <div style={{ minHeight: '100dvh', background: '#0D0B08', display: 'flex', flexDirection: 'column' }}>
      {(h.trialExpired || h.betaExpired) && (
        <div style={{ textAlign: 'center', padding: '40px 24px 0' }}>
          <img src="/logo-moovx.png" alt="MoovX Logo" width={56} height={56} style={{ borderRadius: 16, margin: '0 auto 16px', display: 'block' }} />
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(1.6rem,4vw,2.2rem)', letterSpacing: 3, color: '#F8FAFC', margin: '0 0 8px' }}>
            {h.betaExpired ? 'TON ACCÈS BETA EST TERMINÉ' : 'TA PÉRIODE D\'ESSAI EST TERMINÉE'}
          </h1>
          <p style={{ color: '#555', fontSize: '0.88rem', margin: '0 0 4px', fontFamily: FONT_BODY, fontWeight: 300, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            {h.betaExpired
              ? 'Ta période d\'accès gratuit MoovX est arrivée à son terme. Abonne-toi pour continuer.'
              : `Ton essai gratuit de ${STANDARD_TRIAL_DAYS} jours est arrivé à son terme. Abonne-toi pour continuer à utiliser MoovX.`}
          </p>
        </div>
      )}
      <ClientIntlProvider>
        <Paywall role="client" userId={h.session.user.id} coachId={h.coachId} onSignOut={() => { cache.clearAll(); h.supabase.auth.signOut().then(() => { window.location.href = '/login' }) }} />
      </ClientIntlProvider>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════
     MAIN APP SHELL (Mobile <1024px)
  ══════════════════════════════════════════════════════════════ */
  return (
    <ClientIntlProvider>
    <div className="app-shell" style={{ display: 'flex', width: '100%', background: BG_BASE, color: TEXT_PRIMARY, fontFamily: FONT_BODY }}>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="desktop-sidebar" style={{ display: 'none', width: 240, flexShrink: 0, flexDirection: 'column', height: '100dvh', position: 'fixed', top: 0, left: 0, background: BG_BASE, borderRight: `1px solid ${BORDER}`, zIndex: Z_NAV, padding: '24px 0' }}>
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <img src="/logo-moovx.png" alt="MoovX" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
          {([
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'training', icon: Dumbbell, label: 'Training' },
            { id: 'nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
            { id: 'progress', icon: TrendingUp, label: 'Analytics' },
            { id: 'compte', icon: User, label: 'Compte' },
          ] as const).map(({ id, icon: Icon, label }) => {
            const active = h.activeTab === id
            const badge = id === 'compte' && h.unreadCount > 0
            return (
              <button key={id} onClick={() => { if (overlayOpen) return; h.setActiveTab(id) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'transparent', border: 'none', borderLeft: `2px solid ${active ? GOLD : 'transparent'}`, cursor: overlayOpen ? 'default' : 'pointer', width: '100%', textAlign: 'left', transition: 'background 150ms, opacity 0.2s ease', opacity: overlayOpen ? 0.4 : 1 }}>
                <div style={{ position: 'relative' }}>
                  <Icon size={20} color={active ? GOLD : TEXT_MUTED} strokeWidth={2} />
                  {badge && <span style={{ position: 'absolute', top: -4, right: -6, minWidth: 14, height: 14, background: '#EF4444', borderRadius: 7, fontSize: '0.5rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{h.unreadCount > 9 ? '9+' : h.unreadCount}</span>}
                </div>
                <span style={{ fontFamily: FONT_ALT, fontSize: 13, fontWeight: 700, color: active ? GOLD : TEXT_MUTED, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{id === 'compte' ? <NavAccountLabel /> : label}</span>
              </button>
            )
          })}
        </nav>
        {h.profile && (
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            {h.displayAvatar ? (
              <img src={h.displayAvatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${BORDER}` }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: BG_CARD_2, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontSize: 14, color: GOLD }}>
                {(h.profile.full_name || 'U')[0]?.toUpperCase()}
              </div>
            )}
            <span style={{ fontSize: 13, color: TEXT_MUTED, fontFamily: FONT_BODY, fontWeight: 300 }}>{h.profile.full_name || 'Utilisateur'}</span>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="main-content-area" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100dvh', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .photo-cell:hover .photo-delete-btn { opacity: 1 !important; }
        .app-shell {
          --mobile-bottom-nav-height: 100px;
          --mobile-bottom-visual-gap: 20px;
          --mobile-floating-action-gap: 12px;
          --mobile-athena-fab-size: 52px;
        }
        .client-main-scroll {
          padding-bottom: calc(
            var(--mobile-bottom-nav-height)
            + var(--mobile-bottom-visual-gap)
            + env(safe-area-inset-bottom, 0px)
          );
        }
        .client-main-scroll-home {
          padding-bottom: calc(
            var(--mobile-bottom-nav-height)
            + var(--mobile-floating-action-gap)
            + var(--mobile-athena-fab-size)
            + var(--mobile-bottom-visual-gap)
            + env(safe-area-inset-bottom, 0px)
          );
        }
        @media (max-width: 767px) {
          .client-athena-fab {
            bottom: calc(var(--mobile-bottom-nav-height) + var(--mobile-floating-action-gap) + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
        @media (min-width: 768px) {
          .client-main-scroll,
          .client-main-scroll-home { padding-bottom: 16px; }
        }
      `}</style>

      <InitialGenerationStatus generation={initialGen} />

      {/* ── WorkoutSession fullscreen ── */}
      {h.workoutSession && (
        <WorkoutSessionWithCelebrations
          draft={h.workoutSession}
          onDraftChange={h.updateWorkoutSessionDraft}
          onFinish={h.onFinishWorkout}
          onClose={() => h.setWorkoutSession(null)}
          onNavigateHome={() => { h.setWorkoutSession(null); h.setActiveTab('home') }}
          onNavigateProgress={() => { h.setWorkoutSession(null); h.setActiveTab('progress') }}
          onBadgesEarned={handleBadgesEarned}
          rirTrackingEnabled={h.profile?.rir_tracking_enabled}
        />
      )}

      {/* ── WEIGHT MODAL ── */}
      {h.modal === 'weight' && <WeightModal currentWeight={h.currentWeight} onSave={h.saveWeight} onClose={() => h.setModal(null)} />}

      {/* ── MEASURE MODAL ── */}
      {h.modal === 'measure' && <MeasureModal measurements={h.measurements} onSave={h.saveMeasurements} onClose={() => h.setModal(null)} />}

      {/* ── BMR MODAL ── */}
      {h.modal === 'bmr' && <BmrModal supabase={h.supabase} session={h.session} initialValues={h.bmrForm} onClose={() => h.setModal(null)} />}

      {/* ── OBJECTIVE MODAL ── */}
      {h.modal === 'objective' && <ObjectiveModal profile={h.profile} currentWeight={h.currentWeight} goalWeight={h.goalWeight} supabase={h.supabase} session={h.session} onClose={() => h.setModal(null)} onSaved={() => h.fetchAll(true)} />}

      {/* ── BARCODE SCANNER ── */}
      {h.modal === 'scan' && (
        <BarcodeScanner supabase={h.supabase} userId={h.session?.user?.id || ''} defaultMealType="dejeuner"
          onProductAdded={() => { h.setModal(null); h.fetchAll(true) }}
          onClose={() => h.setModal(null)} />
      )}

      {/* ── FOOD MODAL ── */}
      {h.modal === 'food' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: Z_MODAL, overflowY: 'auto' }}>
          <div style={{ background: BG_CARD, borderRadius: 12, padding: '20px 16px 40px', marginTop: 40, minHeight: 'min(90vh, calc(100dvh - 40px))', border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONT_ALT, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>AJOUTER ALIMENT</h3>
              <button onClick={() => { h.setModal(null); h.setSelectedFood(null); h.setFoodSearch('') }} style={{ width: 32, height: 32, background: BG_CARD_2, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {MEAL_TYPES.map(m => (
                <button key={m.id} onClick={() => h.setMealType(m.id)} style={{ border: `1px solid ${h.mealType === m.id ? GOLD : BORDER}`, background: h.mealType === m.id ? GOLD_DIM : BG_BASE, borderRadius: 12, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 200ms' }}>
                  <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: h.mealType === m.id ? GOLD : TEXT_MUTED }}>{m.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {[['fitness', 'Fitness'], ['anses', 'ANSES'], ['custom', 'Mes aliments']].map(([id, label]) => (
                <button key={id} onClick={() => { h.setSearchTab(id as any); h.setFoodSearch(''); h.setSelectedFood(null) }} style={{ flex: 1, border: `1px solid ${h.searchTab === id ? GOLD : BORDER}`, background: h.searchTab === id ? GOLD_DIM : BG_BASE, borderRadius: 12, padding: '8px 6px', fontSize: '0.7rem', fontWeight: 700, color: h.searchTab === id ? GOLD : TEXT_MUTED, cursor: 'pointer', transition: 'all 200ms' }}>{label}</button>
              ))}
              <button onClick={() => { h.setModal('scan') }} style={{ border: `1px solid ${BORDER}`, background: BG_BASE, borderRadius: 12, padding: '8px 10px', fontSize: '0.7rem', fontWeight: 700, color: TEXT_MUTED, cursor: 'pointer', transition: 'all 200ms', flexShrink: 0 }}>📷</button>
            </div>
            {!h.selectedFood ? (
              <>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED }} />
                  <input value={h.foodSearch} onChange={e => h.setFoodSearch(e.target.value)} placeholder={h.searchTab === 'fitness' ? 'Rechercher un aliment fitness...' : h.searchTab !== 'custom' ? 'Rechercher dans la base ANSES...' : 'Rechercher mes aliments...'} style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }} />
                </div>
                {h.searchTab === 'custom' && (
                  <button onClick={() => h.setModal('custom_food')} style={{ width: '100%', border: `2px dashed ${BORDER}`, borderRadius: 12, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: TEXT_MUTED, fontSize: '0.8rem', fontWeight: 700, background: 'transparent', cursor: 'pointer', marginBottom: 12 }}><Plus size={14} /> Créer un aliment personnalisé</button>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {h.foodResults.map((food: any) => {
                    const cals = h.searchTab === 'custom' ? food.calories : (food.energy_kcal || food.calories || 0)
                    const prot = food.proteins || 0
                    return (
                      <button key={food.id} onClick={() => h.setSelectedFood(food)} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', transition: 'border-color 200ms' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: FONT_BODY, fontWeight: 500, fontSize: '0.9rem', color: TEXT_PRIMARY }}>{food.name}</div>
                          {food.brand && <div style={{ fontSize: '0.7rem', color: TEXT_MUTED, marginTop: 2 }}>{food.brand}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: GOLD }}>{Math.round(cals)} kcal</div>
                          <div style={{ fontSize: '0.65rem', color: TEXT_MUTED }}>P:{Math.round(prot)}g/100g</div>
                        </div>
                        <ChevronRight size={14} color={TEXT_MUTED} />
                      </button>
                    )
                  })}
                  {h.foodSearch.length >= 2 && h.foodResults.length === 0 && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.85rem', padding: '20px 0' }}>Aucun résultat</p>}
                  {h.foodSearch.length < 2 && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.75rem', padding: '16px 0' }}>Saisir au moins 2 caractères</p>}
                </div>
              </>
            ) : (
              <div>
                <button onClick={() => h.setSelectedFood(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEXT_MUTED, fontSize: '0.8rem', fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 16 }}>← Retour</button>
                <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: TEXT_PRIMARY, fontSize: '1rem', marginBottom: 12 }}>{h.selectedFood.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      ['Calories', h.searchTab !== 'custom' ? (h.selectedFood.energy_kcal || 0) : h.selectedFood.calories, 'kcal', GOLD],
                      ['Protéines', h.selectedFood.proteins || 0, 'g', '#3b82f6'],
                      ['Glucides', h.searchTab !== 'custom' ? (h.selectedFood.carbohydrates || h.selectedFood.carbs || 0) : h.selectedFood.carbs, 'g', '#f59e0b'],
                      ['Lipides', h.searchTab !== 'custom' ? (h.selectedFood.fat || h.selectedFood.fats || 0) : h.selectedFood.fat, 'g', '#10b981'],
                    ].map(([n, v, u, c]) => (
                      <div key={n as string} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, color: c as string }}>{Math.round(v as number)}</div>
                        <div style={{ fontSize: '0.6rem', color: TEXT_MUTED }}>{u}/100g</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ color: TEXT_MUTED, fontSize: '0.9rem', flex: 1 }}>Quantité</span>
                  <input type="number" value={h.foodQty} onChange={e => h.setFoodQty(e.target.value)} style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '1.4rem', fontWeight: 700, textAlign: 'right', width: 80, outline: 'none', border: 'none' }} />
                  <span style={{ color: GOLD, fontWeight: 700 }}>g</span>
                </div>
                <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Pour {h.foodQty}g :</div>
                  <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    {[
                      ['Kcal', Math.round((h.searchTab !== 'custom' ? (h.selectedFood.energy_kcal || 0) : h.selectedFood.calories) * parseFloat(h.foodQty) / 100)],
                      ['Prot', Math.round((h.selectedFood.proteins || 0) * parseFloat(h.foodQty) / 100 * 10) / 10],
                      ['Gluc', Math.round((h.searchTab !== 'custom' ? (h.selectedFood.carbohydrates || h.selectedFood.carbs || 0) : h.selectedFood.carbs) * parseFloat(h.foodQty) / 100 * 10) / 10],
                      ['Lip', Math.round((h.searchTab !== 'custom' ? (h.selectedFood.fat || h.selectedFood.fats || 0) : h.selectedFood.fat) * parseFloat(h.foodQty) / 100 * 10) / 10],
                    ].map(([n, v]) => (
                      <div key={n as string} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.6rem', fontWeight: 700, color: GOLD }}>{v}</div>
                        <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase' }}>{n}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={h.addFoodToMeal} style={{ width: '100%', background: GREEN, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: FONT_ALT, fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase',  }}>Ajouter au repas</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CUSTOM FOOD MODAL ── */}
      {h.modal === 'custom_food' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: Z_MODAL, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 20px 40px', width: '100%', border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONT_ALT, fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>NOUVEL ALIMENT</h3>
              <button onClick={() => h.setModal('food')} style={{ width: 32, height: 32, background: BG_CARD_2, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={h.customFoodForm.name} onChange={e => h.setCustomFoodForm(p => ({ ...p, name: e.target.value }))} placeholder="Nom de l'aliment *" style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }} />
              <input value={h.customFoodForm.brand} onChange={e => h.setCustomFoodForm(p => ({ ...p, brand: e.target.value }))} placeholder="Marque (optionnel)" style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['calories_per_100g', 'Calories *', 'kcal'], ['proteins_per_100g', 'Protéines', 'g'], ['carbs_per_100g', 'Glucides', 'g'], ['fats_per_100g', 'Lipides', 'g']].map(([k, l, u]) => (
                  <div key={k} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 4 }}>{l} /100g</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input type="number" value={(h.customFoodForm as any)[k]} onChange={e => h.setCustomFoodForm(p => ({ ...p, [k]: e.target.value }))} placeholder="0" style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '0.9rem', fontWeight: 700, flex: 1, outline: 'none', border: 'none', width: '100%' }} />
                      <span style={{ color: TEXT_MUTED, fontSize: '0.75rem' }}>{u}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={h.addCustomFood} style={{ width: '100%', background: GOLD, color: '#0D0B08', fontWeight: 700, padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: FONT_ALT, fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 16 }}>Créer l&apos;aliment</button>
          </div>
        </div>
      )}

      {/* ── TRIAL BANNER ── */}
      {h.isInTrial && (
        <div style={{ flexShrink: 0, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: h.trialDaysLeft <= 3 ? 'rgba(239,68,68,0.05)' : GOLD_DIM, border: `1px solid ${h.trialDaysLeft <= 3 ? 'rgba(239,68,68,0.15)' : GOLD_RULE}`, borderLeft: 'none', borderRight: 'none' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: h.trialDaysLeft <= 3 ? RED : GOLD }}>
            {h.trialDaysLeft <= 3 ? `Plus que ${h.trialDaysLeft} jour${h.trialDaysLeft !== 1 ? 's' : ''} !` : `Période d'essai — ${h.trialDaysLeft} jours restants`}
          </span>
          <button onClick={() => h.handleSubscribe('client_monthly')} style={{ padding: '6px 14px', background: h.trialDaysLeft <= 3 ? RED : GOLD, border: 'none', borderRadius: 12, color: h.trialDaysLeft <= 3 ? '#fff' : '#0D0B08', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: FONT_ALT, letterSpacing: '0.04em', flexShrink: 0,  }}>
            S&apos;abonner
          </button>
        </div>
      )}

      {/* ── TAB CONTENT — rail horizontal (S1 swipe nav) ── */}
      {/* Sous-écrans (hors rail) */}
      {(h.activeTab === 'profil' || h.activeTab === 'messages' || h.activeTab === 'feedback' || h.activeTab === 'preferences' || h.activeTab === 'account_section' || h.activeTab === 'goals' || h.activeTab === 'nutrition_program' || h.activeTab === 'training_program') && (
        <main className="client-main-scroll" data-scroll-container style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <AnimatePresence mode="wait">
            <motion.div key={h.activeTab} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}>
              {h.activeTab === 'profil' && <ProfileTab supabase={h.supabase} session={h.session} profile={h.profile} displayAvatar={h.displayAvatar} fullName={h.fullName} firstName={h.firstName} avatarRef={h.avatarRef} uploadAvatar={h.uploadAvatar} currentWeight={h.currentWeight} goalWeight={h.goalWeight} calorieGoal={h.calorieGoal} coachProgram={h.coachProgram} coachId={h.coachId} setModal={h.setModal} fetchAll={h.fetchAll} regenerateWeekSchedule={h.regenerateWeekSchedule} onBack={() => h.setActiveTab('compte')} />}
              {h.activeTab === 'messages' && <MessagesTab session={h.session} coachId={h.coachId} supabase={h.supabase} messages={h.messages} msgInput={h.msgInput} setMsgInput={h.setMsgInput} sendMessage={h.sendMessage} msgEndRef={h.msgEndRef} isCoachManaged={perms.isCoachManaged} onBack={() => h.setActiveTab('compte')} />}
              {h.activeTab === 'feedback' && <FeedbackTab onBack={() => h.setActiveTab('compte')} />}
              {h.activeTab === 'preferences' && <PreferencesSection supabase={h.supabase} session={h.session} profile={h.profile} updateReminderSettings={h.updateReminderSettings} updateRirSettings={h.updateRirSettings} onBack={() => h.setActiveTab('compte')} />}
              {h.activeTab === 'account_section' && <AccountSection supabase={h.supabase} session={h.session} profile={h.profile} coachId={h.coachId} onBack={() => h.setActiveTab('compte')} />}
              {h.activeTab === 'goals' && <GoalsSection supabase={h.supabase} session={h.session} profile={h.profile} goalWeight={h.goalWeight} setModal={h.setModal} fetchAll={h.fetchAll} onBack={() => h.setActiveTab('compte')} />}
              {h.activeTab === 'nutrition_program' && <NutritionProgramSection profile={h.profile} capabilities={h.capabilities} coachRelationStatus={h.coachRelationStatus} coachId={h.coachId} supabase={h.supabase} userId={h.session?.user?.id || ''} fetchAll={h.fetchAll} onBack={() => h.setActiveTab('compte')} />}
              {h.activeTab === 'training_program' && <TrainingProgramSection activeProgram={h.activeTrainingProgram} capabilities={h.capabilities} profileObjective={h.profile?.objective} profile={h.profile} supabase={h.supabase} session={h.session} onRefresh={h.fetchAll} onBack={() => h.setActiveTab('compte')} />}
            </motion.div>
          </AnimatePresence>
        </main>
      )}

      {/* Rail horizontal — 5 onglets racine (lazy keep-alive) */}
      <main ref={measureMainRef} style={{ flex: 1, overflow: 'clip', display: (h.activeTab === 'profil' || h.activeTab === 'messages' || h.activeTab === 'feedback' || h.activeTab === 'preferences' || h.activeTab === 'account_section' || h.activeTab === 'goals' || h.activeTab === 'nutrition_program' || h.activeTab === 'training_program') ? 'none' : 'flex' }}>
        <motion.div
          ref={railDivRef}
          style={{ display: 'flex', width: mainSize.w * 5, height: mainSize.h, flexShrink: 0, visibility: mainSize.w === 0 ? 'hidden' : 'visible', x: railX, touchAction: 'pan-y' }}
          onTouchStart={onRailTouchStart}
          onTouchEnd={onRailTouchEnd}
          onTouchCancel={onRailTouchEnd}
        >
          <div className="client-main-scroll client-main-scroll-home" data-scroll-container style={{ width: mainSize.w, flexShrink: 0, minWidth: mainSize.w, maxWidth: mainSize.w, height: mainSize.h, minHeight: mainSize.h, maxHeight: mainSize.h, overflowY: 'auto', overflowX: 'hidden', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            {visitedTabs.current.has('home') && <HomeTab homeModel={homeModel} supabase={h.supabase} session={h.session} profile={h.profile} avatarRef={h.avatarRef} photoRef={h.photoRef} uploadAvatar={h.uploadAvatar} uploadProgressPhoto={h.uploadProgressPhoto} calorieGoal={h.calorieGoal} completedSessions={h.completedSessions} streak={h.streak} coachProgram={h.coachProgram} coachMealPlan={h.coachMealPlan} todayKey={h.todayKey} todayCoachDay={h.todayCoachDay} todaySessionDone={h.todaySessionDone} setActiveTab={h.setActiveTab} setModal={h.setModal} startProgramWorkout={h.startProgramWorkout} completedThisWeek={h.completedThisWeek} aiAllowed={h.aiAllowed} nextSession={h.nextSession} latestDiagnostic={h.latestDiagnostic} setLatestDiagnostic={h.setLatestDiagnostic} activeTab={h.activeTab} />}
          </div>
          <div className="client-main-scroll" data-scroll-container style={{ width: mainSize.w, flexShrink: 0, minWidth: mainSize.w, maxWidth: mainSize.w, height: mainSize.h, minHeight: mainSize.h, maxHeight: mainSize.h, overflowY: 'auto', overflowX: 'hidden', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            {visitedTabs.current.has('training') && <TrainingTab supabase={h.supabase} session={h.session} profile={h.profile} activeTrainingProgram={h.activeTrainingProgram} todayKey={h.todayKey} todaySessionDone={h.todaySessionDone} workoutHistory={h.wSessions.filter(item => item.completed)} workoutHistoryState={h.workoutHistoryState} startProgramWorkout={h.startProgramWorkout} onOpenProgramSettings={() => h.setActiveTab('training_program')} scheduledSessions={h.scheduledSessions} setCalendarSelectedDate={h.setCalendarSelectedDate} setModal={h.setModal} />}
          </div>
          <div className="client-main-scroll" data-scroll-container style={{ width: mainSize.w, flexShrink: 0, minWidth: mainSize.w, maxWidth: mainSize.w, height: mainSize.h, minHeight: mainSize.h, maxHeight: mainSize.h, overflowY: 'auto', overflowX: 'hidden', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            {visitedTabs.current.has('nutrition') && <NutritionTab profile={h.profile} capabilities={h.capabilities} coachRelationStatus={h.coachRelationStatus} coachId={h.coachId} supabase={h.supabase} userId={h.session?.user?.id || ''} fetchAll={h.fetchAll} onOpenProgramSettings={() => h.setActiveTab('nutrition_program')} />}
          </div>
          <div className="client-main-scroll" data-scroll-container style={{ width: mainSize.w, flexShrink: 0, minWidth: mainSize.w, maxWidth: mainSize.w, height: mainSize.h, minHeight: mainSize.h, maxHeight: mainSize.h, overflowY: 'auto', overflowX: 'hidden', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            {visitedTabs.current.has('progress') && <ProgressTab supabase={h.supabase} weightHistory30={h.weightHistory30} measurements={h.measurements} progressPhotos={h.progressPhotos} photoRef={h.photoRef} photoUploading={h.photoUploading} uploadProgressPhoto={h.uploadProgressPhoto} setModal={h.setModal} profile={h.profile} weeklyCalories={h.weeklyCalories} weeklyWater={h.weeklyWater} weightHistoryFull={h.weightHistoryFull} wSessions={h.wSessions} currentWeight={h.currentWeight} progressionModel={h.progressionModel} onProgressionPeriodChange={h.setProgressionPeriod} />}
          </div>
          <div className="client-main-scroll" data-scroll-container style={{ width: mainSize.w, flexShrink: 0, minWidth: mainSize.w, maxWidth: mainSize.w, height: mainSize.h, minHeight: mainSize.h, maxHeight: mainSize.h, overflowY: 'auto', overflowX: 'hidden', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            {visitedTabs.current.has('compte') && <AccountTab firstName={h.firstName} displayAvatar={h.displayAvatar} unreadCount={h.unreadCount} supabase={h.supabase} userId={h.session?.user?.id} session={h.session} onNavigate={(tab) => h.setActiveTab(tab)} isInTrial={h.isInTrial} trialDaysLeft={h.trialDaysLeft} isInBeta={h.isInBeta} betaDaysLeft={h.betaDaysLeft} />}
          </div>
        </motion.div>
      </main>

      </div>{/* end main-content-area */}

      {!h.workoutSession && h.activeTab !== 'coachIA' && (
        <button className="client-athena-fab" onClick={() => h.setActiveTab('coachIA')} aria-label="Athena"
          style={{ position: 'fixed', bottom: 'calc(136px + env(safe-area-inset-bottom, 0px))', right: 16, width: 52, height: 52, borderRadius: 12, background: GOLD, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${GOLD_RULE}`, zIndex: Z_FAB }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700, color: '#0D0B08', lineHeight: 1, letterSpacing: '0.02em' }}>A</span>
          <Sparkles size={11} color="#0D0B08" style={{ position: 'absolute', top: 8, right: 9 }} />
        </button>
      )}
      {celebrateBadge && <BadgeCelebration badge={celebrateBadge} xp={celebrateBadge.xp_reward} onClose={handleBadgeClose} />}
      {!perms.isCoachManaged && (
          <ChatAI
            session={h.session}
            profile={h.profile}
            capabilities={h.capabilities}
            externalOpen={h.activeTab === 'coachIA'}
            onExternalClose={() => h.setActiveTab('compte')}
            hideFloatingButton={true}
          />
      )}

      {/* ── SVG filter for liquid glass effect (rendered once) ── */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="liquid-glass" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.012" numOctaves="2" seed="4" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="blurredNoise" />
            <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="18" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="0.4" />
          </filter>
        </defs>
      </svg>

      {/* ── BOTTOM NAV — 3 centered tabs ── */}
      {!h.workoutSession && <nav className="mobile-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '8px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 8px)', zIndex: Z_NAV, display: 'flex', justifyContent: 'center' }}>
        <div className="stitch-card-nav" style={{ display: 'flex', justifyContent: 'center', gap: 0, padding: '10px 8px', borderRadius: 18, maxWidth: 360, width: '100%' }}>
        {([
          { id: 'home' as Tab, Icon: Home, label: 'Home' },
          { id: 'training' as Tab, Icon: Dumbbell, label: 'Training' },
          { id: 'nutrition' as Tab, Icon: UtensilsCrossed, label: 'Nutrition' },
          { id: 'progress' as Tab, Icon: TrendingUp, label: 'Analytics' },
          { id: 'compte' as Tab, Icon: User, label: 'Compte' },
        ]).map(({ id, Icon, label }) => {
          const active = h.activeTab === id
          return (
            <button key={id} onClick={() => { if (overlayOpen) return; h.setActiveTab(id) }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: overlayOpen ? 'default' : 'pointer', padding: '0 4px', opacity: overlayOpen ? 0.4 : 1, transition: 'opacity 0.2s ease' }}>
              <div
                className={active ? 'nav-glass-active' : undefined}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 14, transition: 'all 0.3s ease' }}
              >
                <Icon size={20} color={active ? GOLD : TEXT_DIM} strokeWidth={active ? 2.5 : 1.5} style={{ transition: 'all 0.3s ease' }} />
                {id === 'compte' && h.unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -6, right: -8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 999, background: RED, opacity: 0.5, animation: 'badge-pulse 1.5s ease-in-out infinite', pointerEvents: 'none' }} />
                    <span style={{ position: 'relative', background: RED, color: '#fff', fontSize: '0.6rem', fontFamily: FONT_DISPLAY, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16, padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                      {h.unreadCount > 99 ? '99+' : h.unreadCount}
                    </span>
                  </span>
                )}
              </div>
              <span style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: active ? GOLD : TEXT_DIM, transition: 'color 0.3s ease' }}>{id === 'compte' ? <NavAccountLabel /> : label}</span>
              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: GOLD, boxShadow: '0 0 8px rgba(212,168,67,0.5)' }} />}
            </button>
          )
        })}
        </div>
      </nav>}

    </div>
    </ClientIntlProvider>
  )
}
