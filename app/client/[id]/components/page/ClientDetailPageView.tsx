'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, Dumbbell, Utensils, LayoutDashboard, FileText, MessageCircle, Pencil, TrendingUp } from 'lucide-react'
import ClientOverview from '../ClientOverview'
import DeferredContentFallback from '@/app/components/loading/DeferredContentFallback'
import type { MealPlanTemplate } from '@/lib/meal-plan-templates'
import { BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE, RED, TEXT_PRIMARY, TEXT_MUTED, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '@/lib/design-tokens'
import type { ClientDetailState, ClientProgramTemplate } from './client-detail-page-types'

const deferredContent = () => <DeferredContentFallback />
const ClientProgram = dynamic(() => import('../ClientProgram'), { loading: deferredContent })
const ClientNutrition = dynamic(() => import('../ClientNutrition'), { loading: deferredContent })
const ClientMessages = dynamic(() => import('../ClientMessages'), { loading: deferredContent })
const ClientNotes = dynamic(() => import('../ClientNotes'), { loading: deferredContent })
const ClientProgress = dynamic(() => import('../ClientProgress'), { loading: deferredContent })

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
}

interface ClientDetailPageViewProps {
  detail: ClientDetailState
  onApplyMealTemplate: (template: MealPlanTemplate) => void
  onRequestTemplate: (template: ClientProgramTemplate) => void
}

