'use client'
import React, { useEffect, useState, useRef } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { cache } from '../../lib/cache'
import BugReport from '../components/BugReport'
import {
  Zap, Users, ChevronLeft, Dumbbell, Calendar,
  LogOut, Check, X, Plus, MessageCircle, Clock, UtensilsCrossed,
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
      {label && <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280', marginBottom: 4, height: 14 }}>{label}</div>}
      <div style={{ position: 'relative', height: WP_ITEM_H * 5, width, overflow: 'hidden', borderRadius: 12, background: '#0A0A0A' }}>
        <div style={{ position: 'absolute', top: WP_ITEM_H * 2, height: WP_ITEM_H, inset: '0 0 auto', left: 0, right: 0, background: 'rgba(249,115,22,0.08)', borderTop: '1px solid rgba(249,115,22,0.4)', borderBottom: '1px solid rgba(249,115,22,0.4)', pointerEvents: 'none', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: WP_ITEM_H * 2, background: 'linear-gradient(to bottom, #0A0A0A 40%, transparent)', pointerEvents: 'none', zIndex: 3 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: WP_ITEM_H * 2, background: 'linear-gradient(to top, #0A0A0A 40%, transparent)', pointerEvents: 'none', zIndex: 3 }} />
        <div ref={ref} onScroll={onScroll} style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' } as React.CSSProperties}>
          <div style={{ height: WP_ITEM_H * 2 }} />
          {items.map((item, i) => (
            <div key={item} onClick={() => { setActiveIdx(i); onChange(item); ref.current?.scrollTo({ top: i * WP_ITEM_H, behavior: 'smooth' }) }}
              style={{ height: WP_ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center', cursor: 'pointer', userSelect: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: i === activeIdx ? 700 : 400, fontSize: i === activeIdx ? '1.35rem' : '1rem', color: i === activeIdx ? '#F97316' : '#6B7280' } as React.CSSProperties}
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
export default function CoachPage({ initialSession }: { initialSession?: any } = {}) {
  const h = useCoachDashboard(initialSession)

  /* ── Loading splash ── */
  if (!h.mounted || h.loading || (h.session && !h.roleChecked)) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#0A0A0A', gap: 24 }}>
      <img src="/logo-moovx.png" alt="MoovX" width={80} height={80} style={{ borderRadius: 20 }} />
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.1em' }}>MOOVX</span>
      <div style={{ width: 32, height: 32, border: '3px solid #222', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  /* ── No session → landing ── */
  if (!h.session && !h.loading) {
    h.supabase.from('app_logs').insert({ level: 'warning', message: 'COACH_PAGE_REDIRECT_LANDING', details: { loading: h.loading, hasSession: !!h.session, url: typeof window !== 'undefined' ? window.location.href : '' }, page_url: '/coach' })
    h.router.push('/landing')
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111827', color: '#F8FAFC', fontFamily: 'Barlow, sans-serif', overflowX: 'hidden', maxWidth: '100vw' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1F2937; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        .wheel-col::-webkit-scrollbar { display: none; }
        .stat-card { background: #1F2937; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: box-shadow 200ms ease; cursor: default; }
        .stat-card:hover { box-shadow: 0 10px 15px rgba(0,0,0,0.15); }
        .sidebar-card { background: #1F2937; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.15rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #F8FAFC; margin: 0 0 16px 0; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table thead th { font-family: 'Barlow Condensed', sans-serif; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #9CA3AF; padding: 10px 16px; text-align: left; border-bottom: 1px solid #374151; }
        .data-table tbody tr { border-bottom: 1px solid #1F2937; transition: background 150ms ease; cursor: pointer; }
        .data-table tbody tr:hover { background: #374151; }
        .data-table tbody td { padding: 14px 16px; font-size: 0.9rem; color: #F8FAFC; }
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
        .badge-active { background: rgba(34,197,94,0.15); color: #22C55E; }
        .badge-warning { background: rgba(249,115,22,0.15); color: #F97316; }
        .badge-inactive { background: rgba(156,163,175,0.12); color: #9CA3AF; }
        .avatar-circle { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #F97316, #FB923C); display: flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; color: #fff; flex-shrink: 0; }
        .btn-primary { display: flex; align-items: center; gap: 8px; background: #22C55E; color: #fff; padding: 11px 20px; border-radius: 8px; font-family: 'Barlow Condensed', sans-serif; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.04em; border: none; cursor: pointer; transition: opacity 200ms ease, transform 200ms ease; width: 100%; justify-content: center; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary-orange { background: #F97316; }
        .btn-secondary { display: flex; align-items: center; gap: 8px; background: transparent; color: #F97316; border: 2px solid #F97316; padding: 9px 20px; border-radius: 8px; font-family: 'Barlow Condensed', sans-serif; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.04em; cursor: pointer; transition: background 200ms ease, color 200ms ease; width: 100%; justify-content: center; }
        .btn-secondary:hover { background: #F97316; color: #fff; }
        .btn-ghost { display: flex; align-items: center; gap: 6px; background: transparent; color: #9CA3AF; border: none; padding: 8px 12px; border-radius: 8px; font-family: 'Barlow', sans-serif; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 150ms ease, color 150ms ease; white-space: nowrap; }
        .btn-ghost:hover { background: #374151; color: #F8FAFC; }
        .divider { border: none; border-top: 1px solid #374151; margin: 16px 0; }
        .search-input { background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 7px 12px 7px 32px; font-family: 'Barlow', sans-serif; font-size: 0.85rem; color: #F8FAFC; width: 180px; transition: border-color 200ms ease; outline: none; }
        .search-input:focus { border-color: #F97316; }
        .invite-panel { background: rgba(249,115,22,0.07); border: 1px solid rgba(249,115,22,0.25); border-radius: 12px; padding: 16px; margin-top: 12px; }
        .client-chat-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #374151; cursor: pointer; transition: background 150ms; }
        .client-chat-row:hover { background: #374151; }
        .client-chat-row.active { background: rgba(249,115,22,0.1); border-left: 3px solid #F97316; }
        .msg-input { flex: 1; background: #111827; border: 1px solid #374151; border-radius: 24px; padding: 10px 18px; font-family: 'Barlow', sans-serif; font-size: 0.9rem; color: #F8FAFC; outline: none; transition: border-color 200ms; }
        .msg-input:focus { border-color: #F97316; }
        @media (max-width: 640px) { .hide-sm { display: none !important; } }
        @media(max-width:768px){
          .data-table th,.data-table td{padding:10px 8px;font-size:0.75rem}
          .section-pad{padding:16px!important}
        }
        @media (max-width: 1024px) { .lg-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 767px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; } }
        .client-cards-m { display: none; flex-direction: column; gap: 10px; }
        @media (max-width: 767px) { .client-table-wrap { display: none !important; } .client-cards-m { display: flex; } }
        .client-card-m { background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 14px; cursor: pointer; transition: border-color 150ms; overflow: hidden; }
        .client-card-m:active { border-color: #F97316; }
        .client-card-m-inner { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .avatar-circle-lg { width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, #F97316, #FB923C); display: flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.05rem; color: #fff; flex-shrink: 0; }
        .client-card-info { flex: 1; min-width: 0; }
        .client-card-name { font-weight: 600; font-size: 0.95rem; color: #F8FAFC; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .client-card-sub { font-size: 0.72rem; color: #6B7280; margin-top: 4px; }
        .client-card-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .client-card-msg-btn { position: relative; background: transparent; border: none; cursor: pointer; padding: 8px; color: #6B7280; display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: 8px; transition: color 150ms; }
        .client-card-msg-btn:active { color: #F97316; }
        .msg-badge { position: absolute; top: 4px; right: 4px; min-width: 16px; height: 16px; background: #EF4444; border-radius: 8px; font-size: 0.6rem; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
        .bottom-nav { display: none; }
        @media (max-width: 767px) {
          .bottom-nav { display: flex; position: fixed; bottom: 0; left: 0; right: 0; background: #111827; border-top: 1px solid #1F2937; padding: 8px 0; padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px)); z-index: 100; }
          .section-pad { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important; }
        }
        .bottom-nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: transparent; border: none; cursor: pointer; padding: 4px 8px; color: #6B7280; transition: color 150ms; position: relative; min-height: 44px; justify-content: center; }
        .bottom-nav-btn.active { color: #F97316; }
        .bottom-nav-label { font-family: 'Barlow Condensed', sans-serif; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
        .nav-badge { position: absolute; top: 2px; right: calc(50% - 20px); min-width: 16px; height: 16px; background: #EF4444; border-radius: 8px; font-size: 0.6rem; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
        .chat-fullscreen { position: fixed; inset: 0; background: #111827; z-index: 200; display: flex; flex-direction: column; overflow: hidden; width: 100vw; height: 100vh; }
        .cal-day-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 0 8px; }
        .cal-day-label { display: inline-flex; align-items: baseline; gap: 6px; border-radius: 8px; padding: 4px 10px; }
        .cal-day-label.today { background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.3); }
        .cal-session-card { background: #1A1A1A; border-radius: 12px; padding: 12px 14px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 150ms; min-height: 64px; }
        .cal-session-card:hover { background: #222; }
        .cal-empty { padding: 10px 14px; color: #4B5563; font-size: 0.78rem; font-style: italic; background: #111827; border-radius: 10px; border: 1px solid #1F2937; }
        .cal-add-day { display: flex; align-items: center; gap: 4px; background: transparent; border: 1px dashed #374151; border-radius: 8px; padding: 6px 10px; color: #6B7280; cursor: pointer; font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 600; min-height: 36px; transition: border-color 150ms, color 150ms; }
        .cal-add-day:hover { border-color: #F97316; color: #F97316; }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
        .modal-box { background: #1F2937; border-radius: 16px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
        .form-label { font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #9CA3AF; display: block; margin-bottom: 6px; }
        .form-input { width: 100%; background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 10px 14px; font-family: 'Barlow', sans-serif; font-size: 0.9rem; color: #F8FAFC; outline: none; transition: border-color 200ms; }
        .form-input:focus { border-color: #F97316; }
        .type-chip { border-radius: 8px; padding: 7px 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em; cursor: pointer; border: 2px solid transparent; transition: all 150ms; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ background: '#1F2937', borderBottom: '1px solid #374151', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src="/logo-moovx.png" alt="MoovX" width={32} height={32} style={{ borderRadius: 6 }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.08em' }}>MOOVX</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => h.setSection(s => s === 'messages' ? 'dashboard' : 'messages')}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, background: h.section === 'messages' ? 'rgba(249,115,22,0.15)' : 'transparent', color: h.section === 'messages' ? '#F97316' : '#9CA3AF', border: h.section === 'messages' ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.04em', transition: 'all 200ms' }}>
              <MessageCircle size={16} strokeWidth={2} /><span className="hide-sm">Messages</span>
              {h.totalUnread > 0 && <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, background: '#EF4444', borderRadius: 9, fontSize: '0.65rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{h.totalUnread > 9 ? '9+' : h.totalUnread}</span>}
            </button>
            <div className="hide-sm" style={{ width: '1px', height: '24px', background: '#374151' }} />
            <div className="hide-sm" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="avatar-circle">{h.coachInitials}</div>
              <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: '#D1D5DB' }}>{h.coachName}</span>
            </div>
            <div className="hide-sm" style={{ width: '1px', height: '24px', background: '#374151' }} />
            <button className="btn-ghost" onClick={() => { cache.clearAll(); h.supabase.auth.signOut().then(() => { window.location.href = '/landing' }) }} aria-label="Se déconnecter">
              <LogOut size={15} strokeWidth={2} /><span className="hide-sm">Déconnexion</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Stripe warning banner ── */}
      {h.coachProfile && !h.coachProfile.stripe_onboarding_complete && (
        <div style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ color: '#f59e0b', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{h.coachProfile?.stripe_account_id ? 'Configuration Stripe incomplète' : 'Stripe non connecté'} — configure Stripe pour recevoir les paiements</span>
          <button onClick={h.handleStripeConnect} disabled={h.stripeConnecting}
            style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '5px 14px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {h.stripeConnecting ? 'Connexion...' : 'Configurer'}
          </button>
        </div>
      )}

      {/* ══════════════ NEW SESSION MODAL ══════════════ */}
      {h.showNewSession && (
        <div className="modal-bg" onClick={() => h.setShowNewSession(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #374151' }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F8FAFC', margin: 0 }}>Nouvelle séance</h2>
              <button onClick={() => h.setShowNewSession(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}><X size={18} /></button>
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
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '4px 0', background: '#111', borderRadius: 14 }}>
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
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, background: '#111', borderRadius: 14, padding: '4px 0' }}>
                        <WheelPicker width={60} label="H" items={WP_HOURS} value={hS.padStart(2,'0')} onChange={hv => h.setNsStartTime(`${hv}:${mS}`)} />
                        <WheelPicker width={60} label="Min" items={WP_MINS} value={mSR} onChange={m => h.setNsStartTime(`${hS}:${m}`)} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Fin</label>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, background: '#111', borderRadius: 14, padding: '4px 0' }}>
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
                return mins > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF', fontSize: '0.78rem' }}><Clock size={13} /><span>{mins} min</span></div> : null
              })()}
              <div>
                <label className="form-label">Type de séance</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SESSION_TYPES.map(t => {
                    const color = SESSION_COLORS[t]; const active = h.nsType === t
                    return <button key={t} onClick={() => h.setNsType(t)} className="type-chip" style={{ background: active ? `${color}22` : 'transparent', borderColor: active ? color : '#374151', color: active ? color : '#9CA3AF' }}>{t}</button>
                  })}
                </div>
              </div>
              <div>
                <label className="form-label">Notes (optionnel)</label>
                <textarea value={h.nsNotes} onChange={e => h.setNsNotes(e.target.value)} rows={3} placeholder="Objectifs, exercices prévus…" className="form-input" style={{ resize: 'vertical', minHeight: 80 }} />
              </div>
              <button onClick={h.saveNewSession} disabled={!h.nsClientId || !h.nsDate || h.nsSaving === 'saving'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: h.nsSaving === 'done' ? '#22C55E' : '#F97316', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 20px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', opacity: (!h.nsClientId || !h.nsDate) ? 0.5 : 1, transition: 'background 200ms' }}>
                {h.nsSaving === 'done' ? <><Check size={16} /> Enregistré !</> : h.nsSaving === 'saving' ? 'Enregistrement…' : <><Plus size={16} /> Créer la séance</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ SESSION DETAIL MODAL ══════════════ */}
      {h.selectedSession && (() => {
        const clientName = h.clients.find(c => c.client_id === h.selectedSession!.client_id)?.profiles?.full_name ?? 'Client'
        const color = SESSION_COLORS[h.selectedSession.session_type] ?? '#F97316'
        const dt = new Date(h.selectedSession.scheduled_at)
        return (
          <div className="modal-bg" onClick={() => h.setSelectedSession(null)}>
            <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
              <div style={{ height: 6, background: color, borderRadius: '16px 16px 0 0' }} />
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color, letterSpacing: '0.08em' }}>{h.selectedSession.session_type}</span>
                    <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', margin: '4px 0 0' }}>{clientName}</h3>
                  </div>
                  <button onClick={() => h.setSelectedSession(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}><X size={16} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', color: '#9CA3AF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={14} /><span>{format(dt, 'EEEE d MMMM yyyy', { locale: fr })}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={14} /><span>{format(dt, 'HH:mm', { locale: fr })} · {h.selectedSession.duration_minutes} min</span></div>
                  {h.selectedSession.notes && <div style={{ background: '#111827', borderRadius: 8, padding: '10px 14px', color: '#D1D5DB', marginTop: 4 }}>{h.selectedSession.notes}</div>}
                </div>
                <button onClick={() => h.setSelectedSession(null)} style={{ marginTop: 20, width: '100%', background: '#374151', color: '#F8FAFC', border: 'none', borderRadius: 8, padding: '10px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>Fermer</button>
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

      {/* ══ DASHBOARD SECTION ══ */}
      {h.section === 'dashboard' && (
        <div className="section-pad" style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>
          <CoachRevenue
            clients={h.clients} loading={h.loading} activeCount={h.activeCount}
            totalUnread={h.totalUnread} scheduledSessions={h.scheduledSessions}
            monthRevenue={h.monthRevenue} yearRevenue={h.yearRevenue} totalRevenue={h.totalRevenue}
            monthPaymentsCount={h.monthPaymentsCount} activeSubscribers={h.activeSubscribers}
            coachProfile={h.coachProfile} stripeConnecting={h.stripeConnecting}
            handleStripeConnect={h.handleStripeConnect} setSection={h.setSection}
          />
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
          setSection={h.setSection} supabaseSignOut={() => { cache.clearAll(); h.supabase.auth.signOut().then(() => { window.location.href = '/landing' }) }}
        />
      )}

      <BugReport session={h.session} profile={h.coachProfile} />

      {/* ── BOTTOM NAV ── */}
      <nav className="bottom-nav" aria-label="Navigation principale">
        {([
          { key: 'dashboard', icon: <Users size={22} strokeWidth={2} />, label: 'Clients' },
          { key: 'messages', icon: <MessageCircle size={22} strokeWidth={2} />, label: 'Messages', badge: h.totalUnread },
          { key: 'calendar', icon: <Calendar size={22} strokeWidth={2} />, label: 'Calendrier' },
          { key: 'aliments', icon: <UtensilsCrossed size={22} strokeWidth={2} />, label: 'Aliments' },
          { key: 'profil', icon: <div className="avatar-circle" style={{ width: 26, height: 26, fontSize: '0.65rem', flexShrink: 0 }}>{h.coachInitials}</div>, label: 'Profil' },
        ] as { key: string; icon: React.ReactNode; label: string; badge?: number }[]).map(tab => (
          <button key={tab.key} className={`bottom-nav-btn${h.section === tab.key ? ' active' : ''}`}
            onClick={() => h.setSection(tab.key as any)} aria-label={tab.label}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {tab.icon}
              {tab.badge && tab.badge > 0 ? <span className="nav-badge">{tab.badge > 9 ? '9+' : tab.badge}</span> : null}
            </div>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
