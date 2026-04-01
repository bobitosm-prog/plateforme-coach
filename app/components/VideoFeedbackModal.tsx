'use client'
import { useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, Video } from 'lucide-react'

const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)
const GOLD = '#C9A84C'

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
    if (file.size > 50 * 1024 * 1024) { alert('Vidéo trop lourde (max 50 MB)'); return }
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

      alert('Vidéo envoyée à ton coach !')
      onClose()
    } catch (err: any) {
      alert('Erreur : ' + (err.message || 'Upload échoué'))
    }
    setUploading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 20, padding: 28, maxWidth: 420, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#f8fafc', margin: 0, letterSpacing: 1 }}>ENVOYER UNE VIDÉO</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        <p style={{ color: '#666', fontSize: 14, margin: '0 0 20px', fontFamily: "'DM Sans', sans-serif" }}>Exercice : <span style={{ color: GOLD }}>{exerciseName}</span></p>

        <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" capture="environment" onChange={handleVideoSelect} style={{ display: 'none' }} />

        {!videoFile ? (
          <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed rgba(201,168,76,0.3)', borderRadius: 12, padding: 36, textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}>
            <Video size={36} color={GOLD} style={{ marginBottom: 8 }} />
            <p style={{ color: '#888', fontSize: 14, margin: '0 0 4px', fontFamily: "'DM Sans', sans-serif" }}>Appuie pour filmer ou choisir</p>
            <p style={{ color: '#444', fontSize: 12, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Max 30s · MP4, MOV, WebM · 50 MB</p>
          </div>
        ) : (
          <div>
            <video src={videoPreview!} controls style={{ width: '100%', borderRadius: 10, maxHeight: 240 }} />
            <button onClick={() => { setVideoFile(null); setVideoPreview(null) }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>
              Supprimer et recommencer
            </button>
          </div>
        )}

        <textarea
          placeholder="Note pour ton coach (optionnel)..."
          value={clientNote}
          onChange={e => setClientNote(e.target.value)}
          style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, padding: 12, color: '#f8fafc', fontSize: 14, marginTop: 16, minHeight: 56, resize: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: 12, color: '#f8fafc', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Annuler</button>
          <button onClick={handleSubmit} disabled={!videoFile || uploading}
            style={{ flex: 1, background: uploading || !videoFile ? '#333' : `linear-gradient(135deg, ${GOLD}, #b8943f)`, border: 'none', borderRadius: 10, padding: 12, color: uploading || !videoFile ? '#666' : '#050505', fontWeight: 700, fontSize: 14, cursor: uploading ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {uploading ? 'Envoi...' : 'Envoyer au coach'}
          </button>
        </div>
      </div>
    </div>
  )
}
