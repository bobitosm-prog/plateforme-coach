'use client'

import { useState, useEffect, useRef } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useTranslations } from 'next-intl'
import { MessageCircle, MessageSquare, Sparkles, User, Target, Settings, ChevronRight, Clock, UtensilsCrossed, Dumbbell, Shield } from 'lucide-react'
import { useMyFeedbackBadge } from '@/app/hooks/useMyFeedbackBadge'
import BugReport from '../BugReport'
import { getLevelFromXP } from '../../../lib/gamification'
import styles from './AccountTab.module.css'
import homeStyles from '../home-v2/HomeV2.module.css'

type Destination = 'messages' | 'coachIA' | 'profil' | 'feedback' | 'preferences' | 'account_section' | 'goals' | 'nutrition_program' | 'training_program'

interface AccountTabProps {
  firstName: string
  displayAvatar?: string
  unreadCount: number
  supabase: SupabaseClient | null
  userId?: string
  session: Session | null
  onNavigate: (tab: Destination) => void
  isInTrial?: boolean
  trialDaysLeft?: number
  isInBeta?: boolean
  betaDaysLeft?: number
  focusPrograms?: boolean
}

function AccountLink({ icon: Icon, title, description, badge, onClick, prominent = false }: {
  icon: typeof User
  title: string
  description?: string
  badge?: number
  onClick: () => void
  prominent?: boolean
}) {
  const t = useTranslations('account')
  return <button type="button" className={`${styles.link} ${prominent ? styles.prominent : ''}`} onClick={onClick}>
    <span className={styles.linkIcon}><Icon size={22} strokeWidth={2} aria-hidden="true" /></span>
    <span className={styles.linkText}><strong>{title}</strong>{description && <small>{description}</small>}</span>
    {badge !== undefined && badge > 0 && <span className={styles.badge} aria-label={t('unread', { count: badge })}>{badge}</span>}
    <ChevronRight size={20} className={styles.chevron} aria-hidden="true" />
  </button>
}

export default function AccountTab({
  firstName, displayAvatar, unreadCount, supabase, userId, onNavigate,
  session, isInTrial, trialDaysLeft, isInBeta, betaDaysLeft, focusPrograms = false,
}: AccountTabProps) {
  const t = useTranslations('account')
  const [xpData, setXpData] = useState<{ total_xp: number } | null>(null)
  const [bugReportOpen, setBugReportOpen] = useState(false)
  const programsHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!supabase || !userId) return
    let active = true
    supabase.from('user_xp').select('total_xp').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (active && data) setXpData(data) })
    return () => { active = false }
  }, [supabase, userId])

  useEffect(() => {
    if (!focusPrograms) return
    programsHeadingRef.current?.scrollIntoView?.({ block: 'start' })
    programsHeadingRef.current?.focus({ preventScroll: true })
  }, [focusPrograms])

  const feedbackUnread = useMyFeedbackBadge()
  const xp = xpData?.total_xp || 0
  const { level, xpForNext, xpInLevel } = getLevelFromXP(xp)
  const progress = xpForNext > 0 ? Math.min(100, xpInLevel / xpForNext * 100) : 0

  return <div className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.header}><h1 className={homeStyles.title}>{t('titleLead')}<br /><em>{t('titleAccent')}</em></h1></header>

      <section className={styles.identity} aria-label={t('myProfile')}>
        <div className={styles.identityTop}>
          <span className={styles.avatar}>{displayAvatar
            ? <img src={displayAvatar} alt="" />
            : firstName?.[0]?.toUpperCase() || '?'}</span>
          <div className={styles.identityName}><strong>{firstName}</strong><span>{t('level', { level })}</span></div>
          <button type="button" className={styles.profileShortcut} onClick={() => onNavigate('profil')} aria-label={t('myProfile')}><ChevronRight size={22} aria-hidden="true" /></button>
        </div>
        <div className={styles.xpLine}><span>{xp.toLocaleString()} XP</span><span>{xpInLevel} / {xpForNext} XP</span></div>
        <div className={styles.xpTrack} role="progressbar" aria-label={t('xpProgress')} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div>
      </section>

      {(isInBeta || isInTrial) && <div className={styles.accessNotice}><Clock size={18} aria-hidden="true" /><span>{t(isInBeta ? 'betaAccess' : 'trialPeriod')} · {t('daysLeft', { count: isInBeta ? betaDaysLeft ?? 0 : trialDaysLeft ?? 0 })}</span></div>}

      <section className={styles.card} aria-labelledby="account-programs">
        <h2 ref={programsHeadingRef} tabIndex={-1} id="account-programs" className={styles.sectionTitle}>{t('programs')}</h2>
        <div className={styles.programGrid}>
          <AccountLink prominent icon={UtensilsCrossed} title={t('nutritionProgram')} description={t('nutritionProgramDescription')} onClick={() => onNavigate('nutrition_program')} />
          <AccountLink prominent icon={Dumbbell} title={t('trainingProgram')} description={t('trainingProgramDescription')} onClick={() => onNavigate('training_program')} />
        </div>
      </section>

      <section className={styles.card} aria-labelledby="account-profile">
        <h2 id="account-profile" className={styles.sectionTitle}>{t('settingsTitle')}</h2>
        <div className={styles.linkGrid}>
          <AccountLink icon={User} title={t('myProfile')} description={t('profileDescription')} onClick={() => onNavigate('profil')} />
          <AccountLink icon={Target} title={t('goals')} description={t('goalsDescription')} onClick={() => onNavigate('goals')} />
          <AccountLink icon={Settings} title={t('preferences')} description={t('preferencesDescription')} onClick={() => onNavigate('preferences')} />
          <AccountLink icon={Shield} title={t('accessTitle')} description={t('accessDescription')} onClick={() => onNavigate('account_section')} />
        </div>
      </section>

      <section className={styles.card} aria-labelledby="account-coaching">
        <h2 id="account-coaching" className={styles.sectionTitle}>{t('coaching')}</h2>
        <div className={styles.linkGrid}>
          <AccountLink icon={MessageCircle} title={t('messages')} badge={unreadCount} onClick={() => onNavigate('messages')} />
          <AccountLink icon={Sparkles} title="Athena" description={t('athenaDescription')} onClick={() => onNavigate('coachIA')} />
        </div>
      </section>

      <section className={styles.card} aria-labelledby="account-help">
        <h2 id="account-help" className={styles.sectionTitle}>{t('helpTitle')}</h2>
        <AccountLink icon={MessageSquare} title={t('reportProblem')} description={t('reportProblemDescription')} badge={feedbackUnread} onClick={() => setBugReportOpen(true)} />
      </section>

      <BugReport session={session} open={bugReportOpen} onOpenChange={setBugReportOpen} />
    </div>
  </div>
}
