'use client'
import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { colors, BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD, FONT_DISPLAY, FONT_BODY } from '../../../lib/design-tokens'
interface BodyAssessmentProps {
  supabase: any
  session: any
  profile: any
  onClose: () => void
  onRefresh: () => void
}

type ViewType = 'front' | 'back' | 'side'

const VIEW_CONFIG: { key: ViewType; label: string; instruction: string }[] = [
  { key: 'front', label: 'FACE', instruction: 'Bras le long du corps, regard droit' },
  { key: 'back', label: 'DOS', instruction: 'Même position, de dos' },
  { key: 'side', label: 'LATÉRAL', instruction: 'Profil gauche, bras légèrement écartés' },
]

const SECTIONS = [
  { title: 'VUE D\'ENSEMBLE', color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
  { title: 'GROUPES MUSCULAIRES DÉVELOPPÉS', color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  { title: 'ZONES EN RETARD', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
  { title: 'DÉSÉQUILIBRES DÉTECTÉS', color: colors.error, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  { title: 'PROGRAMME CORRECTIF', color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  { title: 'OBJECTIF 12 SEMAINES', color: '#D4A843', bg: colors.goldDim, border: colors.goldRule },
]

const ANALYSIS_MESSAGES = [
  'Analyse de ta posture...',
  'Évaluation des groupes musculaires...',
  'Détection des déséquilibres...',
  'Comparaison avant/après...',
  'Génération du rapport coach...',
]

export default function BodyAssessment({ supabase, session, profile, onClose, onRefresh }: BodyAssessmentProps) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [photos, setPhotos] = useState<{ front: string | null; back: string | null; side: string | null }>({ front: null, back: null, side: null })
  const [paths, setPaths] = useState<{ front: string | null; back: string | null; side: string | null }>({ front: null, back: null, side: null })
  const [uploading, setUploading] = useState<{ front: boolean; back: boolean; side: boolean }>({ front: false, back: false, side: false })
  const [analysisText, setAnalysisText] = useState('')
  const [msgIdx, setMsgIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const fileRefs = {
    front: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
  }

  // Rotate analysis messages
  useEffect(() => {
    if (phase !== 2) return
    const interval = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % ANALYSIS_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [phase])

  const handleUpload = async (viewType: ViewType, file: File) => {
    if (!session?.user?.id) return
    setUploading(prev => ({ ...prev, [viewType]: true }))

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const timestamp = Date.now()
      const storagePath = `${session.user.id}/${timestamp}_${viewType}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      // Get signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(storagePath, 3600)

      if (signedError) throw signedError

      // Insert into progress_photos table
      await supabase.from('progress_photos').insert({
        user_id: session.user.id,
        photo_url: storagePath,
        date: new Date().toISOString().split('T')[0],
        view_type: viewType,
      })

      setPhotos(prev => ({ ...prev, [viewType]: signedData.signedUrl }))
      setPaths(prev => ({ ...prev, [viewType]: storagePath }))
    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error('Erreur lors de l\'upload')
    } finally {
      setUploading(prev => ({ ...prev, [viewType]: false }))
    }
  }

  const allPhotosReady = photos.front && photos.back && photos.side

  const startAnalysis = async () => {
    if (!allPhotosReady) return
    setPhase(2)
    setMsgIdx(0)

    try {
      const res = await fetch('/api/analyze-progress-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'assessment',
          photoFrontUrl: photos.front,
          photoBackUrl: photos.back,
          photoSideUrl: photos.side,
          profileData: profile,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur d\'analyse')

      setAnalysisText(data.analysis)
      setPhase(3)
    } catch (err: any) {
      console.error('Analysis error:', err)
      toast.error(err.message || 'Erreur lors de l\'analyse')
      setPhase(1)
    }
  }

  const parseSections = (text: string) => {
    const results: { title: string; color: string; bg: string; border: string; content: string }[] = []

    for (let i = 0; i < SECTIONS.length; i++) {
      const section = SECTIONS[i]
      const regex = new RegExp(section.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      const match = text.search(regex)
      if (match === -1) continue

      // Find end: next section start or end of text
      let endIdx = text.length
      for (let j = i + 1; j < SECTIONS.length; j++) {
        const nextRegex = new RegExp(SECTIONS[j].title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        const nextMatch = text.slice(match + section.title.length).search(nextRegex)
        if (nextMatch !== -1) {
          endIdx = match + section.title.length + nextMatch
          break
        }
      }

      const content = text.slice(match + section.title.length, endIdx).replace(/^[\s:.\-—*#]+/, '').trim()
      results.push({ ...section, content })
    }

    // If parsing failed, show raw text
    if (results.length === 0) {
      results.push({ title: 'ANALYSE', color: GOLD, bg: colors.goldDim, border: colors.goldRule, content: text })
    }

    return results
  }

  const saveAssessment = async () => {
    if (!session?.user?.id) return
    setSaving(true)
    try {
      const { error } = await supabase.from('body_assessments').insert({
        user_id: session.user.id,
        photo_front_url: paths.front,
        photo_back_url: paths.back,
        photo_side_url: paths.side,
        ai_assessment: analysisText,
      })
      if (error) throw error
      toast.success('Bilan sauvegardé !')
      onRefresh()
      onClose()
    } catch (err: any) {
      console.error('Save error:', err)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, background: BG_BASE,
      overflowY: 'auto', padding: '20px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_PRIMARY, letterSpacing: '1px', margin: 0 }}>
            BILAN CORPOREL COMPLET
          </h2>
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, margin: '4px 0 0' }}>
            3 angles pour une analyse précise comme avec un coach
          </p>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: TEXT_MUTED, fontSize: 24, cursor: 'pointer', padding: 4,
        }}>
          ✕
        </button>
      </div>

      {/* Phase 1 — Upload */}
      {phase === 1 && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
          }}>
            {VIEW_CONFIG.map(({ key, label, instruction }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  onClick={() => !uploading[key] && fileRefs[key].current?.click()}
                  style={{
                    border: photos[key] ? `2px solid ${GOLD}` : `2px dashed ${colors.goldRule}`,
                    borderRadius: 20,
                    aspectRatio: '3/4',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    background: photos[key] ? 'transparent' : BG_CARD,
                  }}
                >
                  {photos[key] ? (
                    <>
                      <img src={photos[key]!} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                      <div style={{
                        position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
                        background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, color: '#000', fontWeight: 700,
                      }}>
                        ✓
                      </div>
                    </>
                  ) : uploading[key] ? (
                    <div style={{
                      width: 28, height: 28, border: `2px solid ${GOLD}`, borderTopColor: 'transparent',
                      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                    }} />
                  ) : (
                    <>
                      <div style={{ fontSize: 32, color: TEXT_DIM }}>📷</div>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color: TEXT_PRIMARY, letterSpacing: '1px' }}>
                        {label}
                      </span>
                    </>
                  )}
                  <input
                    ref={fileRefs[key]}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(key, file)
                      e.target.value = ''
                    }}
                  />
                </div>
                <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_DIM, textAlign: 'center', margin: 0, lineHeight: 1.3 }}>
                  {instruction}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={startAnalysis}
            disabled={!allPhotosReady}
            style={{
              width: '100%', padding: 16, marginTop: 24,
              background: allPhotosReady ? GOLD : GOLD_DIM,
              border: 'none', borderRadius: 10, cursor: allPhotosReady ? 'pointer' : 'not-allowed',
              fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: '1px',
              color: allPhotosReady ? '#000' : TEXT_DIM, fontWeight: 700,
            }}
          >
            ANALYSER AVEC L&apos;IA
          </button>
        </>
      )}

      {/* Phase 2 — Analyzing */}
      {phase === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 40 }}>
          <div style={{
            width: 48, height: 48, border: `3px solid ${GOLD}`, borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontFamily: FONT_BODY, fontSize: 15, color: GOLD, textAlign: 'center' }}>
            {ANALYSIS_MESSAGES[msgIdx]}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {photos.front && <img src={photos.front} alt="Face" style={{ width: 70, height: 93, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }} />}
            {photos.back && <img src={photos.back} alt="Dos" style={{ width: 70, height: 93, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }} />}
            {photos.side && <img src={photos.side} alt="Latéral" style={{ width: 70, height: 93, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }} />}
          </div>
        </div>
      )}

      {/* Phase 3 — Results */}
      {phase === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Photo strip */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
            {photos.front && <img src={photos.front} alt="Face" style={{ width: 80, height: 107, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }} />}
            {photos.back && <img src={photos.back} alt="Dos" style={{ width: 80, height: 107, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }} />}
            {photos.side && <img src={photos.side} alt="Latéral" style={{ width: 80, height: 107, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }} />}
          </div>

          {/* Parsed sections */}
          {parseSections(analysisText).map((section, idx) => (
            <div key={idx} style={{
              background: section.bg, border: `1px solid ${section.border}`,
              borderRadius: 12, padding: 16,
            }}>
              <h3 style={{
                fontFamily: FONT_DISPLAY, fontSize: 14, color: section.color,
                letterSpacing: '0.5px', margin: '0 0 10px', textTransform: 'uppercase',
              }}>
                {section.title}
              </h3>
              <p style={{
                fontFamily: FONT_BODY, fontSize: 13, color: TEXT_PRIMARY,
                lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap',
              }}>
                {section.content}
              </p>
            </div>
          ))}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8, paddingBottom: 24 }}>
            <button
              onClick={saveAssessment}
              disabled={saving}
              style={{
                width: '100%', padding: 16, background: GOLD, border: 'none',
                borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: '1px',
                color: '#000', fontWeight: 700,
              }}
            >
              {saving ? 'SAUVEGARDE...' : 'SAUVEGARDER LE BILAN'}
            </button>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: 14, background: 'transparent',
                border: `1px solid ${BORDER}`, borderRadius: 10, cursor: 'pointer',
                fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: '1px',
                color: TEXT_MUTED,
              }}
            >
              FERMER
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
