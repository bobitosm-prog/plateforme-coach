'use client'
import { useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, Video } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, RED,
  TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../lib/design-tokens'

const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

interface Props {
  exerciseName: string
  userId: string
  onClose: () => void
}

export default function VideoFeedbackModal({ exerciseName, userId, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [clientNote, setClientNote] = useState('')
  const [uploading, setUploading] = useState(false)

  function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { alert('Video trop lourde (max 50 MB)'); return }
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!videoFile || !userId) return
    setUploading(true)
    try {
      const ext = videoFile.name.split('.').pop() || 'mp4'
      const fileName = `${userId}/${Date.now()}-${exerciseName.replace(/\s+/g, '-').toLowerCase()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('exercise-videos')
        .upload(fileName, videoFile, { contentType: videoFile.type })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('exercise-videos')
        .getPublicUrl(fileName)

      const { data: relation } = await supabase
        .from('coach_clients')
        .select('coach_id')
        .eq('client_id', userId)
        .limit(1)
        .maybeSingle()

      const { error: dbError } = await supabase.from('exercise_feedback').insert({
        client_id: userId,
        coach_id: relation?.coach_id || null,
        exercise_name: exerciseName,
        video_url: publicUrl,
        client_note: clientNote.trim() || null,
        status: 'pending',
      })
      if (dbError) throw dbError

      alert('Video envoyee a ton coach !')
      onClose()
    } catch (err: any) {
      alert('Erreur : ' + (err.message || 'Upload echoue'))
    }
    setUploading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 28, maxWidth: 420, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: TEXT_PRIMARY, margin: 0, letterSpacing: '2px', textTransform: 'uppercase' }}>ENVOYER UNE VIDEO</h3>
          <button onClick={onClose} style={{ background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 0, color: TEXT_MUTED, cursor: 'pointer', padding: 4, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>
        <p style={{ color: TEXT_MUTED, fontSize: 14, margin: '0 0 20px', fontFamily: FONT_BODY }}>Exercice : <span style={{ color: GOLD }}>{exerciseName}</span></p>

        <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" capture="environment" onChange={handleVideoSelect} style={{ display: 'none' }} />

        {!videoFile ? (
          <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${GOLD_RULE}`, borderRadius: 0, padding: 36, textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}>
            <Video size={36} color={GOLD} style={{ marginBottom: 8 }} />
            <p style={{ color: TEXT_MUTED, fontSize: 14, margin: '0 0 4px', fontFamily: FONT_BODY }}>Appuie pour filmer ou choisir</p>
            <p style={{ color: TEXT_DIM, fontSize: 12, margin: 0, fontFamily: FONT_BODY }}>Max 30s · MP4, MOV, WebM · 50 MB</p>
          </div>
        ) : (
          <div>
            <video src={videoPreview!} controls style={{ width: '100%', borderRadius: 0, maxHeight: 240 }} />
            <button onClick={() => { setVideoFile(null); setVideoPreview(null) }} style={{ background: 'none', border: 'none', color: RED, fontSize: 12, cursor: 'pointer', marginTop: 8, fontFamily: FONT_BODY }}>
              Supprimer et recommencer
            </button>
          </div>
        )}

        <textarea
          placeholder="Note pour ton coach (optionnel)..."
          value={clientNote}
          onChange={e => setClientNote(e.target.value)}
          style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0, padding: 12, color: TEXT_PRIMARY, fontSize: 14, marginTop: 16, minHeight: 56, resize: 'none', fontFamily: FONT_BODY, boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 0, padding: 12, color: TEXT_PRIMARY, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' }}>Annuler</button>
          <button onClick={handleSubmit} disabled={!videoFile || uploading}
            style={{ flex: 1, background: uploading || !videoFile ? BORDER : GOLD, border: 'none', borderRadius: 0, padding: 12, color: uploading || !videoFile ? TEXT_MUTED : '#050505', fontWeight: 800, fontSize: 14, cursor: uploading ? 'wait' : 'pointer', fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {uploading ? 'Envoi...' : 'Envoyer au coach'}
          </button>
        </div>
      </div>
    </div>
  )
}
