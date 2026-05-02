'use client'
import { useState } from 'react'
import {
  Check, Plus, Minus, Save, Sparkles, Loader2, Utensils, X,
  ChevronLeft, ChevronRight, Pencil,
} from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '@/lib/design-tokens'
import { useIsMobile } from '@/app/hooks/useIsMobile'
import { MEAL_PLAN_TEMPLATES, type MealPlanTemplate } from '@/lib/meal-plan-templates'

type FoodItem = { name: string; qty: string; kcal: number; prot: number; carb: number; fat: number }
type Meal      = { type: string; foods: FoodItem[] }
type DayMealData = { meals: Meal[] }
type WeekMealPlan = Record<string, DayMealData>

const DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
const DAY_LABELS: Record<string,string> = { lundi:'Lun', mardi:'Mar', mercredi:'Mer', jeudi:'Jeu', vendredi:'Ven', samedi:'Sam', dimanche:'Dim' }
const MACRO_COLORS = { kcal:GOLD, prot:'#E8C97A', carb:TEXT_MUTED, fat:TEXT_PRIMARY }
const AI_MEAL_ORDER = ['petit_dejeuner', 'dejeuner', 'collation', 'diner']
const AI_MEAL_LABELS: Record<string, string> = { petit_dejeuner: 'Petit-déjeuner', dejeuner: 'Déjeuner', collation: 'Collation', diner: 'Dîner' }

function dayMacros(day: DayMealData) {
  let kcal=0, prot=0, carb=0, fat=0
  day.meals.forEach(m => m.foods.forEach(f => { kcal+=f.kcal; prot+=f.prot; carb+=f.carb; fat+=f.fat }))
  return { kcal, prot, carb, fat }
}
function pct(val: number, target: number) { return Math.min(100, target > 0 ? Math.round((val/target)*100) : 0) }

interface ClientNutritionProps {
  profile: {
    full_name: string | null
    tdee: number | null
    protein_goal: number | null
    carbs_goal: number | null
    fat_goal: number | null
    dietary_type: string | null
    allergies: string[] | null
  }
  mealPlan: WeekMealPlan
  calorieTarget: number
  protTarget: number
  carbTarget: number
  fatTarget: number
  setCalorieTarget: (val: number) => void
  setProtTarget: (val: number) => void
  setCarbTarget: (val: number) => void
  setFatTarget: (val: number) => void
  mealPlanSaving: boolean
  mealPlanSaved: boolean
  saveMealPlan: () => void
  expandedMealDay: string | null
  setExpandedMealDay: (day: string | null) => void
  addFood: (day: string, mealIdx: number) => void
  removeFood: (day: string, mealIdx: number, foodIdx: number) => void
  updateFood: (day: string, mealIdx: number, foodIdx: number, field: keyof FoodItem, val: string|number) => void
  // AI meal plan
  aiMealGenerating: boolean
  aiMealStreamStatus: string
  aiMealPreview: any
  aiMealPreviewDay: string
  setAiMealPreviewDay: (day: string) => void
  setAiMealPreview: (val: any) => void
  generateAiMealPlan: () => void
  acceptAiMealPlan: () => void
  // Client active plan
  clientActivePlan: any
  clientActivePlanDay: string
  setClientActivePlanDay: (day: string) => void
  // Weekly tracking
  weeklyTracking: Record<string, Set<string>>
  // Template
  onApplyTemplate: (tpl: MealPlanTemplate) => void
}

