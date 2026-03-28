'use client'
import {
  Check, Plus, Minus, Moon, Save, Sparkles, Loader2,
} from 'lucide-react'

type Exercise = { name: string; sets: number; reps: number; rest: string; notes: string }
type DayData   = { repos: boolean; exercises: Exercise[] }
type WeekProgram = Record<string, DayData>

const DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
const DAY_LABELS: Record<string,string> = { lundi:'Lun', mardi:'Mar', mercredi:'Mer', jeudi:'Jeu', vendredi:'Ven', samedi:'Sam', dimanche:'Dim' }
const DAY_FULL:   Record<string,string> = { lundi:'Lundi', mardi:'Mardi', mercredi:'Mercredi', jeudi:'Jeudi', vendredi:'Vendredi', samedi:'Samedi', dimanche:'Dimanche' }

interface ClientProgramProps {
  program: WeekProgram
  expandedDay: string | null
  setExpandedDay: (day: string | null) => void
  programSaving: boolean
  programSaved: boolean
  saveProgram: () => void
  toggleRepos: (day: string) => void
  removeExercise: (day: string, i: number) => void
  updateExercise: (day: string, i: number, field: keyof Exercise, val: string|number) => void
  openExDbModal: (day: string) => void
  setShowAiModal: (val: boolean) => void
  setAiPreview: (val: WeekProgram | null) => void
}

