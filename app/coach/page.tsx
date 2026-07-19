'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import ClientIntlProvider from '@/components/ClientIntlProvider'
import { BG_BASE, BORDER, FONT_DISPLAY, GOLD } from '@/lib/design-tokens'
import { useIsMobile } from '@/app/hooks/useIsMobile'
import useCoachDashboard from './hooks/useCoachDashboard'
import CoachSectionFallback from './components/sections/CoachSectionFallback'
import type { CoachTranslator } from './components/sections/coach-page-types'

const CoachDesktopLayout = dynamic(() => import('./components/sections/CoachDesktopLayout'), { loading: CoachSectionFallback })
const CoachMobileLayout = dynamic(() => import('./components/sections/CoachMobileLayout'), { loading: CoachSectionFallback })

type InitialSession = Parameters<typeof useCoachDashboard>[0]

export default function CoachPage({ initialSession }: { initialSession?: InitialSession } = {}) {
  return <ClientIntlProvider><CoachPageInner initialSession={initialSession} /></ClientIntlProvider>
}

function CoachPageInner({ initialSession }: { initialSession?: InitialSession }) {
  const translations = useTranslations('coach_dashboard')
  const translate: CoachTranslator = (key, values) => translations(key as never, values as never)
  const h = useCoachDashboard(initialSession)
  const isMobile = useIsMobile()
  const [isDesktop, setIsDesktop] = useState(false)
  const [revMonth, setRevMonth] = useState(new Date().getMonth())
  const [revYear, setRevYear] = useState(new Date().getFullYear())
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [createdInvitationId, setCreatedInvitationId] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)

  useEffect(() => {
    const updateViewport = () => setIsDesktop(window.innerWidth > 1024)
    const frame = requestAnimationFrame(updateViewport)
    window.addEventListener('resize', updateViewport)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', updateViewport) }
  }, [])

  async function sendInviteEmail() {
    if (!inviteEmail.includes('@') || !h.session?.user?.id) return
    setInviteSending(true); setCreatedInvitationId(null)
    try {
      const response = await fetch('/api/coach/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientEmail: inviteEmail, locale: 'fr' }) })
      if (!response.ok) throw new Error('request_failed')
      const payload = await response.json() as { data?: { invitationId?: string } }
      setCreatedInvitationId(payload.data?.invitationId || null); setInviteSent(true); setInviteEmail('')
      setTimeout(() => setInviteSent(false), 3000)
    } catch { setInviteSent(false) } finally { setInviteSending(false) }
  }

  async function revokeCreatedInvitation() {
    if (!createdInvitationId) return
    const response = await fetch('/api/coach/invitations/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invitationId: createdInvitationId }) })
    if (response.ok) { setCreatedInvitationId(null); setInviteSent(false) }
  }

  if (!h.mounted || h.loading || (h.session && !h.roleChecked)) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: BG_BASE, gap: 24 }}>
    <img src="/logo-moovx.png" alt="MoovX" width={80} height={80} style={{ borderRadius: 2 }} />
    <span style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 800, color: GOLD, letterSpacing: '3px' }}>MOOVX</span>
    <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>

  if (!h.session) {
    void h.supabase.from('app_logs').insert({ level: 'warning', message: 'COACH_PAGE_REDIRECT_LANDING', details: { loading: h.loading, hasSession: false, url: typeof window !== 'undefined' ? window.location.href : '' }, page_url: '/coach' })
    h.router.push('/login')
    return null
  }

  const layoutProps = { h, ct: translate, isMobile, revMonth, setRevMonth, revYear, setRevYear, inviteEmail, setInviteEmail, inviteSending, inviteSent, createdInvitationId, sendInviteEmail, revokeCreatedInvitation, clientSearch, setClientSearch, hoveredNav, setHoveredNav }
  return isDesktop ? <CoachDesktopLayout {...layoutProps} /> : <CoachMobileLayout {...layoutProps} />
}
