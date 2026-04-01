'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Copy, Trash2, ChevronDown, X, Save } from 'lucide-react'

const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

const GOLD = '#C9A84C'
const SPLITS = ['PPL (Push/Pull/Legs)', 'Full Body', 'Upper/Lower', 'Bro Split', 'Autre']
const DURATIONS = ['4 semaines', '6 semaines', '8 semaines', '12 semaines']

interface Exercise { name: string; sets: number; reps: string; rest: number }
interface ProgramDay { name: string; exercises: Exercise[] }
interface Program { id?: string; name: string; split: string; duration: string; days: ProgramDay[]; coach_id?: string; created_at?: string }

export default function CoachPrograms({ session, clients }: { session: any; clients: any[] }) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [assignModal, setAssignModal] = useState<Program | null>(null)
  const [assignClientId, setAssignClientId] = useState('')
  const [saving, setSaving] = useState(false)

  // New program state
  const [pName, setPName] = useState('')
  const [pSplit, setPSplit] = useState(SPLITS[0])
  const [pDuration, setPDuration] = useState(DURATIONS[1])
  const [pDays, setPDays] = useState<ProgramDay[]>([{ name: 'Jour 1', exercises: [] }])

  // Exercise add state
  const [addDayIdx, setAddDayIdx] = useState<number | null>(null)
  const [exName, setExName] = useState('')
  const [exSets, setExSets] = useState('4')
  const [exReps, setExReps] = useState('8-12')
  const [exRest, setExRest] = useState('90')
  const [exerciseDb, setExerciseDb] = useState<any[]>([])

  useEffect(() => {
    loadPrograms()
    supabase.from('exercises_db').select('name').order('name').limit(200).then(({ data }) => setExerciseDb(data || []))
  }, [])

  async function loadPrograms() {
    setLoading(true)
    const { data } = await supabase
      .from('training_programs')
      .select('*')
      .eq('coach_id', session.user.id)
      .eq('is_template', true)
      .order('created_at', { ascending: false })
      .limit(50)
    setPrograms(data?.map((p: any) => ({ ...p, days: p.program_data?.days || [] })) || [])
    setLoading(false)
  }

  function resetForm() {
    setPName(''); setPSplit(SPLITS[0]); setPDuration(DURATIONS[1])
    setPDays([{ name: 'Jour 1', exercises: [] }])
    setCreating(false); setEditing(null)
  }

  function addDay() {
    setPDays([...pDays, { name: `Jour ${pDays.length + 1}`, exercises: [] }])
  }

  function removeDay(idx: number) {
    setPDays(pDays.filter((_, i) => i !== idx))
  }

  function addExercise(dayIdx: number) {
    if (!exName.trim()) return
    const updated = [...pDays]
    updated[dayIdx].exercises.push({
      name: exName.trim(),
      sets: parseInt(exSets) || 4,
      reps: exReps || '8-12',
      rest: parseInt(exRest) || 90,
    })
    setPDays(updated)
    setExName(''); setExSets('4'); setExReps('8-12'); setExRest('90'); setAddDayIdx(null)
  }

  function removeExercise(dayIdx: number, exIdx: number) {
    const updated = [...pDays]
    updated[dayIdx].exercises = updated[dayIdx].exercises.filter((_, i) => i !== exIdx)
    setPDays(updated)
  }

  async function saveProgram() {
    if (!pName.trim() || pDays.length === 0) return
    setSaving(true)
    const programData = { days: pDays, split: pSplit, duration: pDuration }

    if (editing?.id) {
      await supabase.from('training_programs').update({
        name: pName.trim(), program_data: programData,
      }).eq('id', editing.id)
    } else {
      await supabase.from('training_programs').insert({
        name: pName.trim(), program_data: programData,
        coach_id: session.user.id, is_template: true,
      })
    }
    setSaving(false); resetForm(); loadPrograms()
  }

  async function deleteProgram(id: string) {
    if (!confirm('Supprimer ce programme ?')) return
    await supabase.from('training_programs').delete().eq('id', id)
    loadPrograms()
  }

  function startEdit(p: Program) {
    setEditing(p); setPName(p.name); setPSplit(p.split || SPLITS[0])
    setPDuration(p.duration || DURATIONS[1]); setPDays(p.days || [])
    setCreating(true)
  }

  async function assignToClient() {
    if (!assignModal || !assignClientId) return
    setSaving(true)
    await supabase.from('client_programs').upsert({
      client_id: assignClientId,
      coach_id: session.user.id,
      program: assignModal.days,
      program_name: assignModal.name,
    }, { onConflict: 'client_id' })
    setSaving(false); setAssignModal(null); setAssignClientId('')
  }

  const cardStyle: React.CSSProperties = { background: '#141414', border: '1px solid #242424', borderRadius: 14, padding: 20 }
  const inputStyle: React.CSSProperties = { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', color: '#f8fafc', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none' }
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' }

  // List view
  if (!creating) return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Programmes</h1>
        <button onClick={() => setCreating(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', borderRadius: 8, padding: '8px 16px', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={16} /> Créer
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#555', textAlign: 'center' }}>Chargement...</p>
      ) : programs.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#555', margin: '0 0 16px' }}>Aucun programme template créé</p>
          <button onClick={() => setCreating(true)} style={{ background: '#1a1a1a', border: `1px solid ${GOLD}40`, borderRadius: 8, padding: '10px 20px', color: GOLD, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Créer ton premier programme
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {programs.map(p => (
            <div key={p.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  {p.days?.length || 0} jours · {p.split || '–'} · {p.duration || '–'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setAssignModal(p)} title="Assigner" style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: GOLD }}><Copy size={14} /></button>
                <button onClick={() => startEdit(p)} title="Modifier" style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#9ca3af' }}><ChevronDown size={14} /></button>
                <button onClick={() => deleteProgram(p.id!)} title="Supprimer" style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign modal */}
      {assignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setAssignModal(null)}>
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Assigner "{assignModal.name}"</h3>
              <button onClick={() => setAssignModal(null)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <label style={labelStyle}>Choisir un client</label>
            <select value={assignClientId} onChange={e => setAssignClientId(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }}>
              <option value="">Sélectionner...</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
            </select>
            <button onClick={assignToClient} disabled={!assignClientId || saving}
              style={{ width: '100%', background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', borderRadius: 8, padding: '12px', color: '#000', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Assignation...' : 'Assigner le programme'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // Create/Edit view
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
          {editing ? 'Modifier' : 'Créer'} un programme
        </h1>
        <button onClick={resetForm} style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 12px', color: '#666', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Meta */}
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={labelStyle}>Nom du programme</label><input value={pName} onChange={e => setPName(e.target.value)} placeholder="PPL Débutant" style={inputStyle} /></div>
            <div><label style={labelStyle}>Split</label><select value={pSplit} onChange={e => setPSplit(e.target.value)} style={inputStyle}>{SPLITS.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div><label style={labelStyle}>Durée</label><select value={pDuration} onChange={e => setPDuration(e.target.value)} style={inputStyle}>{DURATIONS.map(d => <option key={d}>{d}</option>)}</select></div>
        </div>

        {/* Days */}
        {pDays.map((day, di) => (
          <div key={di} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <input value={day.name} onChange={e => { const u = [...pDays]; u[di].name = e.target.value; setPDays(u) }}
                style={{ ...inputStyle, width: 'auto', fontWeight: 700, fontSize: 15, background: 'transparent', border: 'none', padding: '4px 0', color: GOLD }} />
              {pDays.length > 1 && <button onClick={() => removeDay(di)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>}
            </div>

            {day.exercises.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {day.exercises.map((ex, ei) => (
                  <div key={ei} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a', borderRadius: 8, padding: '8px 12px' }}>
                    <div>
                      <span style={{ fontSize: 14, color: '#f8fafc', fontWeight: 600 }}>{ex.name}</span>
                      <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>{ex.sets}x{ex.reps} · {ex.rest}s repos</span>
                    </div>
                    <button onClick={() => removeExercise(di, ei)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {addDayIdx === di ? (
              <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select value={exName} onChange={e => setExName(e.target.value)} style={inputStyle}>
                  <option value="">Choisir un exercice...</option>
                  {exerciseDb.map((e: any) => <option key={e.name} value={e.name}>{e.name}</option>)}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Séries</label><input value={exSets} onChange={e => setExSets(e.target.value)} style={inputStyle} /></div>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Reps</label><input value={exReps} onChange={e => setExReps(e.target.value)} style={inputStyle} /></div>
                  <div><label style={{ ...labelStyle, fontSize: 10 }}>Repos (s)</label><input value={exRest} onChange={e => setExRest(e.target.value)} style={inputStyle} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => addExercise(di)} style={{ flex: 1, background: GOLD, border: 'none', borderRadius: 6, padding: '8px', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Ajouter</button>
                  <button onClick={() => setAddDayIdx(null)} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 14px', color: '#666', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddDayIdx(di)} style={{ width: '100%', background: 'transparent', border: '1px dashed #333', borderRadius: 8, padding: '10px', color: '#6b7280', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Plus size={14} /> Ajouter un exercice
              </button>
            )}
          </div>
        ))}

        <button onClick={addDay} style={{ background: 'transparent', border: '1px dashed #333', borderRadius: 12, padding: '14px', color: GOLD, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Plus size={16} /> Ajouter un jour
        </button>

        <button onClick={saveProgram} disabled={!pName.trim() || saving}
          style={{ width: '100%', background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, border: 'none', borderRadius: 12, padding: '16px', color: '#000', fontWeight: 700, fontSize: 16, fontFamily: "'Barlow Condensed', sans-serif", cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.04em' }}>
          <Save size={18} /> {saving ? 'Sauvegarde...' : editing ? 'Mettre à jour' : 'Sauvegarder le programme'}
        </button>
      </div>
    </div>
  )
}
