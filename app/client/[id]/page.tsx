'use client'
import React from 'react'
import {
  ArrowLeft, Zap, Dumbbell,
  Check, X, Plus, Moon, Utensils, Search, Pencil, Sparkles, Loader2,
  LayoutDashboard, FileText, MessageCircle, CheckCircle,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import useClientDetail from './hooks/useClientDetail'
import { DAYS, DAY_LABELS } from './hooks/useClientDetail'
import ClientOverview from './components/ClientOverview'
import ClientProgram from './components/ClientProgram'
import ClientNutrition from './components/ClientNutrition'
import ClientMessages from './components/ClientMessages'
import ClientNotes from './components/ClientNotes'

/* ══════════════════════════════════════════════════════════════
   CONSTANTS (render-only)
══════════════════════════════════════════════════════════════ */
const MUSCLE_COLORS: Record<string, string> = {
  'Poitrine': '#EF4444', 'Dos': '#3B82F6', 'Épaules': '#8B5CF6',
  'Bras': '#F97316', 'Jambes': '#22C55E', 'Abdos': '#EAB308',
  'Fessiers': '#EC4899', 'Cardio': '#06B6D4',
}
const MUSCLE_FILTERS = ['Tous', 'Poitrine', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Abdos', 'Fessiers', 'Cardio']

/* ── Style constants ──────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width:'100%', background:'#111827', border:'1px solid #374151', borderRadius:8,
  padding:'11px 14px', fontFamily:'Barlow, sans-serif', fontSize:'0.9rem',
  color:'#F8FAFC', outline:'none', transition:'border-color 200ms ease',
}

/* ── EditField helper ──────────────────────────────────────── */
function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{display:'block',fontSize:'0.75rem',fontWeight:700,color:'#9CA3AF',marginBottom:6,letterSpacing:'0.06em',textTransform:'uppercase',fontFamily:"'Barlow Condensed',sans-serif"}}>{label}</label>
      {children}
    </div>
  )
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
export default function ClientProfilePage() {
  const h = useClientDetail()

  /* ── Loading / error ────────────────────────────────────────── */
  if (h.loading) return (
    <div style={{minHeight:'100vh',background:'#0A0A0A',padding:'20px 16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <div className="skeleton" style={{width:60,height:60,borderRadius:'50%'}} />
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
          <div className="skeleton" style={{height:16,width:'60%'}} />
          <div className="skeleton" style={{height:12,width:'40%'}} />
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{height:80,borderRadius:14}} />)}
      </div>
    </div>
  )
  if (h.error || !h.profile) return (
    <div style={{minHeight:'100vh',background:'#0A0A0A',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <p style={{color:'#EF4444',fontSize:'0.9rem'}}>{h.error ?? 'Client introuvable'}</p>
      <button onClick={()=>h.router.back()} style={{color:'#F97316',background:'none',border:'1px solid #F97316',borderRadius:8,padding:'8px 18px',cursor:'pointer',fontFamily:'Barlow Condensed,sans-serif',fontWeight:600}}>← Retour</button>
    </div>
  )

  const profile = h.profile

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="client-page-root" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0A0A0A' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        body{margin:0;font-family:'Barlow',sans-serif;background:#0A0A0A;color:#F8FAFC;overscroll-behavior-y:none;overflow-x:hidden;max-width:100vw;}
        h1,h2,h3,h4{font-family:'Barlow Condensed',sans-serif;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .card{background:#141414;border:1px solid #242424;border-radius:16px;padding:16px;}
        .metric-card{background:#141414;border:1px solid #242424;border-radius:14px;padding:14px;}
        .section-title{font-family:'Barlow Condensed',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:12px;}
        .btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#F97316;color:#fff;padding:12px 20px;border-radius:10px;font-family:'Barlow Condensed',sans-serif;font-size:.95rem;font-weight:700;letter-spacing:.04em;border:none;cursor:pointer;transition:opacity 200ms,transform 150ms;min-height:44px;}
        .btn-primary:active{transform:scale(0.97);opacity:.9;}
        .btn-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:transparent;color:#F97316;border:1.5px solid #F97316;padding:10px 16px;border-radius:10px;font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:700;letter-spacing:.04em;cursor:pointer;transition:background 200ms,color 200ms;min-height:44px;}
        .btn-secondary:active{background:#F97316;color:#fff;}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#9CA3AF;border:none;padding:10px 12px;border-radius:8px;font-family:'Barlow',sans-serif;font-size:.875rem;font-weight:500;cursor:pointer;transition:background 150ms,color 150ms;min-height:44px;}
        .btn-ghost:active{background:#242424;color:#F8FAFC;}
        .badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-family:'Barlow Condensed',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}
        .badge-active{background:rgba(34,197,94,.12);color:#22C55E;border:1px solid rgba(34,197,94,.2);}
        .badge-warning{background:rgba(249,115,22,.12);color:#F97316;border:1px solid rgba(249,115,22,.2);}
        .badge-inactive{background:rgba(156,163,175,.08);color:#9CA3AF;border:1px solid rgba(156,163,175,.12);}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;pointer-events:none;transition:opacity 200ms ease;}
        .modal-overlay.open{opacity:1;pointer-events:all;}
        .modal{background:#111111;border:1px solid #242424;border-radius:20px;max-width:480px;width:92%;transform:translateY(12px);transition:transform 200ms ease;overflow:hidden;}
        .modal-overlay.open .modal{transform:translateY(0);}
        .toast-el{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1A1A1A;border:1px solid #242424;border-left:3px solid #22C55E;color:#F8FAFC;padding:11px 16px;border-radius:10px;font-size:.85rem;font-weight:500;display:flex;align-items:center;gap:8px;z-index:300;animation:slideUp 200ms ease;box-shadow:0 8px 32px rgba(0,0,0,.5);white-space:nowrap;}
        .col-hdr{font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;margin-bottom:3px;}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#0F0F0F;border-top:1px solid #1E1E1E;z-index:50;padding-bottom:env(safe-area-inset-bottom,0px);}
        .nav-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px 4px;border:none;background:transparent;cursor:pointer;transition:color 150ms;min-height:52px;}
        .day-chip{flex-shrink:0;display:inline-flex;align-items:center;padding:8px 14px;border-radius:10px;border:none;cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.82rem;font-weight:700;letter-spacing:.05em;transition:all 150ms ease;min-height:44px;}
        .ex-row-m{display:flex;flex-direction:column;gap:7px;padding:12px 0;border-bottom:1px solid #1E1E1E;}
        .ex-row-m:last-child{border-bottom:none;}
        .food-row-m{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-bottom:1px solid #1a1f2e;}
        .desktop-sidebar-client{display:none;}
        .desktop-header-client{display:none;}
        .desktop-tabs{display:none;}
        @media(min-width:768px){
          .mobile-header-client{display:none !important;}
          .bottom-nav{display:none !important;}
          .desktop-sidebar-client{display:flex !important;flex-direction:column;width:280px;min-height:100vh;border-right:1px solid #242424;padding:24px;flex-shrink:0;position:sticky;top:0;height:100vh;overflow-y:auto;}
          .desktop-header-client{display:flex !important;align-items:center;gap:12px;padding:16px 32px;border-bottom:1px solid #242424;position:sticky;top:0;z-index:40;background:#0A0A0A;}
          .desktop-tabs{display:flex !important;gap:4px;padding:0 32px;border-bottom:1px solid #242424;background:#0A0A0A;}
          .desktop-tabs button{padding:12px 16px;border:none;background:transparent;cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.85rem;font-weight:700;letter-spacing:.04em;color:#6B7280;border-bottom:2px solid transparent;transition:all 150ms;}
          .desktop-tabs button.dt-active{color:#C9A84C;border-bottom-color:#C9A84C;}
          .main-client-content{max-width:100% !important;padding:24px 32px 32px !important;margin:0 !important;}
          .client-page-root{flex-direction:row !important;}
        }
        .food-row-m:last-child{border-bottom:none;}
        input[type=number]::-webkit-inner-spin-button{opacity:.4;}
        input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:999px;background:#242424;outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#A855F7;cursor:pointer;border:2px solid #0A0A0A;box-shadow:0 2px 8px rgba(168,85,247,.4);}
        ::-webkit-scrollbar{display:none;}
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      <div className="desktop-sidebar-client">
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:24}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#C9A84C,#D4AF37)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.5rem',fontWeight:700,color:'#000'}}>{initials(profile.full_name)}</div>
          <div style={{textAlign:'center'}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.2rem',fontWeight:700,color:'#F8FAFC'}}>{profile.full_name}</div>
            {profile.email && <div style={{fontSize:'0.72rem',color:'#6B7280'}}>{profile.email}</div>}
          </div>
          {(() => { const s = profile.status ?? 'active'; const cfg = s==='warning'?{cls:'badge-warning',l:'À relancer'}:s==='inactive'?{cls:'badge-inactive',l:'Inactif'}:{cls:'badge-active',l:'Actif'}; return <span className={`badge ${cfg.cls}`}>{cfg.l}</span> })()}
        </div>
        <div style={{borderTop:'1px solid #242424',paddingTop:16,display:'flex',flexDirection:'column',gap:10}}>
          {[{l:'Poids',v:profile.current_weight?`${profile.current_weight} kg`:'—'},{l:'Objectif',v:profile.target_weight?`${profile.target_weight} kg`:'—'},{l:'TDEE',v:profile.tdee?`${profile.tdee} kcal`:'—'}].map(({l,v})=>(<div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:'0.82rem'}}><span style={{color:'#6B7280'}}>{l}</span><span style={{color:'#F8FAFC',fontWeight:600}}>{v}</span></div>))}
        </div>
        {profile.dietary_type && (
          <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:4}}>
            <span className="badge badge-active">{profile.dietary_type}</span>
            {(profile.allergies||[]).map((a:string)=>(<span key={a} style={{display:'inline-flex',padding:'3px 8px',borderRadius:999,fontSize:'0.62rem',fontWeight:700,background:'rgba(239,68,68,.12)',color:'#EF4444',border:'1px solid rgba(239,68,68,.2)'}}>{a}</span>))}
          </div>
        )}
        <div style={{marginTop:'auto',paddingTop:16,display:'flex',flexDirection:'column',gap:8}}>
          <button onClick={h.generateAiMealPlan} disabled={h.aiMealGenerating} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:10,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#C9A84C,#D4AF37)',color:'#000',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.82rem',fontWeight:700,width:'100%'}}>
            <Sparkles size={14}/>Générer plan IA
          </button>
          <button onClick={()=>h.router.push('/coach')} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:10,border:'1px solid #2A2A2A',background:'transparent',color:'#6B7280',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.82rem',fontWeight:700,width:'100%'}}>
            <ArrowLeft size={14}/>Retour clients
          </button>
        </div>
      </div>

      {/* ── DESKTOP CONTENT WRAPPER ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,minWidth:0}}>

      {/* ── DESKTOP HEADER ── */}
      <div className="desktop-header-client">
        <button onClick={()=>h.router.push('/coach')} style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:10,background:'#1A1A1A',border:'1px solid #242424',cursor:'pointer',color:'#9CA3AF'}}><ArrowLeft size={16} strokeWidth={2.5}/></button>
        <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#C9A84C,#D4AF37)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'0.7rem',color:'#000'}}>{initials(profile.full_name)}</div>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.1rem',fontWeight:700,color:'#F8FAFC'}}>{profile.full_name}</span>
      </div>

      {/* ── DESKTOP TABS ── */}
      <div className="desktop-tabs">
        {(['apercu','programme','nutrition','messages','notes'] as const).map(t=>(
          <button key={t} className={h.activeTab===t?'dt-active':''} onClick={()=>h.setActiveTab(t)}>
            {{apercu:'Aperçu',programme:'Programme',nutrition:'Nutrition',messages:'Messages',notes:'Notes'}[t]}
          </button>
        ))}
      </div>

      {/* ── MOBILE HEADER ── */}
      <header className="mobile-header-client" style={{flexShrink:0,background:'#0F0F0F',borderBottom:'1px solid #1E1E1E',zIndex:40,height:52,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px'}}>
        <button onClick={()=>h.router.push('/coach')} style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:10,background:'#1A1A1A',border:'1px solid #242424',cursor:'pointer',color:'#9CA3AF',flexShrink:0}} aria-label="Retour">
          <ArrowLeft size={16} strokeWidth={2.5}/>
        </button>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:22,height:22,background:'#F97316',borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Zap size={12} color="#fff" strokeWidth={2.5}/>
          </div>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:700,color:'#F8FAFC',letterSpacing:'0.08em'}}>MOOVX</span>
        </div>
        <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#F97316,#FB923C)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:'0.72rem',color:'#fff',flexShrink:0}}>
          {initials(profile.full_name)}
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <main className="main-client-content" data-scroll-container style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'14px 14px 80px',maxWidth:600,margin:'0 auto'}}>

        {/* ══ TAB: APERÇU ══ */}
        {h.activeTab === 'apercu' && (
          <ClientOverview
            profile={profile}
            currentWeight={h.currentWeight}
            weightDelta={h.weightDelta}
            totalSessions={h.totalSessions}
            goalProgress={h.goalProgress}
            streak={h.streak}
            sessions={h.sessions}
            totalSessionsCount={h.totalSessionsCount}
            editingCalGoal={h.editingCalGoal}
            calGoalInput={h.calGoalInput}
            setCalGoalInput={h.setCalGoalInput}
            saveCalorieGoal={h.saveCalorieGoal}
            setEditingCalGoal={h.setEditingCalGoal}
            setEditTab={h.setEditTab}
            setEditOpen={h.setEditOpen}
            showAllFoods={h.showAllFoods}
            setShowAllFoods={h.setShowAllFoods}
            resolvedFoods={h.resolvedFoods}
          />
        )}

        {/* ══ TAB: PROGRAMME ══ */}
        {h.activeTab === 'programme' && (
          <ClientProgram
            program={h.program}
            expandedDay={h.expandedDay}
            setExpandedDay={h.setExpandedDay}
            programSaving={h.programSaving}
            programSaved={h.programSaved}
            saveProgram={h.saveProgram}
            toggleRepos={h.toggleRepos}
            removeExercise={h.removeExercise}
            updateExercise={h.updateExercise}
            openExDbModal={h.openExDbModal}
            setShowAiModal={h.setShowAiModal}
            setAiPreview={h.setAiPreview}
          />
        )}

        {/* ══ TAB: NUTRITION ══ */}
        {h.activeTab === 'nutrition' && (
          <ClientNutrition
            profile={profile}
            mealPlan={h.mealPlan}
            calorieTarget={h.calorieTarget}
            protTarget={h.protTarget}
            carbTarget={h.carbTarget}
            fatTarget={h.fatTarget}
            setCalorieTarget={h.setCalorieTarget}
            setProtTarget={h.setProtTarget}
            setCarbTarget={h.setCarbTarget}
            setFatTarget={h.setFatTarget}
            mealPlanSaving={h.mealPlanSaving}
            mealPlanSaved={h.mealPlanSaved}
            saveMealPlan={h.saveMealPlan}
            expandedMealDay={h.expandedMealDay}
            setExpandedMealDay={h.setExpandedMealDay}
            addFood={h.addFood}
            removeFood={h.removeFood}
            updateFood={h.updateFood}
            aiMealGenerating={h.aiMealGenerating}
            aiMealStreamStatus={h.aiMealStreamStatus}
            aiMealPreview={h.aiMealPreview}
            aiMealPreviewDay={h.aiMealPreviewDay}
            setAiMealPreviewDay={h.setAiMealPreviewDay}
            setAiMealPreview={h.setAiMealPreview}
            generateAiMealPlan={h.generateAiMealPlan}
            acceptAiMealPlan={h.acceptAiMealPlan}
            clientActivePlan={h.clientActivePlan}
            clientActivePlanDay={h.clientActivePlanDay}
            setClientActivePlanDay={h.setClientActivePlanDay}
            weeklyTracking={h.weeklyTracking}
          />
        )}

        {/* ══ TAB: MESSAGES ══ */}
        {h.activeTab === 'messages' && (
          <ClientMessages
            coachMessages={h.coachMessages}
            coachMsgInput={h.coachMsgInput}
            setCoachMsgInput={h.setCoachMsgInput}
            sendCoachMessage={h.sendCoachMessage}
            coachId={h.coachId}
          />
        )}

        {/* ══ TAB: NOTES ══ */}
        {h.activeTab === 'notes' && (
          <ClientNotes
            notes={h.notes}
            notesSaved={h.notesSaved}
            notesSaving={h.notesSaving}
            onNotesChange={h.onNotesChange}
            saveNotes={h.saveNotes}
            showToast={h.showToast}
          />
        )}
      </main>
      </div>{/* end desktop content wrapper */}

      {/* ── BOTTOM NAVIGATION ─────────────────────────────────────── */}
      <nav className="bottom-nav">
        <div style={{display:'flex',alignItems:'stretch',height:52}}>
          {([
            {id:'apercu',    label:'Aperçu',     icon:(a:boolean)=><LayoutDashboard size={20} strokeWidth={a?2.5:1.5}/>},
            {id:'programme', label:'Programme',  icon:(a:boolean)=><Dumbbell        size={20} strokeWidth={a?2.5:1.5}/>},
            {id:'nutrition', label:'Nutrition',  icon:(a:boolean)=><Utensils        size={20} strokeWidth={a?2.5:1.5}/>},
            {id:'messages',  label:'Messages',   icon:(a:boolean)=><MessageCircle   size={20} strokeWidth={a?2.5:1.5}/>},
            {id:'notes',     label:'Notes',      icon:(a:boolean)=><FileText        size={20} strokeWidth={a?2.5:1.5}/>},
          ] as {id:'apercu'|'programme'|'nutrition'|'notes'|'messages', label:string, icon:(a:boolean)=>React.ReactNode}[]).map(tab => {
            const active = h.activeTab === tab.id
            return (
              <button
                key={tab.id}
                className="nav-tab"
                onClick={()=>h.setActiveTab(tab.id)}
                style={{color: active ? '#F97316' : '#4B5563'}}
                aria-label={tab.label}
              >
                {tab.icon(active)}
                <span style={{fontSize:'0.55rem',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,letterSpacing:'0.05em',textTransform:'uppercase'}}>{tab.label}</span>
                {active && <div style={{position:'absolute',bottom:0,width:24,height:2,background:'#F97316',borderRadius:'2px 2px 0 0'}}/>}
              </button>
            )
          })}
        </div>
      </nav>

      {/* EDIT MODAL */}
      <div className={`modal-overlay${h.editOpen?' open':''}`} onClick={()=>h.setEditOpen(false)}>
        <div className="modal" style={{maxWidth:560,padding:0,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid #374151'}}>
            <h2 style={{fontSize:'1.4rem',fontWeight:700,margin:0,color:'#F8FAFC',fontFamily:"'Barlow Condensed',sans-serif"}}>Modifier le profil</h2>
            <button style={{background:'#374151',border:'none',borderRadius:8,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onClick={()=>h.setEditOpen(false)}>
              <X size={16} color="#9CA3AF" strokeWidth={2}/>
            </button>
          </div>
          <div style={{display:'flex',gap:0,borderBottom:'1px solid #374151',background:'#111827'}}>
            {(['info','metrics','status'] as const).map(tab => {
              const labels = { info:'Informations', metrics:'Métriques', status:'Statut & Objectif' }
              return (
                <button key={tab} onClick={()=>h.setEditTab(tab)} style={{flex:1,padding:'12px 8px',border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.82rem',fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',transition:'all 150ms ease',background:'transparent',color:h.editTab===tab?'#F97316':'#6B7280',borderBottom:h.editTab===tab?'2px solid #F97316':'2px solid transparent',marginBottom:-1}}>
                  {labels[tab]}
                </button>
              )
            })}
          </div>
          <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:14,maxHeight:'60vh',overflowY:'auto'}}>
            {h.editTab === 'info' && (<>
              <EditField label="Nom complet"><input value={h.editName} onChange={e=>h.setEditName(e.target.value)} style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/></EditField>
              <EditField label="Email"><input type="email" value={h.editEmail} onChange={e=>h.setEditEmail(e.target.value)} style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/></EditField>
              <EditField label="Téléphone"><input type="tel" value={h.editPhone} onChange={e=>h.setEditPhone(e.target.value)} placeholder="+33 6 00 00 00 00" style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/></EditField>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <EditField label="Date de naissance"><input type="date" value={h.editBirth} onChange={e=>h.setEditBirth(e.target.value)} style={{...inputStyle,colorScheme:'dark'} as React.CSSProperties} onFocus={e=>{e.target.style.borderColor='#F97316'}} onBlur={e=>{e.target.style.borderColor='#374151'}}/></EditField>
                <EditField label="Genre">
                  <select value={h.editGender} onChange={e=>h.setEditGender(e.target.value)} style={{...inputStyle,appearance:'none',cursor:'pointer'} as React.CSSProperties} onFocus={e=>{e.target.style.borderColor='#F97316'}} onBlur={e=>{e.target.style.borderColor='#374151'}}>
                    <option value="">Non précisé</option><option value="homme">Homme</option><option value="femme">Femme</option><option value="autre">Autre</option>
                  </select>
                </EditField>
              </div>
            </>)}
            {h.editTab === 'metrics' && (<>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <EditField label="Poids actuel (kg)"><input type="number" step="0.1" value={h.editWeight} onChange={e=>h.setEditWeight(e.target.value)} placeholder="70" style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/></EditField>
                <EditField label="Taille (cm)"><input type="number" step="1" value={h.editHeight} onChange={e=>h.setEditHeight(e.target.value)} placeholder="175" style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/></EditField>
                <EditField label="Poids cible (kg)"><input type="number" step="0.1" value={h.editTargetW} onChange={e=>h.setEditTargetW(e.target.value)} placeholder="65" style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/></EditField>
                <EditField label="% Graisse corporelle"><input type="number" step="0.1" value={h.editBodyFat} onChange={e=>h.setEditBodyFat(e.target.value)} placeholder="20" style={inputStyle} onFocus={e=>{e.target.style.borderColor='#F97316';e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,.15)'}} onBlur={e=>{e.target.style.borderColor='#374151';e.target.style.boxShadow='none'}}/></EditField>
              </div>
              {h.editWeight && h.editHeight && (() => {
                const bmi = (parseFloat(h.editWeight) / ((parseFloat(h.editHeight)/100)**2)).toFixed(1)
                const bmiNum = parseFloat(bmi)
                const cat = bmiNum < 18.5 ? {label:'Insuffisance pondérale',color:'#60A5FA'} : bmiNum < 25 ? {label:'Poids normal',color:'#22C55E'} : bmiNum < 30 ? {label:'Surpoids',color:'#FBBF24'} : {label:'Obésité',color:'#EF4444'}
                return (
                  <div style={{background:'#111827',border:'1px solid #374151',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:'0.8rem',color:'#6B7280',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>IMC calculé</span>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.1rem',fontWeight:700,color:cat.color}}>{bmi} <span style={{fontSize:'0.75rem',color:'#6B7280',fontWeight:500}}>— {cat.label}</span></span>
                  </div>
                )
              })()}
            </>)}
            {h.editTab === 'status' && (<>
              <EditField label="Statut">
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[{val:'active',label:'Actif',color:'#22C55E'},{val:'warning',label:'À relancer',color:'#F97316'},{val:'inactive',label:'Inactif',color:'#9CA3AF'}].map(({val,label,color})=>(
                    <button key={val} onClick={()=>h.setEditStatus(val)} style={{padding:'10px 8px',borderRadius:8,border:`2px solid ${h.editStatus===val?color:'#374151'}`,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.85rem',fontWeight:700,background:h.editStatus===val?`${color}20`:'transparent',color:h.editStatus===val?color:'#6B7280',transition:'all 150ms ease'}}>{label}</button>
                  ))}
                </div>
              </EditField>
              <EditField label="Objectif">
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {[{val:'perte_poids',label:'Perte de poids',icon:'📉'},{val:'prise_masse',label:'Prise de masse',icon:'💪'},{val:'maintien',label:'Maintien',icon:'⚖️'},{val:'performance',label:'Performance',icon:'🏆'}].map(({val,label,icon})=>(
                    <button key={val} onClick={()=>h.setEditObj(val)} style={{padding:'12px 10px',borderRadius:8,border:`2px solid ${h.editObj===val?'#F97316':'#374151'}`,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.85rem',fontWeight:700,background:h.editObj===val?'rgba(249,115,22,.12)':'transparent',color:h.editObj===val?'#F97316':'#6B7280',transition:'all 150ms ease',display:'flex',alignItems:'center',gap:8}}><span>{icon}</span>{label}</button>
                  ))}
                </div>
              </EditField>
            </>)}
          </div>
          <div style={{display:'flex',gap:10,padding:'16px 24px',borderTop:'1px solid #374151'}}>
            <button className="btn-secondary" style={{flex:1,justifyContent:'center'}} onClick={()=>h.setEditOpen(false)}>Annuler</button>
            <button className="btn-primary" style={{flex:1,justifyContent:'center'}} onClick={h.saveEdit}><Check size={14} strokeWidth={2.5}/>Enregistrer</button>
          </div>
        </div>
      </div>

      {/* ── EXERCISE DB SEARCH MODAL ── */}
      <AnimatePresence>
        {h.showExDbModal && (
          <motion.div key="exdb-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => h.setShowExDbModal(false)}>
            <motion.div key="exdb-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()} style={{ background: '#111827', border: '1px solid #374151', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: '0.05em' }}>BASE D&apos;EXERCICES</h3>
                    {h.exDbTargetDay && <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '2px 0 0', textTransform: 'capitalize' }}>Ajouter à · {h.exDbTargetDay}</p>}
                  </div>
                  <button onClick={() => h.setShowExDbModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#1F2937', border: '1px solid #374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color="#6B7280" /></button>
                </div>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#6B7280', pointerEvents: 'none' }} />
                  <input value={h.exDbSearch} onChange={e => h.setExDbSearch(e.target.value)} placeholder="Rechercher un exercice..." autoFocus style={{ ...inputStyle, paddingLeft: 40, borderRadius: 12, fontSize: '0.88rem' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 14 }}>
                  {MUSCLE_FILTERS.map(mg => {
                    const active = h.exDbFilter === mg; const color = MUSCLE_COLORS[mg] ?? '#F97316'
                    return (<button key={mg} onClick={() => h.setExDbFilter(mg)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, border: `1px solid ${active ? color : '#374151'}`, background: active ? `${color}22` : '#1F2937', color: active ? color : '#6B7280', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 150ms', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}>{mg}</button>)
                  })}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 32px' }}>
                {(() => {
                  let list = h.exDbSearch.length >= 2 ? h.exDbResults : h.exDbAll
                  if (h.exDbFilter !== 'Tous') list = list.filter(ex => ex.muscle_group === h.exDbFilter)
                  if (list.length === 0) return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 0', color: '#6B7280' }}>
                      <Dumbbell size={32} strokeWidth={1.5} />
                      <p style={{ fontSize: '0.85rem', margin: 0 }}>{h.exDbSearch.length >= 2 ? 'Aucun résultat' : h.exDbAll.length === 0 ? 'Chargement...' : 'Aucun exercice pour ce groupe'}</p>
                    </div>
                  )
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {list.map((ex: any) => {
                        const mgColor = MUSCLE_COLORS[ex.muscle_group] ?? '#6B7280'
                        const diffColor = ex.difficulty === 'Avancé' ? '#EF4444' : ex.difficulty === 'Intermédiaire' ? '#F97316' : '#22C55E'
                        return (
                          <motion.button key={ex.id} whileTap={{ scale: 0.96 }} onClick={() => h.selectExercise(ex)}
                            style={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 14, padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'border-color 150ms' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = mgColor)} onMouseLeave={e => (e.currentTarget.style.borderColor = '#374151')}>
                            <div style={{ height: 3, background: mgColor, width: '100%', flexShrink: 0 }} />
                            <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.2 }}>{ex.name}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {ex.muscle_group && <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: mgColor, background: `${mgColor}20`, borderRadius: 4, padding: '2px 6px', display: 'inline-block', width: 'fit-content' }}>{ex.muscle_group}</span>}
                                {ex.equipment && <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#9CA3AF', background: '#2D3748', borderRadius: 4, padding: '2px 6px', display: 'inline-block', width: 'fit-content' }}>{ex.equipment}</span>}
                                {ex.difficulty && <span style={{ fontSize: '0.58rem', fontWeight: 700, color: diffColor, background: `${diffColor}18`, borderRadius: 4, padding: '2px 6px', display: 'inline-block', width: 'fit-content' }}>{ex.difficulty}</span>}
                              </div>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI PROGRAM GENERATOR MODAL ── */}
      <AnimatePresence>
        {h.showAiModal && (
          <motion.div key="ai-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => { if (!h.aiGenerating) h.setShowAiModal(false) }}>
            <motion.div key="ai-modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }} onClick={e => e.stopPropagation()}
              style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #374151', background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.08))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7C3AED,#A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={18} color="#fff" strokeWidth={2} /></div>
                  <div>
                    <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: '0.05em' }}>GÉNÉRER AVEC L&apos;IA</h2>
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>Claude génère un programme personnalisé</p>
                  </div>
                </div>
                {!h.aiGenerating && <button onClick={() => h.setShowAiModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#1F2937', border: '1px solid #374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color="#6B7280" /></button>}
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {h.aiGenerating && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '56px 24px' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 1s linear infinite' }}><Loader2 size={28} color="#fff" strokeWidth={2} /></div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: '0.04em' }}>L&apos;IA génère votre programme…</p>
                      <p style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 6 }}>Cela prend quelques secondes</p>
                    </div>
                  </div>
                )}
                {!h.aiGenerating && h.aiPreview && (
                  <div style={{ padding: '20px 24px' }}>
                    <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: '#22C55E', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>✓ Programme généré — aperçu</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                      {DAYS.map(d => {
                        const day = h.aiPreview![d]
                        return (
                          <div key={d} style={{ background: '#1A1A2E', borderRadius: 10, padding: '10px 14px', border: `1px solid ${day.repos ? '#1F2937' : 'rgba(124,58,237,0.3)'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: day.repos ? '#4B5563' : '#A855F7', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                              {day.repos ? <span style={{ fontSize: '0.72rem', color: '#4B5563', display: 'flex', alignItems: 'center', gap: 4 }}><Moon size={10} /> Repos</span>
                                : <span style={{ fontSize: '0.72rem', color: '#A855F7', fontWeight: 600 }}>{day.exercises.length} exercice{day.exercises.length !== 1 ? 's' : ''}</span>}
                            </div>
                            {!day.repos && day.exercises.length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {day.exercises.map((ex, i) => <span key={i} style={{ fontSize: '0.68rem', background: 'rgba(124,58,237,0.15)', color: '#C4B5FD', borderRadius: 6, padding: '2px 8px' }}>{ex.name}</span>)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={h.generateAiProgram} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: '1px solid #374151', background: 'transparent', color: '#9CA3AF', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700 }}><Sparkles size={13} /> Régénérer</button>
                      <button onClick={h.acceptAiPreview} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em' }}><Check size={15} strokeWidth={2.5} /> Accepter ce programme</button>
                    </div>
                  </div>
                )}
                {!h.aiGenerating && !h.aiPreview && (
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ background: '#0F172A', borderRadius: 10, padding: '12px 16px', border: '1px solid #1E293B' }}>
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Contexte client (auto-rempli)</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div><p style={{ fontSize: '0.68rem', color: '#6B7280', margin: '0 0 2px' }}>Objectif</p><p style={{ fontSize: '0.82rem', color: '#F8FAFC', margin: 0, fontWeight: 500 }}>{profile?.objective || '—'}</p></div>
                        <div><p style={{ fontSize: '0.68rem', color: '#6B7280', margin: '0 0 2px' }}>Poids actuel</p><p style={{ fontSize: '0.82rem', color: '#F8FAFC', margin: 0, fontWeight: 500 }}>{h.currentWeight ? `${h.currentWeight} kg` : '—'}</p></div>
                        <div><p style={{ fontSize: '0.68rem', color: '#6B7280', margin: '0 0 2px' }}>Poids cible</p><p style={{ fontSize: '0.82rem', color: '#F8FAFC', margin: 0, fontWeight: 500 }}>{profile?.target_weight ? `${profile.target_weight} kg` : '—'}</p></div>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Niveau</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {h.AI_LEVELS.map(l => <button key={l} onClick={() => h.setAiLevel(l)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${h.aiLevel === l ? '#A855F7' : '#374151'}`, background: h.aiLevel === l ? 'rgba(168,85,247,0.15)' : 'transparent', color: h.aiLevel === l ? '#A855F7' : '#6B7280', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, transition: 'all 150ms' }}>{l}</button>)}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Équipement disponible</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {h.AI_EQUIPMENT.map(item => {
                          const checked = h.aiEquipment.includes(item)
                          return (<button key={item} onClick={() => h.toggleAiEquipment(item)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px solid ${checked ? '#A855F7' : '#374151'}`, background: checked ? 'rgba(168,85,247,0.15)' : 'transparent', color: checked ? '#A855F7' : '#6B7280', cursor: 'pointer', fontSize: '0.82rem', fontWeight: checked ? 700 : 500, transition: 'all 150ms' }}>
                            <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${checked ? '#A855F7' : '#4B5563'}`, background: checked ? '#A855F7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 150ms' }}>{checked && <Check size={9} color="#fff" strokeWidth={3} />}</div>
                            {item}
                          </button>)
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Jours d&apos;entraînement — <span style={{ color: '#A855F7' }}>{h.aiTrainingDays} jours/semaine</span> <span style={{ color: '#4B5563', fontWeight: 400, fontSize: '0.65rem' }}>({h.aiTrainingDays === 3 ? 'Full Body' : h.aiTrainingDays === 4 ? 'Upper/Lower' : h.aiTrainingDays === 5 ? 'PPL+UL' : 'PPL x2'})</span></label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '0.78rem', color: '#6B7280', minWidth: 12 }}>3</span>
                        <input type="range" min={3} max={6} step={1} value={h.aiTrainingDays} onChange={e => h.setAiTrainingDays(parseInt(e.target.value))} style={{ flex: 1, accentColor: '#A855F7', cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.78rem', color: '#6B7280', minWidth: 12 }}>6</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        {[3, 4, 5, 6].map(n => <span key={n} style={{ fontSize: '0.68rem', color: n === h.aiTrainingDays ? '#A855F7' : '#4B5563', fontWeight: n === h.aiTrainingDays ? 700 : 400 }}>{n}j</span>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!h.aiGenerating && !h.aiPreview && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid #374151' }}>
                  <button onClick={h.generateAiProgram} disabled={h.aiEquipment.length === 0}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, border: 'none', background: h.aiEquipment.length === 0 ? '#1F2937' : 'linear-gradient(135deg,#7C3AED,#A855F7)', color: h.aiEquipment.length === 0 ? '#4B5563' : '#fff', cursor: h.aiEquipment.length === 0 ? 'not-allowed' : 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                    <Sparkles size={16} strokeWidth={2} />Générer le programme
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {h.toast && (
        <div className="toast-el">
          <CheckCircle size={15} color="#22C55E" strokeWidth={2}/>
          <span>{h.toast}</span>
        </div>
      )}
    </div>
  )
}
