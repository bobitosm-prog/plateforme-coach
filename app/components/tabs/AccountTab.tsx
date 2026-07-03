'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { MessageCircle, MessageSquare, Sparkles, User, Target, Settings, ChevronRight, Clock } from 'lucide-react'
import { useMyFeedbackBadge } from '@/app/hooks/useMyFeedbackBadge'
import { colors, fonts, cardStyle, radii } from '../../../lib/design-tokens'
import { getLevelFromXP } from '../../../lib/gamification'
import SectionTitle from '../ui/SectionTitle'

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
  onNavigate: (tab: 'messages' | 'coachIA' | 'profil' | 'feedback' | 'preferences' | 'account_section') => void
  isInTrial?: boolean
  trialDaysLeft?: number
  isInBeta?: boolean
  betaDaysLeft?: number
}

const menuCard: React.CSSProperties = {
  ...cardStyle,
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
  firstName, displayAvatar, unreadCount, supabase, userId, onNavigate,
  isInTrial, trialDaysLeft, isInBeta, betaDaysLeft,
}: AccountTabProps) {
  const t = useTranslations('account')
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
          ...cardStyle, padding: 20,
          marginBottom: 24,
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
              {t('level', { level })} &bull; {xpInLevel} / {xpForNext} XP
            </div>
          </div>
        </div>

        {isInBeta && (
          <div style={{
            ...cardStyle, padding: '14px 16px',
            marginBottom: 24, border: `1px solid ${GOLD}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Clock size={18} color={GOLD} />
            <div>
              <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase' }}>
                {t('betaAccess')}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_PRIMARY, marginTop: 2 }}>
                {t('daysLeft', { count: betaDaysLeft ?? 0 })}
              </div>
            </div>
          </div>
        )}

        {/* ── COACHING ── */}
        <SectionTitle noPadding title={t('coaching')} />
        <div style={menuCard}>
          <button onClick={() => onNavigate('messages')} style={itemStyle}>
            <MessageCircle size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>{t('messages')}</span>
            <span style={{ flex: 1 }} />
            {unreadCount > 0 && (
              <span style={{ background: GOLD, color: colors.onGold, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
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
        <SectionTitle noPadding title={t('profile')} />
        <div style={menuCard}>
          <button onClick={() => onNavigate('profil')} style={itemStyle}>
            <User size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>{t('myProfile')}</span>
            <span style={{ flex: 1 }} />
            <ChevronRight size={16} color={TEXT_DIM} />
          </button>
          <div style={divider} />
          <button onClick={() => onNavigate('feedback')} style={itemStyle}>
            <MessageSquare size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>{t('myReports')}</span>
            <span style={{ flex: 1 }} />
            {feedbackUnread > 0 && (
              <span style={{ background: GOLD, color: colors.onGold, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                {feedbackUnread}
              </span>
            )}
            <ChevronRight size={16} color={TEXT_DIM} />
          </button>
          <div style={divider} />
          <button onClick={() => alert(t('goalsSoon'))} style={itemStyle}>
            <Target size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>{t('goals')}</span>
            <span style={{ flex: 1 }} />
            <ChevronRight size={16} color={TEXT_DIM} />
          </button>
          <div style={divider} />
          <button onClick={() => onNavigate('preferences')} style={itemStyle}>
            <Settings size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>{t('preferences')}</span>
            <span style={{ flex: 1 }} />
            <ChevronRight size={16} color={TEXT_DIM} />
          </button>
        </div>

        {/* ── COMPTE ── */}
        <SectionTitle noPadding title={t('accountSection')} />
        <div style={menuCard}>
          <button onClick={() => onNavigate('account_section')} style={itemStyle}>
            <Settings size={18} color={GOLD} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>{t('accountSection')}</span>
            <span style={{ flex: 1 }} />
            <ChevronRight size={16} color={TEXT_DIM} />
          </button>
        </div>

      </div>
    </div>
  )
}
