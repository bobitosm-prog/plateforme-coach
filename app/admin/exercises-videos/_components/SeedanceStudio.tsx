'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/admin/api-client'
import { cardStyle, labelStyle, mutedStyle, btnPrimary } from '@/lib/design-tokens'
import { useSeedanceStudio } from '../_hooks/useSeedanceStudio'

interface ExerciseLite {
  id: string
  name: string
  muscle_group: string | null
  equipment: string | null
  gif_url: string | null
}

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: 10, borderRadius: 8,
  border: '1px solid #333', background: '#111', color: '#fff',
}
const selectStyle: React.CSSProperties = {
  flex: 1, minWidth: 90, padding: 10, borderRadius: 8,
  border: '1px solid #333', background: '#111', color: '#fff',
}

export function SeedanceStudio() {
  const { state, generate, publish, reset } = useSeedanceStudio()
  const [exercises, setExercises] = useState<ExerciseLite[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [prompt, setPrompt] = useState('')
  const [referenceImageUrl, setReferenceImageUrl] = useState('')
  const [model, setModel] = useState('seedance-2-0')
  const [resolution, setResolution] = useState('1080p')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [duration, setDuration] = useState(5)
  const [promptLoading, setPromptLoading] = useState(false)

  useEffect(() => {
    adminFetch<{ exercises: ExerciseLite[] }>('/api/admin/seedance/exercises')
      .then((d) => setExercises(d.exercises))
      .catch((e) => console.error('[seedance] load exercises', e.message))
  }, [])

  const selected = exercises.find((e) => e.id === selectedId)
  const generationType = referenceImageUrl.trim() ? 'image-to-video' : 'text-to-video'

  function onSelect(id: string) {
    setSelectedId(id)
    const ex = exercises.find((e) => e.id === id)
    setReferenceImageUrl(ex?.gif_url || '')
    setPrompt('')
  }

  async function autoPrompt() {
    if (!selected) return
    setPromptLoading(true)
    try {
      const { prompt: p } = await adminFetch<{ prompt: string }>('/api/admin/seedance/prompt', {
        method: 'POST',
        body: JSON.stringify({ exerciseName: selected.name, muscleGroup: selected.muscle_group, equipment: selected.equipment }),
      })
      setPrompt(p)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setPromptLoading(false)
    }
  }

  function onGenerate() {
    if (!selected) return
    generate({
      exerciseId: selected.id,
      exerciseName: selected.name,
      prompt,
      model, generationType,
      referenceImageUrl: referenceImageUrl.trim() || undefined,
      params: { duration, aspectRatio, resolution, seed: -1 },
    })
  }

  const busy = state.phase === 'generating' || state.phase === 'publishing'

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 512, marginLeft: 'auto', marginRight: 'auto' }}>
      <div>
        <label style={labelStyle}>Exercice sans vidéo ({exercises.length})</label>
        <select value={selectedId} onChange={(e) => onSelect(e.target.value)} style={fieldStyle}>
          <option value="">— Choisir un exercice —</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}{ex.muscle_group ? ` · ${ex.muscle_group}` : ''}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Image de référence (URL — active image→vidéo)</label>
        <input value={referenceImageUrl} onChange={(e) => setReferenceImageUrl(e.target.value)}
          placeholder="https://… (laisser vide = texte→vidéo)" style={fieldStyle} />
        <p style={mutedStyle}>Mode : {generationType}{selected?.gif_url ? ' — thumbnail pré-rempli' : ''}</p>
      </div>

      <div>
        <label style={labelStyle}>Prompt</label>
        <button type="button" onClick={autoPrompt} disabled={promptLoading || !selected}
          style={{ ...btnPrimary, marginBottom: 8, opacity: promptLoading || !selected ? 0.6 : 1 }}>
          {promptLoading ? 'Génération…' : 'Générer le prompt (Claude)'}
        </button>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} style={fieldStyle} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={selectStyle}>
          <option value="seedance-2-0">seedance-2-0 (pro)</option>
          <option value="seedance-2-0-fast">fast</option>
          <option value="seedance-2-0-mini">mini</option>
        </select>
        <select value={resolution} onChange={(e) => setResolution(e.target.value)} style={selectStyle}>
          <option value="1080p">1080p</option>
          <option value="720p">720p</option>
          <option value="480p">480p</option>
        </select>
        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} style={selectStyle}>
          <option value="9:16">9:16</option>
          <option value="16:9">16:9</option>
          <option value="1:1">1:1</option>
        </select>
        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={selectStyle}>
          <option value={5}>5s</option>
          <option value={8}>8s</option>
          <option value={10}>10s</option>
        </select>
      </div>

      <button type="button" onClick={onGenerate} disabled={busy || !selected || !prompt.trim()}
        style={{ ...btnPrimary, opacity: busy || !selected || !prompt.trim() ? 0.6 : 1 }}>
        {state.phase === 'generating' ? 'Génération en cours (30s–2min)…' : 'Générer la vidéo'}
      </button>

      {state.error && <p style={{ color: '#ff6b6b' }}>{state.error}</p>}

      {state.phase === 'preview' && state.videoUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <video src={state.videoUrl} controls style={{ width: '100%', borderRadius: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onGenerate} style={{ ...btnPrimary, background: '#333' }}>Régénérer</button>
            <button type="button" onClick={publish} style={btnPrimary}>Publier dans le bucket</button>
          </div>
        </div>
      )}

      {state.phase === 'publishing' && <p style={mutedStyle}>Publication en cours…</p>}

      {state.phase === 'published' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ color: '#4ade80' }}>✅ Publié — la vidéo est visible dans l'app.</p>
          <button type="button" onClick={reset} style={btnPrimary}>Nouvelle vidéo</button>
        </div>
      )}
    </div>
  )
}
