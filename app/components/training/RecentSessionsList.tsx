'use client'
import { useState } from 'react'
import { resolveSessionType, HISTORY_FILTERS } from '../../../lib/session-types'
import { colors, fonts, statSmallStyle, bodyStyle, mutedStyle } from '../../../lib/design-tokens'

interface RecentSessionsListProps {
  workoutHistory: any[]
  onOpenDetail: (workout: any) => void
}

export default function RecentSessionsList({ workoutHistory, onOpenDetail }: RecentSessionsListProps) {
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all')

  return (
    <div style={{ padding: '0 24px', marginTop: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ ...statSmallStyle, color: colors.text, letterSpacing: 3 }}>DERNIÈRES SÉANCES</span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(212,168,67,0.25), transparent)' }} />
        <span style={mutedStyle}>{workoutHistory.length} seances</span>
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4, WebkitOverflowScrolling: 'touch' as any }}>
        {HISTORY_FILTERS.map(f => (
          <button key={f.key} onClick={() => setHistoryFilter(f.key)} style={{ padding: '7px 14px', borderRadius: 16, whiteSpace: 'nowrap', border: historyFilter === f.key ? `1px solid ${colors.gold}` : `1px solid ${colors.goldDim}`, background: historyFilter === f.key ? colors.goldDim : 'transparent', color: historyFilter === f.key ? colors.gold : colors.textMuted, fontFamily: fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>{f.label}</button>
        ))}
      </div>
      {(() => {
        const filtered = workoutHistory.filter((s: any) => {
          if (historyFilter === 'all') return true
          const resolved = resolveSessionType(s.name)
          return resolved.key === historyFilter
        })
        if (filtered.length === 0) return <div style={{ textAlign: 'center', padding: '24px 0', ...bodyStyle, color: colors.textDim }}>Aucune séance</div>
        const limit = showFullHistory ? 20 : 3
        return (
          <>
            {filtered.slice(0, limit).map((s: any) => {
              const d = new Date(s.created_at)
              const typeInfo = resolveSessionType(s.name)
              return (
                <div key={s.id} onClick={() => onOpenDetail(s)} style={{ background: colors.surface, border: `1px solid ${colors.goldDim}`, borderRadius: 16, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${typeInfo.color}15`, border: `1px solid ${typeInfo.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{typeInfo.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...statSmallStyle, fontSize: 17, color: colors.text, letterSpacing: 1 }}>{typeInfo.label.toUpperCase()}</div>
                    {s.name && s.name.toLowerCase() !== typeInfo.label.toLowerCase() && s.name.includes('\u2014') && (
                      <div style={{ ...mutedStyle, fontSize: 11, color: colors.gold, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name.split('\u2014').slice(1).join('\u2014').trim()}
                      </div>
                    )}
                    <div style={{ ...mutedStyle, fontSize: 11, marginTop: 2 }}>
                      {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {s.duration_minutes ? ` \u00b7 ${s.duration_minutes}min` : ''}
                      {s.notes ? ` \u00b7 ${s.notes}` : ''}
                    </div>
                  </div>
                </div>
              )
            })}
            {filtered.length > 3 && !showFullHistory && (
              <button onClick={() => setShowFullHistory(true)} style={{ width: '100%', padding: 12, background: 'transparent', border: `1px solid ${colors.goldDim}`, borderRadius: 16, color: colors.gold, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', textAlign: 'center', marginTop: 4 }}>
                Voir tout &rarr;
              </button>
            )}
            {showFullHistory && filtered.length > 3 && (
              <button onClick={() => setShowFullHistory(false)} style={{ width: '100%', padding: 12, background: 'transparent', border: `1px solid ${colors.goldDim}`, borderRadius: 16, color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', textAlign: 'center', marginTop: 4 }}>
                Réduire
              </button>
            )}
          </>
        )
      })()}
    </div>
  )
}
