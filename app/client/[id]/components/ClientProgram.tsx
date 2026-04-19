'use client'
import {
  Check, Plus, Minus, Moon, Save, Sparkles, Loader2, Info, ArrowRightLeft,
} from 'lucide-react'
import ExerciseInfoPopup from '../../../components/ExerciseInfoPopup'
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
  variantPopup: {day: string, idx: number, variants: any[]} | null
  setVariantPopup: (v: any) => void
  loadVariants: (name: string, day: string, idx: number) => void
  selectVariant: (v: any) => void
  exerciseInfo: any
  setExerciseInfo: (v: any) => void
  loadExInfo: (name: string) => void
  clientCustomPrograms?: any[]
}

export default function ClientProgram({
  program, expandedDay, setExpandedDay, programSaving, programSaved,
  saveProgram, toggleRepos, removeExercise, updateExercise,
  openExDbModal, setShowAiModal, setAiPreview,
  swapMode, setSwapMode, swapFirst, handleDayClick,
  variantPopup, setVariantPopup, loadVariants, selectVariant,
  exerciseInfo, setExerciseInfo, loadExInfo,
  clientCustomPrograms = [],
}: ClientProgramProps) {
  return (
    <div style={{animation:'fadeIn 200ms ease',display:'flex',flexDirection:'column',gap:12}}>
      {/* Actions toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <button onClick={()=>{setShowAiModal(true);setAiPreview(null)}}
          style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.78rem',fontWeight:800,letterSpacing:'0.04em',background:GOLD,color:'#0D0B08',minHeight:36}}>
          <Sparkles size={13} strokeWidth={2.5}/>GENERER IA
        </button>
        <div style={{flex:1}} />
        <button className="btn-secondary" style={{padding:'9px 16px',flexShrink:0,gap:6,minHeight:36,borderRadius:10,fontSize:'0.78rem'}} onClick={saveProgram} disabled={programSaving}>
          {programSaving ? <Loader2 size={14} strokeWidth={2} style={{animation:'spin 0.7s linear infinite'}}/> : <><Save size={14} strokeWidth={2}/>SAUVEGARDER</>}
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
      {!swapMode ? (
        <button
          onClick={() => setSwapMode(true)}
          style={{
            width:'100%', padding:'10px', borderRadius:12,
            background: 'transparent',
            border: `1px solid ${BORDER}`,
            color: TEXT_MUTED,
            fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 700,
            letterSpacing: 1, cursor: 'pointer', marginBottom: 12,
          }}
        >
          Réorganiser les jours
        </button>
      ) : (
        <button
          onClick={() => { setSwapMode(false); }}
          style={{
            width:'100%', padding:'10px', borderRadius:12,
            background: GOLD_DIM,
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 700,
            letterSpacing: 1, cursor: 'pointer', marginBottom: 12,
          }}
        >
          {swapFirst ? `${DAY_LABELS[swapFirst]} sélectionné — cliquez un 2e jour` : 'Cliquez 2 jours pour les échanger'}
        </button>
      )}

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
                  {/* Name + variants + delete */}
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input
                      placeholder="Nom de l'exercice"
                      value={ex.name}
                      onChange={e=>updateExercise(expandedDay,idx,'name',e.target.value)}
                      style={{flex:1,background:BG_BASE,border:`1px solid ${BORDER}`,borderRadius:0,padding:'9px 11px',fontFamily:FONT_BODY,fontSize:'0.88rem',color:TEXT_PRIMARY,outline:'none',minHeight:40,minWidth:0}}
                      onFocus={e=>{e.target.style.borderColor=GOLD}}
                      onBlur={e=>{e.target.style.borderColor=BORDER}}
                    />
                    {ex.name && (
                      <>
                        <button onClick={()=>loadExInfo(ex.name)} title="Instructions" style={{background:'rgba(230,195,100,0.06)',border:'1px solid rgba(255,255,255,0.06)',cursor:'pointer',padding:0,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,flexShrink:0}}>
                          <Info size={15} color={GOLD} strokeWidth={2}/>
                        </button>
                        <button onClick={()=>loadVariants(ex.name,expandedDay,idx)} title="Variantes" style={{background:'rgba(230,195,100,0.06)',border:'1px solid rgba(255,255,255,0.06)',cursor:'pointer',padding:0,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,flexShrink:0}}>
                          <ArrowRightLeft size={14} color={GOLD} strokeWidth={2}/>
                        </button>
                      </>
                    )}
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
                          onChange={e=>{
                            if (type!=='number') { updateExercise(expandedDay,idx,field,e.target.value); return }
                            const raw=e.target.value; if(raw===''){updateExercise(expandedDay,idx,field,'');return}
                            const num=parseInt(raw); if(!isNaN(num))updateExercise(expandedDay,idx,field,num)
                          }}
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
      {/* Exercise info popup */}
      {exerciseInfo && <ExerciseInfoPopup info={exerciseInfo} onClose={() => setExerciseInfo(null)} />}

      {/* Variant popup */}
      {variantPopup && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setVariantPopup(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:BG_CARD,border:`1px solid ${GOLD_RULE}`,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,maxHeight:'60vh',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontFamily:FONT_DISPLAY,fontSize:20,letterSpacing:2,color:TEXT_PRIMARY}}>VARIANTES</span>
              <button onClick={()=>setVariantPopup(null)} style={{background:'none',border:'none',color:TEXT_MUTED,fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflowY:'auto',maxHeight:'calc(60vh - 60px)',padding:'8px 12px'}}>
              {variantPopup.variants.length === 0 ? (
                <div style={{textAlign:'center',padding:32,color:TEXT_MUTED,fontSize:14,fontFamily:FONT_BODY}}>Aucune variante trouvée</div>
              ) : variantPopup.variants.map((v,i)=>(
                <button key={i} onClick={()=>selectVariant(v)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',marginBottom:4,borderRadius:14,background:BG_BASE,border:`1px solid ${BORDER}`,cursor:'pointer',textAlign:'left',transition:'all 0.2s'}}>
                  <div style={{width:40,height:40,borderRadius:10,background:GOLD_DIM,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>
                    {v.equipment==='Barre'?'🏋️':v.equipment==='Haltères'?'💪':v.equipment==='Machine'?'⚙️':v.equipment==='Poulie'?'🔗':'🤸'}
                  </div>
                  <div>
                    <div style={{fontFamily:FONT_BODY,fontSize:14,color:TEXT_PRIMARY,fontWeight:500}}>{v.name}</div>
                    <div style={{fontFamily:FONT_ALT,fontSize:10,color:GOLD,fontWeight:700,letterSpacing:1,marginTop:2}}>{v.equipment||''}{v.muscle_group?` · ${v.muscle_group}`:''}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Client's own programs (custom_programs) ── */}
      {clientCustomPrograms.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <span style={{fontFamily:FONT_ALT,fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:GOLD}}>PROGRAMMES DU CLIENT</span>
            <div style={{flex:1,height:1,background:'rgba(201,168,76,0.25)'}} />
            <span style={{fontFamily:FONT_BODY,fontSize:10,color:TEXT_MUTED}}>{clientCustomPrograms.length} programme{clientCustomPrograms.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {clientCustomPrograms.map((cp: any) => {
              const exCount = Array.isArray(cp.days) ? cp.days.reduce((s: number, d: any) => s + (d.exercises?.length || 0), 0) : 0
              const dayCount = Array.isArray(cp.days) ? cp.days.filter((d: any) => !d.is_rest && d.exercises?.length > 0).length : 0
              const created = new Date(cp.created_at)
              const ago = Math.floor((Date.now() - created.getTime()) / 86400000)
              const agoLabel = ago === 0 ? "Aujourd'hui" : ago === 1 ? 'Hier' : `il y a ${ago}j`
              return (
                <div key={cp.id} style={{background:BG_CARD,border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'14px 16px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontFamily:FONT_DISPLAY,fontSize:'0.95rem',fontWeight:700,color:TEXT_PRIMARY,textTransform:'uppercase',letterSpacing:'0.05em'}}>{cp.name || 'Programme sans nom'}</span>
                    <span style={{fontFamily:FONT_ALT,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,letterSpacing:'0.08em',textTransform:'uppercase',background:cp.is_active ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',color:cp.is_active ? '#22c55e' : TEXT_DIM}}>{cp.is_active ? 'ACTIF' : 'INACTIF'}</span>
                  </div>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,color:TEXT_MUTED}}>
                    {dayCount} jour{dayCount > 1 ? 's' : ''} · {exCount} exercice{exCount > 1 ? 's' : ''} · {agoLabel}
                    {cp.source && <span style={{marginLeft:6,color:TEXT_DIM}}>· {cp.source === 'ai' ? 'IA' : cp.source === 'free_session' ? 'Seance libre' : cp.source}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
