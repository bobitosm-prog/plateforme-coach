'use client'
import {
  Mail, Calendar, Scale, Target, Dumbbell,
  Flame, TrendingDown, CheckCircle, Pencil,
  Check, X,
} from 'lucide-react'
import { colors, BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '@/lib/design-tokens'
type Profile = {
  id: string; full_name: string | null; email: string | null
  current_weight: number | null
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
  saveCalorieGoal, setEditingCalGoal, setEditTab, setEditOpen,
  showAllFoods, setShowAllFoods, resolvedFoods,
}: ClientOverviewProps) {
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
          {profile.target_weight && <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.3rem',fontWeight:700,color:'#F5EDD8',lineHeight:1,marginBottom:5}}>{profile.target_weight}<span style={{fontSize:'0.78rem',color:'#8A8070',marginLeft:2}}>kg</span></div>}
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
          {goalProgress !== null && (
            <div style={{marginTop:8}}>
              <div style={{background:'rgba(212,168,67,0.15)',borderRadius:999,height:4,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:999,background:'#D4A843',width:`${goalProgress}%`,transition:'width 600ms ease'}}/>
              </div>
              <span style={{fontSize:'0.62rem',color:'#8A8070',marginTop:3,display:'block'}}>{goalProgress}% atteint</span>
            </div>
          )}
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

      {/* Session history — cards */}
      <section>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <p className="section-title" style={{marginBottom:0}}>Historique séances</p>
          <span style={{fontSize:'0.72rem',color:'#8A8070'}}>{totalSessionsCount} total</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {sessions.length === 0 ? (
            <div className="card" style={{textAlign:'center',color:'#8A8070',padding:'28px 16px',fontSize:'0.85rem'}}>Aucune séance enregistrée</div>
          ) : sessions.map(s => (
            <div key={s.id} style={{background:'#141209',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,padding:'12px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:'#F5EDD8',fontSize:'0.95rem',textTransform:'capitalize'}}>{s.name ?? '—'}</div>
                  <div style={{fontSize:'0.7rem',color:'#8A8070',marginTop:2}}>{formatDate(s.created_at)}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                  {s.duration_minutes && <span style={{fontSize:'0.72rem',color:'#8A8070',background:'rgba(212,168,67,0.1)',borderRadius:6,padding:'2px 7px'}}>{s.duration_minutes} min</span>}
                  {s.completed && <CheckCircle size={14} color="#D4A843" strokeWidth={2}/>}
                </div>
              </div>
              {s.notes && <div style={{fontSize:'0.7rem',color:'#8A8070',marginTop:6,fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.notes}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
