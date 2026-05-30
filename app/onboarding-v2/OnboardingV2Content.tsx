'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { updateProfile, invalidateProfileCache } from '@/lib/profile-service'
import { cache } from '@/lib/cache'
import { colors, fonts, calcMifflinStJeor } from '@/lib/design-tokens'
import { capitalizeFullName } from '@/lib/utils/capitalize-name'

import OnboardingHeader from './steps/shared/OnboardingHeader'
import OnboardingNav from './steps/shared/OnboardingNav'
import OnboardingScreen from './steps/shared/OnboardingScreen'
import InvitedStep1Profile from './steps/invited/InvitedStep1Profile'
import InvitedStep2Avatar from './steps/invited/InvitedStep2Avatar'
import InvitedStep3Welcome from './steps/invited/InvitedStep3Welcome'
import SoloStep1Welcome from './steps/solo/SoloStep1Welcome'
import SoloStep2Profile from './steps/solo/SoloStep2Profile'
import SoloStep3Body from './steps/solo/SoloStep3Body'
import SoloStep4Goal from './steps/solo/SoloStep4Goal'
import SoloStep5Activity from './steps/solo/SoloStep5Activity'
import SoloStep6Sessions from './steps/solo/SoloStep6Sessions'
import SoloStep7Nutrition from './steps/solo/SoloStep7Nutrition'
import SoloStep8Experience from './steps/solo/SoloStep8Experience'
import SoloStep9PhotoBody from './steps/solo/SoloStep9PhotoBody'
import SoloStep7Equipment from './steps/solo/SoloStep7Equipment'
import SoloStep11Recap from './steps/solo/SoloStep11Recap'
import { GOALS, ACTIVITY_OPTS, NUTRITION_OPTS, EXPERIENCE_OPTS } from '@/lib/onboarding-options'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

// ─── State machine ───

