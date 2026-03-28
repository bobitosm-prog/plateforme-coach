'use client'
import {
  Mail, Calendar, Scale, Target, Dumbbell,
  Flame, TrendingDown, CheckCircle, Pencil,
  Check, X,
} from 'lucide-react'

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

      {/* Profile hero */}
      <div className="card" style={{position:'relative',overflow:'hidden',padding:'16px 16px 14px'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#F97316,#FB923C)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:12,marginTop:4}}>
          <div style={{position:'relative',flexShrink:0}}>
            <div style={{width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg,#F97316,#FB923C)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.3rem',fontWeight:700,color:'#fff',border:'3px solid #141414',boxShadow:'0 0 0 2px #F97316'}}>
              {initials(profile.full_name)}
            </div>
            <div style={{position:'absolute',bottom:2,right:2,width:12,height:12,background:'#22C55E',borderRadius:'50%',border:'2px solid #141414'}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
              <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.35rem',fontWeight:700,color:'#F8FAFC',margin:0,lineHeight:1}}>{profile.full_name ?? 'Client'}</h1>
              {(() => {
                const s = profile.status ?? 'active'
                const cfg = s==='warning' ? {cls:'badge-warning',label:'À relancer'} : s==='inactive' ? {cls:'badge-inactive',label:'Inactif'} : {cls:'badge-active',label:'Actif'}
                return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
              })()}
            </div>
            {profile.objective && (() => {
              const labels: Record<string,string> = {perte_poids:'Perte de poids',prise_masse:'Prise de masse',maintien:'Maintien',performance:'Performance'}
              return <span style={{fontSize:'0.75rem',color:'#6B7280'}}>{labels[profile.objective] ?? profile.objective}</span>
            })()}
          </div>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'3px 14px',marginTop:10,paddingTop:10,borderTop:'1px solid #1E1E1E'}}>
          {profile.email && <span style={{fontSize:'0.75rem',color:'#6B7280',display:'flex',alignItems:'center',gap:4}}><Mail size={12} strokeWidth={2}/>{profile.email}</span>}
          <span style={{fontSize:'0.75rem',color:'#6B7280',display:'flex',alignItems:'center',gap:4}}><Calendar size={12} strokeWidth={2}/>Depuis {formatMonthYear(profile.created_at)}</span>
        </div>
        {/* Nutrition preferences badges */}
        {(profile.dietary_type || profile.allergies?.length || profile.liked_foods?.length) && (
          <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #1E1E1E',display:'flex',flexWrap:'wrap',gap:6}}>
            {profile.dietary_type && (
              <span style={{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:999,fontSize:'0.68rem',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',fontFamily:"'Barlow Condensed',sans-serif",background:'rgba(34,197,94,0.12)',color:'#22C55E',border:'1px solid rgba(34,197,94,0.2)'}}>
                {profile.dietary_type === 'omnivore' ? '🥩 Omnivore' : profile.dietary_type === 'vegetarian' ? '🥗 Végétarien' : '🌱 Vegan'}
              </span>
            )}
            {(profile.allergies || []).map((a: string) => (
              <span key={a} style={{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:999,fontSize:'0.68rem',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',fontFamily:"'Barlow Condensed',sans-serif",background:'rgba(239,68,68,0.12)',color:'#EF4444',border:'1px solid rgba(239,68,68,0.2)'}}>
                {a}
              </span>
            ))}
            {(showAllFoods ? resolvedFoods : resolvedFoods.slice(0, 10)).map(f => (
              <span key={f.id} style={{display:'inline-flex',alignItems:'center',gap:2,padding:'3px 9px',borderRadius:999,fontSize:'0.68rem',fontWeight:700,letterSpacing:'0.06em',fontFamily:"'Barlow Condensed',sans-serif",background:'rgba(156,163,175,0.08)',color:'#9CA3AF',border:'1px solid rgba(156,163,175,0.12)'}}>
                {f.emoji || ''} {f.name}
              </span>
            ))}
            {resolvedFoods.length > 10 && !showAllFoods && (
              <button onClick={()=>setShowAllFoods(true)} style={{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:999,fontSize:'0.68rem',fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",background:'rgba(201,168,76,0.1)',color:'#C9A84C',border:'1px solid rgba(201,168,76,0.2)',cursor:'pointer'}}>
                +{resolvedFoods.length - 10} autres
              </button>
            )}
          </div>
        )}
        <button className="btn-secondary" style={{width:'100%',marginTop:12,fontSize:'0.85rem'}} onClick={()=>{ setEditTab('info'); setEditOpen(true) }}>
          <Pencil size={13} strokeWidth={2}/>Modifier le profil
        </button>
      </div>

      {/* 2×2 Metrics */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {/* Poids */}
        <div className="metric-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Poids</span>
            <div style={{width:27,height:27,background:'rgba(249,115,22,.12)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Scale size={13} color="#F97316" strokeWidth={2}/></div>
          </div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.9rem',fontWeight:700,color:'#F8FAFC',lineHeight:1}}>
            {currentWeight ?? '—'}<span style={{fontSize:'0.85rem',color:'#6B7280',fontWeight:500,marginLeft:2}}>kg</span>
          </div>
          {weightDelta !== null && (
            <div style={{display:'flex',alignItems:'center',gap:3,marginTop:6}}>
              <TrendingDown size={11} color={weightDelta<=0?'#22C55E':'#EF4444'} strokeWidth={2.5}/>
              <span style={{fontSize:'0.68rem',color:weightDelta<=0?'#22C55E':'#EF4444',fontWeight:600}}>{weightDelta>0?'+':''}{weightDelta.toFixed(1)} kg</span>
            </div>
          )}
        </div>
        {/* Objectif */}
        <div className="metric-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Objectif</span>
            <div style={{width:27,height:27,background:'rgba(34,197,94,.1)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Target size={13} color="#22C55E" strokeWidth={2}/></div>
          </div>
          {profile.target_weight && <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.3rem',fontWeight:700,color:'#F8FAFC',lineHeight:1,marginBottom:5}}>{profile.target_weight}<span style={{fontSize:'0.78rem',color:'#6B7280',marginLeft:2}}>kg</span></div>}
          {editingCalGoal ? (
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <input type="number" inputMode="numeric" value={calGoalInput} onChange={e=>setCalGoalInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveCalorieGoal();if(e.key==='Escape')setEditingCalGoal(false)}} autoFocus style={{background:'#0A0A0A',border:'1px solid #F97316',borderRadius:6,padding:'4px 6px',color:'#F8FAFC',fontSize:'0.9rem',fontWeight:700,width:68,outline:'none',fontFamily:"'Barlow Condensed',sans-serif"}}/>
              <button onClick={saveCalorieGoal} style={{background:'#22C55E',border:'none',borderRadius:6,padding:'4px 6px',cursor:'pointer',display:'flex',alignItems:'center',minHeight:28}}><Check size={11} color="#fff" strokeWidth={3}/></button>
              <button onClick={()=>setEditingCalGoal(false)} style={{background:'transparent',border:'none',cursor:'pointer',padding:2,display:'flex',alignItems:'center'}}><X size={11} color="#6B7280"/></button>
            </div>
          ) : (
            <button onClick={()=>{setCalGoalInput(profile.calorie_goal?String(profile.calorie_goal):'');setEditingCalGoal(true)}} style={{background:'transparent',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:5}}>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:700,color:'#F8FAFC'}}>{profile.calorie_goal??'—'}<span style={{fontSize:'0.68rem',color:'#6B7280',marginLeft:2}}>kcal</span></span>
              <Pencil size={10} color="#6B7280" strokeWidth={2}/>
            </button>
          )}
          {goalProgress !== null && (
            <div style={{marginTop:8}}>
              <div style={{background:'#242424',borderRadius:999,height:4,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:999,background:'#22C55E',width:`${goalProgress}%`,transition:'width 600ms ease'}}/>
              </div>
              <span style={{fontSize:'0.62rem',color:'#6B7280',marginTop:3,display:'block'}}>{goalProgress}% atteint</span>
            </div>
          )}
        </div>
        {/* Séances */}
        <div className="metric-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Séances</span>
            <div style={{width:27,height:27,background:'rgba(249,115,22,.12)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Dumbbell size={13} color="#F97316" strokeWidth={2}/></div>
          </div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.9rem',fontWeight:700,color:'#F8FAFC',lineHeight:1}}>{totalSessions}</div>
          <div style={{display:'flex',alignItems:'center',gap:3,marginTop:6}}>
            <CheckCircle size={11} color="#22C55E" strokeWidth={2.5}/>
            <span style={{fontSize:'0.68rem',color:'#22C55E',fontWeight:600}}>complétées</span>
          </div>
        </div>
        {/* Streak */}
        <div className="metric-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280'}}>Streak</span>
            <div style={{width:27,height:27,background:'rgba(249,115,22,.12)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Flame size={13} color="#F97316" strokeWidth={2}/></div>
          </div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'2.2rem',fontWeight:700,color:'#F97316',lineHeight:1}}>{streak}</div>
          <span style={{fontSize:'0.68rem',color:'#F97316',fontWeight:600,marginTop:6,display:'block'}}>jours consécutifs</span>
        </div>
      </div>

      {/* Session history — cards */}
      <section>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <p className="section-title" style={{marginBottom:0}}>Historique séances</p>
          <span style={{fontSize:'0.72rem',color:'#6B7280'}}>{totalSessionsCount} total</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {sessions.length === 0 ? (
            <div className="card" style={{textAlign:'center',color:'#6B7280',padding:'28px 16px',fontSize:'0.85rem'}}>Aucune séance enregistrée</div>
          ) : sessions.map(s => (
            <div key={s.id} style={{background:'#141414',border:'1px solid #242424',borderRadius:12,padding:'12px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:'#F8FAFC',fontSize:'0.95rem',textTransform:'capitalize'}}>{s.name ?? '—'}</div>
                  <div style={{fontSize:'0.7rem',color:'#6B7280',marginTop:2}}>{formatDate(s.created_at)}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                  {s.duration_minutes && <span style={{fontSize:'0.72rem',color:'#9CA3AF',background:'#1E1E1E',borderRadius:6,padding:'2px 7px'}}>{s.duration_minutes} min</span>}
                  {s.completed && <CheckCircle size={14} color="#22C55E" strokeWidth={2}/>}
                </div>
              </div>
              {s.notes && <div style={{fontSize:'0.7rem',color:'#6B7280',marginTop:6,fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.notes}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
