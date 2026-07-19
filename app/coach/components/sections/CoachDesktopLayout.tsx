'use client'

import type React from 'react'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { Activity, Calendar, ChevronLeft, Dumbbell, Home, LogOut, MessageCircle, Plus, User, Users, UtensilsCrossed, X, Zap } from 'lucide-react'
import { cache } from '@/lib/cache'
import { BG_BASE, BG_CARD, BG_CARD_2, BORDER, FONT_ALT, FONT_BODY, FONT_DISPLAY, GOLD, GOLD_DIM, GREEN, RADIUS_CARD, RED, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY } from '@/lib/design-tokens'
import { SESSION_COLORS, SESSION_TYPES, WP_MONTHS } from '../../hooks/useCoachDashboard'
import BugReport from '../../../components/BugReport'
import CoachStyles from '../CoachStyles'
import CoachSectionFallback from './CoachSectionFallback'
import type { CoachPageLayoutProps, CoachSection } from './coach-page-types'

const ClientsList = dynamic(() => import('../ClientsList'), { loading: CoachSectionFallback })
const CoachCalendar = dynamic(() => import('../CoachCalendar'), { loading: CoachSectionFallback })
const CoachMessages = dynamic(() => import('../CoachMessages'), { loading: CoachSectionFallback })
const CoachAliments = dynamic(() => import('../CoachAliments'), { loading: CoachSectionFallback })
const CoachProfile = dynamic(() => import('../CoachProfile'), { loading: CoachSectionFallback })
const CoachPrograms = dynamic(() => import('../CoachPrograms'), { loading: CoachSectionFallback })
const CoachAnalytics = dynamic(() => import('../CoachAnalytics'), { loading: CoachSectionFallback })
const SessionDetailModal = dynamic(() => import('../SessionDetailModal'), { loading: CoachSectionFallback })

