'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, fonts, titleStyle, bodyStyle, mutedStyle, pageTitleStyle, BG_BASE, BORDER, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM } from '../../lib/design-tokens'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

const BG = '#0D0B08'
const GOLD_C = '#D4A843'
const FONT_DM = fonts.body
const FONT_BEBAS = fonts.headline

const ANALYSIS_MESSAGES = [
  'Analyse de ta composition corporelle...',
  'Croisement avec tes données de profil...',
  'Calcul de tes besoins réels...',
  'Génération de ton plan personnalisé...',
]

const ANALYSIS_SECTIONS = [
  { title: 'ANALYSE VISUELLE', color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
  { title: 'COHÉRENCE PROGRAMME', color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  { title: 'POINTS POSITIFS', color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  { title: 'AXES DE PROGRESSION', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
  { title: 'RECOMMANDATION PRIORITAIRE', color: GOLD_C, bg: colors.goldDim, border: colors.goldRule },
]

type Phase = 'upload' | 'analyzing' | 'results'

export default function OnboardingPhotoPage() {
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current
  const [userId, setUserId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('upload')
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [analysisText, setAnalysisText] = useState('')
  const [analysisMsg, setAnalysisMsg] = useState(0)
  const [profileData, setProfileData] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUserId(session.user.id)
      // Fetch profile data
      supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
        if (data) setProfileData(data)
      })
    })
  }, [supabase])

  // Rotating analysis messages
  useEffect(() => {
    if (phase !== 'analyzing') return
    const id = setInterval(() => setAnalysisMsg(p => (p + 1) % ANALYSIS_MESSAGES.length), 2000)
    return () => clearInterval(id)
  }, [phase])

  // Upload handler
  const handleFile = useCallback(async (file: File) => {
    if (!userId || !file) return
    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('progress-photos').upload(path, file)
    if (upErr) { setUploading(false); return }

    // Save to progress_photos table
    await supabase.from('progress_photos').insert({ user_id: userId, photo_url: path, view_type: 'front' })

    // Get signed URL for display and API
    const { data: signed } = await supabase.storage.from('progress-photos').createSignedUrl(path, 3600)
    const signedUrl = signed?.signedUrl || ''
    setPhotoUrl(signedUrl)
    setPhotoPath(path)
    setUploading(false)

    // Start analysis
    setPhase('analyzing')
    try {
      const res = await fetch('/api/analyze-progress-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: signedUrl, profileData }),
      })
      const data = await res.json()
      setAnalysisText(data.analysis || 'Analyse indisponible.')
    } catch {
      setAnalysisText('Erreur lors de l\'analyse. Tu peux continuer.')
    }
    setPhase('results')
  }, [userId, supabase, profileData])

  // Drag & drop
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFile(file)
  }, [handleFile])

  // Skip step
  const handleSkip = async () => {
    if (!userId) return
    setGenerating(true)
    await generateMealPlan(null)
  }

  // Generate meal plan
  const generateMealPlan = async (analysisForPlan: string | null) => {
    if (!userId || !profileData) return
    setGenerating(true)
    setGenProgress(0)

    const params: any = {
      calorie_goal: profileData.calorie_goal || profileData.tdee || 2200,
      protein_goal: profileData.protein_goal || 150,
      carbs_goal: profileData.carbs_goal || 250,
      fat_goal: profileData.fat_goal || 70,
      dietary_type: profileData.dietary_type || 'omnivore',
      allergies: profileData.allergies || [],
      disliked_foods: profileData.meal_preferences?.disliked_foods || [],
      objective_mode: profileData.objective === 'weight_loss' ? 'seche' : profileData.objective === 'mass' ? 'bulk' : 'maintien',
      caloric_adjustment: (profileData.calorie_goal || 0) - (profileData.tdee || profileData.calorie_goal || 0),
      tdee: profileData.tdee,
      activity_level: profileData.activity_level,
    }
    if (analysisForPlan) params.ai_photo_analysis = analysisForPlan

    try {
      const res = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let plan: any = null

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value)
          const lines = text.split('\n').filter(l => l.startsWith('data: '))
          for (const line of lines) {
            try {
              const msg = JSON.parse(line.slice(6))
              if (msg.type === 'progress') setGenProgress(Math.round((msg.index / msg.total) * 100))
              if (msg.type === 'done') plan = msg.plan
            } catch { /* skip parse errors */ }
          }
        }
      }

      // Save meal plan
      if (plan) {
        await supabase.from('client_meal_plans').upsert(
          { client_id: userId, plan, created_at: new Date().toISOString() },
          { onConflict: 'client_id' }
        )
      }

      // Mark onboarding photo as completed
      await supabase.from('profiles').update({
        onboarding_photo_completed_at: new Date().toISOString(),
      }).eq('id', userId)

      window.location.href = '/'
    } catch {
      // Even on error, mark as done and proceed
      await supabase.from('profiles').update({
        onboarding_photo_completed_at: new Date().toISOString(),
      }).eq('id', userId)
      window.location.href = '/'
    }
  }

  // ─── Parse analysis into sections ───
  function renderAnalysis(text: string) {
    const lines = text.split('\n')
    const blocks: { section: typeof ANALYSIS_SECTIONS[0]; content: string }[] = []
    let current: typeof ANALYSIS_SECTIONS[0] | null = null
    let buf: string[] = []

    for (const line of lines) {
      const matched = ANALYSIS_SECTIONS.find(s => line.toUpperCase().includes(s.title))
      if (matched) {
        if (current && buf.length) blocks.push({ section: current, content: buf.join('\n') })
        current = matched; buf = []
      } else if (current) {
        buf.push(line)
      }
    }
    if (current && buf.length) blocks.push({ section: current, content: buf.join('\n') })

    if (!blocks.length) {
      return <p style={{ ...bodyStyle, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text}</p>
    }

    return blocks.map((b, i) => (
      <div key={i} style={{ padding: 16, background: b.section.bg, border: `1px solid ${b.section.border}`, marginBottom: 12 }}>
        <h3 style={{ ...titleStyle, fontSize: 16, color: b.section.color, letterSpacing: '0.08em', marginBottom: 8 }}>
          {b.section.title}
        </h3>
        <p style={{ ...bodyStyle, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
          {b.content.trim()}
        </p>
      </div>
    ))
  }

  // ─── PHASE 1: Upload ───
  if (phase === 'upload') {
    return (
      <div style={{ minHeight: '100dvh', background: BG, fontFamily: fonts.body, color: TEXT_PRIMARY }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 20px 40px' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 style={{ ...pageTitleStyle, fontSize: 40, letterSpacing: '0.04em', marginBottom: 12, lineHeight: 1 }}>
              TON POINT DE DÉPART
            </h1>
            <p style={{ ...bodyStyle, fontSize: 15, lineHeight: 1.6, marginBottom: 36 }}>
              Une photo nous aide à personnaliser ton plan avec précision
            </p>

            {/* Drop zone */}
            <div
              ref={dragRef}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? GOLD_C : 'rgba(255,255,255,0.1)'}`,
                background: dragOver ? colors.goldDim : 'rgba(255,255,255,0.02)',
                padding: '60px 24px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: GOLD_C, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ ...bodyStyle }}>Upload en cours...</span>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
                  <p style={{ ...pageTitleStyle, fontSize: 22, letterSpacing: '0.06em', marginBottom: 8 }}>
                    PRENDRE UNE PHOTO
                  </p>
                  <p style={{ ...bodyStyle, fontSize: 13 }}>
                    Glisse une photo ici ou touche pour ouvrir la caméra
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            <p style={{ ...mutedStyle, fontSize: 11, marginTop: 16, textAlign: 'center' }}>
              Photo de face, buste visible · Éclairage neutre · Stockée en privé
            </p>

            {/* Skip button */}
            <button
              onClick={handleSkip}
              disabled={generating}
              style={{
                display: 'block', width: '100%', marginTop: 48,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: fonts.body, fontSize: 13, color: TEXT_MUTED,
                textDecoration: 'underline', padding: 12,
              }}
            >
              {generating ? 'Génération du plan...' : 'Passer cette étape'}
            </button>

            {generating && (
              <div style={{ marginTop: 16 }}>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: `${genProgress}%` }}
                    transition={{ duration: 0.3 }}
                    style={{ height: '100%', background: GOLD_C }}
                  />
                </div>
                <p style={{ ...mutedStyle, textAlign: 'center', marginTop: 8 }}>
                  Génération de ton plan nutritionnel... {genProgress}%
                </p>
              </div>
            )}
          </motion.div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ─── PHASE 2: Analyzing ───
  if (phase === 'analyzing') {
    return (
      <div style={{ minHeight: '100dvh', background: BG, fontFamily: fonts.body, color: TEXT_PRIMARY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 400, textAlign: 'center' }}>
          {photoUrl && (
            <img src={photoUrl} alt="Ta photo" style={{ width: 200, height: 200, objectFit: 'cover', margin: '0 auto 32px', border: `1px solid rgba(255,255,255,0.08)` }} />
          )}
          <div style={{ width: 48, height: 48, border: `3px solid ${BORDER}`, borderTopColor: GOLD_C, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
          <AnimatePresence mode="wait">
            <motion.p
              key={analysisMsg}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              style={{ ...bodyStyle, fontSize: 15 }}
            >
              {ANALYSIS_MESSAGES[analysisMsg]}
            </motion.p>
          </AnimatePresence>
        </motion.div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ─── PHASE 3: Results ───
  return (
    <div style={{ minHeight: '100dvh', background: BG, fontFamily: fonts.body, color: TEXT_PRIMARY }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 20px 60px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 style={{ ...pageTitleStyle, fontSize: 36, letterSpacing: '0.04em', marginBottom: 8 }}>
            TON ANALYSE
          </h1>
          <p style={{ ...bodyStyle, marginBottom: 24 }}>
            Basée sur ta photo et tes données de profil
          </p>

          {/* Photo thumbnail */}
          {photoUrl && (
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <img src={photoUrl} alt="" style={{ width: 120, height: 120, objectFit: 'cover', border: `1px solid rgba(255,255,255,0.08)` }} />
            </div>
          )}

          {/* Analysis sections */}
          <div style={{ marginBottom: 32 }}>
            {renderAnalysis(analysisText)}
          </div>

          {/* Generate plan CTA */}
          <button
            onClick={() => generateMealPlan(analysisText)}
            disabled={generating}
            style={{
              width: '100%', padding: 18,
              background: generating ? 'rgba(255,255,255,0.05)' : GOLD_C,
              color: generating ? TEXT_MUTED : '#0D0B08',
              border: 'none', borderRadius: 12,
              fontFamily: fonts.headline, fontSize: 22, letterSpacing: '0.08em',
              cursor: generating ? 'wait' : 'pointer',
              opacity: generating ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {generating ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER MON PLAN'}
          </button>

          {generating && (
            <div style={{ marginTop: 16 }}>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${genProgress}%` }}
                  transition={{ duration: 0.3 }}
                  style={{ height: '100%', background: GOLD_C }}
                />
              </div>
              <p style={{ ...mutedStyle, textAlign: 'center', marginTop: 8 }}>
                Plan nutritionnel sur 7 jours... {genProgress}%
              </p>
            </div>
          )}

          {/* Skip */}
          {!generating && (
            <button
              onClick={handleSkip}
              style={{
                display: 'block', width: '100%', marginTop: 24,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: fonts.body, fontSize: 13, color: TEXT_MUTED,
                textDecoration: 'underline', padding: 12,
              }}
            >
              Passer et aller au dashboard
            </button>
          )}
        </motion.div>
      </div>
    </div>
  )
}
