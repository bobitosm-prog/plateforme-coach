'use client'

import {
  Users, CalendarCheck, MessageCircle, TrendingUp, Check,
} from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'

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
  atRiskClients: any[]
}

export default function CoachRevenue({
  clients, loading, activeCount, totalUnread,
  scheduledSessions,
  monthRevenue, yearRevenue, totalRevenue, monthPaymentsCount, activeSubscribers,
  coachProfile, stripeConnecting, handleStripeConnect,
  setSection, atRiskClients,
}: CoachRevenueProps) {
  return (
    <>
      {/* Stripe banner */}
      {coachProfile && !coachProfile.stripe_onboarding_complete && (
        <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: RADIUS_CARD, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: GOLD, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Connecte ton compte Stripe pour recevoir les paiements de tes clients</span>
          <button onClick={handleStripeConnect} disabled={stripeConnecting} style={{ padding: '8px 16px', background: GOLD, border: 'none', borderRadius: 0, color: BG_BASE, fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, letterSpacing: '1px', textTransform: 'uppercase' as const }}>
            {stripeConnecting ? '...' : 'Connecter Stripe'}
          </button>
        </div>
      )}

      {/* At-risk clients alert */}
      {atRiskClients.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.05)', border: `1px solid ${BORDER}`, borderLeft: `2px solid ${RED}`, borderRadius: RADIUS_CARD, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: RED, fontFamily: FONT_ALT, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Clients a relancer ({atRiskClients.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {atRiskClients.map((c: any) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.9rem', fontFamily: FONT_BODY, fontWeight: 600, color: TEXT_PRIMARY }}>{c.name}</span>
                  <span style={{ fontSize: '0.78rem', color: TEXT_MUTED, marginLeft: 8, fontFamily: FONT_BODY }}>
                    Derniere seance : {c.daysSince >= 999 ? 'aucune' : `${c.daysSince} jours`}
                  </span>
                </div>
                <button
                  onClick={() => setSection('messages')}
                  style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 0, padding: '6px 14px', color: RED, fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '1px', textTransform: 'uppercase' as const }}
                >
                  Envoyer un message
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '2.4rem', fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '3px', margin: 0, textTransform: 'uppercase' }}>Tableau de bord</h1>
      </div>

      {/* ── STATS ROW ── Bauhaus grid */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', marginBottom: '32px', background: BORDER, border: `1px solid ${BORDER}` }}>

        {/* Clients */}
        <div style={{ background: BG_CARD, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: TEXT_MUTED }}>Clients</span>
            <Users size={16} color={GOLD} strokeWidth={2} />
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '40px', fontWeight: 700, color: GOLD, lineHeight: 1 }}>
            {loading ? '—' : clients.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <TrendingUp size={12} color={GREEN} strokeWidth={2.5} />
            <span style={{ fontFamily: FONT_BODY, fontSize: '0.72rem', color: GREEN, fontWeight: 500 }}>{activeCount} actifs</span>
          </div>
        </div>

        {/* Sessions */}
        <div style={{ background: BG_CARD, padding: 24, cursor: 'pointer' }} onClick={() => setSection('calendar')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: TEXT_MUTED }}>Séances</span>
            <CalendarCheck size={16} color={GOLD} strokeWidth={2} />
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '40px', fontWeight: 700, color: GOLD, lineHeight: 1 }}>
            {scheduledSessions.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: '0.72rem', color: GOLD, fontWeight: 500 }}>
              {scheduledSessions.filter(s => s.status === 'completed').length} complétées
            </span>
          </div>
        </div>

        {/* Revenue: Month */}
        <div style={{ background: BG_CARD, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: TEXT_MUTED }}>Revenus du mois</span>
            <span style={{ fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700, color: GOLD }}>CHF</span>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '40px', fontWeight: 700, color: GOLD, lineHeight: 1 }}>
            CHF {fmtChf(monthRevenue)}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: '0.72rem', color: TEXT_MUTED, fontWeight: 500, marginTop: '8px' }}>
            {monthPaymentsCount} paiement{monthPaymentsCount !== 1 ? 's' : ''} ce mois
          </div>
        </div>

        {/* Revenue: Year */}
        <div style={{ background: BG_CARD, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: TEXT_MUTED }}>Revenus de l&apos;année</span>
            <span style={{ fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700, color: GOLD }}>CHF</span>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '40px', fontWeight: 700, color: GOLD, lineHeight: 1 }}>
            CHF {fmtChf(yearRevenue)}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: '0.72rem', color: TEXT_MUTED, fontWeight: 500, marginTop: '8px' }}>
            {new Date().getFullYear()}
          </div>
        </div>

        {/* Revenue: Total */}
        <div style={{ background: BG_CARD, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: TEXT_MUTED }}>Revenus totaux</span>
            <span style={{ fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700, color: GOLD }}>CHF</span>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '40px', fontWeight: 700, color: GOLD, lineHeight: 1 }}>
            CHF {fmtChf(totalRevenue)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <Check size={12} color={GREEN} strokeWidth={2.5} />
            <span style={{ fontFamily: FONT_BODY, fontSize: '0.72rem', color: GREEN, fontWeight: 500 }}>{activeSubscribers} client{activeSubscribers !== 1 ? 's' : ''} actif{activeSubscribers !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ background: BG_CARD, padding: 24, cursor: 'pointer' }} onClick={() => setSection('messages')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: TEXT_MUTED }}>Messages</span>
            <MessageCircle size={16} color={totalUnread > 0 ? RED : TEXT_MUTED} strokeWidth={2} />
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '40px', fontWeight: 700, color: totalUnread > 0 ? RED : TEXT_PRIMARY, lineHeight: 1 }}>
            {totalUnread}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: '0.72rem', color: TEXT_MUTED, fontWeight: 500, marginTop: '8px' }}>non lus</div>
        </div>

      </div>
    </>
  )
}
