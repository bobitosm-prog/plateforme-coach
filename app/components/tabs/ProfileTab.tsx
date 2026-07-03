'use client'
import React, { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Zap, ChevronRight, Crown, Clock, Calendar, User, Cake, Ruler, Target, Activity, ArrowLeft } from 'lucide-react'
import { colors, fonts, titleStyle, titleLineStyle, subtitleStyle, statSmallStyle, bodyStyle, labelStyle, mutedStyle, pageTitleStyle, cardStyle, cardTitleAbove, radii } from '../../../lib/design-tokens'
import { updateProfile } from '../../../lib/profile-service'
import SwissBadge from '../ui/SwissBadge'
import CoachSection from './profile/CoachSection'
import BadgesModal from '../BadgesModal'
import BadgeCelebration from '../BadgeCelebration'
import { checkAndUnlockBadges, type Badge } from '../../../lib/check-badges'
import { getLevelFromXP } from '../../../lib/gamification'

interface ProfileTabProps {
  supabase: any
  session: any
  profile: any
  displayAvatar: string | undefined
  fullName: string
  firstName: string
  avatarRef: React.RefObject<HTMLInputElement | null>
  uploadAvatar: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  currentWeight: number | undefined
  goalWeight: number | null
  calorieGoal: number
  coachProgram: any
  coachId: string | null
  setModal: (modal: string) => void
  fetchAll: () => Promise<void>
  regenerateWeekSchedule: () => Promise<void>
  onBack?: () => void
}

