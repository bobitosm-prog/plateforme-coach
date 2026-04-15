'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { colors, fonts, titleStyle, titleLineStyle, cardStyle, cardTitleAbove, mutedStyle, radii } from '../../lib/design-tokens'
import { getLevelInfo, getProgress, type Badge } from '../../lib/check-badges'

const BADGE_EMOJIS: Record<string, string> = {
  star: '⭐', grid: '📊', home: '🏠', clock: '⏱️', 'star-big': '🌟', chart: '📈',
  doc: '📝', list: '📋', scan: '📷', target: '🎯',
  flame: '🔥', 'flame-plus': '💪', 'flame-star': '🏆', 'flame-crown': '👑', 'flame-legend': '🏅',
  camera: '📸', share: '🔗', users: '👥', crown: '👑',
}

const CATEGORIES = [
  { id: 'all', label: 'TOUT' },
  { id: 'training', label: 'TRAINING' },
  { id: 'nutrition', label: 'NUTRITION' },
  { id: 'streak', label: 'STREAK' },
  { id: 'social', label: 'SOCIAL' },
]

interface BadgesModalProps {
  allBadges: Badge[]
  unlockedIds: Set<string>
  totalXp: number
  currentValues: Record<string, number>
  onClose: () => void
}

export default function BadgesModal({ allBadges, unlockedIds, totalXp, currentValues, onClose }: BadgesModalProps) {
  const [filter, setFilter] = useState('all')
  const level = getLevelInfo(totalXp)
  const xpInLevel = totalXp - level.minXp
  const xpNeeded = level.maxXp - level.minXp
  const xpPct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))
  const earnedCount = allBadges.filter(b => unlockedIds.has(b.id)).length
  const lockedCount = allBadges.length - earnedCount
  const almostBadges = allBadges.filter(b => !unlockedIds.has(b.id) && getProgress(b.condition_value, currentValues[b.condition_type] || 0) >= 50)

  const filtered = filter === 'all' ? allBadges : allBadges.filter(b => b.category === filter)
  const categories = filter === 'all' ? ['training', 'nutrition', 'streak', 'social'] : [filter]

  return (
    <div style={{ position: 'fixed', inset: 0, background: colors.background, zIndex: 1000, overflowY: 'auto' }}>
      <div style={{ padding: '20px 20px 120px', maxWidth: 420, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'max(12px, env(safe-area-inset-top, 12px))', marginBottom: 20 }}>
          <span style={{ fontFamily: fonts.headline, fontSize: 20, fontWeight: 700, color: colors.text, letterSpacing: '0.12em' }}>MES BADGES</span>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={colors.textMuted} />
          </button>
        </div>

        {/* SECTION A — NIVEAU GLOBAL */}
        <div style={{ ...cardStyle, padding: 20, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: colors.textMuted, letterSpacing: '0.1em', fontFamily: fonts.headline, fontWeight: 700, marginBottom: 4 }}>NIVEAU GLOBAL</div>
          <div style={{ fontFamily: fonts.headline, fontSize: 36, fontWeight: 800, color: colors.gold, lineHeight: 1 }}>LV. {level.level}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>{level.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ flex: 1, height: 6, background: 'rgba(230,195,100,0.1)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${xpPct}%`, height: '100%', background: `linear-gradient(90deg, ${colors.goldContainer}, ${colors.gold})`, borderRadius: 999 }} />
            </div>
            <span style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: colors.gold }}>{totalXp} XP</span>
          </div>
          <div style={{ ...mutedStyle, fontSize: 9, marginBottom: 14 }}>Prochain niveau : {level.maxXp} XP</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            <div><span style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 800, color: colors.gold }}>{earnedCount}</span><div style={{ fontSize: 8, color: colors.textMuted, fontFamily: fonts.headline, letterSpacing: '0.08em' }}>OBTENUS</div></div>
            <div><span style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.2)' }}>{lockedCount}</span><div style={{ fontSize: 8, color: colors.textMuted, fontFamily: fonts.headline, letterSpacing: '0.08em' }}>VERROUILLÉS</div></div>
            <div><span style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 800, color: '#22c55e' }}>{almostBadges.length}</span><div style={{ fontSize: 8, color: colors.textMuted, fontFamily: fonts.headline, letterSpacing: '0.08em' }}>PRESQUE</div></div>
          </div>
        </div>

        {/* SECTION B — PILLS CATÉGORIES */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16 }}>
          {CATEGORIES.map(c => {
            const count = c.id === 'all' ? allBadges.length : allBadges.filter(b => b.category === c.id).length
            const earned = c.id === 'all' ? earnedCount : allBadges.filter(b => b.category === c.id && unlockedIds.has(b.id)).length
            const active = filter === c.id
            return (
              <button key={c.id} onClick={() => setFilter(c.id)} style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                background: active ? 'rgba(230,195,100,0.15)' : 'transparent',
                border: `1px solid ${active ? 'rgba(230,195,100,0.4)' : colors.goldBorder}`,
                color: active ? colors.gold : 'rgba(255,255,255,0.4)',
              }}>
                {c.label} ({earned}/{count})
              </button>
            )
          })}
        </div>

        {/* SECTION C — PRESQUE DÉBLOQUÉS */}
        {almostBadges.length > 0 && filter === 'all' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={cardTitleAbove}>PRESQUE DÉBLOQUÉS</span>
              <div style={titleLineStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 16 }}>
              {almostBadges.map(b => {
                const pct = getProgress(b.condition_value, currentValues[b.condition_type] || 0)
                const current = currentValues[b.condition_type] || 0
                return (
                  <div key={b.id} style={{ minWidth: 140, border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: 14, background: colors.surface, position: 'relative', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: '#22c55e' }}>{pct}%</span>
                    <div style={{ fontSize: 24, marginBottom: 6, textAlign: 'center' }}>{BADGE_EMOJIS[b.icon] || '🏆'}</div>
                    <div style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.text, textAlign: 'center', marginBottom: 2 }}>{b.name}</div>
                    <div style={{ fontSize: 7, color: colors.textMuted, textAlign: 'center', marginBottom: 8 }}>{b.description}</div>
                    <div style={{ height: 4, background: 'rgba(34,197,94,0.1)', borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#22c55e', borderRadius: 999 }} />
                    </div>
                    <div style={{ fontSize: 7, color: colors.textMuted, textAlign: 'center' }}>{current}/{b.condition_value}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* SECTIONS D-G — BADGE CATEGORIES */}
        {categories.map(cat => {
          const catBadges = allBadges.filter(b => b.category === cat)
          const catEarned = catBadges.filter(b => unlockedIds.has(b.id)).length
          return (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={cardTitleAbove}>{cat.toUpperCase()}</span>
                <div style={titleLineStyle} />
                <span style={{ ...mutedStyle, fontSize: 10 }}>{catEarned}/{catBadges.length}</span>
              </div>
              <div style={{ ...cardStyle, padding: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {catBadges.map(b => {
                    const isEarned = unlockedIds.has(b.id)
                    return (
                      <div key={b.id} style={{
                        background: isEarned ? 'rgba(230,195,100,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isEarned ? 'rgba(230,195,100,0.3)' : 'rgba(255,255,255,0.05)'}`,
                        borderRadius: 12, padding: 12, textAlign: 'center', opacity: isEarned ? 1 : 0.35, position: 'relative',
                      }}>
                        {!isEarned && <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 8 }}>🔒</span>}
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{BADGE_EMOJIS[b.icon] || '🏆'}</div>
                        <div style={{ fontFamily: fonts.headline, fontSize: 7, fontWeight: 700, color: isEarned ? colors.text : 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', marginBottom: 2 }}>{b.name}</div>
                        <div style={{ fontSize: 6, color: isEarned ? colors.textMuted : 'rgba(255,255,255,0.15)', lineHeight: 1.3 }}>{b.description}</div>
                        {isEarned && <div style={{ fontSize: 7, color: colors.gold, fontFamily: fonts.headline, fontWeight: 700, marginTop: 4 }}>+{b.xp_reward} XP</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
