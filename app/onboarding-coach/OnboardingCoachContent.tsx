'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Check, Camera, CreditCard, Upload, Copy, Sparkles, LayoutDashboard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY, GREEN } from '../../lib/design-tokens'
import { capitalizeFullName } from '@/lib/utils/capitalize-name'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

const TOTAL_STEPS = 4

// DB labels — stored as-is in profiles.coach_speciality (FR labels for retrocompat)
const SPECIALITY_DB_LABELS = ['Musculation / Hypertrophie', 'Perte de poids', 'Nutrition sportive', 'Fitness général', 'CrossFit / Fonctionnel', 'Préparation physique', 'Rééducation sportive', 'Autre']
const EXPERIENCE_DB_LABELS = ['1-2 ans', '3-5 ans', '5-10 ans', '10+ ans']
const DAYS_DB_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MAX_CLIENTS_DB_LABELS = ['5', '10', '20', '50', 'Illimité']
const FOLLOW_UP_DB_LABELS = ["Chat dans l'app", 'Appels vidéo', 'Plans personnalisés automatiques', 'Suivi hebdomadaire']

const HOURS = Array.from({ length: 15 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`)

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}
const transition = { type: 'tween' as const, duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

export default function OnboardingCoachContent() {
  const t = useTranslations('auth.onboardingCoach')
  const router = useRouter()
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [session, setSession] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [dir, setDir] = useState(1)
  const [saving, setSaving] = useState(false)

  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [speciality, setSpeciality] = useState('')
  const [certifications, setCertifications] = useState('')
  const [experience, setExperience] = useState('')

  const [maxClients, setMaxClients] = useState('')
  const [availableDays, setAvailableDays] = useState<string[]>([])
  const [hoursFrom, setHoursFrom] = useState('08:00')
  const [hoursTo, setHoursTo] = useState('20:00')
  const [followUpModes, setFollowUpModes] = useState<string[]>([])
  const [inviteLinkCopied2, setInviteLinkCopied2] = useState(false)

  const [stripeConnected, setStripeConnected] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)

  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) { router.replace('/login'); return }
      setSession(s)
      const meta = s.user.user_metadata
      if (meta?.full_name) setFullName(meta.full_name)
      if (meta?.coach_speciality) setSpeciality(meta.coach_speciality)
      if (meta?.coach_experience_years) setExperience(meta.coach_experience_years)
      supabase.from('profiles').select('*').eq('id', s.user.id).single().then(({ data }) => {
        if (!data) return
        if (data.full_name) setFullName(data.full_name)
        if (data.coach_bio) setBio(data.coach_bio)
        if (data.coach_speciality) setSpeciality(data.coach_speciality)
        if (data.coach_experience_years) setExperience(data.coach_experience_years)
        if (data.coach_certifications) setCertifications(data.coach_certifications)
        if (data.coach_max_clients) setMaxClients(String(data.coach_max_clients))
        if (data.coach_available_days) setAvailableDays(data.coach_available_days)
        if (data.coach_availability_hours) {
          setHoursFrom(data.coach_availability_hours.from || '08:00')
          setHoursTo(data.coach_availability_hours.to || '20:00')
        }
        if (data.coach_follow_up_mode) setFollowUpModes(data.coach_follow_up_mode)
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
        if (data.coach_onboarding_complete) router.replace('/')
        if (data.stripe_account_id) setStripeConnected(true)
      })
      const params = new URLSearchParams(window.location.search)
      if (params.get('stripe') === 'success') {
        const accountId = params.get('account')
        if (accountId) {
          supabase.from('profiles').update({ stripe_account_id: accountId, stripe_onboarding_complete: true }).eq('id', s.user.id)
        }
        setStripeConnected(true)
        setStep(3)
        window.history.replaceState({}, '', '/onboarding-coach')
      }
    })
  }, [])

  function goNext() { setDir(1); setStep(s => Math.min(s + 1, TOTAL_STEPS)) }
  function goBack() { setDir(-1); setStep(s => Math.max(s - 1, 1)) }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session) return
    setAvatarUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${session.user.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    }
    setAvatarUploading(false)
  }

  async function handleStripeConnect() {
    if (!session) return
    setStripeLoading(true)
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: session.user.id, email: session.user.email }),
      })
      const data = await res.json()
      if (data.url) {
        if (data.accountId) {
          await supabase.from('profiles').update({ stripe_account_id: data.accountId }).eq('id', session.user.id)
        }
        window.location.href = data.url
      } else {
        alert(t('stripe.errorGeneric') + ': ' + (data.error || ''))
        setStripeLoading(false)
      }
    } catch {
      alert(t('stripe.errorConnect'))
      setStripeLoading(false)
    }
  }

  function toggleDay(day: string) {
    setAvailableDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function toggleFollowUp(mode: string) {
    setFollowUpModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode])
  }

  async function copyInviteLink() {
    if (!session) return
    const link = `${window.location.origin}/join?coach=${session.user.id}`
    await navigator.clipboard.writeText(link)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function finish() {
    if (!session) return
    setSaving(true)
    const uid = session.user.id
    const update: Record<string, any> = {
      id: uid,
      role: 'coach',
      full_name: capitalizeFullName(fullName),
      coach_bio: bio.trim() || null,
      coach_speciality: speciality || null,
      coach_certifications: certifications.trim() || null,
      coach_experience_years: experience || null,
      coach_max_clients: maxClients === MAX_CLIENTS_DB_LABELS[4] ? 999 : maxClients ? parseInt(maxClients) : null,
      coach_available_days: availableDays.length > 0 ? availableDays : null,
      coach_availability_hours: { from: hoursFrom, to: hoursTo },
      coach_follow_up_mode: followUpModes.length > 0 ? followUpModes : null,
      coach_onboarding_complete: true,
      onboarding_completed: true,
    }
    if (avatarUrl) update.avatar_url = avatarUrl
    const { error } = await supabase.from('profiles').update(update).eq('id', uid).select()
    if (error) await supabase.from('profiles').upsert(update).select()
    const { data: check } = await supabase.from('profiles').select('coach_onboarding_complete').eq('id', uid).single()
    if (!check?.coach_onboarding_complete) {
      await supabase.from('profiles').update({ coach_onboarding_complete: true, onboarding_completed: true }).eq('id', uid)
    }
    setSaving(false)
    window.location.href = '/'
  }

  return (
    <div style={{ minHeight: '100svh', background: BG_BASE, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: FONT_BODY }}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 12, background: BORDER, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 12, background: GOLD, width: i < step ? '100%' : '0%', transition: 'width 400ms ease' }} />
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.68rem', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 600, marginTop: 6 }}>{t('nav.progress', { current: step, total: TOTAL_STEPS })}</div>
      </div>

      {step > 1 && step < 4 && (
        <button onClick={goBack} style={{ position: 'fixed', top: 36, left: 16, zIndex: 50, background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontFamily: FONT_BODY }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> {t('nav.back')}
        </button>
      )}

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence custom={dir} mode="wait">

          {/* STEP 1: Profile */}
          {step === 1 && (
            <motion.div key="s1" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '64px 24px 32px', gap: 18, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
              <div>
                <h2 style={h2Style}>{t('profile.title')}</h2>
                <p style={subStyle}>{t('profile.subtitle')}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ position: 'relative', width: 96, height: 96, borderRadius: '50%', border: `2.5px dashed ${avatarUrl ? GOLD : BORDER}`, background: avatarUrl ? 'transparent' : BG_CARD, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 200ms' }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt={t('profile.avatarAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Camera size={28} color={TEXT_MUTED} />}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${BG_BASE}` }}>
                    {avatarUploading
                      ? <div style={{ width: 12, height: 12, border: '2px solid #0004', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      : <Upload size={12} color="#000" strokeWidth={2.5} />}
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              </div>

              <div><label style={labelStyle}>{t('profile.nameLabel')}</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('profile.namePlaceholder')} style={inputStyle} /></div>

              <div><label style={labelStyle}>{t('profile.bioLabel')}</label>
                <textarea value={bio} onChange={e => { if (e.target.value.length <= 500) setBio(e.target.value) }}
                  placeholder={t('profile.bioPlaceholder')}
                  style={{ ...inputStyle, minHeight: 100, resize: 'vertical', lineHeight: 1.6 } as React.CSSProperties} />
                <div style={{ textAlign: 'right', fontSize: '0.7rem', color: bio.length > 450 ? '#EF4444' : TEXT_MUTED, marginTop: 4, fontFamily: FONT_ALT }}>{bio.length}/500</div></div>

              <div><label style={labelStyle}>{t('profile.specialityLabel')}</label>
                <select value={speciality} onChange={e => setSpeciality(e.target.value)} style={selectStyle}>
                  <option value="" style={{ background: BG_CARD, color: TEXT_MUTED }}>{t('profile.specialityPlaceholder')}</option>
                  {SPECIALITY_DB_LABELS.map((dbLabel, i) => <option key={dbLabel} value={dbLabel} style={{ background: BG_CARD, color: TEXT_PRIMARY }}>{t(`constants.specialities.${i}`)}</option>)}
                </select></div>

              <div><label style={labelStyle}>{t('profile.certificationsLabel')}</label>
                <textarea value={certifications} onChange={e => setCertifications(e.target.value)}
                  placeholder={t('profile.certificationsPlaceholder')}
                  style={{ ...inputStyle, minHeight: 60, resize: 'vertical', lineHeight: 1.5 } as React.CSSProperties} /></div>

              <div><label style={labelStyle}>{t('profile.experienceLabel')}</label>
                <select value={experience} onChange={e => setExperience(e.target.value)} style={selectStyle}>
                  <option value="" style={{ background: BG_CARD, color: TEXT_MUTED }}>{t('profile.experiencePlaceholder')}</option>
                  {EXPERIENCE_DB_LABELS.map((dbLabel, i) => <option key={dbLabel} value={dbLabel} style={{ background: BG_CARD, color: TEXT_PRIMARY }}>{t(`constants.experience.${i}`)}</option>)}
                </select></div>

              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <NextBtn onClick={goNext} disabled={!fullName.trim()} label={t('nav.next')} />
              </div>
            </motion.div>
          )}

          {/* STEP 2: Business */}
          {step === 2 && (
            <motion.div key="s2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '64px 24px 32px', gap: 18, maxWidth: 480, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
              <div>
                <h2 style={h2Style}>{t('business.title')}</h2>
                <p style={subStyle}>{t('business.subtitle')}</p>
              </div>

              <div><label style={labelStyle}>{t('business.maxClientsLabel')}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {MAX_CLIENTS_DB_LABELS.map((dbLabel, i) => {
                    const sel = maxClients === dbLabel
                    return (
                      <button key={dbLabel} onClick={() => setMaxClients(dbLabel)}
                        style={{ padding: '10px 16px', borderRadius: 12, border: `1.5px solid ${sel ? GOLD : BORDER}`, background: sel ? GOLD_DIM : BG_CARD, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, fontFamily: FONT_ALT, color: sel ? GOLD : TEXT_PRIMARY, transition: 'all 200ms' }}>
                        {t(`constants.maxClients.${i}`)}
                      </button>
                    )
                  })}
                </div></div>

              <div><label style={labelStyle}>{t('business.daysLabel')}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DAYS_DB_LABELS.map((dbLabel, i) => {
                    const sel = availableDays.includes(dbLabel)
                    return (
                      <button key={dbLabel} onClick={() => toggleDay(dbLabel)}
                        style={{ padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${sel ? GOLD : BORDER}`, background: sel ? GOLD_DIM : BG_CARD, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: FONT_ALT, color: sel ? GOLD : TEXT_PRIMARY, transition: 'all 200ms', minWidth: 44, textAlign: 'center' }}>
                        {t(`constants.days.${i}`)}
                      </button>
                    )
                  })}
                </div></div>

              <div><label style={labelStyle}>{t('business.hoursLabel')}</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <select value={hoursFrom} onChange={e => setHoursFrom(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                    {HOURS.map(h => <option key={h} value={h} style={{ background: BG_CARD, color: TEXT_PRIMARY }}>{h}</option>)}
                  </select>
                  <span style={{ color: TEXT_MUTED, fontSize: '0.85rem', fontWeight: 600, fontFamily: FONT_ALT }}>{t('business.hoursTo')}</span>
                  <select value={hoursTo} onChange={e => setHoursTo(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                    {HOURS.map(h => <option key={h} value={h} style={{ background: BG_CARD, color: TEXT_PRIMARY }}>{h}</option>)}
                  </select>
                </div></div>

              <div><label style={labelStyle}>{t('business.followUpLabel')}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {FOLLOW_UP_DB_LABELS.map((dbLabel, i) => {
                    const sel = followUpModes.includes(dbLabel)
                    return (
                      <button key={dbLabel} onClick={() => toggleFollowUp(dbLabel)}
                        style={{ padding: '12px 16px', borderRadius: RADIUS_CARD, border: `1.5px solid ${sel ? GOLD : BORDER}`, background: sel ? GOLD_DIM : BG_CARD, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 300, fontFamily: FONT_BODY, color: sel ? GOLD : TEXT_PRIMARY, transition: 'all 200ms', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 12, border: `2px solid ${sel ? GOLD : BORDER}`, background: sel ? GOLD : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 200ms' }}>
                          {sel && <Check size={12} color="#000" strokeWidth={3} />}
                        </div>
                        {t(`constants.followUpModes.${i}`)}
                      </button>
                    )
                  })}
                </div></div>

              <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: RADIUS_CARD, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: FONT_ALT, color: GOLD, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 8 }}>{t('business.businessModelTitle')}</div>
                <p style={{ fontSize: '0.85rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_PRIMARY, lineHeight: 1.6, margin: 0, opacity: 0.85 }}>{t('business.businessModelDesc')}</p>
              </div>

              {session && (
                <div>
                  <label style={labelStyle}>{t('business.inviteLinkLabel')}</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" readOnly value={`${typeof window !== 'undefined' ? window.location.origin : 'https://app.moovx.ch'}/join?coach=${session.user.id}`}
                      style={{ ...inputStyle, flex: 1, fontSize: '0.82rem', color: GOLD, background: BG_BASE }} />
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join?coach=${session.user.id}`); setInviteLinkCopied2(true); setTimeout(() => setInviteLinkCopied2(false), 2000) }}
                      style={{ padding: '12px 18px', background: inviteLinkCopied2 ? GREEN : GOLD, border: 'none', borderRadius: 12, color: BG_BASE, fontFamily: FONT_ALT, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', transition: 'background 200ms', whiteSpace: 'nowrap' }}>
                      {inviteLinkCopied2 ? t('business.inviteLinkCopied') : t('business.inviteLinkCopy')}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: TEXT_DIM, margin: '6px 0 0', fontStyle: 'italic', fontFamily: FONT_BODY, fontWeight: 300 }}>{t('business.inviteLinkNote')}</p>
                </div>
              )}

              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <NextBtn onClick={goNext} label={t('nav.next')} />
              </div>
            </motion.div>
          )}

          {/* STEP 3: Stripe */}
          {step === 3 && (
            <motion.div key="s3" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 28px 32px', gap: 24, maxWidth: 480, width: '100%', margin: '0 auto' }}>

              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                style={{ width: 80, height: 80, borderRadius: '50%', background: GOLD_DIM, border: `2px solid ${GOLD_RULE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={36} color={GOLD} strokeWidth={1.5} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ textAlign: 'center' }}>
                <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.8rem', fontWeight: 400, color: TEXT_PRIMARY, margin: '0 0 16px', letterSpacing: '2px' }}>{t('stripe.title')}</h2>
                <p style={{ color: TEXT_MUTED, fontSize: '0.88rem', fontFamily: FONT_BODY, fontWeight: 300, margin: '0 0 8px', lineHeight: 1.6 }}>{t('stripe.subtitle')}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[t('stripe.point1'), t('stripe.point2'), t('stripe.point3')].map((text, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 28, height: 28, borderRadius: '50%', background: GOLD_DIM, border: `1.5px solid ${GOLD_RULE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, fontFamily: FONT_ALT, color: GOLD }}>{i + 1}</div>
                    <p style={{ fontSize: '0.88rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.5, opacity: 0.85 }}>{text}</p>
                  </div>
                ))}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleStripeConnect} disabled={stripeLoading || stripeConnected}
                  style={{ width: '100%', padding: '16px', background: stripeConnected ? GREEN : GOLD, border: 'none', borderRadius: 12, color: stripeConnected ? '#fff' : BG_BASE, fontSize: '1rem', fontWeight: 800, fontFamily: FONT_ALT, cursor: stripeLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '2px' }}>
                  {stripeLoading ? (<><div style={{ width: 18, height: 18, border: '2px solid #0004', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> {t('stripe.connecting')}</>)
                    : stripeConnected ? (<><Check size={18} strokeWidth={2.5} /> {t('stripe.connected')}</>)
                    : t('stripe.connectButton')}
                </motion.button>
                <button onClick={goNext}
                  style={{ width: '100%', padding: '14px', background: 'transparent', border: `1.5px solid ${GOLD_RULE}`, borderRadius: 12, color: TEXT_MUTED, fontSize: '0.92rem', fontFamily: FONT_ALT, fontWeight: 600, cursor: 'pointer', transition: 'all 200ms' }}>
                  {t('stripe.later')}
                </button>
              </motion.div>

              <p style={{ color: TEXT_DIM, fontSize: '0.72rem', fontFamily: FONT_BODY, fontWeight: 300, fontStyle: 'italic', textAlign: 'center', margin: 0 }}>{t('stripe.note')}</p>
            </motion.div>
          )}

          {/* STEP 4: Welcome */}
          {step === 4 && (
            <motion.div key="s4" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px 32px', gap: 20, maxWidth: 520, width: '100%', margin: '0 auto', overflowY: 'auto' }}>

              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                style={{ width: 80, height: 80, borderRadius: '50%', background: GOLD_DIM, border: `2.5px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={40} color={GOLD} strokeWidth={2.5} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ textAlign: 'center' }}>
                <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '2.2rem', fontWeight: 400, color: TEXT_PRIMARY, margin: '0 0 6px', letterSpacing: '2px' }}>{t('welcome.title')}</h2>
                <p style={{ color: TEXT_MUTED, fontSize: '1rem', fontFamily: FONT_BODY, fontWeight: 300, margin: 0 }}>{t('welcome.subtitle')}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ width: '100%', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt={t('profile.avatarAlt')} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${GOLD_RULE}` }} />
                    : <div style={{ width: 48, height: 48, borderRadius: '50%', background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${GOLD_RULE}` }}>
                        <span style={{ fontSize: '1.2rem', color: GOLD, fontFamily: FONT_DISPLAY, fontWeight: 700 }}>{fullName.charAt(0).toUpperCase()}</span>
                      </div>}
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: FONT_BODY, color: TEXT_PRIMARY }}>{fullName || 'Coach'}</div>
                    <div style={{ fontSize: '0.78rem', color: GOLD, fontFamily: FONT_ALT, fontWeight: 600 }}>{speciality || t('welcome.defaultSpeciality')}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { l: t('welcome.experienceLabel'), v: experience || '--' },
                    { l: t('welcome.maxClientsLabel'), v: maxClients || '--' },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <div style={{ fontSize: 11, fontFamily: FONT_ALT, color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>{l}</div>
                      <div style={{ fontSize: '0.88rem', fontFamily: FONT_BODY, color: TEXT_PRIMARY, fontWeight: 600, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={copyInviteLink}
                  style={{ width: '100%', padding: '14px 16px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', transition: 'border-color 200ms' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Copy size={18} color={GOLD} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: FONT_BODY, color: TEXT_PRIMARY }}>{t('welcome.inviteTitle')}</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_MUTED }}>{linkCopied ? t('welcome.inviteCopied') : t('welcome.inviteDesc')}</div>
                  </div>
                  {linkCopied && <Check size={18} color={GREEN} />}
                </button>

                <div style={{ padding: '14px 16px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Sparkles size={18} color={GOLD} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: FONT_BODY, color: TEXT_PRIMARY }}>{t('welcome.aiPlanTitle')}</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_MUTED }}>{t('welcome.aiPlanDesc')}</div>
                  </div>
                </div>

                <div style={{ padding: '14px 16px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <LayoutDashboard size={18} color={GOLD} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: FONT_BODY, color: TEXT_PRIMARY }}>{t('welcome.dashboardTitle')}</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_MUTED }}>{t('welcome.dashboardDesc')}</div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ width: '100%' }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={finish} disabled={saving}
                  style={{ width: '100%', padding: '18px', background: saving ? BORDER : GOLD, border: 'none', borderRadius: 12, color: saving ? TEXT_MUTED : BG_BASE, fontSize: '1.1rem', fontWeight: 800, fontFamily: FONT_ALT, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '2px' }}>
                  {saving ? (<><div style={{ width: 18, height: 18, border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> {t('nav.saving')}</>)
                    : (<>{t('nav.submit')} <ChevronRight size={20} strokeWidth={2.5} /></>)}
                </motion.button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

const h2Style: React.CSSProperties = { fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 400, color: TEXT_PRIMARY, margin: '0 0 4px', letterSpacing: '2px' }
const subStyle: React.CSSProperties = { color: TEXT_MUTED, fontSize: '0.9rem', fontFamily: FONT_BODY, fontWeight: 300, margin: 0 }
const labelStyle: React.CSSProperties = { display: 'block', fontFamily: FONT_ALT, color: TEXT_MUTED, fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: '2px', textTransform: 'uppercase' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', background: BG_BASE, border: `1.5px solid ${BORDER}`, borderRadius: 12, color: TEXT_PRIMARY, fontSize: '1rem', fontFamily: FONT_BODY, fontWeight: 300, outline: 'none', transition: 'border-color 200ms, box-shadow 200ms', boxSizing: 'border-box' }
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%238A8580' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' } as React.CSSProperties

function NextBtn({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <motion.button whileTap={disabled ? {} : { scale: 0.97 }} onClick={onClick} disabled={disabled}
      style={{ width: '100%', padding: '18px', background: disabled ? BORDER : GOLD, border: 'none', borderRadius: 12, color: disabled ? TEXT_MUTED : BG_BASE, fontSize: '1.05rem', fontWeight: 800, fontFamily: FONT_ALT, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 200ms, color 200ms', letterSpacing: '2px', clipPath: disabled ? 'none' : 'polygon(0 0,100% 0,96% 100%,0 100%)' }}>
      {label} <ChevronRight size={20} strokeWidth={2.5} />
    </motion.button>
  )
}
