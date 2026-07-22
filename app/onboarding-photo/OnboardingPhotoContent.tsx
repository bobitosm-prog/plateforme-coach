'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { colors, fonts, radii, cardStyle, pageTitleStyle, titleStyle, titleLineStyle, bodyStyle, labelStyle, mutedStyle, btnPrimary, btnSecondary } from '../../lib/design-tokens'
import { Camera, ChevronLeft, Upload, Shield } from 'lucide-react'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

type Phase = 'upload' | 'analyzing' | 'results'

export default function OnboardingPhotoContent() {
  const t = useTranslations('auth.onboardingPhoto')
  const supabase = useRef(createBrowserClient(SUPABASE_URL, SUPABASE_KEY)).current
  const [userId, setUserId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('upload')
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [analysisText, setAnalysisText] = useState('')
  const [analysisFailed, setAnalysisFailed] = useState(false)
  const [analysisMsg, setAnalysisMsg] = useState(0)
  const [profileData, setProfileData] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const ANALYSIS_SECTIONS = [
    { title: t('sections.visualAnalysis'), color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
    { title: t('sections.programCoherence'), color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
    { title: t('sections.positivePoints'), color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
    { title: t('sections.progressionAxes'), color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
    { title: t('sections.priorityRecommendation'), color: colors.gold, bg: colors.goldDim, border: colors.goldRule },
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUserId(session.user.id)
      supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
        if (data) setProfileData(data)
      })
    })
  }, [supabase])

  useEffect(() => {
    if (phase !== 'analyzing') return
    const id = setInterval(() => setAnalysisMsg(p => (p + 1) % 4), 2000)
    return () => clearInterval(id)
  }, [phase])

  const handleFile = useCallback(async (file: File) => {
    if (!userId || !file) return
    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('progress-photos').upload(path, file)
    if (upErr) { setUploading(false); return }
    await supabase.from('progress_photos').insert({ user_id: userId, photo_url: path, view_type: 'front' })
    const { data: signed } = await supabase.storage.from('progress-photos').createSignedUrl(path, 3600)
    const signedUrl = signed?.signedUrl || ''
    setPhotoUrl(signedUrl)
    setPhotoPath(path)
    setUploading(false)
    setPhase('analyzing')
    setAnalysisFailed(false)
    try {
      const res = await fetch('/api/analyze-progress-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: signedUrl, profileData }),
      })
      const data = await res.json()
      if (!res.ok || typeof data.analysis !== 'string' || !data.analysis.trim()) throw new Error('analysis_failed')
      setAnalysisText(data.analysis)
    } catch {
      setAnalysisFailed(true)
      setAnalysisText(t('results.analysisError'))
    }
    setPhase('results')
  }, [userId, supabase, profileData, t])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFile(file)
  }, [handleFile])

  const handleSkip = async () => {
    if (!userId) return
    setGenerating(true)
    await generateMealPlan(null)
  }

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
      objective_mode: profileData.objective === 'cut' ? 'seche' : profileData.objective === 'mass' ? 'bulk' : 'maintien',
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
      if (plan) {
        await supabase.from('client_meal_plans').upsert(
          { client_id: userId, plan, created_at: new Date().toISOString() },
          { onConflict: 'client_id' }
        )
      }
      await supabase.from('profiles').update({ onboarding_photo_completed_at: new Date().toISOString() }).eq('id', userId)
      window.location.href = '/'
    } catch {
      await supabase.from('profiles').update({ onboarding_photo_completed_at: new Date().toISOString() }).eq('id', userId)
      window.location.href = '/'
    }
  }

  function renderAnalysis(text: string) {
    const lines = text.split('\n')
    const blocks: { section: typeof ANALYSIS_SECTIONS[0]; content: string }[] = []
    let current: typeof ANALYSIS_SECTIONS[0] | null = null
    let buf: string[] = []
    for (const line of lines) {
      const matched = ANALYSIS_SECTIONS.find(s => line.toUpperCase().includes(s.title.toUpperCase()))
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
      <div key={i} style={{ ...cardStyle, padding: 16, background: b.section.bg, border: `1px solid ${b.section.border}`, marginBottom: 12 }}>
        <h3 style={{ ...titleStyle, fontSize: 14, color: b.section.color, letterSpacing: '0.12em', marginBottom: 8 }}>{b.section.title}</h3>
        <p style={{ ...bodyStyle, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{b.content.trim()}</p>
      </div>
    ))
  }

  // ─── PHASE 1: Upload ───
  if (phase === 'upload') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.background, fontFamily: fonts.body, color: colors.text, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < 3 ? colors.gold : `${colors.gold}33` }} />
            ))}
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: 480, margin: '0 auto', padding: '40px 20px 0', width: '100%' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 style={{ ...pageTitleStyle, fontSize: 32, letterSpacing: '0.08em', marginBottom: 12, lineHeight: 1 }}>{t('upload.title')}</h1>
            <p style={{ ...bodyStyle, fontSize: 15, lineHeight: 1.6, marginBottom: 36 }}>{t('upload.subtitle')}</p>
            <div ref={dragRef} onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? colors.gold : colors.goldRule}`, borderRadius: 20, padding: '40px 24px', textAlign: 'center', background: dragOver ? colors.goldDim : colors.surface, cursor: 'pointer', transition: 'all 0.2s' }}>
              {uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, border: `3px solid ${colors.goldBorder}`, borderTopColor: colors.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ ...bodyStyle }}>{t('upload.uploading')}</span>
                </div>
              ) : (
                <>
                  <Camera size={40} color={colors.gold} style={{ margin: '0 auto 16px', display: 'block' }} />
                  <p style={{ ...titleStyle, fontSize: 18, letterSpacing: '0.1em', marginBottom: 8 }}>{t('upload.dropzoneTitle')}</p>
                  <p style={{ ...bodyStyle, fontSize: 12 }}>{t('upload.dropzoneHint')}</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
              <Shield size={12} color={colors.textDim} />
              <p style={{ ...mutedStyle, fontSize: 10, margin: 0 }}>{t('upload.privacyNote')}</p>
            </div>
            {generating && (
              <div style={{ marginTop: 24 }}>
                <div style={{ height: 4, background: `${colors.gold}1a`, borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${genProgress}%` }} transition={{ duration: 0.3 }} style={{ height: '100%', background: colors.gold, borderRadius: 2 }} />
                </div>
                <p style={{ ...bodyStyle, textAlign: 'center', marginTop: 8 }}>{t('upload.generating', { progress: genProgress })}</p>
              </div>
            )}
          </motion.div>
        </div>
        <div style={{ position: 'sticky', bottom: 0, padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: colors.background, borderTop: `1px solid ${colors.goldBorder}` }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <button onClick={handleSkip} disabled={generating}
              style={{ display: 'block', width: '100%', ...labelStyle, fontSize: 13, color: colors.textMuted, textDecoration: 'underline', textAlign: 'center', padding: 12 }}>
              {generating ? t('upload.skipGenerating') : t('upload.skip')}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ─── PHASE 2: Analyzing ───
  if (phase === 'analyzing') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.background, fontFamily: fonts.body, color: colors.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 400, textAlign: 'center' }}>
          {photoUrl && (
            <img src={photoUrl} alt={t('analyzing.photoAlt')} style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: radii.card, margin: '0 auto 32px', border: `1px solid ${colors.goldBorder}` }} />
          )}
          <div style={{ width: 48, height: 48, border: `3px solid ${colors.goldBorder}`, borderTopColor: colors.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
          <AnimatePresence mode="wait">
            <motion.p key={analysisMsg} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
              style={{ ...bodyStyle, fontSize: 15 }}>
              {t(`analyzing.messages.${analysisMsg}`)}
            </motion.p>
          </AnimatePresence>
        </motion.div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ─── PHASE 3: Results ───
  return (
    <div style={{ minHeight: '100dvh', background: colors.background, fontFamily: fonts.body, color: colors.text, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, maxWidth: 520, margin: '0 auto', padding: '40px 20px 120px', width: '100%' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 style={{ ...pageTitleStyle, fontSize: 32, letterSpacing: '0.08em', marginBottom: 8 }}>{t('results.title')}</h1>
          <p style={{ ...bodyStyle, marginBottom: 24 }}>{t('results.subtitle')}</p>
          {photoUrl && (
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <img src={photoUrl} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: radii.card, border: `1px solid ${colors.goldBorder}` }} />
            </div>
          )}
          <div style={{ marginBottom: 32 }}>{renderAnalysis(analysisText)}</div>
          {generating && (
            <div style={{ marginTop: 16 }}>
              <div style={{ height: 4, background: `${colors.gold}1a`, borderRadius: 2, overflow: 'hidden' }}>
                <motion.div animate={{ width: `${genProgress}%` }} transition={{ duration: 0.3 }} style={{ height: '100%', background: colors.gold, borderRadius: 2 }} />
              </div>
              <p style={{ ...bodyStyle, textAlign: 'center', marginTop: 8 }}>{t('results.generating', { progress: genProgress })}</p>
            </div>
          )}
        </motion.div>
      </div>
      <div style={{ position: 'sticky', bottom: 0, padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: colors.background, borderTop: `1px solid ${colors.goldBorder}` }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!generating && (
            <button onClick={handleSkip}
              style={{ ...labelStyle, display: 'block', width: '100%', background: 'transparent', color: colors.gold, textDecoration: 'underline', textAlign: 'center', padding: 8, fontSize: 13 }}>
              {t('results.skip')}
            </button>
          )}
          <button onClick={() => generateMealPlan(analysisFailed ? null : analysisText)} disabled={generating}
            style={{ ...btnPrimary, width: '100%', padding: 16, fontSize: 16, letterSpacing: '0.1em', opacity: generating ? 0.6 : 1, cursor: generating ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
            {generating ? t('results.continueGenerating') : t('results.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
