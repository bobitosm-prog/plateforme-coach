'use client'

import {
  Users, CalendarCheck, MessageCircle, TrendingUp, Check,
} from 'lucide-react'

import type { ClientRow, ScheduledSession } from '../hooks/useCoachDashboard'

function fmtChf(n: number): string {
  if (n === 0) return '0'
  const s = Math.round(n).toString()
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, "'")
}

interface CoachRevenueProps {
  clients: ClientRow[]
  loading: boolean
  activeCount: number
  totalUnread: number
  scheduledSessions: ScheduledSession[]
  monthRevenue: number
  yearRevenue: number
  totalRevenue: number
  monthPaymentsCount: number
  activeSubscribers: number
  coachProfile: any
  stripeConnecting: boolean
  handleStripeConnect: () => void
  setSection: (s: 'dashboard' | 'messages' | 'calendar' | 'aliments' | 'profil') => void
}

export default function CoachRevenue({
  clients, loading, activeCount, totalUnread,
  scheduledSessions,
  monthRevenue, yearRevenue, totalRevenue, monthPaymentsCount, activeSubscribers,
  coachProfile, stripeConnecting, handleStripeConnect,
  setSection,
}: CoachRevenueProps) {
  return (
    <>
      {/* Stripe banner */}
      {coachProfile && !coachProfile.stripe_onboarding_complete && (
        <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: '#C9A84C', fontWeight: 600 }}>Connecte ton compte Stripe pour recevoir les paiements de tes clients</span>
          <button onClick={handleStripeConnect} disabled={stripeConnecting} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #C9A84C, #D4AF37)', border: 'none', borderRadius: 8, color: '#000', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            {stripeConnecting ? '...' : '💳 Connecter Stripe'}
          </button>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.02em', margin: 0 }}>Tableau de bord</h1>
      </div>

      {/* ── STATS ROW ── */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>

        {/* Clients */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Clients</span>
            <div style={{ width: '32px', height: '32px', background: 'rgba(249,115,22,0.12)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} color="#F97316" strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.4rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1 }}>
            {loading ? '—' : clients.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <TrendingUp size={12} color="#22C55E" strokeWidth={2.5} />
            <span style={{ fontSize: '0.72rem', color: '#22C55E', fontWeight: 500 }}>{activeCount} actifs</span>
          </div>
        </div>

        {/* Sessions */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setSection('calendar')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Séances</span>
            <div style={{ width: '32px', height: '32px', background: 'rgba(201,168,76,0.12)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={16} color="#C9A84C" strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.4rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1 }}>
            {scheduledSessions.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#C9A84C', fontWeight: 500 }}>
              {scheduledSessions.filter(s => s.status === 'completed').length} complétées
            </span>
          </div>
        </div>

        {/* Revenue: Month */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Revenus du mois</span>
            <div style={{ width: '32px', height: '32px', background: 'rgba(201,168,76,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C' }}>
              CHF
            </div>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.4rem', fontWeight: 700, color: '#C9A84C', lineHeight: 1 }}>
            CHF {fmtChf(monthRevenue)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 500, marginTop: '8px' }}>
            {monthPaymentsCount} paiement{monthPaymentsCount !== 1 ? 's' : ''} ce mois
          </div>
        </div>

        {/* Revenue: Year */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Revenus de l&apos;année</span>
            <div style={{ width: '32px', height: '32px', background: 'rgba(201,168,76,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C' }}>
              CHF
            </div>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.4rem', fontWeight: 700, color: '#C9A84C', lineHeight: 1 }}>
            CHF {fmtChf(yearRevenue)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 500, marginTop: '8px' }}>
            {new Date().getFullYear()}
          </div>
        </div>

        {/* Revenue: Total */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Revenus totaux</span>
            <div style={{ width: '32px', height: '32px', background: 'rgba(201,168,76,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C' }}>
              CHF
            </div>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.4rem', fontWeight: 700, color: '#C9A84C', lineHeight: 1 }}>
            CHF {fmtChf(totalRevenue)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <Check size={12} color="#22C55E" strokeWidth={2.5} />
            <span style={{ fontSize: '0.72rem', color: '#22C55E', fontWeight: 500 }}>{activeSubscribers} client{activeSubscribers !== 1 ? 's' : ''} actif{activeSubscribers !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setSection('messages')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Messages</span>
            <div style={{ width: '32px', height: '32px', background: totalUnread > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={16} color={totalUnread > 0 ? '#EF4444' : '#F97316'} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.4rem', fontWeight: 700, color: totalUnread > 0 ? '#EF4444' : '#F8FAFC', lineHeight: 1 }}>
            {totalUnread}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 500, marginTop: '8px' }}>non lus</div>
        </div>

      </div>
    </>
  )
}