export default function ClientDetailPageView({ detail: h, onApplyMealTemplate, onRequestTemplate }: ClientDetailPageViewProps) {
  const profile = h.profile!
  return (
    <div className="client-page-root" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: BG_BASE }}>
      {/* ── DESKTOP SIDEBAR ── */}
      <div className="desktop-sidebar-client">
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:24}}>
          <div style={{width:72,height:72,borderRadius:0,background:GOLD,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FONT_DISPLAY,fontSize:'1.8rem',fontWeight:400,color:'#0D0B08',letterSpacing:'2px'}}>{initials(profile.full_name)}</div>
          <div style={{textAlign:'center'}}>
            <div style={{fontFamily:FONT_DISPLAY,fontSize:'1.4rem',fontWeight:400,color:TEXT_PRIMARY,letterSpacing:'1px',textTransform:'uppercase'}}>{profile.full_name}</div>
            {profile.email && <div style={{fontSize:'0.72rem',fontFamily:FONT_BODY,color:TEXT_MUTED}}>{profile.email}</div>}
          </div>
          {(() => { const s = profile.status ?? 'active'; const cfg = s==='warning'?{cls:'badge-warning',l:'À relancer'}:s==='inactive'?{cls:'badge-inactive',l:'Inactif'}:{cls:'badge-active',l:'Actif'}; return <span className={`badge ${cfg.cls}`}>{cfg.l}</span> })()}
        </div>
        <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:16,display:'flex',flexDirection:'column',gap:10}}>
          {[{l:'Poids',v:profile.current_weight?`${profile.current_weight} kg`:'—'},{l:'Objectif',v:profile.target_weight?`${profile.target_weight} kg`:'—'},{l:'TDEE',v:profile.tdee?`${profile.tdee} kcal`:'—'}].map(({l,v})=>(<div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:'0.82rem'}}><span style={{fontFamily:FONT_ALT,color:TEXT_MUTED,fontWeight:700,fontSize:'11px',letterSpacing:'1px',textTransform:'uppercase'}}>{l}</span><span style={{fontFamily:FONT_BODY,color:TEXT_PRIMARY,fontWeight:600}}>{v}</span></div>))}
        </div>
        {profile.dietary_type && (
          <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:4}}>
            <span className="badge badge-active">{profile.dietary_type}</span>
            {(profile.allergies||[]).map((a:string)=>(<span key={a} style={{display:'inline-flex',padding:'3px 8px',borderRadius:0,fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,background:'rgba(239,68,68,.12)',color:RED,border:'1px solid rgba(239,68,68,.2)',letterSpacing:'1px',textTransform:'uppercase'}}>{a}</span>))}
          </div>
        )}
        <div style={{marginTop:'auto',paddingTop:16}}>
          <button onClick={()=>h.router.push('/coach')} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.06)',background:'transparent',color:TEXT_MUTED,cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.82rem',fontWeight:700,width:'100%'}}>
            <ArrowLeft size={14}/>Retour clients
          </button>
        </div>
      </div>

      {/* ── DESKTOP CONTENT WRAPPER ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,minWidth:0}}>

      {/* ── DESKTOP HEADER (compact — no duplicate name) ── */}
      <div className="desktop-header-client">
        <button onClick={()=>h.router.push('/coach')} style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:0,background:BG_CARD,border:`1px solid ${BORDER}`,cursor:'pointer',color:TEXT_MUTED}}><ArrowLeft size={16} strokeWidth={2.5}/></button>
        <span style={{fontFamily:FONT_ALT,fontSize:'0.82rem',fontWeight:700,color:TEXT_MUTED,letterSpacing:'0.04em',textTransform:'uppercase'}}>FICHE CLIENT</span>
        <div style={{flex:1}} />
        <button onClick={()=>{h.setEditTab('info');h.setEditOpen(true)}} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:8,background:'transparent',border:`1px solid rgba(255,255,255,0.06)`,cursor:'pointer',color:TEXT_MUTED,fontFamily:FONT_ALT,fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.04em'}}>
          <Pencil size={12}/>MODIFIER
        </button>
      </div>

      {/* ── DESKTOP TABS ── */}
      <div className="desktop-tabs">
        {(['apercu','programme','progression','nutrition','messages','notes'] as const).map(t=>(
          <button key={t} className={h.activeTab===t?'dt-active':''} onClick={()=>h.setActiveTab(t)}>
            {{apercu:'Aperçu',programme:'Programme',progression:'Progression',nutrition:'Nutrition',messages:'Messages',notes:'Notes'}[t]}
          </button>
        ))}
      </div>

      {/* ── MOBILE HEADER ── */}
      <header className="mobile-header-client" style={{flexShrink:0,zIndex:40,padding:'12px 14px 0'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',borderRadius:18,background:'rgba(20,18,9,0.55)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:'1px solid rgba(212,168,67,0.08)',boxShadow:'0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(232,201,122,0.04)'}}>
          <button onClick={()=>h.router.push('/coach')} style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:12,background:'transparent',border:'1px solid transparent',cursor:'pointer',color:TEXT_MUTED,flexShrink:0}} aria-label="Retour">
            <ArrowLeft size={16} strokeWidth={2.5}/>
          </button>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontFamily:FONT_DISPLAY,fontSize:18,letterSpacing:4,background:'linear-gradient(135deg, #E8C97A, #D4A843, #8B6914)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',lineHeight:1}}>MOOVX</span>
          </div>
          <div style={{width:34,height:34,borderRadius:'50%',border:`1.5px solid ${GOLD_RULE}`,background:GOLD_DIM,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FONT_DISPLAY,fontSize:14,color:GOLD,flexShrink:0}}>
            {initials(profile.full_name)}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <main className="main-client-content" data-scroll-container style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'14px 14px 140px'}}>

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
            saveTargetWeight={h.saveTargetWeight}
            saveObjective={h.saveObjective}
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
            swapMode={h.swapMode}
            setSwapMode={h.setSwapMode}
            swapFirst={h.swapFirst}
            handleDayClick={h.handleDayClick}
            variantPopup={h.variantPopup}
            setVariantPopup={h.setVariantPopup}
            loadVariants={h.loadVariants}
            selectVariant={h.selectVariant}
            exerciseInfo={h.exerciseInfo}
            setExerciseInfo={h.setExerciseInfo}
            loadExInfo={h.loadExInfo}
            clientCustomPrograms={h.clientCustomPrograms}
            coachTemplates={h.coachTemplates}
            onResyncFromTemplate={onRequestTemplate}
          />
        )}

        {/* ══ TAB: PROGRESSION ══ */}
        {h.activeTab === 'progression' && (
          <ClientProgress
            weightLogs={h.weightLogsFull}
            bodyMeasurements={h.bodyMeasurements}
            progressPhotos={h.clientProgressPhotos}
            completedSessions={h.sessions}
            startWeight={profile?.start_weight}
            targetWeight={profile?.target_weight}
            currentWeight={profile?.current_weight}
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
            onApplyTemplate={onApplyMealTemplate}
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
            supabase={h.supabase}
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
        <div style={{display:'flex',alignItems:'stretch',height:44}}>
          {([
            {id:'apercu',      label:'Aperçu',  icon:(a:boolean)=><LayoutDashboard size={18} strokeWidth={a?2.5:1.5}/>},
            {id:'programme',   label:'Progr.',   icon:(a:boolean)=><Dumbbell        size={18} strokeWidth={a?2.5:1.5}/>},
            {id:'progression', label:'Progres.', icon:(a:boolean)=><TrendingUp      size={18} strokeWidth={a?2.5:1.5}/>},
            {id:'nutrition',   label:'Nutri.',   icon:(a:boolean)=><Utensils        size={18} strokeWidth={a?2.5:1.5}/>},
            {id:'messages',    label:'Msgs',     icon:(a:boolean)=><MessageCircle   size={18} strokeWidth={a?2.5:1.5}/>},
            {id:'notes',       label:'Notes',    icon:(a:boolean)=><FileText        size={18} strokeWidth={a?2.5:1.5}/>},
          ] as const).map(tab => {
            const active = h.activeTab === tab.id
            return (
              <button
                key={tab.id}
                className="nav-tab"
                onClick={()=>h.setActiveTab(tab.id)}
                style={{color: active ? GOLD : '#3A3528'}}
                aria-label={tab.label}
              >
                {tab.icon(active)}
                <span style={{fontSize:'8px',fontFamily:FONT_ALT,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase'}}>{tab.label}</span>
                {active && <div style={{position:'absolute',bottom:0,width:24,height:2,background:GOLD,borderRadius:0}}/>}
              </button>
            )
          })}
        </div>
      </nav>

    </div>
  )
}
