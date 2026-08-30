'use client'

import { createBrowserClient } from '@supabase/ssr'
import { Camera, Check, ChevronLeft, CreditCard } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { capitalizeFullName } from '@/lib/utils/capitalize-name'
import styles from './OnboardingCoachContent.module.css'

const TOTAL_STEPS = 4
const SPECIALITY_DB_LABELS = ['Musculation / Hypertrophie', 'Perte de poids', 'Nutrition sportive', 'Fitness général', 'CrossFit / Fonctionnel', 'Préparation physique', 'Rééducation sportive', 'Autre']
const EXPERIENCE_DB_LABELS = ['1-2 ans', '3-5 ans', '5-10 ans', '10+ ans']
const DAYS_DB_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MAX_CLIENTS_DB_LABELS = ['5', '10', '20', '50', 'Illimité']
const FOLLOW_UP_DB_LABELS = ["Chat dans l'app", 'Appels vidéo', 'Plans personnalisés automatiques', 'Suivi hebdomadaire']
const HOURS = Array.from({ length: 15 }, (_, index) => `${String(index + 6).padStart(2, '0')}:00`)
type Answers = Record<string, unknown>
type Translate = (key: string, values?: Record<string, string | number>) => string

export default function OnboardingCoachContent() {
  const rawT = useTranslations('auth.onboardingCoach')
  const t: Translate = useCallback((key, values) => (rawT as Translate)(key, values), [rawT])
  const router = useRouter()
  const supabase = useRef(createBrowserClient((process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(), (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim())).current
  const answersRef = useRef<Answers>({})
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [step, setStep] = useState(1)
  const [editingFromSummary, setEditingFromSummary] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fatal, setFatal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stripeError, setStripeError] = useState<string | null>(null)
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
  const [stripeConnected, setStripeConnected] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    void (async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) { if (mounted) { setFatal(true); setLoading(false) }; return }
      if (!session) { router.replace('/login'); return }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role,coach_onboarding_complete,full_name,coach_bio,coach_speciality,coach_experience_years,coach_certifications,coach_max_clients,coach_available_days,coach_availability_hours,coach_follow_up_mode,avatar_url,stripe_account_id,onboarding_answers').eq('id', session.user.id).single()
      if (!mounted) return
      if (profileError || !profile || profile.role !== 'coach') { setFatal(true); setLoading(false); return }
      if (profile.coach_onboarding_complete) { router.replace('/'); return }
      setUserId(session.user.id); setUserEmail(session.user.email || '')
      setFullName(profile.full_name || session.user.user_metadata?.full_name || '')
      setBio(profile.coach_bio || ''); setSpeciality(profile.coach_speciality || '')
      setExperience(profile.coach_experience_years || ''); setCertifications(profile.coach_certifications || '')
      setMaxClients(profile.coach_max_clients === 999 ? 'Illimité' : profile.coach_max_clients ? String(profile.coach_max_clients) : '')
      setAvailableDays(Array.isArray(profile.coach_available_days) ? profile.coach_available_days : [])
      const availability = profile.coach_availability_hours as { from?: string; to?: string } | null
      setHoursFrom(availability?.from || '08:00'); setHoursTo(availability?.to || '20:00')
      setFollowUpModes(Array.isArray(profile.coach_follow_up_mode) ? profile.coach_follow_up_mode : [])
      setAvatarUrl(profile.avatar_url || ''); setStripeConnected(Boolean(profile.stripe_account_id))
      const answers = profile.onboarding_answers && typeof profile.onboarding_answers === 'object' ? profile.onboarding_answers as Answers : {}
      answersRef.current = answers
      const restored = typeof answers.coach_onboarding_step === 'number' ? answers.coach_onboarding_step : 1
      const params = new URLSearchParams(window.location.search)
      if (params.get('stripe') === 'success') {
        const accountId = params.get('account')
        if (accountId) {
          const { error: stripeSaveError } = await supabase.from('profiles').update({ stripe_account_id: accountId, stripe_onboarding_complete: true }).eq('id', session.user.id)
          if (stripeSaveError) setStripeError(t('redesign.errors.stripe'))
          else setStripeConnected(true)
        }
        window.history.replaceState({}, '', '/onboarding-coach')
      }
      setStep(Math.min(TOTAL_STEPS, Math.max(1, params.get('stripe') === 'success' ? 3 : restored)))
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [router, supabase, t])

  async function update(fields: Record<string, unknown>, resumeStep: number) {
    if (!userId) return false
    const answers = { ...answersRef.current, coach_onboarding_step: resumeStep }
    const { error: saveError } = await supabase.from('profiles').update({ ...fields, onboarding_answers: answers }).eq('id', userId)
    if (saveError) return false
    answersRef.current = answers
    return true
  }

  function profileFields() {
    const fields: Record<string, unknown> = {
      full_name: capitalizeFullName(fullName), coach_bio: bio.trim() || null,
      coach_speciality: speciality || null, coach_certifications: certifications.trim() || null,
      coach_experience_years: experience || null,
    }
    if (avatarUrl) fields.avatar_url = avatarUrl
    return fields
  }

  function coachingFields() {
    return {
      coach_max_clients: maxClients === 'Illimité' ? 999 : maxClients ? Number(maxClients) : null,
      coach_available_days: availableDays.length ? availableDays : null,
      coach_availability_hours: { from: hoursFrom, to: hoursTo },
      coach_follow_up_mode: followUpModes.length ? followUpModes : null,
    }
  }

  async function saveCurrentStep() {
    const resume = editingFromSummary ? TOTAL_STEPS : Math.min(step + 1, TOTAL_STEPS)
    if (step === 1) return update(profileFields(), resume)
    if (step === 2) return update(coachingFields(), resume)
    if (step === 3) return update({}, resume)
    return finalize()
  }

  async function finalize() {
    if (!userId) return false
    const answers = { ...answersRef.current, coach_onboarding_step: TOTAL_STEPS }
    const { error: finalError } = await supabase.from('profiles').update({
      ...profileFields(), ...coachingFields(), onboarding_answers: answers,
      coach_onboarding_complete: true, onboarding_completed: true,
    }).eq('id', userId)
    if (finalError) return false
    const { data: confirmation, error: confirmError } = await supabase.from('profiles').select('role,coach_onboarding_complete').eq('id', userId).single()
    if (confirmError || confirmation?.role !== 'coach' || confirmation.coach_onboarding_complete !== true) return false
    answersRef.current = answers
    return true
  }

  async function handleNext() {
    setSaving(true); setError(null)
    try {
      if (!await saveCurrentStep()) { setError(t('redesign.errors.save')); return }
      if (step === TOTAL_STEPS) { router.replace('/'); return }
      if (editingFromSummary) { setEditingFromSummary(false); setStep(TOTAL_STEPS); return }
      setStep(current => current + 1)
    } finally { setSaving(false) }
  }

  function goBack() {
    if (editingFromSummary) { setEditingFromSummary(false); setStep(TOTAL_STEPS); void update({}, TOTAL_STEPS); return }
    const target = Math.max(1, step - 1); setStep(target); void update({}, target)
  }

  function edit(target: number) { setEditingFromSummary(true); setStep(target); void update({}, target) }
  function toggleDay(day: string) { setAvailableDays(days => days.includes(day) ? days.filter(value => value !== day) : [...days, day]) }
  function toggleFollowUp(mode: string) { setFollowUpModes(modes => modes.includes(mode) ? modes.filter(value => value !== mode) : [...modes, mode]) }

  async function handleAvatarUpload(file: File) {
    if (!userId) return
    setAvatarUploading(true); setError(null)
    try {
      const path = `avatars/${userId}.${file.name.split('.').pop() || 'jpg'}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      if (!await update({ avatar_url: publicUrl }, step)) throw new Error('avatar-save')
      setAvatarUrl(publicUrl)
    } catch { setError(t('redesign.errors.avatar')) } finally { setAvatarUploading(false) }
  }

  async function handleStripeConnect() {
    if (!userId) return
    setStripeLoading(true); setStripeError(null)
    try {
      if (!await update({}, 3)) throw new Error('resume-save')
      const response = await fetch('/api/stripe/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coachId: userId, email: userEmail }) })
      const payload = await response.json()
      if (!response.ok || !payload.url) throw new Error('provider')
      if (payload.accountId) {
        const { error: accountError } = await supabase.from('profiles').update({ stripe_account_id: payload.accountId }).eq('id', userId)
        if (accountError) throw accountError
      }
      window.location.assign(payload.url)
    } catch { setStripeError(t('redesign.errors.stripe')); setStripeLoading(false) }
  }

  if (loading) return <main className={styles.shell}><p role="status">{t('redesign.loading')}</p></main>
  if (fatal) return <main className={styles.shell}><div className={styles.error} role="alert"><p>{t('redesign.errors.profile')}</p><button type="button" onClick={() => window.location.reload()}>{t('redesign.retry')}</button></div></main>
  const valid = step !== 1 || fullName.trim().length >= 2

  return <main className={styles.shell}><section className={styles.app} aria-label={t('redesign.a11y.flow')}>
    <header className={styles.header}><div><strong>MoovX</strong><span>{t('redesign.step', { current: step, total: TOTAL_STEPS })}</span></div><ol aria-label={t('redesign.a11y.progress')}>{Array.from({ length: TOTAL_STEPS }, (_, index) => <li key={index} className={index < step ? styles.active : undefined} aria-current={index + 1 === step ? 'step' : undefined} />)}</ol></header>
    <div className={styles.content}>
      {step === 1 && <><Title title={t('redesign.profile.title')} subtitle={t('redesign.profile.subtitle')} />
        <button type="button" className={styles.avatar} onClick={() => avatarInputRef.current?.click()} aria-label={t('profile.avatarAlt')}>{avatarUrl ? <CoachAvatar src={avatarUrl} /> : <Camera aria-hidden="true" />}{avatarUploading && <span role="status">…</span>}</button>
        <input ref={avatarInputRef} className={styles.hidden} type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) void handleAvatarUpload(file) }} />
        <div className={styles.form}><Field id="coach-name" label={t('profile.nameLabel')} value={fullName} onChange={setFullName} /><Field id="coach-bio" label={t('profile.bioLabel')} value={bio} onChange={value => setBio(value.slice(0, 500))} multiline /><Select id="coach-speciality" label={t('profile.specialityLabel')} value={speciality} onChange={setSpeciality} options={SPECIALITY_DB_LABELS} labels={SPECIALITY_DB_LABELS.map((_, index) => t(`constants.specialities.${index}`))} placeholder={t('profile.specialityPlaceholder')} /><Field id="coach-certifications" label={t('profile.certificationsLabel')} value={certifications} onChange={setCertifications} multiline /><Select id="coach-experience" label={t('profile.experienceLabel')} value={experience} onChange={setExperience} options={EXPERIENCE_DB_LABELS} labels={EXPERIENCE_DB_LABELS.map((_, index) => t(`constants.experience.${index}`))} placeholder={t('profile.experiencePlaceholder')} /></div></>}
      {step === 2 && <><Title title={t('redesign.coaching.title')} subtitle={t('redesign.coaching.subtitle')} /><Group title={t('business.maxClientsLabel')}><Choices options={MAX_CLIENTS_DB_LABELS} selected={maxClients ? [maxClients] : []} labels={MAX_CLIENTS_DB_LABELS.map((_, index) => t(`constants.maxClients.${index}`))} toggle={setMaxClients} /></Group><Group title={t('business.daysLabel')}><Choices options={DAYS_DB_LABELS} selected={availableDays} labels={DAYS_DB_LABELS.map((_, index) => t(`constants.days.${index}`))} toggle={toggleDay} /></Group><Group title={t('business.hoursLabel')}><div className={styles.hours}><SelectBare value={hoursFrom} onChange={setHoursFrom} options={HOURS} /><span>{t('business.hoursTo')}</span><SelectBare value={hoursTo} onChange={setHoursTo} options={HOURS} /></div></Group><Group title={t('business.followUpLabel')}><Choices options={FOLLOW_UP_DB_LABELS} selected={followUpModes} labels={FOLLOW_UP_DB_LABELS.map((_, index) => t(`constants.followUpModes.${index}`))} toggle={toggleFollowUp} stacked /></Group></>}
      {step === 3 && <><Title title={t('redesign.stripe.title')} subtitle={t('redesign.stripe.subtitle')} /><section className={styles.stripe}><CreditCard aria-hidden="true" /><strong>{stripeConnected ? t('stripe.connected') : t('redesign.stripe.optional')}</strong><p>{t('stripe.note')}</p><button type="button" className={styles.secondary} disabled={stripeLoading || stripeConnected} onClick={() => void handleStripeConnect()}>{stripeLoading ? t('stripe.connecting') : stripeConnected ? t('stripe.connected') : t('stripe.connectButton')}</button>{stripeError && <div className={styles.recoverable} role="alert" aria-live="assertive"><p>{stripeError}</p><button type="button" onClick={() => void handleStripeConnect()}>{t('redesign.retry')}</button></div>}<p className={styles.optional}>{t('redesign.stripe.skip')}</p></section></>}
      {step === 4 && <><Title title={t('redesign.summary.title')} subtitle={t('redesign.summary.subtitle')} /><div className={styles.summary}><Summary title={t('redesign.profile.title')} value={`${fullName} · ${speciality || '—'} · ${experience || '—'}`} edit={() => edit(1)} label={t('redesign.edit')} /><Summary title={t('redesign.coaching.title')} value={`${maxClients || '—'} · ${availableDays.join(', ') || '—'} · ${hoursFrom}–${hoursTo}`} edit={() => edit(2)} label={t('redesign.edit')} /><Summary title={t('redesign.stripe.title')} value={stripeConnected ? t('stripe.connected') : t('redesign.stripe.later')} edit={() => edit(3)} label={t('redesign.edit')} /></div></>}
      {error && <p className={styles.error} role="alert" aria-live="assertive">{error}</p>}
    </div>
    <footer className={styles.nav}>{step > 1 && <button type="button" className={styles.back} onClick={goBack} aria-label={t('nav.back')}><ChevronLeft aria-hidden="true" /></button>}<button type="button" className={styles.primary} disabled={!valid || saving} onClick={() => void handleNext()}>{saving ? t('nav.saving') : step === TOTAL_STEPS ? t('redesign.finish') : t('nav.next')}</button></footer>
  </section></main>
}

function Title({ title, subtitle }: { title: string; subtitle: string }) { return <div className={styles.title}><h1>{title}</h1><p>{subtitle}</p></div> }
function CoachAvatar({ src }: { src: string }) { return (// Runtime user uploads are intentionally rendered outside the static Next image pipeline.
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" />
) }
function Field({ id, label, value, onChange, multiline = false }: { id: string; label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) { return <label className={styles.field} htmlFor={id}><span>{label}</span>{multiline ? <textarea id={id} value={value} onChange={event => onChange(event.target.value)} /> : <input id={id} value={value} onChange={event => onChange(event.target.value)} />}</label> }
function Select({ id, label, value, onChange, options, labels, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; options: string[]; labels: string[]; placeholder: string }) { return <label className={styles.field} htmlFor={id}><span>{label}</span><select id={id} value={value} onChange={event => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map((option, index) => <option key={option} value={option}>{labels[index]}</option>)}</select></label> }
function SelectBare({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) { return <select aria-label={value} value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select> }
function Group({ title, children }: { title: string; children: React.ReactNode }) { return <fieldset className={styles.group}><legend>{title}</legend>{children}</fieldset> }
function Choices({ options, labels, selected, toggle, stacked = false }: { options: string[]; labels: string[]; selected: string[]; toggle: (value: string) => void; stacked?: boolean }) { return <div className={stacked ? styles.choicesStacked : styles.choices}>{options.map((option, index) => <button type="button" key={option} aria-pressed={selected.includes(option)} onClick={() => toggle(option)}>{labels[index]}{selected.includes(option) && <Check aria-hidden="true" />}</button>)}</div> }
function Summary({ title, value, edit, label }: { title: string; value: string; edit: () => void; label: string }) { return <section className={styles.summaryRow}><div><h2>{title}</h2><p>{value}</p></div><button type="button" onClick={edit}>{label}</button></section> }
