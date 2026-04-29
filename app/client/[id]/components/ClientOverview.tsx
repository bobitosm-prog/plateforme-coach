'use client'
import { useState } from 'react'
import {
  Mail, Calendar, Scale, Target, Dumbbell,
  Flame, TrendingDown, CheckCircle, Pencil,
  Check, X,
} from 'lucide-react'
import { colors, BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '@/lib/design-tokens'
import { useIsMobile } from '@/app/hooks/useIsMobile'
type Profile = {
  id: string; full_name: string | null; email: string | null
  current_weight: number | null; start_weight: number | null
  calorie_goal: number | null; created_at: string
  phone: string | null; birth_date: string | null; gender: string | null
  height: number | null; target_weight: number | null
  body_fat_pct: number | null; objective: string | null; status: string | null
  dietary_type: string | null; allergies: string[] | null; liked_foods: string[] | null
  activity_level: string | null; tdee: number | null; protein_goal: number | null
  carbs_goal: number | null; fat_goal: number | null
}
type WorkoutSession = {
  id: string; created_at: string; name: string | null
  completed: boolean | null; duration_minutes: number | null; notes: string | null
  muscles_worked: string[] | null
}

interface ClientOverviewProps {
  profile: Profile
  currentWeight: number | null
  weightDelta: number | null
  totalSessions: number
  goalProgress: number | null
  streak: number
  sessions: WorkoutSession[]
  totalSessionsCount: number
  editingCalGoal: boolean
  calGoalInput: string
  setCalGoalInput: (val: string) => void
  saveCalorieGoal: () => void
  setEditingCalGoal: (val: boolean) => void
  saveTargetWeight: (val: number) => void
  saveObjective: (val: string | null) => void
  setEditTab: (tab: 'info'|'metrics'|'status') => void
  setEditOpen: (val: boolean) => void
  showAllFoods: boolean
  setShowAllFoods: (val: boolean) => void
  resolvedFoods: { id: string; name: string; emoji: string | null }[]
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
}
function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { month:'short', year:'numeric' })
}

