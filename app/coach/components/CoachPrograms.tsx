'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Copy, Trash2, ChevronDown, X, Save } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

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
  const [programToDelete, setProgramToDelete] = useState<{ id: string; name: string } | null>(null)

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
    setPrograms(data?.map((p: any) => ({ ...p, days: p.program?.days || [] })) || [])
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
      const { error } = await supabase.from('training_programs').update({
        name: pName.trim(), program: programData,
      }).eq('id', editing.id)

      if (error) {
        console.error("Erreur lors de la mise a jour du programme :", error)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from('training_programs').insert({
        name: pName.trim(), program: programData,
        coach_id: session?.user?.id, is_template: true,
      })

      if (error) {
        console.error("Erreur lors de la creation du programme :", error)
        setSaving(false)
        return
      }
    }
    setSaving(false); resetForm(); loadPrograms()
  }

  async function deleteProgram(id: string) {
    await supabase.from('training_programs').delete().eq('id', id)
    loadPrograms()
    setProgramToDelete(null)
  }

  function startEdit(p: Program) {
    setEditing(p); setPName(p.name); setPSplit(p.split || SPLITS[0])
    setPDuration(p.duration || DURATIONS[1]); setPDays(p.days || [])
    setCreating(true)
  }

  async function assignToClient() {
    if (!assignModal || !assignClientId) return
    setSaving(true)

    // Check anti-doublon : ce programme est-il deja assigne a ce client ?
    const { data: existing } = await supabase
      .from('client_programs')
      .select('id')
      .eq('client_id', assignClientId)
      .eq('coach_id', session.user.id)
      .eq('program_name', assignModal.name)
      .maybeSingle()

    if (existing) {
      alert(`Le programme "${assignModal.name}" est deja assigne a ce client.`)
      setSaving(false)
      return
    }

    // INSERT du programme
    const { error } = await supabase
      .from('client_programs')
      .insert({
        client_id: assignClientId,
        coach_id: session.user.id,
        program: assignModal.days,
        program_name: assignModal.name,
        training_program_id: assignModal.id ?? null,
      })

    if (error) {
      console.error('Erreur assignation programme :', error)
      alert(`Erreur assignation : ${error.message}`)
      setSaving(false)
      return
    }

    setSaving(false); setAssignModal(null); setAssignClientId('')
  }

  const cardStyle: React.CSSProperties = { background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20 }
  const inputStyle: React.CSSProperties = { width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', color: TEXT_PRIMARY, fontSize: 14, fontFamily: FONT_BODY, outline: 'none' }
  const labelStyle: React.CSSProperties = { fontFamily: FONT_ALT, fontSize: 11, color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginBottom: 6, display: 'block' }

  // List view
  if (!creating) return (
    <div style={{ padding: '16px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0, letterSpacing: '3px', textTransform: 'uppercase' }}>Programmes</h1>
        <button onClick={() => setCreating(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: GOLD, border: 'none', borderRadius: 12, padding: '8px 16px', color: BG_BASE, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const,  }}>
          <Plus size={16} /> Créer
        </button>
      </div>

      {loading ? (
        <p style={{ color: TEXT_DIM, textAlign: 'center', fontFamily: FONT_BODY }}>Chargement...</p>
      ) : programs.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
          <p style={{ color: TEXT_MUTED, margin: '0 0 16px', fontFamily: FONT_BODY }}>Aucun programme template créé</p>
          <button onClick={() => setCreating(true)} style={{ background: BG_CARD_2, border: `1px solid ${GOLD_RULE}`, borderRadius: 12, padding: '10px 20px', color: GOLD, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 14, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const }}>
            Créer ton premier programme
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {programs.map(p => (
            <div key={p.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY }}>{p.name}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>
                  {p.days?.length || 0} jours · {p.split || '–'} · {p.duration || '–'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setAssignModal(p)} title="Assigner" style={{ background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '6px 10px', cursor: 'pointer', color: GOLD }}><Copy size={14} /></button>
                <button onClick={() => startEdit(p)} title="Modifier" style={{ background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '6px 10px', cursor: 'pointer', color: TEXT_MUTED }}><ChevronDown size={14} /></button>
                <button onClick={() => setProgramToDelete({ id: p.id!, name: p.name })} title="Supprimer" style={{ background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '6px 10px', cursor: 'pointer', color: RED }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign modal */}
      {assignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setAssignModal(null)}>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 24, maxWidth: 400, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.3rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0, letterSpacing: '2px' }}>Assigner "{assignModal.name}"</h3>
              <button onClick={() => setAssignModal(null)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <label style={labelStyle}>Choisir un client</label>
            <select value={assignClientId} onChange={e => setAssignClientId(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }}>
              <option value="">Sélectionner...</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.client_id}>
                  {c.profiles?.full_name || c.profiles?.email || 'Client sans nom'}
                </option>
              ))}
            </select>
            <button onClick={assignToClient} disabled={!assignClientId || saving}
              style={{ width: '100%', background: GOLD, border: 'none', borderRadius: 12, padding: '12px', color: BG_BASE, fontFamily: FONT_ALT, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const,  }}>
              {saving ? 'Assignation...' : 'Assigner le programme'}
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!programToDelete}
        variant="danger"
        title="Supprimer ce programme ?"
        message={`Cette action est irréversible. Le programme "${programToDelete?.name}" sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => programToDelete && deleteProgram(programToDelete.id)}
        onCancel={() => setProgramToDelete(null)}
      />
    </div>
  )

  // Create/Edit view
  return (
    <div style={{ padding: '16px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0, letterSpacing: '3px', textTransform: 'uppercase' }}>
          {editing ? 'Modifier' : 'Créer'} un programme
        </h1>
        <button onClick={resetForm} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '6px 12px', color: TEXT_MUTED, fontFamily: FONT_ALT, fontSize: 13, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Annuler</button>
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
                style={{ ...inputStyle, width: 'auto', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, background: 'transparent', border: 'none', padding: '4px 0', color: GOLD, letterSpacing: '2px' }} />
              {pDays.length > 1 && <button onClick={() => removeDay(di)} style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer' }}><Trash2 size={14} /></button>}
            </div>

            {(day.exercises || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 12, background: BORDER }}>
                {(day.exercises || []).map((ex, ei) => (
                  <div key={ei} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: BG_BASE, padding: '8px 12px' }}>
                    <div>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_PRIMARY, fontWeight: 600 }}>{ex.name}</span>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED, marginLeft: 8 }}>{ex.sets}x{ex.reps} · {ex.rest}s repos</span>
                    </div>
                    <button onClick={() => removeExercise(di, ei)} style={{ background: 'none', border: 'none', color: TEXT_DIM, cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {addDayIdx === di ? (
              <div style={{ background: BG_BASE, borderRadius: RADIUS_CARD, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                  <button onClick={() => addExercise(di)} style={{ flex: 1, background: GOLD, border: 'none', borderRadius: 12, padding: '8px', color: BG_BASE, fontFamily: FONT_ALT, fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Ajouter</button>
                  <button onClick={() => setAddDayIdx(null)} style={{ background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 14px', color: TEXT_MUTED, fontFamily: FONT_ALT, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddDayIdx(di)} style={{ width: '100%', background: 'transparent', border: `1px dashed ${BORDER}`, borderRadius: 12, padding: '10px', color: TEXT_MUTED, fontFamily: FONT_ALT, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Plus size={14} /> Ajouter un exercice
              </button>
            )}
          </div>
        ))}

        <button onClick={addDay} style={{ background: 'transparent', border: `1px dashed ${BORDER}`, borderRadius: 12, padding: '14px', color: GOLD, fontFamily: FONT_ALT, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, letterSpacing: '1px', textTransform: 'uppercase' as const }}>
          <Plus size={16} /> Ajouter un jour
        </button>

        <button onClick={saveProgram} disabled={!pName.trim() || saving}
          style={{ width: '100%', background: GOLD, border: 'none', borderRadius: 12, padding: '16px', color: BG_BASE, fontWeight: 700, fontSize: 16, fontFamily: FONT_ALT, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '1.5px', textTransform: 'uppercase' as const,  }}>
          <Save size={18} /> {saving ? 'Sauvegarde...' : editing ? 'Mettre à jour' : 'Sauvegarder le programme'}
        </button>
      </div>
    </div>
  )
}