type Flow = 'invited' | 'solo' | null
type InvitedStep = 1 | 2 | 3
type SoloStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

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
const SOLO_TOTAL_STEPS = 11

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

  // ─── SOLO body state ───
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [goalWeight, setGoalWeight] = useState('')

  // ─── SOLO steps 4-8 state ───
  const [goal, setGoal] = useState<number | null>(null)
  const [activityLevel, setActivityLevel] = useState<number | null>(null)
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3)
  const [nutrition, setNutrition] = useState<number | null>(null)
  const [experience, setExperience] = useState<number | null>(null)

  // ─── SOLO steps 9-11 state ───
  const [photoBodyUrl, setPhotoBodyUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // ─── SOLO step 10 equipment state (F6.B.1) ───
  const [locationIndex, setLocationIndex] = useState<number | null>(null)
  const [homeEquipment, setHomeEquipment] = useState<string[]>([])

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
        .select('subscription_type, full_name, birth_date, gender, avatar_url, current_weight, height, target_weight, training_location, home_equipment')
        .eq('id', uid)
        .single()

      if (profile) {
        // Pre-fill existing data
        if (profile.full_name) setFirstName(profile.full_name.split(' ')[0])
        if (profile.birth_date) setBirthDate(profile.birth_date)
        if (profile.gender) setGender(profile.gender as 'male' | 'female')
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url)
        if (profile.current_weight) setWeight(String(profile.current_weight))
        if (profile.height) setHeight(String(profile.height))
        if (profile.target_weight) setGoalWeight(String(profile.target_weight))
        if (profile.training_location) {
          const loc = profile.training_location as 'home' | 'gym' | 'both'
          setLocationIndex(['home', 'gym', 'both'].indexOf(loc))
        }
        if (profile.home_equipment) setHomeEquipment(profile.home_equipment as string[])

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

  // ─── Macros calculation (Step 10) ───
  const macrosCalc = useMemo(() => {
    if (!weight || !height || !birthDate || !gender) return null
    if (activityLevel === null || goal === null) return null

    const age = Math.floor(
      (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    )
    const w = parseFloat(weight)
    const h = parseFloat(height)
    if (!w || !h || age <= 0) return null

    const bmr = calcMifflinStJeor(w, h, age, gender)

    const ACTIVITY_MULT: Record<string, number> = {
      sedentary: 1.2,
      active: 1.375,
      regular: 1.55,
      advanced: 1.725,
    }
    const mult = ACTIVITY_MULT[ACTIVITY_OPTS[activityLevel].id] || 1.55
    const tdee = Math.round(bmr * mult)

    const goalLabel = GOALS[goal].dbLabel
    let calorieGoal = tdee
    if (goalLabel === 'Perdre du poids') calorieGoal = tdee - 400
    else if (goalLabel === 'Prendre du muscle') calorieGoal = tdee + 300

    const protein = Math.round(w * 2)
    const fat = Math.round((calorieGoal * 0.25) / 9)
    const carbs = Math.round((calorieGoal - protein * 4 - fat * 9) / 4)

    return { tdee, calorieGoal, protein, fat, carbs, goalLabel }
  }, [weight, height, birthDate, gender, activityLevel, goal])

  // ─── Auto-save per step ───
  async function saveCurrentStep(): Promise<boolean> {
    if (!userId) return false
    setSaving(true)
    try {
      if (state.flow === 'invited') {
        switch (state.step) {
          case 1: {
            const { error } = await updateProfile(userId, {
              full_name: capitalizeFullName(firstName),
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
              onboarding_completed_at: new Date().toISOString(),
              // Premier diagnostic hebdomadaire dans 7 jours
              next_diagnostic_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }, supabase)
            if (error) { console.error('Save step 3:', error); return false }
            invalidateProfileCache()
            cache.remove(`dashboard_${userId}`)
            break
          }
        }
      }

      if (state.flow === 'solo') {
        switch (state.step) {
          case 1:
            // Welcome screen — nothing to save
            break
          case 2: {
            const { error } = await updateProfile(userId, {
              full_name: capitalizeFullName(firstName),
              birth_date: birthDate || null,
              gender: gender || null,
            }, supabase)
            if (error) { console.error('Save solo step 2:', error); return false }
            break
          }
          case 3: {
            const w = parseFloat(weight)
            const h = parseFloat(height)
            const gw = parseFloat(goalWeight)
            if (!w || !h || !gw) return false
            const { error } = await updateProfile(userId, {
              current_weight: w,
              start_weight: w,
              height: h,
              target_weight: gw,
            }, supabase)
            if (error) { console.error('Save solo step 3:', error); return false }
            // Upsert weight_logs
            const today = new Date().toISOString().slice(0, 10)
            await supabase
              .from('weight_logs')
              .upsert({ user_id: userId, date: today, poids: w }, { onConflict: 'user_id,date' })
            break
          }
          case 4: {
            if (goal === null) return false
            const { error } = await updateProfile(userId, {
              objective: GOALS[goal].dbLabel,
            }, supabase)
            if (error) { console.error('Save solo step 4:', error); return false }
            break
          }
          case 5: {
            if (activityLevel === null) return false
            const { error } = await updateProfile(userId, {
              activity_level: ACTIVITY_OPTS[activityLevel].dbLabel,
            }, supabase)
            if (error) { console.error('Save solo step 5:', error); return false }
            break
          }
          case 6: {
            // Save sessions_per_week into onboarding_answers
            const { data: current } = await supabase
              .from('profiles')
              .select('onboarding_answers')
              .eq('id', userId)
              .single()
            const existing = (current?.onboarding_answers as Record<string, unknown>) || {}
            const { error } = await updateProfile(userId, {
              onboarding_answers: { ...existing, sessions_per_week: sessionsPerWeek },
            }, supabase)
            if (error) { console.error('Save solo step 6:', error); return false }
            break
          }
          case 7: {
            if (nutrition === null) return false
            const { error } = await updateProfile(userId, {
              dietary_type: NUTRITION_OPTS[nutrition].dbLabel,
            }, supabase)
            if (error) { console.error('Save solo step 7:', error); return false }
            break
          }
          case 8: {
            if (experience === null) return false
            const { data: current } = await supabase
              .from('profiles')
              .select('onboarding_answers')
              .eq('id', userId)
              .single()
            const existing = (current?.onboarding_answers as Record<string, unknown>) || {}
            const { error } = await updateProfile(userId, {
              onboarding_answers: { ...existing, experience_level: EXPERIENCE_OPTS[experience].dbLabel },
            }, supabase)
            if (error) { console.error('Save solo step 8:', error); return false }
            break
          }
          case 9:
            // Photo already uploaded in handlePhotoBodyUpload — nothing extra to save
            break
          case 10: {
            // F6.B.1 — save equipment selections
            if (locationIndex === null) return false
            const trainingLocation = ['home', 'gym', 'both'][locationIndex] as 'home' | 'gym' | 'both'
            const { error } = await updateProfile(userId, {
              training_location: trainingLocation,
              home_equipment: homeEquipment,
            }, supabase)
            if (error) { console.error('Save solo step 10 equipment:', error); return false }
            break
          }
          case 11: {
            if (!macrosCalc) {
              console.error('Save solo step 11: macros calc null')
              return false
            }
            const trialEndsAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
            const { error: err11 } = await updateProfile(userId, {
              tdee: macrosCalc.tdee,
              calorie_goal: macrosCalc.calorieGoal,
              protein_goal: macrosCalc.protein,
              carbs_goal: macrosCalc.carbs,
              fat_goal: macrosCalc.fat,
              trial_ends_at: trialEndsAt,
              onboarding_completed: true,
              onboarding_completed_at: new Date().toISOString(),
              // Premier diagnostic hebdomadaire dans 7 jours
              next_diagnostic_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }, supabase)
            if (err11) { console.error('Save solo step 11:', err11); return false }
            invalidateProfileCache()
            cache.remove(`dashboard_${userId}`)
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

  // ─── Photo body upload handler (Step 9) ───
  async function handlePhotoBodyUpload(file: File) {
    if (!userId) return
    setUploadingPhoto(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/onboarding-${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('progress-photos')
        .upload(path, file, { upsert: false })
      if (upErr) { console.error('Photo body upload:', upErr); return }

      const today = new Date().toISOString().slice(0, 10)
      const { data: photoRow } = await supabase
        .from('progress_photos')
        .insert({ user_id: userId, date: today, photo_url: path, view_type: 'front' })
        .select()
        .single()

      const { data: signed } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(path, 3600)
      setPhotoBodyUrl(signed?.signedUrl || '')

      // AI analysis (best-effort, non-blocking)
      if (signed?.signedUrl && goal !== null) {
        try {
          const profileData = {
            weight: parseFloat(weight),
            height: parseFloat(height),
            gender,
            objective: GOALS[goal].dbLabel,
          }
          const res = await fetch('/api/analyze-progress-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoUrl: signed.signedUrl, profileData }),
          })
          if (res.ok) {
            const { analysis } = await res.json()
            if (analysis && photoRow?.id) {
              await supabase.from('progress_photos').update({
                ai_analysis: analysis,
                ai_analyzed_at: new Date().toISOString(),
              }).eq('id', photoRow.id)
            }
          }
        } catch (aiErr) {
          console.warn('AI analysis failed (non-blocking):', aiErr)
        }
      }
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Handler for multi-select home equipment (F6.B.1)
  function toggleHomeEquipment(equipmentId: string) {
    setHomeEquipment((prev) =>
      prev.includes(equipmentId)
        ? prev.filter((id) => id !== equipmentId)
        : [...prev, equipmentId]
    )
  }

  // ─── Navigation handlers ───
  async function handleNext() {
    const saved = await saveCurrentStep()
    if (!saved) return

    const totalSteps = state.flow === 'invited' ? INVITED_TOTAL_STEPS : SOLO_TOTAL_STEPS
    if (state.step >= totalSteps) {
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

  // ─── Validation helpers ───
  const isInvited = state.flow === 'invited'
  const totalSteps = isInvited ? INVITED_TOTAL_STEPS : SOLO_TOTAL_STEPS

  // INVITED validations
  const canProceedInvitedStep1 = firstName.trim().length >= 2

  // SOLO validations
  const canProceedSoloStep2 = firstName.trim().length >= 2 && !!birthDate && !!gender
  const canProceedSoloStep3 =
    !!weight && !!height && !!goalWeight &&
    parseFloat(weight) > 0 && parseFloat(height) > 0 && parseFloat(goalWeight) > 0

  function getNextDisabled(): boolean {
    if (isInvited) {
      return state.step === 1 && !canProceedInvitedStep1
    }
    // SOLO
    switch (state.step) {
      case 1: return false // welcome, always OK
      case 2: return !canProceedSoloStep2
      case 3: return !canProceedSoloStep3
      case 4: return goal === null
      case 5: return activityLevel === null
      case 6: return false // slider always has a value
      case 7: return nutrition === null
      case 8: return experience === null
      case 9: return false // photo is skippable
      case 10: return locationIndex === null
      case 11: return !macrosCalc
      default: return false
    }
  }

  function getNextLabel(): string | undefined {
    if (isInvited) {
      if (state.step === INVITED_TOTAL_STEPS) return t('nav.finish')
      if (state.step === 2) return avatarUrl ? t('nav.continue') : t('nav.skip')
      return undefined
    }
    // SOLO
    if (state.step === 1) return t('nav.letsGo')
    if (state.step === 9 && !photoBodyUrl) return t('nav.skip')
    if (state.step === 11) return t('nav.start')
    return undefined
  }

  // ─── Render ───
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
        totalSteps={totalSteps}
      />

      {/* Step content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={state.direction}>
          {/* ─── INVITED steps ─── */}
          {isInvited && state.step === 1 && (
            <OnboardingScreen
              stepKey="invited-profile"
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

          {isInvited && state.step === 2 && (
            <OnboardingScreen
              stepKey="invited-avatar"
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

          {isInvited && state.step === 3 && (
            <OnboardingScreen
              stepKey="invited-welcome"
              title=""
              direction={state.direction}
            >
              <InvitedStep3Welcome
                firstName={firstName}
                coachName={coachName}
              />
            </OnboardingScreen>
          )}

          {/* ─── SOLO steps ─── */}
          {!isInvited && state.step === 1 && (
            <OnboardingScreen
              stepKey="solo-welcome"
              title=""
              direction={state.direction}
            >
              <SoloStep1Welcome />
            </OnboardingScreen>
          )}

          {!isInvited && state.step === 2 && (
            <OnboardingScreen
              stepKey="solo-profile"
              title={t('profile.title')}
              subtitle={t('profile.subtitle')}
              direction={state.direction}
            >
              <SoloStep2Profile
                firstName={firstName}
                setFirstName={setFirstName}
                birthDate={birthDate}
                setBirthDate={setBirthDate}
                gender={gender}
                setGender={setGender}
              />
            </OnboardingScreen>
          )}

          {!isInvited && state.step === 3 && (
            <OnboardingScreen
              stepKey="solo-body"
              title={t('solo.step3.title')}
              subtitle={t('solo.step3.subtitle')}
              direction={state.direction}
            >
              <SoloStep3Body
                weight={weight}
                setWeight={setWeight}
                height={height}
                setHeight={setHeight}
                goalWeight={goalWeight}
                setGoalWeight={setGoalWeight}
              />
            </OnboardingScreen>
          )}

          {!isInvited && state.step === 4 && (
            <OnboardingScreen
              stepKey="solo-goal"
              title={t('solo.step4.title')}
              subtitle={t('solo.step4.subtitle')}
              direction={state.direction}
            >
              <SoloStep4Goal selected={goal} onSelect={setGoal} />
            </OnboardingScreen>
          )}

          {!isInvited && state.step === 5 && (
            <OnboardingScreen
              stepKey="solo-activity"
              title={t('solo.step5.title')}
              subtitle={t('solo.step5.subtitle')}
              direction={state.direction}
            >
              <SoloStep5Activity selected={activityLevel} onSelect={setActivityLevel} />
            </OnboardingScreen>
          )}

          {!isInvited && state.step === 6 && (
            <OnboardingScreen
              stepKey="solo-sessions"
              title={t('solo.step6.title')}
              subtitle={t('solo.step6.subtitle')}
              direction={state.direction}
            >
              <SoloStep6Sessions sessions={sessionsPerWeek} setSessions={setSessionsPerWeek} />
            </OnboardingScreen>
          )}

          {!isInvited && state.step === 7 && (
            <OnboardingScreen
              stepKey="solo-nutrition"
              title={t('solo.step7.title')}
              subtitle={t('solo.step7.subtitle')}
              direction={state.direction}
            >
              <SoloStep7Nutrition selected={nutrition} onSelect={setNutrition} />
            </OnboardingScreen>
          )}

          {!isInvited && state.step === 8 && (
            <OnboardingScreen
              stepKey="solo-experience"
              title={t('solo.step8.title')}
              subtitle={t('solo.step8.subtitle')}
              direction={state.direction}
            >
              <SoloStep8Experience selected={experience} onSelect={setExperience} />
            </OnboardingScreen>
          )}

          {!isInvited && state.step === 9 && (
            <OnboardingScreen
              stepKey="solo-photo-body"
              title={t('solo.step9.title')}
              subtitle={t('solo.step9.subtitle')}
              direction={state.direction}
            >
              <SoloStep9PhotoBody
                photoUrl={photoBodyUrl}
                onUpload={handlePhotoBodyUpload}
                uploading={uploadingPhoto}
              />
            </OnboardingScreen>
          )}

          {!isInvited && state.step === 10 && (
            <OnboardingScreen
              stepKey="solo-equipment"
              title={t('solo.stepEquipment.title')}
              subtitle={t('solo.stepEquipment.subtitle')}
              direction={state.direction}
            >
              <SoloStep7Equipment
                locationIndex={locationIndex}
                homeEquipment={homeEquipment}
                onLocationSelect={setLocationIndex}
                onHomeEquipmentToggle={toggleHomeEquipment}
              />
            </OnboardingScreen>
          )}

          {!isInvited && state.step === 11 && macrosCalc && (
            <OnboardingScreen
              stepKey="solo-recap"
              title={t('solo.step10.title')}
              subtitle={t('solo.step10.subtitle')}
              direction={state.direction}
            >
              <SoloStep11Recap {...macrosCalc} />
            </OnboardingScreen>
          )}
        </AnimatePresence>
      </div>

      <OnboardingNav
        onBack={state.step > 1 ? handleBack : undefined}
        onNext={handleNext}
        showBack={state.step > 1}
        nextDisabled={getNextDisabled()}
        loading={saving}
        nextLabel={getNextLabel()}
      />
    </div>
  )
}
