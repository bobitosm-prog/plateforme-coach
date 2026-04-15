'use client'
import { colors, fonts, titleStyle, cardStyle } from '../../lib/design-tokens'
import type { Badge } from '../../lib/check-badges'

const BADGE_EMOJIS: Record<string, string> = {
  star: '⭐', grid: '📊', home: '🏠', clock: '⏱️', 'star-big': '🌟', chart: '📈',
  doc: '📝', list: '📋', scan: '📷', target: '🎯',
  flame: '🔥', 'flame-plus': '💪', 'flame-star': '🏆', 'flame-crown': '👑', 'flame-legend': '🏅',
  camera: '📸', share: '🔗', users: '👥', crown: '👑',
}

export default function BadgeCelebration({ badge, xp, onClose }: { badge: Badge; xp: number; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Confetti */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', width: 6, height: 6, borderRadius: i % 3 === 0 ? '50%' : 0,
            background: i % 2 === 0 ? colors.gold : colors.goldContainer,
            left: `${Math.random() * 100}%`, top: -10, opacity: 0.7,
            animation: `confettiFall ${1.5 + Math.random() * 2}s ${Math.random() * 0.5}s ease-out forwards`,
          }} />
        ))}
      </div>
      <div style={{ ...cardStyle, padding: 32, maxWidth: 300, textAlign: 'center', position: 'relative', border: `1px solid rgba(230,195,100,0.3)` }}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: 'badgeBounce 0.6s ease-out' }}>
          {BADGE_EMOJIS[badge.icon] || '🏆'}
        </div>
        <div style={{ ...titleStyle, fontSize: 16, marginBottom: 8 }}>BADGE DÉBLOQUÉ !</div>
        <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 800, color: colors.text, marginBottom: 4 }}>{badge.name}</div>
        <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>{badge.description}</div>
        <div style={{ fontFamily: fonts.headline, fontSize: 14, fontWeight: 700, color: colors.gold, marginBottom: 20 }}>+{badge.xp_reward} XP</div>
        <button onClick={onClose} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: colors.gold, color: '#0D0B08', fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>
          CONTINUER
        </button>
      </div>
      <style>{`
        @keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 0.8; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        @keyframes badgeBounce { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  )
}
