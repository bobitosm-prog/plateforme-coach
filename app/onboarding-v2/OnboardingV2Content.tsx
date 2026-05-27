'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { updateProfile, invalidateProfileCache } from '@/lib/profile-service'
import { colors } from '@/lib/design-tokens'

import OnboardingHeader from './steps/shared/OnboardingHeader'
import OnboardingNav from './steps/shared/OnboardingNav'
import OnboardingScreen from './steps/shared/OnboardingScreen'
import InvitedStep1Profile from './steps/invited/InvitedStep1Profile'
import InvitedStep2Avatar from './steps/invited/InvitedStep2Avatar'
import InvitedStep3Welcome from './steps/invited/InvitedStep3Welcome'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

// ─── State machine ───

type Flow = 'invited' | 'solo' | null
type InvitedStep = 1 | 2 | 3
type SoloStep = 1 // placeholder

interface State {
  flow: Flow
  step: InvitedStep | SoloStep
  direction: number
}

type Action =
  | { type: 'SET_FLOW'; flow: Flow }
  | { type: 'NEXT' }
  | { type: 'BACK' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FLOW':
      return { ...state, flow: action.flow, step: 1, direction: 1 }
    case 'NEXT':
      return { ...state, step: (state.step + 1) as any, direction: 1 }
    case 'BACK':
      return { ...state, step: (state.step - 1) as any, direction: -1 }
    default:
      return state
  }
}

const INVITED_TOTAL_STEPS = 3

export default function OnboardingV2Content() {
  const t = useTranslations('onboarding_v2')
  const router = useRouter()
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current

  const [state, dispatch] = useReducer(reducer, {
    flow: null,
    step: 1,
    direction: 1,
  })

  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // ─── Form state ───
  const [firstName, setFirstName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [coachName, setCoachName] = useState<string | null>(null)

  // ─── Flow detection on mount ───
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }

      const uid = session.user.id
      setUserId(uid)

      // Pre-fill from metadata
      const meta = session.user.user_metadata
      if (meta?.full_name) setFirstName(meta.full_name.split(' ')[0])

      // Fetch profile to detect flow
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_type, full_name, birth_date, gender, avatar_url')
        .eq('id', uid)
        .single()

      if (profile) {
        // Pre-fill existing data
        if (profile.full_name) setFirstName(profile.full_name.split(' ')[0])
        if (profile.birth_date) setBirthDate(profile.birth_date)
        if (profile.gender) setGender(profile.gender as 'male' | 'female')
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url)

        // Flow detection: subscription_type === 'invited' → invited flow
        if (profile.subscription_type === 'invited') {
          dispatch({ type: 'SET_FLOW', flow: 'invited' })

          // Fetch coach via coach_clients junction table
          const { data: link } = await supabase
            .from('coach_clients')
            .select('coach_id')
            .eq('client_id', uid)
            .single()

          if (link?.coach_id) {
            const { data: coach } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', link.coach_id)
              .single()
            if (coach?.full_name) setCoachName(coach.full_name)
          }
        } else {
          dispatch({ type: 'SET_FLOW', flow: 'solo' })
        }
      } else {
        dispatch({ type: 'SET_FLOW', flow: 'solo' })
      }

      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-save per step ───
  async function saveCurrentStep(): Promise<boolean> {
    if (!userId) return false
    setSaving(true)
    try {
      if (state.flow === 'invited') {
        switch (state.step) {
          case 1: {
            const { error } = await updateProfile(userId, {
              full_name: firstName,
              birth_date: birthDate || null,
              gender: gender || null,
            }, supabase)
            if (error) { console.error('Save step 1:', error); return false }
            break
          }
          case 2:
            // Avatar already uploaded in handleAvatarUpload
            break
          case 3: {
            // Mark onboarding complete
            const { error } = await updateProfile(userId, {
              onboarding_completed: true,
            }, supabase)
            if (error) { console.error('Save step 3:', error); return false }
            invalidateProfileCache()
            break
          }
        }
      }
      return true
    } finally {
      setSaving(false)
    }
  }

  // ─── Avatar upload handler ───
  async function handleAvatarUpload(file: File) {
    if (!userId) return
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `avatars/${userId}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (upErr) {
      console.error('Avatar upload:', upErr)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = urlData?.publicUrl || ''

    await updateProfile(userId, { avatar_url: publicUrl }, supabase)
    setAvatarUrl(publicUrl)
  }

  // ─── Navigation handlers ───
  async function handleNext() {
    const saved = await saveCurrentStep()
    if (!saved) return

    if (state.flow === 'invited' && state.step >= INVITED_TOTAL_STEPS) {
      // Final step → redirect to app
      router.replace('/')
      return
    }
    dispatch({ type: 'NEXT' })
  }

  function handleBack() {
    if (state.step <= 1) return
    dispatch({ type: 'BACK' })
  }

  // ─── Loading ───
  if (loading || !state.flow) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: colors.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${colors.goldBorder}`,
            borderTop: `3px solid ${colors.gold}`,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ─── SOLO flow (placeholder) ───
  if (state.flow === 'solo') {
    // Redirect to v1 onboarding for now
    router.replace('/onboarding')
    return null
  }

  // ─── INVITED flow ───
  const canProceedStep1 = firstName.trim().length >= 2

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: colors.background,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 512,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <OnboardingHeader
        currentStep={state.step}
        totalSteps={INVITED_TOTAL_STEPS}
      />

      {/* Step content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={state.direction}>
          {state.step === 1 && (
            <OnboardingScreen
              stepKey="profile"
              title={t('profile.title')}
              subtitle={t('profile.subtitle')}
              direction={state.direction}
            >
              <InvitedStep1Profile
                firstName={firstName}
                setFirstName={setFirstName}
                birthDate={birthDate}
                setBirthDate={setBirthDate}
                gender={gender}
                setGender={setGender}
              />
            </OnboardingScreen>
          )}

          {state.step === 2 && (
            <OnboardingScreen
              stepKey="avatar"
              title={t('avatar.title')}
              subtitle={t('avatar.subtitle')}
              direction={state.direction}
            >
              <InvitedStep2Avatar
                avatarUrl={avatarUrl}
                onUpload={handleAvatarUpload}
              />
            </OnboardingScreen>
          )}

          {state.step === 3 && (
            <OnboardingScreen
              stepKey="welcome"
              title=""
              direction={state.direction}
            >
              <InvitedStep3Welcome
                firstName={firstName}
                coachName={coachName}
              />
            </OnboardingScreen>
          )}
        </AnimatePresence>
      </div>

      <OnboardingNav
        onBack={state.step > 1 ? handleBack : undefined}
        onNext={handleNext}
        showBack={state.step > 1}
        nextDisabled={state.step === 1 && !canProceedStep1}
        loading={saving}
        nextLabel={
          state.step === INVITED_TOTAL_STEPS
            ? t('nav.finish')
            : state.step === 2
              ? (avatarUrl ? t('nav.continue') : t('nav.skip'))
              : undefined
        }
      />
    </div>
  )
}