export default function CoachDesktopLayout({ h, ct, revMonth, setRevMonth, revYear, setRevYear, inviteEmail, setInviteEmail, inviteSending, inviteSent, createdInvitationId, sendInviteEmail, revokeCreatedInvitation, clientSearch, setClientSearch, hoveredNav, setHoveredNav }: CoachPageLayoutProps) {
  const SIDEBAR_W = 240
  const CARD = { background: BG_CARD, border: '1px solid rgba(255,255,255,0.06)', borderRadius: RADIUS_CARD, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' } as React.CSSProperties
  const SEC_TITLE = { fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: GOLD, whiteSpace: 'nowrap' as const }
  const SEC_LINE = { flex: 1, height: 1, background: 'rgba(201,168,76,0.25)' }

  const navItems = [
    { id: 'accueil', icon: Home, label: ct('sidebar.home') },
    { id: 'dashboard', icon: Users, label: ct('sidebar.dashboard') },
    { id: 'suivi', icon: Activity, label: ct('sidebar.tracking') },
    { id: 'programs', icon: Dumbbell, label: ct('sidebar.programs') },
    { id: 'aliments', icon: UtensilsCrossed, label: ct('sidebar.nutrition') },
    { id: 'messages', icon: MessageCircle, label: ct('sidebar.messages') },
    { id: 'calendar', icon: Calendar, label: ct('sidebar.calendar') },
    { id: 'profil', icon: User, label: ct('sidebar.myProfile') },
  ]

  // Revenue calc
  const startDate = new Date(revYear, revMonth, 1).toISOString()
  const endDate = new Date(revYear, revMonth + 1, 0, 23, 59, 59).toISOString()
  let mRevTotal = 0, mRevCount = 0
  for (const p of h.allPayments) { if (p.paid_at && p.paid_at >= startDate && p.paid_at <= endDate) { mRevTotal += p.amount || 0; mRevCount++ } }
  const fmtRev = Math.round(mRevTotal).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")

  // Today sessions
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todaySessions = h.scheduledSessions.filter((s) => format(new Date(s.scheduled_at), 'yyyy-MM-dd') === todayStr)

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100dvh', background: BG_BASE, color: TEXT_PRIMARY, fontFamily: FONT_BODY }}>
      <CoachStyles />
      {/* SIDEBAR */}
      <aside style={{ width: SIDEBAR_W, flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100dvh', background: BG_BASE, borderRight: `1px solid rgba(255,255,255,0.06)`, display: 'flex', flexDirection: 'column', zIndex: 50 }}>
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-moovx.png" alt="MoovX" style={{ height: 40, width: 40, borderRadius: 10, objectFit: 'contain' }} />
          <div>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: GOLD, letterSpacing: '0.15em' }}>MOOVX</span>
            <span style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#0D0B08', padding: '1px 5px', background: GOLD, borderRadius: 3, marginLeft: 6 }}>PRO</span>
          </div>
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 20px 16px' }} />
        <div style={{ padding: '0 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: BG_BASE }}>{h.coachInitials}</div>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.05em' }}>{h.coachName}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 9, fontWeight: 700, color: GOLD, letterSpacing: '0.15em' }}>{ct('header.coachPro', { count: h.clients.length })}</div>
          </div>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>
          {navItems.map(({ id, icon: Icon, label }) => {
            const active = h.section === id
            const badge = id === 'messages' ? h.totalUnread : 0
            return (
              <button key={id} onClick={() => h.setSection(id as CoachSection)} onMouseEnter={() => setHoveredNav(id)} onMouseLeave={() => setHoveredNav(null)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: active ? 'rgba(230,195,100,0.08)' : (hoveredNav === id ? 'rgba(255,255,255,0.06)' : 'transparent'), borderTop: (hoveredNav === id && !active) ? '1px solid rgba(230,195,100,0.45)' : '1px solid transparent', borderRight: (hoveredNav === id && !active) ? '1px solid rgba(230,195,100,0.45)' : '1px solid transparent', borderBottom: (hoveredNav === id && !active) ? '1px solid rgba(230,195,100,0.45)' : '1px solid transparent', borderLeft: `3px solid ${active ? GOLD : (hoveredNav === id ? 'rgba(230,195,100,0.45)' : 'transparent')}`, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 150ms', position: 'relative', transform: (hoveredNav === id && !active) ? 'translateX(3px)' : 'none' }}>
                <Icon size={18} color={active ? GOLD : TEXT_MUTED} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: active ? GOLD : (hoveredNav === id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'), letterSpacing: '0.12em', transition: 'color 150ms' }}>{label}</span>
                {badge > 0 && <span style={{ marginLeft: 'auto', minWidth: 18, height: 18, background: RED, borderRadius: 9, fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{badge > 9 ? '9+' : badge}</span>}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '16px 20px' }}>
          <button onClick={() => { cache.clearAll(); h.supabase.auth.signOut().then(() => { window.location.href = '/login' }) }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            <LogOut size={14} />{ct('nav.signOut')}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ marginLeft: SIDEBAR_W, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh', ...(h.section === 'messages' ? { height: '100dvh' } : {}) }}>
        {/* Header */}
        <header style={{ position: 'sticky', top: 0, zIndex: 40, height: 64, background: 'rgba(19,19,19,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px' }}>
          <div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, margin: 0, letterSpacing: '0.08em' }}>
              BONJOUR{h.coachName !== 'Coach' && !h.coachName.includes('@') ? ` ${h.coachName.split(' ')[0].toUpperCase()}` : ''}
            </h1>
            <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED, margin: 0 }}>{h.clients.length} client{h.clients.length !== 1 ? 's' : ''} actif{h.clients.length !== 1 ? 's' : ''} · {h.totalUnread} message{h.totalUnread !== 1 ? 's' : ''} non lu{h.totalUnread !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} />
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: h.section === 'messages' ? 0 : '28px 36px 40px', overflowY: h.section === 'messages' ? 'hidden' : 'auto' }}>
          {/* ACCUEIL — Dashboard grid */}
          {h.section === 'accueil' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
              {/* Stripe banner — single, discreet */}
              {h.coachProfile && !h.coachProfile.stripe_onboarding_complete && (
                <div style={{ gridColumn: 'span 12', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: RADIUS_CARD, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={14} color={GOLD} />
                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED }}>Configure Stripe pour recevoir les paiements</span>
                  </div>
                  <button onClick={h.handleStripeConnect} disabled={h.stripeConnecting} style={{ background: GOLD, color: BG_BASE, border: 'none', padding: '6px 14px', borderRadius: 8, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 10, letterSpacing: 1, cursor: 'pointer' }}>{h.stripeConnecting ? '...' : 'CONFIGURER'}</button>
                </div>
              )}

              {/* Activity today — richer content */}
              <div style={{ gridColumn: 'span 8', ...CARD }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}><span style={SEC_TITLE}>Activite Aujourd&apos;hui</span><div style={SEC_LINE} /></div>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div className="coach-clickable" onClick={() => h.setSection('messages' as CoachSection)} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, color: h.totalUnread > 0 ? RED : TEXT_DIM }}>{h.totalUnread}</div>
                    <div style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, color: TEXT_MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>Messages non lus</div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, color: h.pendingVideoCount > 0 ? GOLD : TEXT_DIM }}>{h.pendingVideoCount}</div>
                    <div style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, color: TEXT_MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>Videos a reviewer</div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, color: todaySessions.length > 0 ? GOLD : TEXT_DIM }}>{todaySessions.length}</div>
                    <div style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, color: TEXT_MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>Seances prevues</div>
                  </div>
                </div>
                {/* Today sessions list */}
                {todaySessions.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Ton planning aujourd&apos;hui</div>
                    {todaySessions.map((s) => {
                      const cn = h.clients.find(c => c.client_id === s.client_id)?.profiles?.full_name ?? 'Client'
                      return (
                        <div key={s.id} className="coach-clickable" onClick={() => h.setSelectedSession(s)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ width: 4, height: 28, borderRadius: 2, background: GOLD }} />
                          <div style={{ flex: 1 }}><div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_PRIMARY }}>{cn}</div><div style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_MUTED }}>{s.session_type} · {format(new Date(s.scheduled_at), 'HH:mm')} · {s.duration_minutes}min</div></div>
                          <ChevronLeft size={14} color={TEXT_DIM} style={{ transform: 'rotate(180deg)' }} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Revenue KPI — month pills */}
              <div style={{ gridColumn: 'span 4', ...CARD }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}><span style={SEC_TITLE}>Revenus</span><div style={SEC_LINE} /></div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 700, color: GOLD, lineHeight: 1, marginBottom: 8 }}>CHF {fmtRev}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>{mRevCount} paiement{mRevCount !== 1 ? 's' : ''} ce mois</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => { const m = revMonth - 1; if (m < 0) { setRevMonth(11); setRevYear(y => y - 1) } else setRevMonth(m) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: TEXT_MUTED }}><ChevronLeft size={16} /></button>
                  <span style={{ fontFamily: FONT_ALT, fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.05em', minWidth: 100, textAlign: 'center' }}>{WP_MONTHS[revMonth]} {revYear}</span>
                  <button onClick={() => { const m = revMonth + 1; if (m > 11) { setRevMonth(0); setRevYear(y => y + 1) } else setRevMonth(m) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: TEXT_MUTED }}><ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} /></button>
                </div>
              </div>

              {/* Clients list — with search + email */}
              <div style={{ gridColumn: 'span 8', ...CARD }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={SEC_TITLE}>Mes Clients</span><div style={SEC_LINE} />
                  <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_MUTED }}>{ct('header.clientsActive', { count: h.clients.length, unread: h.totalUnread })}</span>
                </div>
                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: TEXT_DIM, pointerEvents: 'none' }}>&#128269;</span>
                  <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder={ct('header.searchPlaceholder')}
                    style={{ width: '100%', padding: '8px 12px 8px 34px', background: BG_BASE, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontFamily: FONT_BODY, fontSize: 12, color: TEXT_PRIMARY, outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(() => {
                    const q = clientSearch.toLowerCase().trim()
                    const list = q ? h.filtered.filter(c => {
                      const name = (c.profiles?.full_name || '').toLowerCase()
                      const email = (c.profiles?.email || '').toLowerCase()
                      return name.includes(q) || email.includes(q)
                    }) : h.filtered
                    return list.slice(0, 10).map(c => {
                      const name = c.profiles?.full_name || 'Client'
                      const email = c.profiles?.email || ''
                      const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                      const unread = h.unreadCounts[c.client_id] || 0
                      const daysSince = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000)
                      const isActive = daysSince < 7
                      const isWarning = daysSince >= 7 && daysSince < 14
                      const statusColor = isActive ? GREEN : isWarning ? GOLD : RED
                      const statusLabel = isActive ? 'Actif' : isWarning ? 'Inactif 7j+' : 'Inactif 14j+'
                      return (
                        <div key={c.client_id} className="coach-clickable" onClick={() => h.router.push(`/client/${c.client_id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 700, color: BG_BASE, flexShrink: 0 }}>{initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>{name}</div>
                            {email && <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                              <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: statusColor }}>{statusLabel}</span>
                              <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: TEXT_DIM }}>· Depuis {daysSince}j</span>
                              {c.invited_by_coach && <span style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: GOLD_DIM, color: GOLD, letterSpacing: '0.08em' }}>INVITE</span>}
                            </div>
                          </div>
                          {unread > 0 && <span style={{ minWidth: 18, height: 18, background: RED, borderRadius: 9, fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unread}</span>}
                          <ChevronLeft size={14} color={TEXT_DIM} style={{ transform: 'rotate(180deg)', flexShrink: 0 }} />
                        </div>
                      )
                    })
                  })()}
                </div>
                {h.clients.length > 10 && !clientSearch && <button onClick={() => h.setSection('dashboard' as CoachSection)} style={{ width: '100%', marginTop: 8, padding: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: GOLD, fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}>{ct('nav.seeAll')}</button>}
              </div>

              {/* Quick actions */}
              <div style={{ gridColumn: 'span 4', ...CARD }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}><span style={SEC_TITLE}>Actions Rapides</span><div style={SEC_LINE} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={() => { h.setShowInvite(true); h.setSection('dashboard' as CoachSection) }} style={{ width: '100%', padding: '12px', background: GOLD, color: BG_BASE, border: 'none', borderRadius: 10, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Plus size={14} />{ct('nav.newClient')}</button>
                  <button onClick={() => h.setSection('programs' as CoachSection)} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, color: GOLD, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Dumbbell size={14} />NOUVEAU PROGRAMME</button>
                  <button onClick={() => h.setSection('aliments' as CoachSection)} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, color: GOLD, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><UtensilsCrossed size={14} />PLAN NUTRITION</button>
                  <button onClick={() => h.setSection('messages' as CoachSection)} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, color: GOLD, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><MessageCircle size={14} />ENVOYER UN MESSAGE</button>
                </div>
              </div>

              {/* Invite — compact */}
              <div style={{ gridColumn: 'span 12', ...CARD, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONT_ALT, fontSize: 9, fontWeight: 700, color: TEXT_MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>INVITER PAR EMAIL</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="email" placeholder="email@client.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendInviteEmail() }}
                        style={{ flex: 1, background: BG_BASE, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px', fontFamily: FONT_BODY, fontSize: 11, color: TEXT_PRIMARY, outline: 'none' }} />
                      <button onClick={sendInviteEmail} disabled={!inviteEmail.includes('@') || inviteSending} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: inviteSent ? 'rgba(74,222,128,0.15)' : GOLD, color: inviteSent ? GREEN : BG_BASE, fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !inviteEmail.includes('@') ? 0.5 : 1 }}>{inviteSent ? '✓ Envoye' : inviteSending ? '...' : 'Inviter'}</button>
                      {createdInvitationId && <button onClick={revokeCreatedInvitation} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT_MUTED, fontFamily: FONT_ALT, fontSize: 10, cursor: 'pointer' }}>Révoquer</button>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other sections — render existing components with desktop padding */}
          {h.section === 'dashboard' && (
            <ClientsList filtered={h.filtered} loading={h.loading} search={h.search} setSearch={h.setSearch} showInvite={h.showInvite} setShowInvite={h.setShowInvite} unreadCounts={h.unreadCounts} setSection={h.setSection} openChat={h.openChat} setShowNewSession={h.setShowNewSession} coachInitials={h.coachInitials} scheduledSessions={h.scheduledSessions} clients={h.clients} setSelectedSession={h.setSelectedSession} SESSION_COLORS={SESSION_COLORS} lastSessionByClient={h.lastSessionByClient} sessionsThisWeekByClient={h.sessionsThisWeekByClient} />
          )}
          {h.section === 'calendar' && <CoachCalendar calWeekOffset={h.calWeekOffset} setCalWeekOffset={h.setCalWeekOffset} scheduledSessions={h.scheduledSessions} clients={h.clients} setSelectedSession={h.setSelectedSession} setShowNewSession={h.setShowNewSession} setNsDate={h.setNsDate} setSection={h.setSection} />}
          {h.section === 'messages' && <CoachMessages clients={h.clients} selectedClient={h.selectedClient} setSelectedClient={h.setSelectedClient} openChat={h.openChat} chatMessages={h.chatMessages} msgInput={h.msgInput} setMsgInput={h.setMsgInput} sendMessage={h.sendMessage} unreadCounts={h.unreadCounts} lastMessages={h.lastMessages} supabase={h.supabase} session={h.session} msgEndRef={h.msgEndRef} />}
          {h.section === 'suivi' && <CoachAnalytics coachId={h.session?.user?.id || null} />}
          {h.section === 'programs' && <CoachPrograms session={h.session} clients={h.clients} />}
          {h.section === 'aliments' && <CoachAliments foodList={h.foodList} foodFilter={h.foodFilter} setFoodFilter={h.setFoodFilter} foodSearchQ={h.foodSearchQ} setFoodSearchQ={h.setFoodSearchQ} foodLoading={h.foodLoading} loadFoods={h.loadFoods} showAddFood={h.showAddFood} setShowAddFood={h.setShowAddFood} newFood={h.newFood} setNewFood={h.setNewFood} saveNewFood={h.saveNewFood} deleteFood={h.deleteFood} />}
          {h.section === 'profil' && <CoachProfile coachName={h.coachName} coachInitials={h.coachInitials} session={h.session} coachProfile={h.coachProfile} setSection={h.setSection} supabaseSignOut={() => { cache.clearAll(); h.supabase.auth.signOut().then(() => { window.location.href = '/login' }) }} />}
        </main>
      </div>

      {/* Modals (same as mobile) */}
      {h.showNewSession && (
        <div className="modal-bg" onClick={() => h.setShowNewSession(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY, margin: 0 }}>Nouvelle seance</h2>
              <button onClick={() => h.setShowNewSession(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label className="form-label">Client *</label><select value={h.nsClientId} onChange={e => h.setNsClientId(e.target.value)} className="form-input" style={{ cursor: 'pointer' }}><option value="">Selectionner un client…</option>{h.clients.map(c => <option key={c.client_id} value={c.client_id}>{c.profiles?.full_name ?? c.client_id}</option>)}</select></div>
              <div><label className="form-label">Date *</label><input type="date" value={h.nsDate} onChange={e => h.setNsDate(e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div><label className="form-label">Debut</label><input type="time" value={h.nsStartTime} onChange={e => h.setNsStartTime(e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} /></div><div><label className="form-label">Fin</label><input type="time" value={h.nsEndTime} onChange={e => h.setNsEndTime(e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} /></div></div>
              <div><label className="form-label">Type</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{SESSION_TYPES.map(t => { const color = SESSION_COLORS[t]; const active = h.nsType === t; return <button key={t} onClick={() => h.setNsType(t)} className="type-chip" style={{ background: active ? `${color}22` : BG_CARD_2, borderColor: active ? color : 'transparent', color: active ? color : TEXT_MUTED }}>{t}</button> })}</div></div>
              <div><label className="form-label">Notes</label><textarea value={h.nsNotes} onChange={e => h.setNsNotes(e.target.value)} className="form-input" rows={2} placeholder="Instructions..." /></div>
              <div><label className="form-label">Lieu</label><input type="text" value={h.nsLocation} onChange={e => h.setNsLocation(e.target.value)} className="form-input" placeholder="Ex: Salle de sport, Parc, Zoom…" /></div>
              <button onClick={h.saveNewSession} disabled={!h.nsClientId || !!h.nsSaving} className="btn-primary" style={{ marginTop: 8 }}>{h.nsSaving ? 'Enregistrement...' : 'CREER LA SEANCE'}</button>
            </div>
          </div>
        </div>
      )}
      {h.selectedSession && (
        <SessionDetailModal session={h.selectedSession} clients={h.clients} onClose={() => h.setSelectedSession(null)} onDelete={h.deleteSession} />
      )}
      <BugReport session={h.session} profile={h.coachProfile} />
    </div>
  )
}