export default function ProfileTab({
  supabase, session, profile, displayAvatar, fullName, firstName, avatarRef, uploadAvatar,
  currentWeight, goalWeight, calorieGoal, coachProgram, coachId, setModal, fetchAll,
  regenerateWeekSchedule, onBack,
}: ProfileTabProps) {
  const t = useTranslations('profile')
  const locale = useLocale()
  const [phoneForm, setPhoneForm] = useState<string>(profile?.phone || '')
  const [phoneEditing, setPhoneEditing] = useState(false)
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<Set<string>>(new Set())
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [totalXp, setTotalXp] = useState(0)
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({})
  const [showBadgesModal, setShowBadgesModal] = useState(false)
  const [celebrateBadge, setCelebrateBadge] = useState<Badge | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return
    const uid = session.user.id

    async function loadAndCheck() {
      // 1. Snapshot BEFORE — get existing badge IDs
      const { data: beforeBadges } = await supabase.from('user_badges').select('badge_id').eq('user_id', uid)
      const beforeIds = new Set<string>((beforeBadges || []).map((b: any) => b.badge_id).filter(Boolean))

      // 2. Run badge check (unlocks new ones)
      const { currentValues: cv } = await checkAndUnlockBadges(uid, supabase)
      setCurrentValues(cv)

      // 3. Refetch AFTER — get full state
      const [bRes, uRes, xRes] = await Promise.all([
        supabase.from('badges').select('*').order('sort_order'),
        supabase.from('user_badges').select('badge_id, badge_type, celebrated').eq('user_id', uid).limit(100),
        supabase.from('user_xp').select('total_xp').eq('user_id', uid).maybeSingle(),
      ])
      setAllBadges(bRes.data || [])
      const afterIds = new Set<string>((uRes.data || []).map((u: any) => u.badge_id || u.badge_type).filter(Boolean))
      setUnlockedBadgeIds(afterIds)
      setTotalXp(xRes.data?.total_xp || 0)

      // 4. Find truly new badges (in after but not in before) AND uncelebrated
      const uncelebrated = (uRes.data || []).filter((u: any) => u.celebrated === false && u.badge_id && !beforeIds.has(u.badge_id))
      if (uncelebrated.length > 0 && bRes.data) {
        const badgeToShow = (bRes.data as Badge[]).find(b => b.id === uncelebrated[0].badge_id)
        if (badgeToShow) setCelebrateBadge(badgeToShow)
      }
    }
    loadAndCheck()
  }, [session?.user?.id])

  async function savePhone() {
    await updateProfile(session.user.id, { phone: phoneForm }, supabase)
    setPhoneEditing(false)
    fetchAll()
  }

  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', cursor: 'pointer' }
  const iconBoxStyle: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, background: colors.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  const separatorStyle: React.CSSProperties = { height: 0.5, background: colors.goldDim }


  return (
    <div style={{ padding: '20px 20px 120px', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>

      {/* Back button */}
      {onBack && (
        <button onClick={onBack} aria-label={t('badges.backToAccount')} style={{ padding: '8px 0', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: colors.gold }}>
          <ArrowLeft size={18} />
          <span style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{t('badges.backToAccount')}</span>
        </button>
      )}

      {/* ═══ SECTION 1 — PROFIL HEADER ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <button onClick={() => avatarRef.current?.click()} style={{ width: 80, height: 80, borderRadius: '50%', background: displayAvatar ? 'transparent' : colors.surfaceHigh, border: `2px solid ${colors.goldContainer}4d`, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            {displayAvatar
              ? <img src={displayAvatar} style={{ width: 80, height: 80, objectFit: 'cover' }} alt={t('avatarAlt')} />
              : <span style={{ fontFamily: fonts.headline, fontWeight: 700, fontSize: 32, color: colors.gold }}>{firstName.charAt(0).toUpperCase()}</span>}
          </button>
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => avatarRef.current?.click()}>
            <span style={{ fontSize: 12, color: colors.background, fontWeight: 700, lineHeight: 1 }}>+</span>
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
        <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 700, color: colors.text, letterSpacing: '0.12em', textTransform: 'uppercase' as const, textAlign: 'center', marginBottom: 4 }}>{fullName}</div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10 }}>{session.user.email}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 8, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, border: `1px solid ${colors.goldContainer}33`, borderRadius: 999, padding: '4px 10px', letterSpacing: '0.08em' }}>{t('header.swissMade')}</span>
          {profile?.fitness_level && (
            <span style={{ fontSize: 8, fontFamily: fonts.headline, fontWeight: 700, color: colors.gold, background: colors.goldBorder, border: `1px solid ${colors.gold}4d`, borderRadius: 999, padding: '4px 10px', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{profile.fitness_level}</span>
          )}
        </div>
        {profile?.created_at && (
          <div style={{ fontSize: 8, color: colors.textMuted, letterSpacing: '0.1em' }}>
            {t('header.memberSince', { date: new Date(profile.created_at).toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase() })}
          </div>
        )}
      </div>

      {/* ═══ SECTION 2 — STATS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: t('stats.weight'), value: currentWeight || '—', color: colors.gold },
          { label: t('stats.goal'), value: goalWeight || '—', color: colors.text },
          { label: t('stats.kcal'), value: calorieGoal || '—', color: colors.gold },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, padding: 14, textAlign: 'center' }}>
            <div style={{ fontFamily: fonts.headline, fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ SECTION 3 — MON PROFIL ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={cardTitleAbove}>{t('sections.myProfile')}</span>
        <div style={titleLineStyle} />
      </div>
      <div style={{ ...cardStyle, padding: '4px 16px', marginBottom: 24 }}>
        {[
          { icon: User, label: t('fields.firstName'), value: firstName },
          { icon: Cake, label: t('fields.birthDate'), value: profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString(locale) : '—' },
          { icon: User, label: t('fields.gender'), value: profile?.gender === 'male' ? t('fields.male') : profile?.gender === 'female' ? t('fields.female') : '—' },
          { icon: Ruler, label: t('fields.height'), value: profile?.height ? `${profile.height} cm` : '—' },
          { icon: Target, label: t('fields.goalWeight'), value: goalWeight ? `${goalWeight} kg` : '—' },
          { icon: Target, label: t('fields.objective'), value: ({ mass: t('fields.objectives.mass'), cut: t('fields.objectives.cut'), maintain: t('fields.objectives.maintain') } as Record<string, string>)[profile?.objective] || profile?.objective || '—', action: 'objective' },
          { icon: Activity, label: t('fields.activityLevel'), value: ({ sedentary: t('fields.activityLevels.sedentary'), light: t('fields.activityLevels.light'), moderate: t('fields.activityLevels.moderate'), active: t('fields.activityLevels.active'), extreme: t('fields.activityLevels.extreme') } as Record<string, string>)[profile?.activity_level] || profile?.activity_level || '—', action: 'objective' },
        ].map((row, i, arr) => (
          <React.Fragment key={row.label}>
            <div style={rowStyle} onClick={'action' in row ? () => setModal(row.action as string) : undefined}>
              <div style={iconBoxStyle}><row.icon size={14} color={colors.gold} /></div>
              <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>{row.label}</span>
              <span style={{ fontSize: 12, color: colors.textMuted }}>{row.value}</span>
              <ChevronRight size={12} color="rgba(255,255,255,0.15)" />
            </div>
            {i < arr.length - 1 && <div style={separatorStyle} />}
          </React.Fragment>
        ))}
      </div>

      {/* ═══ SECTION 4 — TÉLÉPHONE ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={cardTitleAbove}>{t('sections.phone')}</span>
        <div style={titleLineStyle} />
      </div>
      <div style={{ ...cardStyle, padding: '14px 16px', marginBottom: 24 }}>
        {phoneEditing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="tel" value={phoneForm} onChange={e => setPhoneForm(e.target.value)} placeholder={t('phone.placeholder')}
              style={{ flex: 1, background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: radii.button, padding: '8px 12px', color: colors.text, fontSize: 14, outline: 'none', fontFamily: fonts.body }} />
            <button onClick={savePhone} style={{ background: colors.gold, border: 'none', borderRadius: radii.button, padding: '8px 14px', color: colors.onGold, fontFamily: fonts.headline, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>OK</button>
            <button onClick={() => { setPhoneEditing(false); setPhoneForm(profile?.phone || '') }} style={{ background: colors.surfaceHigh, border: 'none', borderRadius: radii.button, padding: '8px 12px', color: colors.textMuted, fontSize: 12, cursor: 'pointer' }}>✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: profile?.phone ? colors.text : colors.textMuted }}>{profile?.phone || t('phone.addNumber')}</span>
            <button onClick={() => setPhoneEditing(true)} style={{ background: 'transparent', border: `1px solid ${colors.goldBorder}`, borderRadius: radii.button, padding: '4px 10px', color: colors.textMuted, fontSize: 10, cursor: 'pointer', fontFamily: fonts.headline, fontWeight: 700 }}>{t('phone.edit')}</button>
          </div>
        )}
      </div>

      {/* ═══ SECTION 5 — OUTILS ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={cardTitleAbove}>{t('sections.tools')}</span>
        <div style={titleLineStyle} />
      </div>
      <div style={{ ...cardStyle, padding: '4px 16px', marginBottom: 24 }}>
        <div style={rowStyle} onClick={() => setModal('bmr')}>
          <div style={iconBoxStyle}><Zap size={14} color={colors.gold} /></div>
          <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>{t('tools.bmrCalculator')}</span>
          <ChevronRight size={12} color="rgba(255,255,255,0.15)" />
        </div>
        {coachProgram && (
          <>
            <div style={separatorStyle} />
            <div style={rowStyle} onClick={regenerateWeekSchedule}>
              <div style={iconBoxStyle}><Calendar size={14} color={colors.gold} /></div>
              <span style={{ flex: 1, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>{t('tools.regenerateSchedule')}</span>
              <ChevronRight size={12} color="rgba(255,255,255,0.15)" />
            </div>
          </>
        )}
      </div>

      {/* ═══ SECTION 7 — MON COACH ═══ */}
      {coachProgram && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={cardTitleAbove}>{t('sections.myCoach')}</span>
            <div style={titleLineStyle} />
          </div>
          <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Crown size={18} color={colors.gold} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 700, color: colors.text }}>Coach</div>
                <div style={{ ...mutedStyle, fontSize: 10 }}>{t('coach.activeStatus')}</div>
              </div>
              <span style={{ fontSize: 9, fontFamily: fonts.headline, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 999, padding: '4px 8px' }}>{t('coach.active')}</span>
            </div>
          </div>
        </>
      )}


      {/* ═══ SECTION 10 — MES BADGES ═══ */}
      {(() => {
        const earnedBadges = allBadges.filter(b => unlockedBadgeIds.has(b.id))
        const lastThree = earnedBadges.slice(-3)
        const EMOJIS: Record<string, string> = { star: '⭐', grid: '📊', home: '🏠', clock: '⏱️', 'star-big': '🌟', chart: '📈', doc: '📝', list: '📋', scan: '📷', target: '🎯', flame: '🔥', 'flame-plus': '💪', 'flame-star': '🏆', 'flame-crown': '👑', 'flame-legend': '🏅', camera: '📸', share: '🔗', users: '👥', crown: '👑' }
        const level = getLevelFromXP(totalXp)
        return (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={cardTitleAbove}>{t('sections.badges')}</span>
              <div style={titleLineStyle} />
              <span style={{ ...labelStyle, fontSize: 10 }}>{earnedBadges.length}/{allBadges.length}</span>
              <button onClick={() => setShowBadgesModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: colors.gold, letterSpacing: '0.08em' }}>{t('badges.viewAll')}</button>
            </div>
            <div style={{ ...cardStyle, padding: 16, marginBottom: 8 }}>
              {/* Level bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 800, color: colors.gold }}>LV.{level.level}</span>
                <div style={{ flex: 1, height: 4, background: `${colors.gold}1a`, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(level.progress * 100)}%`, height: '100%', background: colors.gold, borderRadius: 999 }} />
                </div>
                <span style={{ fontFamily: fonts.headline, fontSize: 9, fontWeight: 700, color: colors.gold }}>{totalXp} XP</span>
              </div>
              {/* Last 3 earned */}
              {lastThree.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {lastThree.map(b => (
                    <div key={b.id} style={{ background: colors.goldDim, border: `1px solid ${colors.gold}4d`, borderRadius: 12, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, marginBottom: 3 }}>{EMOJIS[b.icon] || '🏆'}</div>
                      <div style={{ fontFamily: fonts.headline, fontSize: 7, fontWeight: 700, color: colors.text, letterSpacing: '0.05em' }}>{b.name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <span style={{ fontSize: 10, color: colors.textMuted }}>{t('badges.emptyState')}</span>
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* Badges fullscreen modal */}
      {showBadgesModal && (
        <BadgesModal allBadges={allBadges} unlockedIds={unlockedBadgeIds} totalXp={totalXp} currentValues={currentValues} onClose={() => setShowBadgesModal(false)} />
      )}

      {/* Badge celebration */}
      {celebrateBadge && (
        <BadgeCelebration badge={celebrateBadge} xp={celebrateBadge.xp_reward} onClose={async () => {
          // Mark ALL uncelebrated badges as celebrated (belt and suspenders)
          await supabase.from('user_badges').update({ celebrated: true }).eq('user_id', session.user.id).eq('celebrated', false)
          setCelebrateBadge(null)
        }} />
      )}

    </div>
  )
}
