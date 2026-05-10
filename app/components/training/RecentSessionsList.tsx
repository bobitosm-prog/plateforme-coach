'use client'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { resolveSessionType, HISTORY_FILTERS, getHeroImage } from '../../../lib/session-types'
import { colors, fonts } from '../../../lib/design-tokens'

interface RecentSessionsListProps {
  workoutHistory: any[]
  onOpenDetail: (workout: any) => void
}

export default function RecentSessionsList({ workoutHistory, onOpenDetail }: RecentSessionsListProps) {
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all')

  const filtered = workoutHistory.filter((s: any) => {
    if (historyFilter === 'all') return true
    const resolved = resolveSessionType(s.name)
    return resolved.key === historyFilter
  })

  const limit = showFullHistory ? 20 : 3
  const visible = filtered.slice(0, limit)

  return (
    <div style={{ padding: '0 20px', marginTop: 24, marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 4 }}>
        <span style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: colors.gold, textTransform: 'uppercase' }}>
          Dernieres seances
        </span>
        <span style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textDim }}>
          {workoutHistory.length} seances
        </span>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4, WebkitOverflowScrolling: 'touch' as any }}>
        {HISTORY_FILTERS.map(f => {
          const active = historyFilter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setHistoryFilter(f.key)}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 10,
                background: active ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${active ? colors.gold : 'rgba(255,255,255,0.1)'}`,
                fontFamily: fonts.alt, fontSize: 9, fontWeight: 700,
                letterSpacing: '0.18em', color: active ? colors.gold : colors.textDim,
                textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Session items */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: fonts.body, fontSize: 14, color: colors.textDim }}>
          Aucune seance
        </div>
      ) : (
        <>
          {visible.map((s: any) => {
            const heroImg = getHeroImage(s.name)
            const d = new Date(s.created_at)
            const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

            return (
              <button
                key={s.id}
                onClick={() => onOpenDetail(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: 12, background: colors.surface2,
                  border: `1px solid ${colors.divider}`, borderRadius: 14,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  marginBottom: 10, transition: 'all 0.15s',
                  fontFamily: 'inherit', color: 'inherit',
                }}
              >
                {/* Mini-thumbnail hero */}
                <div style={{
                  width: 60, height: 60, borderRadius: 12,
                  overflow: 'hidden', flexShrink: 0,
                  backgroundImage: `url(${heroImg})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  filter: 'grayscale(0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: fonts.headline, fontSize: 17, fontWeight: 400,
                    color: colors.text, textTransform: 'uppercase',
                    letterSpacing: '0.02em', lineHeight: 1.1,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.name || 'Seance'}
                  </div>
                  <div style={{
                    fontFamily: fonts.body, fontSize: 12, color: colors.textDim,
                    marginTop: 4, lineHeight: 1.3,
                  }}>
                    {dateStr}
                    {s.duration_minutes ? ` \u00b7 ${s.duration_minutes}min` : ''}
                    {s.notes ? ` \u00b7 ${s.notes}` : ''}
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight size={18} color={colors.textDim} style={{ flexShrink: 0 }} />
              </button>
            )
          })}

          {/* Show more / less */}
          {filtered.length > 3 && !showFullHistory && (
            <button
              onClick={() => setShowFullHistory(true)}
              style={{
                width: '100%', padding: 12, marginTop: 4,
                background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)',
                border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 14,
                fontFamily: fonts.alt, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.18em', color: colors.gold,
                textTransform: 'uppercase', cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Voir tout &rsaquo;
            </button>
          )}
          {showFullHistory && filtered.length > 3 && (
            <button
              onClick={() => setShowFullHistory(false)}
              style={{
                width: '100%', padding: 12, marginTop: 4,
                background: 'transparent',
                border: `1px solid ${colors.divider}`, borderRadius: 14,
                fontFamily: fonts.alt, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.18em', color: colors.textDim,
                textTransform: 'uppercase', cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Reduire
            </button>
          )}
        </>
      )}
    </div>
  )
}
