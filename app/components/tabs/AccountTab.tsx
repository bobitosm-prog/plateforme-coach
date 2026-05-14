'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, MessageSquare, Sparkles, User, Target, Settings, LogOut, ChevronRight } from 'lucide-react'
import { useMyFeedbackBadge } from '@/app/hooks/useMyFeedbackBadge'
import { colors, fonts } from '../../../lib/design-tokens'
import { getLevelFromXP } from '../../../lib/gamification'

const GOLD = colors.gold
const TEXT_PRIMARY = colors.text
const TEXT_DIM = colors.textDim
const FONT_DISPLAY = fonts.headline
const FONT_ALT = fonts.alt
const FONT_BODY = fonts.body

interface AccountTabProps {
  firstName: string
  displayAvatar?: string
  unreadCount: number
  supabase: any
  userId?: string
  onNavigate: (tab: 'messages' | 'coachIA' | 'profil' | 'feedback') => void
  onLogout: () => void
}

const sectionLabel: React.CSSProperties = {
  fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700,
  letterSpacing: '0.18em', color: TEXT_DIM,
  textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4,
}

const cardGroup: React.CSSProperties = {
  background: colors.surface2,
  borderRadius: 14,
  border: `1px solid ${colors.divider}`,
  marginBottom: 24,
  overflow: 'hidden',
}

const itemStyle: React.CSSProperties = {
  padding: '14px 16px',
  display: 'flex', alignItems: 'center', gap: 12,
  background: 'transparent', border: 'none',
  width: '100%', cursor: 'pointer',
  fontFamily: 'inherit', color: 'inherit',
  textAlign: 'left',
}

const divider: React.CSSProperties = {
  height: 1, background: colors.divider, margin: '0 16px',
}

export default function AccountTab({
  firstName, displayAvatar, unreadCount, supabase, userId, onNavigate, onLogout,
}: AccountTabProps) {
  const [xpData, setXpData] = useState<{ total_xp: number } | null>(null)

  useEffect(() => {
    if (!supabase || !userId) return
    supabase.from('user_xp').select('total_xp').eq('user_id', userId).maybeSingle()
      .then(({ data }: any) => { if (data) setXpData(data) })
  }, [supabase, userId])

  const feedbackUnread = useMyFeedbackBadge()
  const xp = xpData?.total_xp || 0
  const { level, xpForNext, xpInLevel } = getLevelFromXP(xp)

  return (
    <div style={{ padding: 16, minHeight: '100vh', background: colors.background }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* ── User card ── */}
        <div style={{
          background: colors.surface2, borderRadius: 16, padding: 20,
          marginBottom: 24, border: `1px solid ${colors.divider}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: `2px solid ${GOLD}`, overflow: 'hidden', flexShrink: 0,
            background: colors.surface,
          }}>
            {displayAvatar ? (
              <img src={displayAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontSize: 24, color: GOLD }}>
                {firstName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 400, color: TEXT_PRIMARY, letterSpacing: '0.02em', lineHeight: 1, textTransform: 'uppercase' }}>
              {firstName}
            </div>
            <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: TEXT_DIM, textTransform: 'uppercase', marginTop: 4 }}>
              NIVEAU {level} &bull; {xpInLevel} / {xpForNext} XP
            </div>
          </div>
        </div>

        {/* ── COACHING ── */}
        <div style={sectionLabel}>COACHING</div>
        <div style={cardGroup}>
          <button onClick={() => onNavigate('messages')} style={itemStyle}>
            <MessageCircle size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>Messages</span>
            <span style={{ flex: 1 }} />
            {unreadCount > 0 && (
              <span style={{ background: GOLD, color: '#0e0e0e', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                {unreadCount}
              </span>
            )}
            <ChevronRight size={16} color={TEXT_DIM} />
          </button>
          <div style={divider} />
          <button onClick={() => onNavigate('coachIA')} style={itemStyle}>
            <Sparkles size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>Athena</span>
            <span style={{ flex: 1 }} />
            <ChevronRight size={16} color={TEXT_DIM} />
          </button>
        </div>

        {/* ── PROFIL ── */}
        <div style={sectionLabel}>PROFIL</div>
        <div style={cardGroup}>
          <button onClick={() => onNavigate('profil')} style={itemStyle}>
            <User size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>Mon profil</span>
            <span style={{ flex: 1 }} />
            <ChevronRight size={16} color={TEXT_DIM} />
          </button>
          <div style={divider} />
          <button onClick={() => onNavigate('feedback')} style={itemStyle}>
            <MessageSquare size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>Mes rapports</span>
            <span style={{ flex: 1 }} />
            {feedbackUnread > 0 && (
              <span style={{ background: GOLD, color: '#0e0e0e', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                {feedbackUnread}
              </span>
            )}
            <ChevronRight size={16} color={TEXT_DIM} />
          </button>
          <div style={divider} />
          <button onClick={() => alert('Section Objectifs : bientot disponible')} style={itemStyle}>
            <Target size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>Objectifs</span>
            <span style={{ flex: 1 }} />
            <ChevronRight size={16} color={TEXT_DIM} />
          </button>
          <div style={divider} />
          <button onClick={() => alert('Section Preferences : bientot disponible')} style={itemStyle}>
            <Settings size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>Preferences</span>
            <span style={{ flex: 1 }} />
            <ChevronRight size={16} color={TEXT_DIM} />
          </button>
        </div>

        {/* ── COMPTE ── */}
        <div style={sectionLabel}>COMPTE</div>
        <div style={cardGroup}>
          <button onClick={onLogout} style={itemStyle}>
            <LogOut size={18} color={colors.error} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: colors.error }}>Deconnexion</span>
          </button>
        </div>

      </div>
    </div>
  )
}