export default function ClientProgram({
  program, expandedDay, setExpandedDay, programSaving, programSaved,
  saveProgram, toggleRepos, removeExercise, updateExercise,
  openExDbModal, setShowAiModal, setAiPreview,
}: ClientProgramProps) {
  return (
    <div style={{animation:'fadeIn 200ms ease',display:'flex',flexDirection:'column',gap:12}}>
      {/* Actions */}
      <div style={{display:'flex',gap:8}}>
        <button
          onClick={()=>{setShowAiModal(true);setAiPreview(null)}}
          style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:7,padding:'12px 16px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.9rem',fontWeight:700,letterSpacing:'0.04em',background:'linear-gradient(135deg,#7C3AED,#A855F7)',color:'#fff',minHeight:44}}
        >
          <Sparkles size={14} strokeWidth={2.5}/>Générer avec l&apos;IA
        </button>
        <button className="btn-secondary" style={{padding:'12px 14px',flexShrink:0,gap:0}} onClick={saveProgram} disabled={programSaving} aria-label="Sauvegarder">
          {programSaving ? <Loader2 size={15} strokeWidth={2} style={{animation:'spin 0.7s linear infinite'}}/> : <Save size={15} strokeWidth={2.5}/>}
        </button>
      </div>
      {programSaved && (
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:'rgba(34,197,94,.07)',border:'1px solid rgba(34,197,94,.18)',borderRadius:8,color:'#22C55E',fontSize:'0.78rem',fontWeight:600}}>
          <Check size={12} strokeWidth={2.5}/>Programme sauvegardé
        </div>
      )}

      {/* Day chips — horizontal scroll */}
      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2}}>
        {DAYS.map(day => {
          const d = program[day]
          const isActive = expandedDay === day
          const hasEx = !d.repos && d.exercises.length > 0
          return (
            <button
              key={day}
              className="day-chip"
              onClick={()=>setExpandedDay(isActive?null:day)}
              style={{
                background: d.repos?'rgba(107,114,128,.1)':isActive?'#F97316':hasEx?'rgba(249,115,22,.12)':'#1A1A1A',
                color: d.repos?'#6B7280':isActive?'#fff':hasEx?'#F97316':'#9CA3AF',
                border: `1.5px solid ${isActive?'#F97316':d.repos?'#1E1E1E':hasEx?'rgba(249,115,22,.25)':'#242424'}`,
              }}
            >
              {DAY_LABELS[day]}
              {d.repos && <Moon size={9} style={{marginLeft:3}}/>}
              {hasEx && <span style={{marginLeft:4,background:'rgba(249,115,22,.2)',borderRadius:999,padding:'0 4px',fontSize:'0.62rem'}}>{d.exercises.length}</span>}
            </button>
          )
        })}
      </div>

      {/* Expanded day */}
      {expandedDay && (
        <div className="card" style={{padding:0,overflow:'hidden',animation:'fadeIn 150ms ease'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderBottom:'1px solid #1E1E1E'}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:700,color:'#F8FAFC'}}>{DAY_FULL[expandedDay]}</span>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <button
                onClick={()=>toggleRepos(expandedDay)}
                style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:700,background:program[expandedDay].repos?'rgba(107,114,128,.18)':'rgba(107,114,128,.08)',color:program[expandedDay].repos?'#9CA3AF':'#6B7280',minHeight:36}}
              >
                <Moon size={11} strokeWidth={2}/>{program[expandedDay].repos?'Repos ✓':'Repos'}
              </button>
              {!program[expandedDay].repos && (
                <button
                  onClick={()=>openExDbModal(expandedDay)}
                  style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:700,background:'rgba(249,115,22,.12)',color:'#F97316',minHeight:36}}
                >
                  <Plus size={12} strokeWidth={2.5}/>Ajouter
                </button>
              )}
            </div>
          </div>

          {program[expandedDay].repos ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'28px 16px',color:'#6B7280'}}>
              <Moon size={20} strokeWidth={1.5}/><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:600}}>Jour de repos</span>
            </div>
          ) : program[expandedDay].exercises.length === 0 ? (
            <div style={{textAlign:'center',padding:'28px 16px',color:'#6B7280',fontSize:'0.85rem'}}>Aucun exercice — cliquez Ajouter</div>
          ) : (
            <div style={{padding:'0 14px'}}>
              {program[expandedDay].exercises.map((ex,idx)=>(
                <div key={idx} className="ex-row-m">
                  {/* Name + delete */}
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input
                      placeholder="Nom de l'exercice"
                      value={ex.name}
                      onChange={e=>updateExercise(expandedDay,idx,'name',e.target.value)}
                      style={{flex:1,background:'#0A0A0A',border:'1px solid #242424',borderRadius:8,padding:'9px 11px',fontFamily:'Barlow,sans-serif',fontSize:'0.88rem',color:'#F8FAFC',outline:'none',minHeight:40}}
                      onFocus={e=>{e.target.style.borderColor='#F97316'}}
                      onBlur={e=>{e.target.style.borderColor='#242424'}}
                    />
                    <button onClick={()=>removeExercise(expandedDay,idx)} style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.15)',cursor:'pointer',color:'#EF4444',padding:0,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',width:40,height:40,flexShrink:0}}>
                      <Minus size={14} strokeWidth={2.5}/>
                    </button>
                  </div>
                  {/* Sets / Reps / Rest / Notes */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6}}>
                    {([
                      {label:'Séries',field:'sets' as const,type:'number',val:ex.sets},
                      {label:'Reps',field:'reps' as const,type:'number',val:ex.reps},
                      {label:'Repos',field:'rest' as const,type:'text',val:ex.rest},
                      {label:'Notes',field:'notes' as const,type:'text',val:ex.notes},
                    ]).map(({label,field,type,val})=>(
                      <div key={field}>
                        <div className="col-hdr">{label}</div>
                        <input
                          type={type}
                          min={type==='number'?1:undefined}
                          inputMode={type==='number'?'numeric':undefined}
                          value={val}
                          placeholder={field==='rest'?'60s':field==='notes'?'…':''}
                          onChange={e=>updateExercise(expandedDay,idx,field,type==='number'?parseInt(e.target.value)||1:e.target.value)}
                          style={{width:'100%',background:'#0A0A0A',border:'1px solid #242424',borderRadius:7,padding:'7px 7px',fontFamily:'Barlow,sans-serif',fontSize:'0.8rem',color:'#F8FAFC',outline:'none',textAlign:type==='number'?'center':'left',minHeight:36}}
                          onFocus={e=>{e.target.style.borderColor='#F97316'}}
                          onBlur={e=>{e.target.style.borderColor='#242424'}}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{padding:'10px 0'}}>
                <button
                  onClick={()=>openExDbModal(expandedDay)}
                  style={{display:'flex',alignItems:'center',gap:6,background:'transparent',border:'1.5px dashed #242424',borderRadius:10,padding:'10px 14px',cursor:'pointer',color:'#6B7280',fontFamily:'Barlow,sans-serif',fontSize:'0.82rem',width:'100%',justifyContent:'center',minHeight:44}}
                  onFocus={e=>{e.currentTarget.style.borderColor='#F97316';e.currentTarget.style.color='#F97316'}}
                  onBlur={e=>{e.currentTarget.style.borderColor='#242424';e.currentTarget.style.color='#6B7280'}}
                >
                  <Plus size={13} strokeWidth={2.5}/>Ajouter un exercice
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