export default function ClientOverview({
  profile, currentWeight, weightDelta, totalSessions, goalProgress, streak,
  sessions, totalSessionsCount, editingCalGoal, calGoalInput, setCalGoalInput,
  saveCalorieGoal, setEditingCalGoal, saveTargetWeight, saveObjective, setEditTab, setEditOpen,
  showAllFoods, setShowAllFoods, resolvedFoods,
}: ClientOverviewProps) {
  const isMobile = useIsMobile()

  // Inline edit: target weight
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')

  async function handleSaveTarget() {
    const val = parseFloat(targetInput)
    if (isNaN(val) || val < 20) return
    await saveTargetWeight(val)
    setEditingTarget(false)
  }

  // Inline edit: objective text
  const [editingObjective, setEditingObjective] = useState(false)
  const [objectiveInput, setObjectiveInput] = useState('')

  async function handleSaveObjective() {
    const val = objectiveInput.trim()
    await saveObjective(val || null)
    setEditingObjective(false)
  }

  const startWeight = profile.start_weight ?? profile.current_weight ?? currentWeight

  return (
    <div style={{animation:'fadeIn 200ms ease',display:'flex',flexDirection:'column',gap:12}}>

      {/* 2×2 Metrics */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {/* Poids */}
        <div className="metric-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#8A8070'}}>Poids</span>
            <div style={{width:27,height:27,background:'rgba(212,168,67,.12)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Scale size={13} color="#D4A843" strokeWidth={2}/></div>
          </div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.9rem',fontWeight:700,color:'#F5EDD8',lineHeight:1}}>
            {currentWeight ?? '—'}<span style={{fontSize:'0.85rem',color:'#8A8070',fontWeight:500,marginLeft:2}}>kg</span>
          </div>
          {weightDelta !== null && (
            <div style={{display:'flex',alignItems:'center',gap:3,marginTop:6}}>
              <TrendingDown size={11} color={weightDelta<=0?'#D4A843':colors.error} strokeWidth={2.5}/>
              <span style={{fontSize:'0.68rem',color:weightDelta<=0?'#D4A843':colors.error,fontWeight:600}}>{weightDelta>0?'+':''}{weightDelta.toFixed(1)} kg</span>
            </div>
          )}
        </div>
        {/* Objectif */}
        <div className="metric-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#8A8070'}}>Objectif</span>
            <div style={{width:27,height:27,background:'rgba(212,168,67,.12)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Target size={13} color="#D4A843" strokeWidth={2}/></div>
          </div>

          {/* Target weight — inline editable */}
          {editingTarget ? (
            <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:5}}>
              <input type="number" inputMode="decimal" value={targetInput} onChange={e=>setTargetInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleSaveTarget();if(e.key==='Escape')setEditingTarget(false)}} autoFocus style={{background:'#0D0B08',border:'1px solid #D4A843',borderRadius:6,padding:'4px 6px',color:'#F5EDD8',fontSize:'0.9rem',fontWeight:700,width:68,outline:'none',fontFamily:"'Barlow Condensed',sans-serif"}}/>
              <span style={{fontSize:'0.68rem',color:'#8A8070'}}>kg</span>
              <button onClick={handleSaveTarget} style={{background:'#D4A843',border:'none',borderRadius:6,padding:isMobile?'6px 8px':'4px 6px',cursor:'pointer',display:'flex',alignItems:'center',minHeight:28}}><Check size={11} color="#fff" strokeWidth={3}/></button>
              <button onClick={()=>setEditingTarget(false)} style={{background:'transparent',border:'none',cursor:'pointer',padding:isMobile?6:2,display:'flex',alignItems:'center'}}><X size={11} color="#8A8070"/></button>
            </div>
          ) : (
            <button onClick={()=>{setTargetInput(profile.target_weight?String(profile.target_weight):'');setEditingTarget(true)}} style={{background:'transparent',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:5,marginBottom:5}}>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.3rem',fontWeight:700,color:'#F5EDD8',lineHeight:1}}>{profile.target_weight??'—'}<span style={{fontSize:'0.78rem',color:'#8A8070',marginLeft:2}}>kg</span></span>
              <Pencil size={10} color="#8A8070" strokeWidth={2}/>
            </button>
          )}

          {/* Calorie goal — existing inline edit */}
          {editingCalGoal ? (
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <input type="number" inputMode="numeric" value={calGoalInput} onChange={e=>setCalGoalInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveCalorieGoal();if(e.key==='Escape')setEditingCalGoal(false)}} autoFocus style={{background:'#0D0B08',border:'1px solid #D4A843',borderRadius:6,padding:'4px 6px',color:'#F5EDD8',fontSize:'0.9rem',fontWeight:700,width:68,outline:'none',fontFamily:"'Barlow Condensed',sans-serif"}}/>
              <button onClick={saveCalorieGoal} style={{background:'#D4A843',border:'none',borderRadius:6,padding:'4px 6px',cursor:'pointer',display:'flex',alignItems:'center',minHeight:28}}><Check size={11} color="#fff" strokeWidth={3}/></button>
              <button onClick={()=>setEditingCalGoal(false)} style={{background:'transparent',border:'none',cursor:'pointer',padding:2,display:'flex',alignItems:'center'}}><X size={11} color="#8A8070"/></button>
            </div>
          ) : (
            <button onClick={()=>{setCalGoalInput(profile.calorie_goal?String(profile.calorie_goal):'');setEditingCalGoal(true)}} style={{background:'transparent',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:5}}>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:700,color:'#F5EDD8'}}>{profile.calorie_goal??'—'}<span style={{fontSize:'0.68rem',color:'#8A8070',marginLeft:2}}>kcal</span></span>
              <Pencil size={10} color="#8A8070" strokeWidth={2}/>
            </button>
          )}

          {/* Progress bar */}
          {goalProgress !== null && (
            <div style={{marginTop:8}}>
              <div style={{background:'rgba(212,168,67,0.15)',borderRadius:999,height:4,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:999,background:'#D4A843',width:`${goalProgress}%`,transition:'width 600ms ease'}}/>
              </div>
              <span style={{fontSize:'0.62rem',color:'#8A8070',marginTop:3,display:'block'}}>{goalProgress}% atteint</span>
            </div>
          )}

          {/* Weight journey: start → current → target */}
          {startWeight != null && profile.target_weight != null && (
            <div style={{marginTop:6,fontSize:'0.6rem',color:TEXT_DIM,fontFamily:FONT_ALT,letterSpacing:'0.05em'}}>
              {startWeight}kg → {currentWeight??'—'}kg → {profile.target_weight}kg
            </div>
          )}

          {/* Objective text — inline editable */}
          <div style={{marginTop:8}}>
            {editingObjective ? (
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <input type="text" value={objectiveInput} onChange={e=>setObjectiveInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleSaveObjective();if(e.key==='Escape')setEditingObjective(false)}} autoFocus placeholder="Ex: Perdre 5kg pour l'été" style={{background:'#0D0B08',border:'1px solid #D4A843',borderRadius:6,padding:'4px 6px',color:'#F5EDD8',fontSize:'0.72rem',flex:1,outline:'none',fontFamily:FONT_BODY}}/>
                <button onClick={handleSaveObjective} style={{background:'#D4A843',border:'none',borderRadius:6,padding:isMobile?'6px 8px':'4px 6px',cursor:'pointer',display:'flex',alignItems:'center',minHeight:28}}><Check size={11} color="#fff" strokeWidth={3}/></button>
                <button onClick={()=>setEditingObjective(false)} style={{background:'transparent',border:'none',cursor:'pointer',padding:isMobile?6:2,display:'flex',alignItems:'center'}}><X size={11} color="#8A8070"/></button>
              </div>
            ) : profile.objective ? (
              <button onClick={()=>{setObjectiveInput(profile.objective??'');setEditingObjective(true)}} style={{background:'transparent',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                <span style={{fontSize:'0.68rem',color:TEXT_MUTED,fontStyle:'italic',fontFamily:FONT_BODY}}>{profile.objective}</span>
                <Pencil size={9} color="#8A8070" strokeWidth={2}/>
              </button>
            ) : (
              <button onClick={()=>{setObjectiveInput('');setEditingObjective(true)}} style={{background:'transparent',border:`1px dashed ${BORDER}`,borderRadius:6,cursor:'pointer',padding:'4px 8px',display:'flex',alignItems:'center',gap:4,width:'100%',justifyContent:'center'}}>
                <span style={{fontSize:'0.62rem',color:TEXT_DIM,fontFamily:FONT_ALT,letterSpacing:'0.05em',textTransform:'uppercase'}}>+ Objectif</span>
              </button>
            )}
          </div>
        </div>
        {/* Séances */}
        <div className="metric-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#8A8070'}}>Séances</span>
            <div style={{width:27,height:27,background:'rgba(212,168,67,.12)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Dumbbell size={13} color="#D4A843" strokeWidth={2}/></div>
          </div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.9rem',fontWeight:700,color:'#F5EDD8',lineHeight:1}}>{totalSessions}</div>
          <div style={{display:'flex',alignItems:'center',gap:3,marginTop:6}}>
            <CheckCircle size={11} color="#D4A843" strokeWidth={2.5}/>
            <span style={{fontSize:'0.68rem',color:'#D4A843',fontWeight:600}}>complétées</span>
          </div>
        </div>
        {/* Streak */}
        <div className="metric-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#8A8070'}}>Streak</span>
            <div style={{width:27,height:27,background:'rgba(212,168,67,.12)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Flame size={13} color="#D4A843" strokeWidth={2}/></div>
          </div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'2.2rem',fontWeight:700,color:'#D4A843',lineHeight:1}}>{streak}</div>
          <span style={{fontSize:'0.68rem',color:'#D4A843',fontWeight:600,marginTop:6,display:'block'}}>jours consécutifs</span>
        </div>
      </div>

      {/* Session history — enriched cards */}
      <section>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <p className="section-title" style={{marginBottom:0}}>Historique seances</p>
          <span style={{fontSize:'0.72rem',color:'#8A8070'}}>{totalSessionsCount} total</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {sessions.length === 0 ? (
            <div className="card" style={{textAlign:'center',color:'#8A8070',padding:'28px 16px',fontSize:'0.85rem'}}>Aucune seance enregistree</div>
          ) : sessions.slice(0, 10).map(s => {
            const d = new Date(s.created_at)
            const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
            const dayLabel = d.toDateString() === today.toDateString() ? "Aujourd'hui" : d.toDateString() === yesterday.toDateString() ? 'Hier' : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
            return (
              <div key={s.id} style={{background:BG_CARD,border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'12px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
                    <div style={{width:36,height:36,borderRadius:10,background:'rgba(230,195,100,0.08)',border:'1px solid rgba(230,195,100,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Dumbbell size={16} color={GOLD} />
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:FONT_DISPLAY,fontWeight:700,color:TEXT_PRIMARY,fontSize:'0.9rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.name ?? 'Seance'}</div>
                      <div style={{fontSize:'0.7rem',color:TEXT_MUTED,marginTop:2}}>{dayLabel}{s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}</div>
                    </div>
                  </div>
                  {s.completed && <CheckCircle size={16} color={GOLD} strokeWidth={2}/>}
                </div>
                {s.notes && <div style={{fontSize:'0.7rem',color:TEXT_MUTED,marginTop:6,fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.notes}</div>}
                {s.muscles_worked && s.muscles_worked.length > 0 && (
                  <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>
                    {s.muscles_worked.map(m => (
                      <span key={m} style={{fontSize:'0.62rem',fontWeight:700,padding:'2px 6px',borderRadius:4,background:'rgba(230,195,100,0.08)',color:GOLD,fontFamily:FONT_ALT,letterSpacing:'0.05em',textTransform:'uppercase'}}>{m}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {totalSessionsCount > 10 && <div style={{textAlign:'center',marginTop:8}}><span style={{fontSize:'0.72rem',color:GOLD,cursor:'pointer',fontFamily:FONT_ALT,fontWeight:700,letterSpacing:'0.08em'}}>VOIR TOUTES LES SEANCES</span></div>}
      </section>
    </div>
  )
}