export default function ClientNutrition({
  profile, mealPlan, calorieTarget, protTarget, carbTarget, fatTarget,
  setCalorieTarget, setProtTarget, setCarbTarget, setFatTarget,
  mealPlanSaving, mealPlanSaved, saveMealPlan,
  expandedMealDay, setExpandedMealDay, addFood, removeFood, updateFood,
  aiMealGenerating, aiMealStreamStatus, aiMealPreview, aiMealPreviewDay,
  setAiMealPreviewDay, setAiMealPreview, generateAiMealPlan, acceptAiMealPlan,
  clientActivePlan, clientActivePlanDay, setClientActivePlanDay,
  weeklyTracking, onApplyTemplate,
}: ClientNutritionProps) {
  const isMobile = useIsMobile()
  const [mobileTrackDayIdx, setMobileTrackDayIdx] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [templateConfirm, setTemplateConfirm] = useState<string | null>(null)

  return (
    <div style={{animation:'fadeIn 200ms ease',display:'flex',flexDirection:'column',gap:12}}>
      {/* ── Header + AI Generate Button ── */}
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{flex:1,fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,color:TEXT_MUTED,letterSpacing:'2px',textTransform:'uppercase'}}>Plan alimentaire</span>
        <button
          onClick={() => setEditorOpen(o => !o)}
          style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,border:`1px solid ${GOLD_RULE}`,cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.78rem',fontWeight:800,letterSpacing:'0.04em',background:'transparent',color:GOLD,minHeight:36}}
        >
          <Pencil size={13} strokeWidth={2.5}/>
          {isMobile ? '' : (editorOpen ? 'Fermer' : 'Éditer')}
        </button>
        <button
          onClick={generateAiMealPlan}
          disabled={aiMealGenerating}
          style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,border:'none',cursor:aiMealGenerating?'wait':'pointer',fontFamily:FONT_ALT,fontSize:'0.78rem',fontWeight:800,letterSpacing:'0.04em',background:GOLD,color:'#0D0B08',minHeight:36,opacity:aiMealGenerating?0.6:1}}
        >
          {aiMealGenerating ? <Loader2 size={13} strokeWidth={2.5} style={{animation:'spin 0.7s linear infinite'}}/> : <Sparkles size={13} strokeWidth={2.5}/>}
          {aiMealGenerating ? 'Génération...' : 'Générer plan IA'}
        </button>
      </div>

      {/* ── Client TDEE / preferences summary ── */}
      {profile && (
        <div style={{background:BG_CARD,border:'1px solid rgba(255,255,255,0.06)',borderRadius:RADIUS_CARD,padding:'10px 14px',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          {profile.tdee ? (
            <>
              <span style={{fontFamily:FONT_DISPLAY,fontSize:'1rem',color:GOLD,fontWeight:400}}>{profile.tdee} kcal/j</span>
              <span style={{fontSize:'0.68rem',fontFamily:FONT_BODY,color:TEXT_MUTED}}>P {profile.protein_goal || '—'}g · G {profile.carbs_goal || '—'}g · L {profile.fat_goal || '—'}g</span>
            </>
          ) : (
            <span style={{fontSize:'0.72rem',fontFamily:FONT_BODY,color:TEXT_MUTED,fontStyle:'italic'}}>Le client n&apos;a pas encore calculé son TDEE</span>
          )}
          {profile.dietary_type && <span style={{fontFamily:FONT_ALT,fontSize:'0.65rem',padding:'2px 8px',borderRadius:0,background:GOLD_DIM,color:GOLD,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>{profile.dietary_type}</span>}
          {(profile.allergies || []).map((a: string) => (
            <span key={a} style={{fontFamily:FONT_ALT,fontSize:'0.65rem',padding:'2px 8px',borderRadius:0,background:'rgba(239,68,68,.12)',color:RED,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>{a}</span>
          ))}
        </div>
      )}

      {/* ── Streaming loading state ── */}
      {aiMealGenerating && (
        <div style={{background:BG_CARD,border:`1.5px solid ${GOLD_RULE}`,borderRadius:RADIUS_CARD,padding:'28px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:'50%',border:`3px solid ${BORDER}`,borderTopColor:GOLD,animation:'spin 0.8s linear infinite'}}/>
          <span style={{fontFamily:FONT_DISPLAY,fontSize:'1.1rem',fontWeight:400,color:GOLD,letterSpacing:'1px',textTransform:'uppercase'}}>{aiMealStreamStatus || 'Génération...'}</span>
          <span style={{fontSize:'0.7rem',fontFamily:FONT_BODY,color:TEXT_MUTED}}>Claude rédige le plan alimentaire sur 7 jours</span>
        </div>
      )}

      {/* ── AI Meal Plan Preview ── */}
      {aiMealPreview && (
        <div style={{background:BG_CARD,border:`1.5px solid ${GOLD_RULE}`,borderRadius:RADIUS_CARD,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:8}}>
            <Sparkles size={14} color={GOLD} strokeWidth={2.5}/>
            <span style={{fontFamily:FONT_DISPLAY,fontSize:'1.1rem',fontWeight:400,color:GOLD,flex:1,letterSpacing:'1px',textTransform:'uppercase'}}>Plan IA généré</span>
            <button onClick={()=>setAiMealPreview(null)} style={{background:BG_CARD_2,border:'none',cursor:'pointer',color:TEXT_MUTED,padding:4,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:0}}><X size={16}/></button>
          </div>
          <div style={{display:'flex',gap:4,padding:'8px 12px',overflowX:'auto'}}>
            {DAYS.map(d => (
              <button key={d} onClick={()=>setAiMealPreviewDay(d)} style={{
                padding:'6px 10px',borderRadius:0,border:'none',cursor:'pointer',
                fontFamily:FONT_ALT,fontSize:'0.72rem',fontWeight:700,
                background:aiMealPreviewDay===d?GOLD:BG_CARD_2,
                color:aiMealPreviewDay===d?'#0D0B08':TEXT_MUTED,flexShrink:0,
              }}>{DAY_LABELS[d]}</button>
            ))}
          </div>
          {(() => {
            const day = aiMealPreview[aiMealPreviewDay]
            if (!day) return null
            return (
              <div style={{padding:'8px 12px 12px'}}>
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  {[
                    {l:'Kcal',v:day.total_kcal,c:'#D4A843'},{l:'P',v:`${day.total_protein}g`,c:'#E8C97A'},
                    {l:'G',v:`${day.total_carbs}g`,c:'#8A8070'},{l:'L',v:`${day.total_fat}g`,c:'#F5EDD8'},
                  ].map(m=>(
                    <div key={m.l} style={{flex:1,background:BG_BASE,borderRadius:RADIUS_CARD,padding:'6px 4px',textAlign:'center'}}>
                      <div style={{fontFamily:FONT_DISPLAY,fontSize:'1.1rem',fontWeight:400,color:m.c}}>{m.v}</div>
                      <div style={{fontFamily:FONT_ALT,fontSize:'0.55rem',color:TEXT_MUTED,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase'}}>{m.l}</div>
                    </div>
                  ))}
                </div>
                {AI_MEAL_ORDER.map(mealType => {
                  const foods = Array.isArray(day.repas?.[mealType]) ? day.repas[mealType] : []
                  if (foods.length === 0) return null
                  return (
                    <div key={mealType} style={{marginBottom:8}}>
                      <div style={{fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,color:GOLD,textTransform:'uppercase',letterSpacing:'2px',marginBottom:4}}>
                        {AI_MEAL_LABELS[mealType]}
                      </div>
                      {foods.map((f: any, i: number) => (
                        <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:`1px solid ${BORDER}`}}>
                          <span style={{fontSize:'0.78rem',fontFamily:FONT_BODY,color:TEXT_PRIMARY}}>{f.aliment}</span>
                          <span style={{fontSize:'0.7rem',fontFamily:FONT_BODY,color:TEXT_MUTED,flexShrink:0,marginLeft:8}}>{f.quantite_g}g · {f.kcal}kcal</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })()}
          <div style={{display:'flex',gap:8,padding:'8px 12px 12px'}}>
            <button onClick={generateAiMealPlan} disabled={aiMealGenerating} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:0,border:`1px solid ${GOLD_RULE}`,background:'transparent',color:TEXT_MUTED,cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.82rem',fontWeight:700}}>
              <Sparkles size={13}/>Régénérer
            </button>
            <button onClick={acceptAiMealPlan} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:0,border:'none',background:GOLD,color:'#0D0B08',cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.82rem',fontWeight:800}}>
              <Check size={13} strokeWidth={3}/>Valider et envoyer
            </button>
          </div>
        </div>
      )}

      {/* ── Active Meal Plan Summary ── */}
      {!aiMealPreview && clientActivePlan?.plan_data && (
        <div style={{background:BG_CARD,border:'1px solid rgba(255,255,255,0.06)',borderRadius:RADIUS_CARD,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:8}}>
            <Utensils size={14} color={GOLD} strokeWidth={2.5}/>
            <span style={{fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,color:GOLD,flex:1,letterSpacing:'2px',textTransform:'uppercase'}}>Plan actif</span>
            <span style={{fontSize:'0.65rem',fontFamily:FONT_BODY,color:TEXT_MUTED}}>{new Date(clientActivePlan.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          <div style={{display:'flex',gap:4,padding:'8px 12px',overflowX:'auto'}}>
            {DAYS.map(d => {
              const dayData = clientActivePlan.plan_data[d]
              return (
                <button key={d} onClick={()=>setClientActivePlanDay(d)} style={{
                  padding:'6px 10px',borderRadius:0,border:'none',cursor:'pointer',
                  fontFamily:FONT_ALT,fontSize:'0.72rem',fontWeight:700,
                  background:clientActivePlanDay===d?GOLD:BG_CARD_2,
                  color:clientActivePlanDay===d?'#0D0B08':TEXT_MUTED,flexShrink:0,
                }}>
                  {DAY_LABELS[d]}
                  {dayData?.total_kcal && <span style={{display:'block',fontSize:'0.55rem',opacity:0.8}}>{dayData.total_kcal}</span>}
                </button>
              )
            })}
          </div>
          {(() => {
            const day = clientActivePlan.plan_data[clientActivePlanDay]
            if (!day) return null
            return (
              <div style={{padding:'8px 12px 12px'}}>
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  {[
                    {l:'Kcal',v:day.total_kcal,c:'#D4A843'},{l:'P',v:`${day.total_protein}g`,c:'#E8C97A'},
                    {l:'G',v:`${day.total_carbs}g`,c:'#8A8070'},{l:'L',v:`${day.total_fat}g`,c:'#F5EDD8'},
                  ].map(m=>(
                    <div key={m.l} style={{flex:1,background:BG_BASE,borderRadius:RADIUS_CARD,padding:'6px 4px',textAlign:'center'}}>
                      <div style={{fontFamily:FONT_DISPLAY,fontSize:'1.1rem',fontWeight:400,color:m.c}}>{m.v}</div>
                      <div style={{fontFamily:FONT_ALT,fontSize:'0.55rem',color:TEXT_MUTED,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase'}}>{m.l}</div>
                    </div>
                  ))}
                </div>
                {AI_MEAL_ORDER.map(mealType => {
                  const foods = Array.isArray(day.repas?.[mealType]) ? day.repas[mealType] : []
                  if (foods.length === 0) return null
                  return (
                    <div key={mealType} style={{marginBottom:8}}>
                      <div style={{fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,color:GOLD,textTransform:'uppercase',letterSpacing:'2px',marginBottom:4}}>
                        {AI_MEAL_LABELS[mealType]}
                      </div>
                      {foods.map((f: any, i: number) => (
                        <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:`1px solid ${BORDER}`}}>
                          <span style={{fontSize:'0.78rem',fontFamily:FONT_BODY,color:TEXT_PRIMARY}}>{f.aliment}</span>
                          <span style={{fontSize:'0.7rem',fontFamily:FONT_BODY,color:TEXT_MUTED,flexShrink:0,marginLeft:8}}>{f.quantite_g}g · {f.kcal}kcal</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* ── No plan message ── */}
      {!aiMealPreview && !clientActivePlan && (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'30px 0',background:BG_CARD,border:'1px solid rgba(255,255,255,0.06)',borderRadius:RADIUS_CARD}}>
          <Utensils size={28} color={TEXT_MUTED}/>
          <p style={{fontSize:'0.85rem',fontFamily:FONT_BODY,color:TEXT_MUTED,margin:0,textAlign:'center'}}>Aucun plan actif pour ce client</p>
          <p style={{fontSize:'0.72rem',fontFamily:FONT_BODY,color:TEXT_DIM,margin:0}}>Clique sur &quot;Générer plan IA&quot; pour en créer un</p>
        </div>
      )}

      {/* ── Weekly tracking grid ── */}
      {(() => {
        const mondayDate = new Date()
        const dayOfWeek = mondayDate.getDay()
        mondayDate.setDate(mondayDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
        const todayStr = new Date().toISOString().split('T')[0]
        const weekDates = DAYS.map((_, i) => {
          const d = new Date(mondayDate)
          d.setDate(d.getDate() + i)
          return d.toISOString().split('T')[0]
        })
        const mealTypes = ['petit_dejeuner', 'dejeuner', 'collation', 'diner']
        const mealLabels = ['P-déj', 'Déj', 'Coll', 'Dîner']
        let completed = 0, total = 0
        weekDates.forEach(date => {
          mealTypes.forEach(mt => {
            if (date <= todayStr) { total++; if (weeklyTracking[date]?.has(mt)) completed++ }
          })
        })
        const pctVal = total > 0 ? Math.round((completed / total) * 100) : 0

        return (
          <div style={{background:BG_CARD,border:'1px solid rgba(255,255,255,0.06)',borderRadius:RADIUS_CARD,padding:'12px 10px',marginBottom:4}}>
            <div style={{fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,color:GOLD,textTransform:'uppercase',letterSpacing:'2px',marginBottom:10}}>
              Suivi de la semaine
            </div>
            {/* Grid header */}
            {isMobile ? (
              /* Mobile: show 1 day at a time with nav */
              <>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <button onClick={()=>setMobileTrackDayIdx(i=>(i-1+7)%7)} style={{width:28,height:28,borderRadius:8,background:BG_CARD_2,border:`1px solid ${BORDER}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:TEXT_MUTED}}><ChevronLeft size={14}/></button>
                  <span style={{flex:1,textAlign:'center',fontFamily:FONT_ALT,fontSize:'0.72rem',fontWeight:700,color:weekDates[mobileTrackDayIdx]===todayStr?GOLD:TEXT_PRIMARY,letterSpacing:'1px',textTransform:'uppercase'}}>{DAY_LABELS[DAYS[mobileTrackDayIdx]]}</span>
                  <button onClick={()=>setMobileTrackDayIdx(i=>(i+1)%7)} style={{width:28,height:28,borderRadius:8,background:BG_CARD_2,border:`1px solid ${BORDER}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:TEXT_MUTED}}><ChevronRight size={14}/></button>
                </div>
                {mealTypes.map((mt, mi) => {
                  const date = weekDates[mobileTrackDayIdx]
                  const isFuture = date > todayStr
                  const isDone = weeklyTracking[date]?.has(mt)
                  return (
                    <div key={mt} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                      <div style={{width:50,fontFamily:FONT_ALT,fontSize:'0.58rem',fontWeight:700,color:TEXT_MUTED,letterSpacing:'1px'}}>{mealLabels[mi]}</div>
                      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',height:28,borderRadius:0,fontFamily:FONT_DISPLAY,fontSize:'0.72rem',fontWeight:400,background:isFuture?BG_CARD_2:isDone?GOLD_DIM:'rgba(138,133,128,.06)',color:isFuture?TEXT_DIM:isDone?GOLD:TEXT_DIM}}>
                        {isFuture ? '' : isDone ? '✓' : '○'}
                      </div>
                    </div>
                  )
                })}
              </>
            ) : (
              /* Desktop: full 8-column grid */
              <>
              <div style={{display:'grid',gridTemplateColumns:'50px repeat(7, 1fr)',gap:3,marginBottom:4}}>
                <div/>
                {DAYS.map((d,i) => (
                  <div key={d} style={{textAlign:'center',fontFamily:FONT_ALT,fontSize:'0.58rem',fontWeight:700,color:weekDates[i]===todayStr?GOLD:TEXT_MUTED,textTransform:'uppercase',letterSpacing:'1px'}}>
                    {DAY_LABELS[d]}
                  </div>
                ))}
              </div>
              {/* Grid rows */}
              {mealTypes.map((mt, mi) => (
                <div key={mt} style={{display:'grid',gridTemplateColumns:'50px repeat(7, 1fr)',gap:3,marginBottom:2}}>
                  <div style={{fontFamily:FONT_ALT,fontSize:'0.58rem',fontWeight:700,color:TEXT_MUTED,display:'flex',alignItems:'center',letterSpacing:'1px'}}>{mealLabels[mi]}</div>
                  {weekDates.map((date, di) => {
                    const isFuture = date > todayStr
                    const isDone = weeklyTracking[date]?.has(mt)
                    return (
                      <div key={di} style={{
                        display:'flex',alignItems:'center',justifyContent:'center',
                        height:24,borderRadius:0,fontFamily:FONT_DISPLAY,fontSize:'0.65rem',fontWeight:400,
                        background: isFuture ? BG_CARD_2 : isDone ? GOLD_DIM : 'rgba(138,133,128,.06)',
                        color: isFuture ? TEXT_DIM : isDone ? GOLD : TEXT_DIM,
                      }}>
                        {isFuture ? '' : isDone ? '✓' : '○'}
                      </div>
                    )
                  })}
              </div>
            ))}
            </>
            )}
            {/* Score */}
            <div style={{marginTop:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <span style={{fontSize:'0.7rem',fontFamily:FONT_BODY,color:TEXT_MUTED}}>{profile?.full_name?.split(' ')[0] || 'Client'} a complété {completed}/{total} repas ({pctVal}%)</span>
              </div>
              <div style={{background:BORDER,borderRadius:0,height:6,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:0,background:GOLD,width:`${pctVal}%`,transition:'width 300ms'}}/>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Meal plan editor (surfaced) ── */}
      {editorOpen && (
        <div style={{display:'flex',flexDirection:'column',gap:12,paddingTop:8,borderTop:`1px solid ${BORDER}`,marginTop:8}}>

          {/* Template selector */}
          <div>
            <div style={{fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,color:GOLD,letterSpacing:'2px',textTransform:'uppercase',marginBottom:8}}>
              Appliquer un template
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {MEAL_PLAN_TEMPLATES.map(tpl => (
                <button key={tpl.id}
                  onClick={() => {
                    const hasExisting = Object.values(mealPlan).some(d => d.meals.some(m => m.foods.length > 0))
                    if (hasExisting) setTemplateConfirm(tpl.id)
                    else onApplyTemplate(tpl)
                  }}
                  style={{flex:'1 1 calc(33% - 8px)',minWidth:100,padding:'12px',background:BG_CARD_2,border:`1px solid ${BORDER}`,borderRadius:RADIUS_CARD,cursor:'pointer',textAlign:'center'}}
                >
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:'1rem',color:GOLD,marginBottom:2}}>{tpl.name}</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:'0.7rem',color:TEXT_MUTED}}>{tpl.macros.calorieTarget} kcal</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:'0.62rem',color:TEXT_DIM,marginTop:4}}>{tpl.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Confirmation modal pour template */}
          {templateConfirm && (
            <div style={{background:'rgba(239,68,68,.08)',border:`1px solid ${RED}`,borderRadius:RADIUS_CARD,padding:'12px 14px'}}>
              <div style={{fontFamily:FONT_ALT,fontSize:'0.8rem',fontWeight:700,color:TEXT_PRIMARY,marginBottom:8}}>
                Cela va remplacer le plan actuel
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={() => setTemplateConfirm(null)} style={{flex:1,padding:'8px',background:'transparent',border:`1px solid ${BORDER}`,borderRadius:10,color:TEXT_MUTED,cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.78rem'}}>Annuler</button>
                <button onClick={() => { const tpl = MEAL_PLAN_TEMPLATES.find(t => t.id === templateConfirm); if (tpl) onApplyTemplate(tpl); setTemplateConfirm(null) }}
                  style={{flex:1,padding:'8px',background:RED,border:'none',borderRadius:10,color:'#fff',cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.78rem',fontWeight:700}}>Confirmer</button>
              </div>
            </div>
          )}

          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn-secondary" style={{padding:'10px 14px',flexShrink:0,gap:6,fontSize:'0.78rem'}} onClick={saveMealPlan} disabled={mealPlanSaving}>
              {mealPlanSaving ? <Loader2 size={13} strokeWidth={2} style={{animation:'spin 0.7s linear infinite'}}/> : <Save size={13} strokeWidth={2.5}/>}
              Sauvegarder
            </button>
          </div>
          {mealPlanSaved && (
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:GOLD_DIM,border:`1px solid ${GOLD_RULE}`,borderRadius:RADIUS_CARD,color:GOLD,fontFamily:FONT_ALT,fontSize:'0.78rem',fontWeight:700}}>
              <Check size={12} strokeWidth={2.5}/>Plan alimentaire sauvegardé
            </div>
          )}

          {/* Macro targets 2×2 */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
            {[
              { label:'Calories', unit:'kcal', color:MACRO_COLORS.kcal, val:calorieTarget, set:setCalorieTarget },
              { label:'Protéines', unit:'g', color:MACRO_COLORS.prot, val:protTarget, set:setProtTarget },
              { label:'Glucides', unit:'g', color:MACRO_COLORS.carb, val:carbTarget, set:setCarbTarget },
              { label:'Lipides', unit:'g', color:MACRO_COLORS.fat, val:fatTarget, set:setFatTarget },
            ].map(({ label, unit, color, val, set }) => (
              <div key={label} style={{background:BG_CARD,border:'1px solid rgba(255,255,255,0.06)',borderRadius:RADIUS_CARD,padding:'11px 12px',borderTop:`3px solid ${color}`}}>
                <div style={{fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:TEXT_MUTED,marginBottom:7}}>{label}</div>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={val}
                    onChange={e=>set(parseInt(e.target.value)||0)}
                    style={{flex:1,background:BG_BASE,border:'1px solid rgba(255,255,255,0.06)',borderRadius:0,padding:'6px 7px',fontFamily:FONT_DISPLAY,fontSize:'1.3rem',fontWeight:400,color,outline:'none',textAlign:'center',minHeight:38}}
                    onFocus={e=>{e.target.style.borderColor=color}}
                    onBlur={e=>{e.target.style.borderColor=BORDER}}
                  />
                  <span style={{fontSize:'0.7rem',fontFamily:FONT_BODY,color:TEXT_MUTED,flexShrink:0}}>{unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Day chips */}
          <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2}}>
            {DAYS.map(day => {
              const { kcal } = dayMacros(mealPlan[day])
              const isActive = expandedMealDay === day
              const hasFoods = mealPlan[day].meals.some(m => m.foods.length > 0)
              return (
                <button
                  key={day}
                  className="day-chip"
                  onClick={()=>setExpandedMealDay(isActive?null:day)}
                  style={{
                    background: isActive?GOLD:hasFoods?GOLD_DIM:BG_CARD_2,
                    color: isActive?'#0D0B08':hasFoods?GOLD:TEXT_MUTED,
                    border: `1.5px solid ${isActive?GOLD:hasFoods?GOLD_RULE:BORDER}`,
                  }}
                >
                  {DAY_LABELS[day]}
                  {hasFoods && !isActive && <span style={{marginLeft:4,background:GOLD_DIM,borderRadius:0,padding:'0 4px',fontFamily:FONT_DISPLAY,fontSize:'0.6rem'}}>{kcal}</span>}
                </button>
              )
            })}
          </div>

          {/* Expanded meal day */}
          {expandedMealDay && (() => {
            const dayData = mealPlan[expandedMealDay]
            const totals = dayMacros(dayData)
            return (
              <div style={{display:'flex',flexDirection:'column',gap:10,animation:'fadeIn 150ms ease'}}>
                {/* Macro summary */}
                <div style={{background:BG_CARD,border:'1px solid rgba(255,255,255,0.06)',borderRadius:RADIUS_CARD,padding:'12px 14px'}}>
                  <div style={{fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:TEXT_MUTED,marginBottom:10}}>Total du jour</div>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:10}}>
                    {[
                      {label:'Cal',val:totals.kcal,target:calorieTarget,color:MACRO_COLORS.kcal},
                      {label:'Prot',val:totals.prot,target:protTarget,color:MACRO_COLORS.prot},
                      {label:'Gluc',val:totals.carb,target:carbTarget,color:MACRO_COLORS.carb},
                      {label:'Lip',val:totals.fat,target:fatTarget,color:MACRO_COLORS.fat},
                    ].map(({label,val,target,color})=>(
                      <div key={label}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:3}}>
                          <span style={{fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,color:TEXT_MUTED,textTransform:'uppercase',letterSpacing:'1px'}}>{label}</span>
                          <span style={{fontFamily:FONT_DISPLAY,fontSize:'1rem',fontWeight:400,color}}>{val}</span>
                        </div>
                        <div style={{background:BORDER,borderRadius:0,height:4,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:0,background:color,width:`${pct(val,target)}%`,transition:'width 400ms ease'}}/>
                        </div>
                        <div style={{fontFamily:FONT_BODY,fontSize:'0.58rem',color:TEXT_DIM,marginTop:2,textAlign:'right'}}>{pct(val,target)}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meal cards */}
                {dayData.meals.map((meal, mealIdx) => {
                  const mealTotals = meal.foods.reduce((acc,f)=>({kcal:acc.kcal+f.kcal,prot:acc.prot+f.prot,carb:acc.carb+f.carb,fat:acc.fat+f.fat}),{kcal:0,prot:0,carb:0,fat:0})
                  return (
                    <div key={mealIdx} className="card" style={{padding:0,overflow:'hidden'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:meal.foods.length>0?`1px solid ${BORDER}`:'none',background:'rgba(255,255,255,.015)'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <span style={{fontFamily:FONT_ALT,fontSize:'0.95rem',fontWeight:700,color:TEXT_PRIMARY}}>{meal.type}</span>
                          {meal.foods.length > 0 && (
                            <div style={{fontSize:'0.68rem',fontFamily:FONT_BODY,color:TEXT_MUTED,marginTop:1}}>{mealTotals.kcal} kcal · {mealTotals.prot}g prot</div>
                          )}
                        </div>
                        <button onClick={()=>addFood(expandedMealDay,mealIdx)} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:0,border:'none',cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.78rem',fontWeight:700,background:GOLD_DIM,color:GOLD,minHeight:36}}>
                          <Plus size={11} strokeWidth={2.5}/>Ajouter
                        </button>
                      </div>

                      {meal.foods.length > 0 && (
                        <div style={{padding:'0 14px'}}>
                          {meal.foods.map((food, foodIdx) => (
                            <div key={foodIdx} className="food-row-m">
                              {/* Name + delete */}
                              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                                <input
                                  placeholder="Ex: Riz cuit"
                                  value={food.name}
                                  onChange={e=>updateFood(expandedMealDay,mealIdx,foodIdx,'name',e.target.value)}
                                  style={{flex:1,background:BG_BASE,border:'1px solid rgba(255,255,255,0.06)',borderRadius:0,padding:'8px 10px',fontFamily:FONT_BODY,fontSize:'0.85rem',color:TEXT_PRIMARY,outline:'none',minHeight:36}}
                                  onFocus={e=>{e.target.style.borderColor=GOLD}}
                                  onBlur={e=>{e.target.style.borderColor=BORDER}}
                                />
                                <button onClick={()=>removeFood(expandedMealDay,mealIdx,foodIdx)} style={{background:'rgba(239,68,68,.08)',border:`1px solid rgba(239,68,68,.15)`,cursor:'pointer',color:RED,padding:0,borderRadius:0,display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,flexShrink:0}}>
                                  <Minus size={12} strokeWidth={2.5}/>
                                </button>
                              </div>
                              {/* Qty / Kcal / Prot / Carb / Fat */}
                              <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(3,1fr)':'repeat(5,1fr)',gap:5}}>
                                {([
                                  {label:'Qté',field:'qty' as const,type:'text',val:food.qty,color:TEXT_MUTED},
                                  {label:'Kcal',field:'kcal' as const,type:'number',val:food.kcal,color:MACRO_COLORS.kcal},
                                  {label:'Prot',field:'prot' as const,type:'number',val:food.prot,color:MACRO_COLORS.prot},
                                  {label:'Gluc',field:'carb' as const,type:'number',val:food.carb,color:MACRO_COLORS.carb},
                                  {label:'Lip',field:'fat' as const,type:'number',val:food.fat,color:MACRO_COLORS.fat},
                                ]).map(({label,field,type,val,color})=>(
                                  <div key={field}>
                                    <div className="col-hdr">{label}</div>
                                    <input
                                      type={type}
                                      min={type==='number'?0:undefined}
                                      inputMode={type==='number'?'numeric':undefined}
                                      value={val}
                                      placeholder={field==='qty'?'100g':'0'}
                                      onChange={e=>updateFood(expandedMealDay,mealIdx,foodIdx,field,type==='number'?parseInt(e.target.value)||0:e.target.value)}
                                      style={{width:'100%',background:BG_BASE,border:'1px solid rgba(255,255,255,0.06)',borderRadius:0,padding:'5px 4px',fontFamily:FONT_BODY,fontSize:'0.75rem',color,outline:'none',textAlign:'center',minHeight:30}}
                                      onFocus={e=>{e.target.style.borderColor=color}}
                                      onBlur={e=>{e.target.style.borderColor=BORDER}}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          <div style={{padding:'6px 0'}}/>
                        </div>
                      )}
                      {meal.foods.length === 0 && (
                        <div style={{textAlign:'center',padding:'14px',color:TEXT_DIM,fontFamily:FONT_BODY,fontSize:'0.78rem',fontStyle:'italic'}}>Aucun aliment</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
