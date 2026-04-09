'use client'
import {
  Check, Plus, Minus, Moon, Save, Sparkles, Loader2,
} from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '@/lib/design-tokens'

type Exercise = { name: string; sets: number; reps: number; rest: string; notes: string }
type DayData   = { repos: boolean; exercises: Exercise[]; day_name?: string }
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
  swapMode: boolean
  setSwapMode: (val: boolean) => void
  swapFirst: string | null
  handleDayClick: (day: string) => void
}

export default function ClientProgram({
  program, expandedDay, setExpandedDay, programSaving, programSaved,
  saveProgram, toggleRepos, removeExercise, updateExercise,
  openExDbModal, setShowAiModal, setAiPreview,
  swapMode, setSwapMode, swapFirst, handleDayClick,
}: ClientProgramProps) {
  return (
    <div style={{animation:'fadeIn 200ms ease',display:'flex',flexDirection:'column',gap:12}}>
      {/* Actions */}
      <div style={{display:'flex',gap:8}}>
        <button
          onClick={()=>{setShowAiModal(true);setAiPreview(null)}}
          style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:7,padding:'12px 16px',borderRadius:0,border:'none',cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.9rem',fontWeight:800,letterSpacing:'0.04em',background:GOLD,color:'#0D0B08',minHeight:44}}
        >
          <Sparkles size={14} strokeWidth={2.5}/>Générer avec l&apos;IA
        </button>
        <button className="btn-secondary" style={{padding:'12px 14px',flexShrink:0,gap:0}} onClick={saveProgram} disabled={programSaving} aria-label="Sauvegarder">
          {programSaving ? <Loader2 size={15} strokeWidth={2} style={{animation:'spin 0.7s linear infinite'}}/> : <Save size={15} strokeWidth={2.5}/>}
        </button>
      </div>
      {programSaved && (
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:GOLD_DIM,border:`1px solid ${GOLD_RULE}`,borderRadius:RADIUS_CARD,color:GOLD,fontFamily:FONT_ALT,fontSize:'0.78rem',fontWeight:700}}>
          <Check size={12} strokeWidth={2.5}/>Programme sauvegardé
        </div>
      )}

      {/* Calendrier semaine */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:6,marginBottom:12}}>
        {DAYS.map(day => {
          const d = program[day]
          const isActive = expandedDay === day
          const hasEx = !d.repos && d.exercises.length > 0
          return (
            <button
              key={day}
              onClick={()=>handleDayClick(day)}
              style={{
                display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                padding:'10px 4px',
                background:swapFirst===day?'rgba(232,201,122,0.2)':isActive?GOLD:d.repos?BG_CARD_2:hasEx?GOLD_DIM:BG_CARD,
                border:`1.5px solid ${swapFirst===day?'#E8C97A':isActive?GOLD:hasEx?GOLD_RULE:BORDER}`,
                borderRadius:14,
                cursor:'pointer',
                transition:'all 0.2s',
              }}
            >
              <span style={{
                fontFamily:FONT_ALT,fontSize:11,fontWeight:700,
                letterSpacing:1,textTransform:'uppercase',
                color:isActive?'#0D0B08':d.repos?TEXT_DIM:hasEx?GOLD:TEXT_MUTED,
              }}>{DAY_LABELS[day]}</span>
              {d.repos ? (
                <Moon size={14} color={TEXT_DIM}/>
              ) : (
                <span style={{
                  fontFamily:FONT_DISPLAY,fontSize:18,
                  color:isActive?'#0D0B08':hasEx?GOLD:TEXT_DIM,
                }}>{d.exercises.length}</span>
              )}
              {hasEx && !isActive && (
                <div style={{width:4,height:4,borderRadius:'50%',background:GOLD}}/>
              )}
            </button>
          )
        })}
      </div>

      {/* Swap days */}
      <button
        onClick={() => { setSwapMode(!swapMode); if (swapMode) { /* cancel */ } }}
        style={{
          width:'100%', padding:'10px', borderRadius:12,
          background: swapMode ? GOLD_DIM : 'transparent',
          border: `1px solid ${swapMode ? GOLD : BORDER}`,
          color: swapMode ? GOLD : TEXT_MUTED,
          fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 700,
          letterSpacing: 1, cursor: 'pointer', marginBottom: 12,
        }}
      >
        {swapMode ? (swapFirst ? `${DAY_LABELS[swapFirst]} sélectionné — cliquez un 2e jour` : 'Cliquez 2 jours pour les échanger') : 'Réorganiser les jours'}
      </button>

      {/* Expanded day */}
      {expandedDay && (
        <div className="card" style={{padding:0,overflow:'hidden',animation:'fadeIn 150ms ease'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderBottom:`1px solid ${BORDER}`}}>
            <span style={{fontFamily:FONT_DISPLAY,fontSize:'1.2rem',fontWeight:400,color:TEXT_PRIMARY,letterSpacing:'1px',textTransform:'uppercase'}}>{program[expandedDay].day_name ? `${DAY_FULL[expandedDay]} — ${program[expandedDay].day_name}` : DAY_FULL[expandedDay]}</span>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <button
                onClick={()=>toggleRepos(expandedDay)}
                style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:0,border:'none',cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.78rem',fontWeight:700,background:program[expandedDay].repos?'rgba(138,133,128,.18)':'rgba(138,133,128,.08)',color:program[expandedDay].repos?TEXT_MUTED:TEXT_DIM,minHeight:36}}
              >
                <Moon size={11} strokeWidth={2}/>{program[expandedDay].repos?'Repos ✓':'Repos'}
              </button>
              {!program[expandedDay].repos && (
                <button
                  onClick={()=>openExDbModal(expandedDay)}
                  style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:0,border:'none',cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.78rem',fontWeight:700,background:GOLD_DIM,color:GOLD,minHeight:36}}
                >
                  <Plus size={12} strokeWidth={2.5}/>Ajouter
                </button>
              )}
            </div>
          </div>

          {program[expandedDay].repos ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'28px 16px',color:TEXT_MUTED}}>
              <Moon size={20} strokeWidth={1.5}/><span style={{fontFamily:FONT_DISPLAY,fontSize:'1.1rem',fontWeight:400,letterSpacing:'1px',textTransform:'uppercase'}}>Jour de repos</span>
            </div>
          ) : program[expandedDay].exercises.length === 0 ? (
            <div style={{textAlign:'center',padding:'28px 16px',color:TEXT_MUTED,fontFamily:FONT_BODY,fontSize:'0.85rem'}}>Aucun exercice — cliquez Ajouter</div>
          ) : (
            <div style={{padding:'0 14px',overflowX:'auto'}}>
              {program[expandedDay].exercises.map((ex,idx)=>(
                <div key={idx} className="ex-row-m">
                  {/* Name + delete */}
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input
                      placeholder="Nom de l'exercice"
                      value={ex.name}
                      onChange={e=>updateExercise(expandedDay,idx,'name',e.target.value)}
                      style={{flex:1,background:BG_BASE,border:`1px solid ${BORDER}`,borderRadius:0,padding:'9px 11px',fontFamily:FONT_BODY,fontSize:'0.88rem',color:TEXT_PRIMARY,outline:'none',minHeight:40,minWidth:0}}
                      onFocus={e=>{e.target.style.borderColor=GOLD}}
                      onBlur={e=>{e.target.style.borderColor=BORDER}}
                    />
                    <button onClick={()=>removeExercise(expandedDay,idx)} style={{background:'rgba(239,68,68,.08)',border:`1px solid rgba(239,68,68,.15)`,cursor:'pointer',color:RED,padding:0,borderRadius:0,display:'flex',alignItems:'center',justifyContent:'center',width:40,height:40,flexShrink:0}}>
                      <Minus size={14} strokeWidth={2.5}/>
                    </button>
                  </div>
                  {/* Sets / Reps / Rest / Notes */}
                  <div style={{display:'grid',gridTemplateColumns:'60px 60px 65px 1fr',gap:6,minWidth:0}}>
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
                          style={{width:'100%',background:BG_BASE,border:`1px solid ${BORDER}`,borderRadius:0,padding:'7px 7px',fontFamily:FONT_BODY,fontSize:'0.8rem',color:TEXT_PRIMARY,outline:'none',textAlign:type==='number'?'center':'left',minHeight:36}}
                          onFocus={e=>{e.target.style.borderColor=GOLD}}
                          onBlur={e=>{e.target.style.borderColor=BORDER}}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{padding:'10px 0'}}>
                <button
                  onClick={()=>openExDbModal(expandedDay)}
                  style={{display:'flex',alignItems:'center',gap:6,background:'transparent',border:`1.5px dashed ${BORDER}`,borderRadius:0,padding:'10px 14px',cursor:'pointer',color:TEXT_MUTED,fontFamily:FONT_BODY,fontSize:'0.82rem',width:'100%',justifyContent:'center',minHeight:44}}
                  onFocus={e=>{e.currentTarget.style.borderColor=GOLD;e.currentTarget.style.color=GOLD}}
                  onBlur={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.color=TEXT_MUTED}}
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
