'use client'
import React, { useEffect, useState, useRef } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { cache } from '../../lib/cache'
import BugReport from '../components/BugReport'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../lib/design-tokens'
import {
  Zap, Users, ChevronLeft, Dumbbell, Calendar, Home,
  LogOut, Check, X, Plus, MessageCircle, Clock, UtensilsCrossed, User,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import useCoachDashboard from './hooks/useCoachDashboard'
import {
  SESSION_TYPES, SESSION_COLORS, WP_MONTHS, WP_YEARS, WP_DAYS,
  WP_HOURS, WP_MINS, WP_ITEM_H,
} from './hooks/useCoachDashboard'

import CoachRevenue from './components/CoachRevenue'
import ClientsList from './components/ClientsList'
import CoachCalendar from './components/CoachCalendar'
import CoachMessages from './components/CoachMessages'
import CoachAliments from './components/CoachAliments'
import CoachProfile from './components/CoachProfile'
import CoachPrograms from './components/CoachPrograms'
import CoachVideoReviews from './components/CoachVideoReviews'

/* ── WheelPicker ──────────────────────────────────────────── */
function WheelPicker({ items, value, onChange, label, width = 72 }: {
  items: string[]; value: string; onChange: (v: string) => void; label?: string; width?: number
}) {
  const ref  = useRef<HTMLDivElement>(null)
  const tmr  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const init = Math.max(0, items.indexOf(value))
  const [activeIdx, setActiveIdx] = useState(init)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = init * WP_ITEM_H
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function onScroll() {
    if (!ref.current) return
    const idx = Math.round(ref.current.scrollTop / WP_ITEM_H)
    const clamped = Math.max(0, Math.min(items.length - 1, idx))
    setActiveIdx(clamped)
    if (tmr.current) clearTimeout(tmr.current)
    tmr.current = setTimeout(() => onChange(items[clamped]), 80)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {label && <div style={{ fontFamily: FONT_ALT, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: TEXT_MUTED, marginBottom: 4, height: 14 }}>{label}</div>}
      <div style={{ position: 'relative', height: WP_ITEM_H * 5, width, overflow: 'hidden', borderRadius: 12, background: BG_BASE }}>
        <div style={{ position: 'absolute', top: WP_ITEM_H * 2, height: WP_ITEM_H, inset: '0 0 auto', left: 0, right: 0, background: GOLD_DIM, borderTop: `1px solid ${GOLD_RULE}`, borderBottom: `1px solid ${GOLD_RULE}`, pointerEvents: 'none', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: WP_ITEM_H * 2, background: `linear-gradient(to bottom, ${BG_BASE} 40%, transparent)`, pointerEvents: 'none', zIndex: 3 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: WP_ITEM_H * 2, background: `linear-gradient(to top, ${BG_BASE} 40%, transparent)`, pointerEvents: 'none', zIndex: 3 }} />
        <div ref={ref} onScroll={onScroll} style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' } as React.CSSProperties}>
          <div style={{ height: WP_ITEM_H * 2 }} />
          {items.map((item, i) => (
            <div key={item} onClick={() => { setActiveIdx(i); onChange(item); ref.current?.scrollTo({ top: i * WP_ITEM_H, behavior: 'smooth' }) }}
              style={{ height: WP_ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center', cursor: 'pointer', userSelect: 'none', fontFamily: FONT_DISPLAY, fontWeight: i === activeIdx ? 700 : 400, fontSize: i === activeIdx ? '1.35rem' : '1rem', color: i === activeIdx ? GOLD : TEXT_MUTED } as React.CSSProperties}
            >{item}</div>
          ))}
          <div style={{ height: WP_ITEM_H * 2 }} />
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
function downloadCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `moovx-${filename}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function CoachPage({ initialSession }: { initialSession?: any } = {}) {
  const h = useCoachDashboard(initialSession)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [revMonth, setRevMonth] = useState(new Date().getMonth())
  const [revYear, setRevYear] = useState(new Date().getFullYear())

  /* ── Loading splash ── */
  if (!h.mounted || h.loading || (h.session && !h.roleChecked)) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: BG_BASE, gap: 24 }}>
      <img src="/logo-moovx.png" alt="MoovX" width={80} height={80} style={{ borderRadius: 2 }} />
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 800, color: GOLD, letterSpacing: '3px' }}>MOOVX</span>
      <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  /* ── No session → landing ── */
  if (!h.session && !h.loading) {
    h.supabase.from('app_logs').insert({ level: 'warning', message: 'COACH_PAGE_REDIRECT_LANDING', details: { loading: h.loading, hasSession: !!h.session, url: typeof window !== 'undefined' ? window.location.href : '' }, page_url: '/coach' })
    h.router.push('/login')
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: BG_BASE, color: TEXT_PRIMARY, fontFamily: FONT_BODY, overflowX: 'hidden', maxWidth: '100vw' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${BG_BASE}; }
        ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 1px; }
        .wheel-col::-webkit-scrollbar { display: none; }
        .stat-card { background: rgba(20,18,9,0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(212,168,67,0.15); border-radius: ${RADIUS_CARD}px; padding: 24px; transition: all 200ms ease; cursor: default; box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(232,201,122,0.06); position: relative; overflow: hidden; }
        .stat-card:hover { border-color: rgba(212,168,67,0.3); box-shadow: 0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(232,201,122,0.12); }
        .sidebar-card { background: rgba(20,18,9,0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(212,168,67,0.15); border-radius: ${RADIUS_CARD}px; padding: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(232,201,122,0.06); }
        .section-title { font-family: ${FONT_ALT}; font-size: 1.15rem; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: ${TEXT_PRIMARY}; margin: 0 0 16px 0; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table thead th { font-family: ${FONT_ALT}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: ${GOLD}; padding: 10px 16px; text-align: left; background: ${GOLD_DIM}; border-bottom: 1px solid ${BORDER}; }
        .data-table tbody tr { border-bottom: 1px solid ${BORDER}; transition: background 150ms ease; cursor: pointer; }
        .data-table tbody tr:hover { background: ${BG_CARD_2}; }
        .data-table tbody td { padding: 14px 16px; font-family: ${FONT_BODY}; font-size: 14px; font-weight: 400; color: ${TEXT_PRIMARY}; }
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 2px; font-family: ${FONT_ALT}; font-size: 0.72rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
        .badge-active { background: rgba(212,168,67,0.12); color: ${GOLD}; }
        .badge-warning { background: ${GOLD_DIM}; color: ${GOLD}; }
        .badge-inactive { background: rgba(138,133,128,0.12); color: ${TEXT_MUTED}; }
        .avatar-circle { width: 34px; height: 34px; border-radius: 50%; background: ${GOLD}; display: flex; align-items: center; justify-content: center; font-family: ${FONT_DISPLAY}; font-weight: 700; font-size: 0.85rem; color: ${BG_BASE}; flex-shrink: 0; }
        .btn-primary { display: flex; align-items: center; gap: 8px; background: ${GOLD}; color: ${BG_BASE}; padding: 11px 20px; border-radius: 12px; font-family: ${FONT_ALT}; font-size: 0.95rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border: none; cursor: pointer; transition: opacity 200ms ease, transform 200ms ease; width: 100%; justify-content: center; ; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary-orange { background: ${GOLD}; color: ${BG_BASE}; }
        .btn-secondary { display: flex; align-items: center; gap: 8px; background: transparent; color: ${GOLD}; border: 2px solid ${GOLD}; padding: 9px 20px; border-radius: 12px; font-family: ${FONT_ALT}; font-size: 0.95rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; transition: background 200ms ease, color 200ms ease; width: 100%; justify-content: center; }
        .btn-secondary:hover { background: ${GOLD}; color: ${BG_BASE}; }
        .btn-ghost { display: flex; align-items: center; gap: 6px; background: transparent; color: ${TEXT_MUTED}; border: none; padding: 8px 12px; border-radius: 12px; font-family: ${FONT_BODY}; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 150ms ease, color 150ms ease; white-space: nowrap; }
        .btn-ghost:hover { background: ${BG_CARD_2}; color: ${TEXT_PRIMARY}; }
        .divider { border: none; border-top: 1px solid ${BORDER}; margin: 16px 0; }
        .search-input { background: ${BG_BASE}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 7px 12px 7px 32px; font-family: ${FONT_BODY}; font-size: 0.85rem; color: ${TEXT_PRIMARY}; width: 180px; transition: border-color 200ms ease; outline: none; }
        .search-input:focus { border-color: ${GOLD}; }
        .invite-panel { background: ${GOLD_DIM}; border: 1px solid ${GOLD_RULE}; border-radius: ${RADIUS_CARD}px; padding: 16px; margin-top: 12px; }
        .client-chat-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid ${BORDER}; cursor: pointer; transition: background 150ms; }
        .client-chat-row:hover { background: ${BG_CARD_2}; }
        .client-chat-row.active { background: ${GOLD_DIM}; border-left: 2px solid ${GOLD}; }
        .msg-input { flex: 1; background: ${BG_BASE}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 10px 18px; font-family: ${FONT_BODY}; font-size: 0.9rem; color: ${TEXT_PRIMARY}; outline: none; transition: border-color 200ms; }
        .msg-input:focus { border-color: ${GOLD}; }
        @media (max-width: 640px) { .hide-sm { display: none !important; } }
        @media(max-width:768px){
          .data-table th,.data-table td{padding:10px 8px;font-size:0.75rem}
          .section-pad{padding:16px!important}
        }
        @media (max-width: 1024px) { .lg-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 767px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 1px !important; } }
        .client-cards-m { display: none; flex-direction: column; gap: 10px; }
        @media (max-width: 767px) { .client-table-wrap { display: none !important; } .client-cards-m { display: flex; } }
        .client-card-m { background: ${BG_CARD}; border: 1px solid ${BORDER}; border-radius: ${RADIUS_CARD}px; cursor: pointer; transition: border-color 150ms; overflow: hidden; }
        .client-card-m:active { border-color: ${GOLD}; }
        .client-card-m-inner { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .avatar-circle-lg { width: 46px; height: 46px; border-radius: 50%; background: ${GOLD}; display: flex; align-items: center; justify-content: center; font-family: ${FONT_DISPLAY}; font-weight: 700; font-size: 1.05rem; color: ${BG_BASE}; flex-shrink: 0; }
        .client-card-info { flex: 1; min-width: 0; }
        .client-card-name { font-family: ${FONT_BODY}; font-weight: 600; font-size: 0.95rem; color: ${TEXT_PRIMARY}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .client-card-sub { font-family: ${FONT_BODY}; font-size: 0.72rem; color: ${TEXT_MUTED}; margin-top: 4px; }
        .client-card-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .client-card-msg-btn { position: relative; background: transparent; border: none; cursor: pointer; padding: 8px; color: ${TEXT_MUTED}; display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: 12px; transition: color 150ms; }
        .client-card-msg-btn:active { color: ${GOLD}; }
        .msg-badge { position: absolute; top: 4px; right: 4px; min-width: 16px; height: 16px; background: ${RED}; border-radius: 8px; font-size: 0.6rem; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
        .bottom-nav { display: block; position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 14px; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); z-index: 100; }
        .bottom-nav-inner { display: flex; background: rgba(13,11,8,0.7); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(212,168,67,0.08); border-radius: 18px; box-shadow: 0 -2px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(232,201,122,0.04); }
        .section-pad { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important; }
        .bottom-nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: transparent; border: none; cursor: pointer; padding: 4px 8px; color: ${TEXT_MUTED}; transition: color 150ms; position: relative; min-height: 44px; justify-content: center; }
        .bottom-nav-btn.active { color: ${GOLD}; }
        .bottom-nav-label { font-family: ${FONT_ALT}; font-size: 0.68rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
        .nav-badge { position: absolute; top: 2px; right: calc(50% - 20px); min-width: 16px; height: 16px; background: ${RED}; border-radius: 8px; font-size: 0.6rem; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
        .chat-fullscreen { position: fixed; inset: 0; background: ${BG_BASE}; z-index: 200; display: flex; flex-direction: column; overflow: hidden; width: 100vw; height: 100vh; }
        .cal-day-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 0 8px; }
        .cal-day-label { display: inline-flex; align-items: baseline; gap: 6px; border-radius: 12px; padding: 4px 10px; }
        .cal-day-label.today { background: ${GOLD_DIM}; border: 1px solid ${GOLD_RULE}; }
        .cal-session-card { background: ${BG_CARD}; border: 1px solid ${BORDER}; border-radius: ${RADIUS_CARD}px; padding: 12px 14px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 150ms; min-height: 64px; }
        .cal-session-card:hover { background: ${BG_CARD_2}; }
        .cal-empty { padding: 10px 14px; color: ${TEXT_DIM}; font-family: ${FONT_BODY}; font-size: 0.78rem; font-style: italic; background: ${BG_BASE}; border-radius: ${RADIUS_CARD}px; border: 1px solid ${BORDER}; }
        .cal-add-day { display: flex; align-items: center; gap: 4px; background: transparent; border: 1px dashed ${BORDER}; border-radius: 12px; padding: 6px 10px; color: ${TEXT_MUTED}; cursor: pointer; font-family: ${FONT_ALT}; font-size: 0.72rem; font-weight: 600; min-height: 36px; transition: border-color 150ms, color 150ms; }
        .cal-add-day:hover { border-color: ${GOLD}; color: ${GOLD}; }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
        .modal-box { background: ${BG_CARD}; border: 1px solid ${BORDER}; border-radius: ${RADIUS_CARD}px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
        .form-label { font-family: ${FONT_ALT}; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${TEXT_MUTED}; display: block; margin-bottom: 6px; }
        .form-input { width: 100%; background: ${BG_BASE}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 10px 14px; font-family: ${FONT_BODY}; font-size: 0.9rem; color: ${TEXT_PRIMARY}; outline: none; transition: border-color 200ms; }
        .form-input:focus { border-color: ${GOLD}; }
        .type-chip { border-radius: 12px; padding: 7px 14px; font-family: ${FONT_ALT}; font-size: 0.82rem; font-weight: 700; letter-spacing: 1px; cursor: pointer; border: 2px solid transparent; transition: all 150ms; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* ── GLASS BAR HEADER ── */}
      <div style={{ padding: '12px 14px 0', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="liquid-glass-strong" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 18 }}>
          {/* Left: Messages */}
          <button onClick={() => h.setSection(s => s === 'messages' ? 'accueil' : 'messages')} style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: h.section === 'messages' ? GOLD_DIM : 'transparent', border: h.section === 'messages' ? `1px solid ${GOLD_RULE}` : '1px solid transparent', cursor: 'pointer', position: 'relative', zIndex: 3 }}>
            <MessageCircle size={19} color={h.section === 'messages' ? GOLD : TEXT_MUTED} strokeWidth={1.5} />
            {h.totalUnread > 0 && <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: RED, border: '2px solid rgba(20,18,9,0.8)' }} />}
          </button>
          {/* Center: Logo pill PRO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: GOLD_DIM, border: `1px solid ${GOLD_DIM}`, borderRadius: 14, padding: '6px 14px', zIndex: 3 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 4, background: 'linear-gradient(135deg, #E8C97A, #D4A843, #8B6914)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>MOOVX</span>
            <span style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#0D0B08', padding: '2px 6px', background: GOLD, borderRadius: 4 }}>PRO</span>
          </div>
          {/* Right: Profil + Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, zIndex: 3 }}>
            <button onClick={() => h.setSection('profil')} style={{ width: 34, height: 34, borderRadius: '50%', border: h.section === 'profil' ? `1.5px solid ${GOLD}` : `1.5px solid ${GOLD_RULE}`, background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: FONT_DISPLAY, fontSize: 14, color: GOLD }}>
              {h.coachInitials}
            </button>
            <button onClick={() => { cache.clearAll(); h.supabase.auth.signOut().then(() => { window.location.href = '/login' }) }} style={{ width: 34, height: 34, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid transparent', cursor: 'pointer' }}>
              <LogOut size={16} color={TEXT_MUTED} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stripe warning banner ── */}
      {h.coachProfile && !h.coachProfile.stripe_onboarding_complete && (
        <div style={{ background: GOLD_DIM, borderBottom: `1px solid ${GOLD_RULE}`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ color: GOLD, fontSize: 13, fontFamily: FONT_BODY }}>{h.coachProfile?.stripe_account_id ? 'Configuration Stripe incomplète' : 'Stripe non connecté'} — configure Stripe pour recevoir les paiements</span>
          <button onClick={h.handleStripeConnect} disabled={h.stripeConnecting}
            style={{ background: GOLD, color: BG_BASE, border: 'none', padding: '5px 14px', borderRadius: 12, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: FONT_ALT }}>
            {h.stripeConnecting ? 'Connexion...' : 'Configurer'}
          </button>
        </div>
      )}

      {/* ══════════════ NEW SESSION MODAL ══════════════ */}
      {h.showNewSession && (
        <div className="modal-bg" onClick={() => h.setShowNewSession(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY, margin: 0 }}>Nouvelle séance</h2>
              <button onClick={() => h.setShowNewSession(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Client *</label>
                <select value={h.nsClientId} onChange={e => h.setNsClientId(e.target.value)} className="form-input" style={{ cursor: 'pointer' }}>
                  <option value="">Sélectionner un client…</option>
                  {h.clients.map(c => <option key={c.client_id} value={c.client_id}>{c.profiles?.full_name ?? c.client_id}</option>)}
                </select>
              </div>
              {(() => {
                const [yr, mo, da] = h.nsDate.split('-')
                const moDisp = WP_MONTHS[parseInt(mo) - 1] ?? WP_MONTHS[0]
                return (
                  <div>
                    <label className="form-label">Date</label>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '4px 0', background: BG_BASE, borderRadius: 2 }}>
                      <WheelPicker width={56} label="Jour" items={WP_DAYS} value={da} onChange={d => h.setNsDate(`${yr}-${mo}-${d}`)} />
                      <WheelPicker width={68} label="Mois" items={WP_MONTHS} value={moDisp} onChange={m => { const n = String(WP_MONTHS.indexOf(m) + 1).padStart(2,'0'); h.setNsDate(`${yr}-${n}-${da}`) }} />
                      <WheelPicker width={68} label="Année" items={WP_YEARS} value={yr} onChange={y => h.setNsDate(`${y}-${mo}-${da}`)} />
                    </div>
                  </div>
                )
              })()}
              {(() => {
                const [hS, mS] = h.nsStartTime.split(':')
                const [hE, mE] = h.nsEndTime.split(':')
                const mSR = WP_MINS.reduce((p, c) => Math.abs(+c - +mS) < Math.abs(+p - +mS) ? c : p)
                const mER = WP_MINS.reduce((p, c) => Math.abs(+c - +mE) < Math.abs(+p - +mE) ? c : p)
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label className="form-label">Début</label>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, background: BG_BASE, borderRadius: 12, padding: '4px 0' }}>
                        <WheelPicker width={60} label="H" items={WP_HOURS} value={hS.padStart(2,'0')} onChange={hv => h.setNsStartTime(`${hv}:${mS}`)} />
                        <WheelPicker width={60} label="Min" items={WP_MINS} value={mSR} onChange={m => h.setNsStartTime(`${hS}:${m}`)} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Fin</label>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, background: BG_BASE, borderRadius: 12, padding: '4px 0' }}>
                        <WheelPicker width={60} label="H" items={WP_HOURS} value={hE.padStart(2,'0')} onChange={hv => h.setNsEndTime(`${hv}:${mE}`)} />
                        <WheelPicker width={60} label="Min" items={WP_MINS} value={mER} onChange={m => h.setNsEndTime(`${hE}:${m}`)} />
                      </div>
                    </div>
                  </div>
                )
              })()}
              {h.nsStartTime && h.nsEndTime && (() => {
                const start = new Date(`2000-01-01T${h.nsStartTime}`); const end = new Date(`2000-01-01T${h.nsEndTime}`)
                const mins = Math.round((end.getTime() - start.getTime()) / 60000)
                return mins > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEXT_MUTED, fontSize: '0.78rem' }}><Clock size={13} /><span>{mins} min</span></div> : null
              })()}
              <div>
                <label className="form-label">Type de séance</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SESSION_TYPES.map(t => {
                    const color = SESSION_COLORS[t]; const active = h.nsType === t
                    return <button key={t} onClick={() => h.setNsType(t)} className="type-chip" style={{ background: active ? `${color}22` : 'transparent', borderColor: active ? color : BORDER, color: active ? color : TEXT_MUTED }}>{t}</button>
                  })}
                </div>
              </div>
              <div>
                <label className="form-label">Notes (optionnel)</label>
                <textarea value={h.nsNotes} onChange={e => h.setNsNotes(e.target.value)} rows={3} placeholder="Objectifs, exercices prévus…" className="form-input" style={{ resize: 'vertical', minHeight: 80 }} />
              </div>
              <button onClick={h.saveNewSession} disabled={!h.nsClientId || !h.nsDate || h.nsSaving === 'saving'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: h.nsSaving === 'done' ? GREEN : GOLD, color: BG_BASE, border: 'none', borderRadius: 12, padding: '13px 20px', fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', opacity: (!h.nsClientId || !h.nsDate) ? 0.5 : 1, transition: 'background 200ms',  }}>
                {h.nsSaving === 'done' ? <><Check size={16} /> Enregistré !</> : h.nsSaving === 'saving' ? 'Enregistrement…' : <><Plus size={16} /> Créer la séance</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ SESSION DETAIL MODAL ══════════════ */}
      {h.selectedSession && (() => {
        const clientName = h.clients.find(c => c.client_id === h.selectedSession!.client_id)?.profiles?.full_name ?? 'Client'
        const color = SESSION_COLORS[h.selectedSession.session_type] ?? GOLD
        const dt = new Date(h.selectedSession.scheduled_at)
        return (
          <div className="modal-bg" onClick={() => h.setSelectedSession(null)}>
            <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
              <div style={{ height: 4, background: color }} />
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <span style={{ fontFamily: FONT_ALT, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color, letterSpacing: '2px' }}>{h.selectedSession.session_type}</span>
                    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.5rem', fontWeight: 700, color: TEXT_PRIMARY, margin: '4px 0 0' }}>{clientName}</h3>
                  </div>
                  <button onClick={() => h.setSelectedSession(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 4 }}><X size={16} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', color: TEXT_MUTED }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={14} /><span>{format(dt, 'EEEE d MMMM yyyy', { locale: fr })}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={14} /><span>{format(dt, 'HH:mm', { locale: fr })} · {h.selectedSession.duration_minutes} min</span></div>
                  {h.selectedSession.notes && <div style={{ background: BG_BASE, borderRadius: RADIUS_CARD, padding: '10px 14px', color: TEXT_PRIMARY, marginTop: 4, border: `1px solid ${BORDER}` }}>{h.selectedSession.notes}</div>}
                </div>
                <button onClick={() => h.setSelectedSession(null)} style={{ marginTop: 20, width: '100%', background: BG_CARD_2, color: TEXT_PRIMARY, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px', fontFamily: FONT_ALT, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Fermer</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ══ CALENDAR SECTION ══ */}
      {h.section === 'calendar' && (
        <CoachCalendar
          calWeekOffset={h.calWeekOffset} setCalWeekOffset={h.setCalWeekOffset}
          scheduledSessions={h.scheduledSessions} clients={h.clients}
          setSelectedSession={h.setSelectedSession}
          setShowNewSession={h.setShowNewSession} setNsDate={h.setNsDate}
          setSection={h.setSection}
        />
      )}

      {/* ══ MESSAGES SECTION (client list when section=messages, chat overlay always when selectedClient) ══ */}
      {(h.section === 'messages' || h.selectedClient) && (
        <CoachMessages
          clients={h.clients} selectedClient={h.selectedClient}
          setSelectedClient={h.setSelectedClient} openChat={h.openChat}
          chatMessages={h.chatMessages} msgInput={h.msgInput}
          setMsgInput={h.setMsgInput} sendMessage={h.sendMessage}
          unreadCounts={h.unreadCounts} session={h.session}
          msgEndRef={h.msgEndRef}
        />
      )}

      {/* ══ ACCUEIL SECTION ══ */}
      {h.section === 'accueil' && (
        <div className="section-pad" style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Bloc 1 — Agenda du jour */}
          <div className="sidebar-card">
            <h2 className="section-title">Aujourd&apos;hui</h2>
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0]
              const todaySessions = h.scheduledSessions.filter(s => s.scheduled_at.startsWith(todayStr))
              if (todaySessions.length === 0) {
                return <p style={{ fontSize: '0.9rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>Aucune séance aujourd&apos;hui</p>
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {todaySessions.map(s => {
                    const color = SESSION_COLORS[s.session_type] ?? GOLD
                    const clientName = h.clients.find(c => c.client_id === s.client_id)?.profiles?.full_name ?? 'Client'
                    const dt = new Date(s.scheduled_at)
                    return (
                      <div key={s.id} onClick={() => h.setSelectedSession(s)}
                        style={{ background: BG_CARD_2, borderLeft: `2px solid ${GOLD}`, borderRadius: RADIUS_CARD, padding: '10px 14px', cursor: 'pointer', border: `1px solid ${BORDER}`, borderLeftWidth: 2, borderLeftColor: GOLD }}>
                        <div style={{ fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '1.5px' }}>{s.session_type}</div>
                        <div style={{ fontSize: '0.88rem', color: TEXT_PRIMARY, fontFamily: FONT_BODY, fontWeight: 500, marginTop: 2 }}>{clientName}</div>
                        <div style={{ fontSize: '0.75rem', color: TEXT_MUTED, fontFamily: FONT_BODY, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} />{format(dt, 'HH:mm')} · {s.duration_minutes}min
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Bloc 2 — Chiffre d'affaires */}
          <div className="sidebar-card">
            <h2 className="section-title">Chiffre d&apos;affaires</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <select value={revMonth} onChange={e => setRevMonth(Number(e.target.value))}
                style={{ flex: 1, maxWidth: 130, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 12px', fontFamily: FONT_BODY, fontSize: '0.85rem', color: TEXT_PRIMARY, cursor: 'pointer', outline: 'none' }}>
                {WP_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={revYear} onChange={e => setRevYear(Number(e.target.value))}
                style={{ width: 'auto', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 12px', fontFamily: FONT_BODY, fontSize: '0.85rem', color: TEXT_PRIMARY, cursor: 'pointer', outline: 'none' }}>
                {WP_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {(() => {
              const startDate = new Date(revYear, revMonth, 1)
              const endDate = new Date(revYear, revMonth + 1, 0, 23, 59, 59)
              const startIso = startDate.toISOString()
              const endIso = endDate.toISOString()
              let total = 0
              let count = 0
              for (const p of h.allPayments) {
                if (p.paid_at && p.paid_at >= startIso && p.paid_at <= endIso) {
                  total += p.amount || 0
                  count++
                }
              }
              const formatted = Math.round(total).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")
              return (
                <div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: '2.4rem', fontWeight: 700, color: GOLD, lineHeight: 1 }}>
                    CHF {formatted}
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: '0.78rem', color: TEXT_MUTED, marginTop: 8 }}>
                    {count} paiement{count !== 1 ? 's' : ''}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Bloc 3 — Messages non lus (seulement si > 0) */}
          {h.totalUnread > 0 && (
            <div className="sidebar-card" style={{ cursor: 'pointer' }} onClick={() => h.setSection('messages')}>
              <h2 className="section-title">Messages</h2>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: RED, lineHeight: 1 }}>
                {h.totalUnread}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: '0.78rem', color: TEXT_MUTED, marginTop: 8 }}>
                message{h.totalUnread !== 1 ? 's' : ''} non lu{h.totalUnread !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ DASHBOARD / CLIENTS SECTION ══ */}
      {h.section === 'dashboard' && (
        <div className="section-pad" style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>
          <ClientsList
            filtered={h.filtered} loading={h.loading}
            search={h.search} setSearch={h.setSearch}
            showInvite={h.showInvite} setShowInvite={h.setShowInvite}
            inviteLink={h.inviteLink} copied={h.copied} copyInviteLink={h.copyInviteLink}
            unreadCounts={h.unreadCounts} setSection={h.setSection}
            openChat={h.openChat} setShowNewSession={h.setShowNewSession}
            coachInitials={h.coachInitials}
            scheduledSessions={h.scheduledSessions} clients={h.clients}
            setSelectedSession={h.setSelectedSession}
            SESSION_COLORS={SESSION_COLORS}
          />
        </div>
      )}

      {/* ══ ALIMENTS SECTION ══ */}
      {h.section === 'programs' && (
        <CoachPrograms session={h.session} clients={h.clients} />
      )}

      {h.section === 'aliments' && (
        <CoachAliments
          foodList={h.foodList} foodFilter={h.foodFilter} setFoodFilter={h.setFoodFilter}
          foodSearchQ={h.foodSearchQ} setFoodSearchQ={h.setFoodSearchQ}
          foodLoading={h.foodLoading} loadFoods={h.loadFoods}
          showAddFood={h.showAddFood} setShowAddFood={h.setShowAddFood}
          newFood={h.newFood} setNewFood={h.setNewFood}
          saveNewFood={h.saveNewFood} deleteFood={h.deleteFood}
        />
      )}

      {/* ══ PROFIL SECTION ══ */}
      {h.section === 'profil' && (
        <CoachProfile
          coachName={h.coachName} coachInitials={h.coachInitials}
          session={h.session} coachProfile={h.coachProfile}
          setSection={h.setSection} supabaseSignOut={() => { cache.clearAll(); h.supabase.auth.signOut().then(() => { window.location.href = '/login' }) }}
        />
      )}

      <BugReport session={h.session} profile={h.coachProfile} />

      {/* ── BOTTOM NAV ── */}
      <nav className="bottom-nav" aria-label="Navigation principale">
        <div className="bottom-nav-inner" style={{ justifyContent: 'center', gap: 48, padding: '10px 24px' }}>
        {([
          { key: 'accueil', icon: <Home size={20} strokeWidth={1.5} />, label: 'Accueil' },
          { key: 'dashboard', icon: <Users size={20} strokeWidth={1.5} />, label: 'Clients' },
          { key: 'calendar', icon: <Calendar size={20} strokeWidth={1.5} />, label: 'Calendrier' },
        ] as { key: string; icon: React.ReactNode; label: string; badge?: number }[]).map(tab => (
          <button key={tab.key} className={`bottom-nav-btn${h.section === tab.key ? ' active' : ''}`}
            onClick={() => h.setSection(tab.key as any)} aria-label={tab.label} style={{ flex: 'none' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {tab.icon}
              {tab.badge && tab.badge > 0 ? <span className="nav-badge">{tab.badge > 9 ? '9+' : tab.badge}</span> : null}
            </div>
            <span className="bottom-nav-label">{tab.label}</span>
            {h.section === tab.key && <div style={{ width: 3, height: 3, borderRadius: '50%', background: GOLD }} />}
          </button>
        ))}
        </div>
      </nav>
    </div>
  )
}
