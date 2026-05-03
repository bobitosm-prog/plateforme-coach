'use client'

import { useRouter } from 'next/navigation'
import { Calendar, Flame, Scale, Utensils } from 'lucide-react'
import useCoachAnalytics, { type ClientStatus, type ClientAnalytics } from '../hooks/useCoachAnalytics'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'

/* ── Helpers ── */
const statusConfig: Record<ClientStatus, { color: string; emoji: string; label: string }> = {
  active:    { color: GREEN, emoji: '🟢', label: 'Actif' },
  declining: { color: GOLD,  emoji: '🟡', label: 'Décroche' },
  inactive:  { color: RED,   emoji: '🔴', label: 'Inactif' },
  new:       { color: TEXT_MUTED, emoji: '⚪', label: 'Nouveau' },
}

function formatRelative(date: Date | null): string {
  if (!date) return '—'
  const now = Date.now()
  const diff = now - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `il y a ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days}j`
  const weeks = Math.floor(days / 7)
  return `il y a ${weeks} sem`
}

function formatWeightDelta(delta: number | null): string {
  if (delta === null) return '—'
  return (delta >= 0 ? '+' : '') + delta.toFixed(1) + ' kg'
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

/* ── Component ── */
type Props = { coachId: string | null }

export default function CoachAnalytics({ coachId }: Props) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { loading, clients, kpi, sortBy, setSortBy, filterBy, setFilterBy } = useCoachAnalytics(coachId)

  if (loading && kpi.totalClients === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!loading && kpi.totalClients === 0) {
    return (
      <div style={{ padding: '16px 14px' }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 24px', letterSpacing: '3px', textTransform: 'uppercase' }}>Suivi</h1>
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 40, textAlign: 'center' }}>
          <p style={{ color: TEXT_MUTED, fontFamily: FONT_BODY, margin: 0 }}>Aucun client à suivre pour l&apos;instant</p>
        </div>
      </div>
    )
  }

  const kpiCards: { label: string; value: number; color: string; filter: typeof filterBy }[] = [
    { label: 'Total', value: kpi.totalClients, color: TEXT_PRIMARY, filter: 'all' },
    { label: 'Actifs', value: kpi.totalActive, color: GREEN, filter: 'active' },
    { label: 'Décrochent', value: kpi.totalDeclining, color: GOLD, filter: 'declining' },
    { label: 'Inactifs', value: kpi.totalInactive, color: RED, filter: 'inactive' },
  ]

  const filterChips: { label: string; value: typeof filterBy }[] = [
    { label: 'Tous', value: 'all' },
    { label: 'Actifs', value: 'active' },
    { label: 'Décrochent', value: 'declining' },
    { label: 'Inactifs', value: 'inactive' },
  ]

  return (
    <div style={{ padding: '16px 14px' }}>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 20px', letterSpacing: '3px', textTransform: 'uppercase' }}>Suivi</h1>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {kpiCards.map(card => {
          const isActive = filterBy === card.filter
          return (
            <button
              key={card.label}
              onClick={() => setFilterBy(card.filter)}
              style={{
                background: BG_CARD,
                border: `1.5px solid ${isActive ? GOLD : BORDER}`,
                borderRadius: RADIUS_CARD,
                padding: '16px 14px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'border-color 150ms',
              }}
            >
              <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: 6 }}>
                {card.label}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.6rem', fontWeight: 700, color: card.color, lineHeight: 1 }}>
                {card.value}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Filters + Sort ── */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, marginBottom: 16, alignItems: isMobile ? 'stretch' : 'center' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1 }}>
          {filterChips.map(chip => {
            const active = filterBy === chip.value
            return (
              <button
                key={chip.value}
                onClick={() => setFilterBy(chip.value)}
                style={{
                  padding: '6px 14px', borderRadius: 14, flexShrink: 0,
                  border: `1px solid ${active ? GOLD : BORDER}`,
                  background: active ? GOLD : 'transparent',
                  color: active ? '#0D0B08' : TEXT_MUTED,
                  fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
                  letterSpacing: 0.5, textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{
            background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 12,
            padding: '8px 12px', color: TEXT_PRIMARY, fontFamily: FONT_ALT,
            fontSize: '0.78rem', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="status">Tri : Statut</option>
          <option value="name">Tri : Nom</option>
          <option value="lastActivity">Tri : Dernière activité</option>
        </select>
      </div>

      {/* ── Client List ── */}
      {clients.length === 0 ? (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 32, textAlign: 'center' }}>
          <p style={{ color: TEXT_MUTED, fontFamily: FONT_BODY, margin: 0 }}>Aucun client dans cette catégorie</p>
          <button onClick={() => setFilterBy('all')} style={{ marginTop: 12, padding: '8px 16px', background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: 10, color: GOLD, fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
            Voir tous
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clients.map((c: ClientAnalytics) => {
            const cfg = statusConfig[c.status]
            return (
              <div
                key={c.client_id}
                onClick={() => router.push(`/client/${c.client_id}`)}
                style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD,
                  padding: '14px 16px', cursor: 'pointer', transition: 'border-color 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD_RULE }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER }}
              >
                {/* Row 1: avatar + name + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: GOLD_DIM,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY, flexShrink: 0,
                  }}>
                    {initials(c.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_ALT, fontSize: '0.95rem', fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.03em' }}>
                      {c.full_name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: '0.68rem', color: cfg.color, fontFamily: FONT_BODY, fontWeight: 600 }}>{cfg.label}</span>
                      {c.subscription_type && (
                        <span style={{
                          fontSize: '0.58rem', fontFamily: FONT_ALT, fontWeight: 700,
                          padding: '1px 6px', borderRadius: 4, letterSpacing: '0.5px', textTransform: 'uppercase',
                          background: c.subscription_type === 'invited' ? GOLD_DIM : 'rgba(138,133,128,0.12)',
                          color: c.subscription_type === 'invited' ? GOLD : TEXT_MUTED,
                        }}>
                          {c.subscription_type === 'invited' ? 'Invité' : 'Solo'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: TEXT_DIM, fontFamily: FONT_BODY, flexShrink: 0 }}>
                    {formatRelative(c.lastActivity)}
                  </span>
                </div>

                {/* Row 2: metrics */}
                <div style={{ display: 'flex', gap: isMobile ? 10 : 16, flexWrap: 'wrap', paddingLeft: 52 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>
                    <Calendar size={12} color={TEXT_DIM} />{c.sessionsLast7d} séances
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>
                    <Flame size={12} color={TEXT_DIM} />{c.streak}j
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>
                    <Scale size={12} color={TEXT_DIM} />{formatWeightDelta(c.weightDelta7d)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>
                    <Utensils size={12} color={TEXT_DIM} />{c.mealAdherence7d}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
