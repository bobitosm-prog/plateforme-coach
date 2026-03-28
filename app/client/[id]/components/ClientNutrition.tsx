'use client'
import {
  Check, Plus, Minus, Save, Sparkles, Loader2, Utensils, X,
} from 'lucide-react'

type FoodItem = { name: string; qty: string; kcal: number; prot: number; carb: number; fat: number }
type Meal      = { type: string; foods: FoodItem[] }
type DayMealData = { meals: Meal[] }
type WeekMealPlan = Record<string, DayMealData>

const DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
const DAY_LABELS: Record<string,string> = { lundi:'Lun', mardi:'Mar', mercredi:'Mer', jeudi:'Jeu', vendredi:'Ven', samedi:'Sam', dimanche:'Dim' }
const MACRO_COLORS = { kcal:'#F97316', prot:'#818CF8', carb:'#22C55E', fat:'#FBBF24' }
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
}

export default function ClientNutrition({
  profile, mealPlan, calorieTarget, protTarget, carbTarget, fatTarget,
  setCalorieTarget, setProtTarget, setCarbTarget, setFatTarget,
  mealPlanSaving, mealPlanSaved, saveMealPlan,
  expandedMealDay, setExpandedMealDay, addFood, removeFood, updateFood,
  aiMealGenerating, aiMealStreamStatus, aiMealPreview, aiMealPreviewDay,
  setAiMealPreviewDay, setAiMealPreview, generateAiMealPlan, acceptAiMealPlan,
  clientActivePlan, clientActivePlanDay, setClientActivePlanDay,
  weeklyTracking,
}: ClientNutritionProps) {
  return (
    <div style={{animation:'fadeIn 200ms ease',display:'flex',flexDirection:'column',gap:12}}>
      {/* ── Header + AI Generate Button ── */}
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <span style={{flex:1,fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:700,color:'#F8FAFC'}}>Plan alimentaire</span>
        <button
          onClick={generateAiMealPlan}
          disabled={aiMealGenerating}
          style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,border:'none',cursor:aiMealGenerating?'wait':'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:700,letterSpacing:'0.04em',background:'linear-gradient(135deg,#C9A84C,#D4AF37)',color:'#000',minHeight:38,opacity:aiMealGenerating?0.6:1}}
        >
          {aiMealGenerating ? <Loader2 size={13} strokeWidth={2.5} style={{animation:'spin 0.7s linear infinite'}}/> : <Sparkles size={13} strokeWidth={2.5}/>}
          {aiMealGenerating ? 'Génération...' : 'Générer plan IA'}
        </button>
      </div>

      {/* ── Client TDEE / preferences summary ── */}
      {profile && (
        <div style={{background:'#141414',border:'1px solid #242424',borderRadius:12,padding:'10px 14px',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          {profile.tdee ? (
            <>
              <span style={{fontSize:'0.72rem',color:'#C9A84C',fontWeight:700}}>{profile.tdee} kcal/j</span>
              <span style={{fontSize:'0.68rem',color:'#6B7280'}}>P {profile.protein_goal || '—'}g · G {profile.carbs_goal || '—'}g · L {profile.fat_goal || '—'}g</span>
            </>
          ) : (
            <span style={{fontSize:'0.72rem',color:'#6B7280',fontStyle:'italic'}}>Le client n&apos;a pas encore calculé son TDEE</span>
          )}
          {profile.dietary_type && <span style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:999,background:'rgba(34,197,94,.12)',color:'#22C55E',fontWeight:700,textTransform:'uppercase'}}>{profile.dietary_type}</span>}
          {(profile.allergies || []).map((a: string) => (
            <span key={a} style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:999,background:'rgba(239,68,68,.12)',color:'#EF4444',fontWeight:700,textTransform:'uppercase'}}>{a}</span>
          ))}
        </div>
      )}

      {/* ── Streaming loading state ── */}
      {aiMealGenerating && (
        <div style={{background:'#141414',border:'1.5px solid #C9A84C30',borderRadius:16,padding:'28px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:'50%',border:'3px solid #242424',borderTopColor:'#C9A84C',animation:'spin 0.8s linear infinite'}}/>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.9rem',fontWeight:700,color:'#C9A84C'}}>{aiMealStreamStatus || 'Génération...'}</span>
          <span style={{fontSize:'0.7rem',color:'#6B7280'}}>Claude rédige le plan alimentaire sur 7 jours</span>
        </div>
      )}

      {/* ── AI Meal Plan Preview ── */}
      {aiMealPreview && (
        <div style={{background:'#141414',border:'1.5px solid #C9A84C40',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #242424',display:'flex',alignItems:'center',gap:8}}>
            <Sparkles size={14} color="#C9A84C" strokeWidth={2.5}/>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.9rem',fontWeight:700,color:'#C9A84C',flex:1}}>Plan IA généré</span>
            <button onClick={()=>setAiMealPreview(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#6B7280',padding:4}}><X size={16}/></button>
          </div>
          <div style={{display:'flex',gap:4,padding:'8px 12px',overflowX:'auto'}}>
            {DAYS.map(d => (
              <button key={d} onClick={()=>setAiMealPreviewDay(d)} style={{
                padding:'6px 10px',borderRadius:8,border:'none',cursor:'pointer',
                fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,
                background:aiMealPreviewDay===d?'#C9A84C':'#1A1A1A',
                color:aiMealPreviewDay===d?'#000':'#6B7280',flexShrink:0,
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
                    {l:'Kcal',v:day.total_kcal,c:'#EF4444'},{l:'P',v:`${day.total_protein}g`,c:'#3B82F6'},
                    {l:'G',v:`${day.total_carbs}g`,c:'#F59E0B'},{l:'L',v:`${day.total_fat}g`,c:'#22C55E'},
                  ].map(m=>(
                    <div key={m.l} style={{flex:1,background:'#0A0A0A',borderRadius:8,padding:'6px 4px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.95rem',fontWeight:700,color:m.c}}>{m.v}</div>
                      <div style={{fontSize:'0.55rem',color:'#6B7280',fontWeight:700}}>{m.l}</div>
                    </div>
                  ))}
                </div>
                {AI_MEAL_ORDER.map(mealType => {
                  const foods = Array.isArray(day.repas?.[mealType]) ? day.repas[mealType] : []
                  if (foods.length === 0) return null
                  return (
                    <div key={mealType} style={{marginBottom:8}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,color:'#C9A84C',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>
                        {AI_MEAL_LABELS[mealType]}
                      </div>
                      {foods.map((f: any, i: number) => (
                        <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:'1px solid #1A1A1A'}}>
                          <span style={{fontSize:'0.78rem',color:'#F8FAFC'}}>{f.aliment}</span>
                          <span style={{fontSize:'0.7rem',color:'#6B7280',flexShrink:0,marginLeft:8}}>{f.quantite_g}g · {f.kcal}kcal</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })()}
          <div style={{display:'flex',gap:8,padding:'8px 12px 12px'}}>
            <button onClick={generateAiMealPlan} disabled={aiMealGenerating} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:8,border:'1px solid #374151',background:'transparent',color:'#9CA3AF',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.82rem',fontWeight:700}}>
              <Sparkles size={13}/>Régénérer
            </button>
            <button onClick={acceptAiMealPlan} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#C9A84C,#D4AF37)',color:'#000',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.82rem',fontWeight:700}}>
              <Check size={13} strokeWidth={3}/>Valider et envoyer
            </button>
          </div>
        </div>
      )}

      {/* ── Active Meal Plan Summary ── */}
      {!aiMealPreview && clientActivePlan?.plan_data && (
        <div style={{background:'#141414',border:'1px solid #242424',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #242424',display:'flex',alignItems:'center',gap:8}}>
            <Utensils size={14} color="#22C55E" strokeWidth={2.5}/>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.9rem',fontWeight:700,color:'#22C55E',flex:1}}>Plan actif</span>
            <span style={{fontSize:'0.65rem',color:'#6B7280'}}>{new Date(clientActivePlan.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          <div style={{display:'flex',gap:4,padding:'8px 12px',overflowX:'auto'}}>
            {DAYS.map(d => {
              const dayData = clientActivePlan.plan_data[d]
              return (
                <button key={d} onClick={()=>setClientActivePlanDay(d)} style={{
                  padding:'6px 10px',borderRadius:8,border:'none',cursor:'pointer',
                  fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,
                  background:clientActivePlanDay===d?'#22C55E':'#1A1A1A',
                  color:clientActivePlanDay===d?'#000':'#6B7280',flexShrink:0,
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
                    {l:'Kcal',v:day.total_kcal,c:'#EF4444'},{l:'P',v:`${day.total_protein}g`,c:'#3B82F6'},
                    {l:'G',v:`${day.total_carbs}g`,c:'#F59E0B'},{l:'L',v:`${day.total_fat}g`,c:'#22C55E'},
                  ].map(m=>(
                    <div key={m.l} style={{flex:1,background:'#0A0A0A',borderRadius:8,padding:'6px 4px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.95rem',fontWeight:700,color:m.c}}>{m.v}</div>
                      <div style={{fontSize:'0.55rem',color:'#6B7280',fontWeight:700}}>{m.l}</div>
                    </div>
                  ))}
                </div>
                {AI_MEAL_ORDER.map(mealType => {
                  const foods = Array.isArray(day.repas?.[mealType]) ? day.repas[mealType] : []
                  if (foods.length === 0) return null
                  return (
                    <div key={mealType} style={{marginBottom:8}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,color:'#22C55E',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>
                        {AI_MEAL_LABELS[mealType]}
                      </div>
                      {foods.map((f: any, i: number) => (
                        <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:'1px solid #1A1A1A'}}>
                          <span style={{fontSize:'0.78rem',color:'#F8FAFC'}}>{f.aliment}</span>
                          <span style={{fontSize:'0.7rem',color:'#6B7280',flexShrink:0,marginLeft:8}}>{f.quantite_g}g · {f.kcal}kcal</span>
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
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'30px 0',background:'#141414',border:'1px solid #242424',borderRadius:16}}>
          <Utensils size={28} color="#6B7280"/>
          <p style={{fontSize:'0.85rem',color:'#6B7280',margin:0,textAlign:'center'}}>Aucun plan actif pour ce client</p>
          <p style={{fontSize:'0.72rem',color:'#4B5563',margin:0}}>Clique sur &quot;Générer plan IA&quot; pour en créer un</p>
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
          <div style={{background:'#141414',border:'1px solid #242424',borderRadius:16,padding:'12px 10px',marginBottom:4}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,color:'#C9A84C',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>
              Suivi de la semaine
            </div>
            {/* Grid header */}
            <div style={{display:'grid',gridTemplateColumns:'50px repeat(7, 1fr)',gap:3,marginBottom:4}}>
              <div/>
              {DAYS.map((d,i) => (
                <div key={d} style={{textAlign:'center',fontSize:'0.58rem',fontWeight:700,color:weekDates[i]===todayStr?'#C9A84C':'#6B7280',textTransform:'uppercase'}}>
                  {DAY_LABELS[d]}
                </div>
              ))}
            </div>
            {/* Grid rows */}
            {mealTypes.map((mt, mi) => (
              <div key={mt} style={{display:'grid',gridTemplateColumns:'50px repeat(7, 1fr)',gap:3,marginBottom:2}}>
                <div style={{fontSize:'0.58rem',fontWeight:600,color:'#6B7280',display:'flex',alignItems:'center'}}>{mealLabels[mi]}</div>
                {weekDates.map((date, di) => {
                  const isFuture = date > todayStr
                  const isDone = weeklyTracking[date]?.has(mt)
                  return (
                    <div key={di} style={{
                      display:'flex',alignItems:'center',justifyContent:'center',
                      height:24,borderRadius:6,fontSize:'0.65rem',fontWeight:700,
                      background: isFuture ? '#1A1A1A' : isDone ? 'rgba(34,197,94,.15)' : 'rgba(156,163,175,.06)',
                      color: isFuture ? '#2A2A2A' : isDone ? '#22C55E' : '#4B5563',
                    }}>
                      {isFuture ? '' : isDone ? '✓' : '○'}
                    </div>
                  )
                })}
              </div>
            ))}
            {/* Score */}
            <div style={{marginTop:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>{profile?.full_name?.split(' ')[0] || 'Client'} a complété {completed}/{total} repas ({pctVal}%)</span>
              </div>
              <div style={{background:'#242424',borderRadius:999,height:6,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:999,background:'linear-gradient(90deg,#C9A84C,#D4AF37)',width:`${pctVal}%`,transition:'width 300ms'}}/>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Manual meal plan editor (old interface) ── */}
      <details style={{marginTop:4}}>
        <summary style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:700,color:'#6B7280',cursor:'pointer',padding:'8px 0',letterSpacing:'0.04em',textTransform:'uppercase'}}>
          Édition manuelle du plan
        </summary>
        <div style={{display:'flex',flexDirection:'column',gap:12,paddingTop:8}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn-secondary" style={{padding:'10px 14px',flexShrink:0,gap:6,fontSize:'0.78rem'}} onClick={saveMealPlan} disabled={mealPlanSaving}>
              {mealPlanSaving ? <Loader2 size={13} strokeWidth={2} style={{animation:'spin 0.7s linear infinite'}}/> : <Save size={13} strokeWidth={2.5}/>}
              Sauvegarder
            </button>
          </div>
          {mealPlanSaved && (
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:'rgba(34,197,94,.07)',border:'1px solid rgba(34,197,94,.18)',borderRadius:8,color:'#22C55E',fontSize:'0.78rem',fontWeight:600}}>
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
              <div key={label} style={{background:'#141414',border:'1px solid #242424',borderRadius:12,padding:'11px 12px',borderTop:`3px solid ${color}`}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',marginBottom:7}}>{label}</div>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={val}
                    onChange={e=>set(parseInt(e.target.value)||0)}
                    style={{flex:1,background:'#0A0A0A',border:'1px solid #242424',borderRadius:8,padding:'6px 7px',fontFamily:"'Barlow Condensed', sans-serif",fontSize:'1.1rem',fontWeight:700,color,outline:'none',textAlign:'center',minHeight:38}}
                    onFocus={e=>{e.target.style.borderColor=color}}
                    onBlur={e=>{e.target.style.borderColor='#242424'}}
                  />
                  <span style={{fontSize:'0.7rem',color:'#6B7280',flexShrink:0}}>{unit}</span>
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
                    background: isActive?'#22C55E':hasFoods?'rgba(34,197,94,.12)':'#1A1A1A',
                    color: isActive?'#fff':hasFoods?'#22C55E':'#9CA3AF',
                    border: `1.5px solid ${isActive?'#22C55E':hasFoods?'rgba(34,197,94,.25)':'#242424'}`,
                  }}
                >
                  {DAY_LABELS[day]}
                  {hasFoods && !isActive && <span style={{marginLeft:4,background:'rgba(34,197,94,.18)',borderRadius:999,padding:'0 4px',fontSize:'0.6rem'}}>{kcal}</span>}
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
                <div style={{background:'#141414',border:'1px solid #242424',borderRadius:12,padding:'12px 14px'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.65rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B7280',marginBottom:10}}>Total du jour</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                    {[
                      {label:'Cal',val:totals.kcal,target:calorieTarget,color:MACRO_COLORS.kcal},
                      {label:'Prot',val:totals.prot,target:protTarget,color:MACRO_COLORS.prot},
                      {label:'Gluc',val:totals.carb,target:carbTarget,color:MACRO_COLORS.carb},
                      {label:'Lip',val:totals.fat,target:fatTarget,color:MACRO_COLORS.fat},
                    ].map(({label,val,target,color})=>(
                      <div key={label}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:3}}>
                          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.6rem',fontWeight:700,color:'#6B7280',textTransform:'uppercase'}}>{label}</span>
                          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.85rem',fontWeight:700,color}}>{val}</span>
                        </div>
                        <div style={{background:'#242424',borderRadius:999,height:4,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:999,background:color,width:`${pct(val,target)}%`,transition:'width 400ms ease'}}/>
                        </div>
                        <div style={{fontSize:'0.58rem',color:'#4B5563',marginTop:2,textAlign:'right'}}>{pct(val,target)}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meal cards */}
                {dayData.meals.map((meal, mealIdx) => {
                  const mealTotals = meal.foods.reduce((acc,f)=>({kcal:acc.kcal+f.kcal,prot:acc.prot+f.prot,carb:acc.carb+f.carb,fat:acc.fat+f.fat}),{kcal:0,prot:0,carb:0,fat:0})
                  return (
                    <div key={mealIdx} className="card" style={{padding:0,overflow:'hidden'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:meal.foods.length>0?'1px solid #1E1E1E':'none',background:'rgba(255,255,255,.015)'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.95rem',fontWeight:700,color:'#F8FAFC'}}>{meal.type}</span>
                          {meal.foods.length > 0 && (
                            <div style={{fontSize:'0.68rem',color:'#6B7280',marginTop:1}}>{mealTotals.kcal} kcal · {mealTotals.prot}g prot</div>
                          )}
                        </div>
                        <button onClick={()=>addFood(expandedMealDay,mealIdx)} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:700,background:'rgba(34,197,94,.1)',color:'#22C55E',minHeight:36}}>
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
                                  style={{flex:1,background:'#0A0A0A',border:'1px solid #242424',borderRadius:8,padding:'8px 10px',fontFamily:'Barlow,sans-serif',fontSize:'0.85rem',color:'#F8FAFC',outline:'none',minHeight:36}}
                                  onFocus={e=>{e.target.style.borderColor='#22C55E'}}
                                  onBlur={e=>{e.target.style.borderColor='#242424'}}
                                />
                                <button onClick={()=>removeFood(expandedMealDay,mealIdx,foodIdx)} style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.15)',cursor:'pointer',color:'#EF4444',padding:0,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,flexShrink:0}}>
                                  <Minus size={12} strokeWidth={2.5}/>
                                </button>
                              </div>
                              {/* Qty / Kcal / Prot / Carb / Fat */}
                              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5}}>
                                {([
                                  {label:'Qté',field:'qty' as const,type:'text',val:food.qty,color:'#9CA3AF'},
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
                                      style={{width:'100%',background:'#0A0A0A',border:'1px solid #242424',borderRadius:6,padding:'5px 4px',fontFamily:'Barlow,sans-serif',fontSize:'0.75rem',color,outline:'none',textAlign:'center',minHeight:30}}
                                      onFocus={e=>{e.target.style.borderColor=color}}
                                      onBlur={e=>{e.target.style.borderColor='#242424'}}
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
                        <div style={{textAlign:'center',padding:'14px',color:'#4B5563',fontSize:'0.78rem',fontStyle:'italic'}}>Aucun aliment</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </details>
    </div>
  )
}
