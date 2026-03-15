'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Zap, Utensils } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
const DAY_LABELS: Record<string,string> = { lundi:'Lun', mardi:'Mar', mercredi:'Mer', jeudi:'Jeu', vendredi:'Ven', samedi:'Sam', dimanche:'Dim' }
const DAY_FULL: Record<string,string> = { lundi:'Lundi', mardi:'Mardi', mercredi:'Mercredi', jeudi:'Jeudi', vendredi:'Vendredi', samedi:'Samedi', dimanche:'Dimanche' }
const MEAL_ICONS: Record<string,string> = { 'Petit-déjeuner':'☀️', 'Déjeuner':'🍽️', 'Dîner':'🌙', 'Collation':'🍎' }
const MACRO_COLORS = { kcal:'#F97316', prot:'#818CF8', carb:'#22C55E', fat:'#FBBF24' }

type FoodItem = { name: string; qty: string; kcal: number; prot: number; carb: number; fat: number }
type Meal     = { type: string; foods: FoodItem[] }
type DayData  = { meals: Meal[] }
type Plan     = Record<string, DayData>

function pct(val: number, target: number) { return Math.min(100, target > 0 ? Math.round((val / target) * 100) : 0) }

function dayTotals(day: DayData) {
  let kcal=0, prot=0, carb=0, fat=0
  day.meals?.forEach(m => m.foods?.forEach(f => { kcal+=f.kcal; prot+=f.prot; carb+=f.carb; fat+=f.fat }))
  return { kcal, prot, carb, fat }
}

export default function NutritionPlanPage() {
  const router = useRouter()
  const [plan,           setPlan]           = useState<Plan | null>(null)
  const [calorieTarget,  setCalorieTarget]  = useState(2000)
  const [protTarget,     setProtTarget]     = useState(150)
  const [carbTarget,     setCarbTarget]     = useState(200)
  const [fatTarget,      setFatTarget]      = useState(70)
  const [activeDay,      setActiveDay]      = useState('lundi')
  const [loading,        setLoading]        = useState(true)
  const [mounted,        setMounted]        = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      const { data } = await supabase
        .from('client_meal_plans')
        .select('calorie_target,protein_target,carb_target,fat_target,plan')
        .eq('client_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) {
        setCalorieTarget(data.calorie_target ?? 2000)
        setProtTarget(data.protein_target ?? 150)
        setCarbTarget(data.carb_target ?? 200)
        setFatTarget(data.fat_target ?? 70)
        setPlan(data.plan as Plan)
      }
      setLoading(false)
    })
  }, [mounted, router])

  if (!mounted || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #374151', borderTopColor: '#22C55E', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const dayData: DayData | null = plan ? (plan[activeDay] ?? { meals: [] }) : null
  const totals = dayData ? dayTotals(dayData) : null

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        body{margin:0;font-family:'Barlow',sans-serif;background:#111827;color:#F8FAFC;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .card{background:#1F2937;border:1px solid #374151;border-radius:14px;}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#9CA3AF;border:none;padding:7px 12px;border-radius:8px;font-family:'Barlow',sans-serif;font-size:.875rem;font-weight:500;cursor:pointer;transition:background 150ms,color 150ms;}
        .btn-ghost:hover{background:#374151;color:#F8FAFC;}
      `}</style>

      {/* NAVBAR */}
      <nav style={{ background: '#1F2937', borderBottom: '1px solid #374151', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <button className="btn-ghost" style={{ padding: '7px 10px' }} onClick={() => router.push('/')}>
            <ArrowLeft size={16} strokeWidth={2.5} /> Retour
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, background: '#22C55E', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Utensils size={13} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.08em' }}>PLAN ALIMENTAIRE</span>
          </div>
          <div style={{ width: 80 }} />
        </div>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 40px' }}>

        {/* No plan */}
        {!plan ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(34,197,94,.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Utensils size={28} color="#22C55E" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>Pas encore de plan</h2>
            <p style={{ fontSize: '0.9rem', color: '#6B7280', margin: 0, maxWidth: 300 }}>Ton coach n&apos;a pas encore créé ton plan alimentaire.</p>
          </div>
        ) : (
          <>
            {/* Targets summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
              {[
                { label:'Calories', val:calorieTarget, unit:'kcal', color:MACRO_COLORS.kcal },
                { label:'Protéines', val:protTarget, unit:'g', color:MACRO_COLORS.prot },
                { label:'Glucides', val:carbTarget, unit:'g', color:MACRO_COLORS.carb },
                { label:'Lipides', val:fatTarget, unit:'g', color:MACRO_COLORS.fat },
              ].map(({ label, val, unit, color }) => (
                <div key={label} className="card" style={{ padding: '10px 12px', borderTop: `3px solid ${color}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.62rem', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: '1.2rem', color }}>{val}<span style={{ fontSize: '0.7rem', color: '#6B7280', marginLeft: 2 }}>{unit}</span></div>
                </div>
              ))}
            </div>

            {/* Day tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
              {DAYS.map(day => {
                const d: DayData = (plan[day] ?? { meals: [] })
                const hasFoods = d.meals?.some(m => m.foods?.length > 0)
                const isActive = activeDay === day
                const { kcal } = dayTotals(d)
                return (
                  <button key={day} onClick={() => setActiveDay(day)} style={{
                    flexShrink: 0, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.04em',
                    transition: 'all 150ms',
                    background: isActive ? '#22C55E' : hasFoods ? 'rgba(34,197,94,.12)' : '#1F2937',
                    color: isActive ? '#fff' : hasFoods ? '#22C55E' : '#4B5563',
                    boxShadow: isActive ? '0 0 0 2px #22C55E' : 'none',
                  }}>
                    {DAY_LABELS[day]}
                    {hasFoods && !isActive && (
                      <span style={{ marginLeft: 4, fontSize: '0.62rem', background: 'rgba(34,197,94,.18)', borderRadius: 999, padding: '0 4px' }}>{kcal}k</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Day content */}
            {dayData && totals && (
              <div style={{ animation: 'fadeUp 200ms ease' }}>
                <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#F8FAFC', margin: '0 0 16px' }}>{DAY_FULL[activeDay]}</h2>

                {/* Daily macro bars */}
                <div className="card" style={{ padding: '16px', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.68rem', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 12 }}>Total du jour</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label:'Calories', val:totals.kcal, target:calorieTarget, unit:'kcal', color:MACRO_COLORS.kcal },
                      { label:'Protéines', val:totals.prot, target:protTarget, unit:'g', color:MACRO_COLORS.prot },
                      { label:'Glucides', val:totals.carb, target:carbTarget, unit:'g', color:MACRO_COLORS.carb },
                      { label:'Lipides', val:totals.fat, target:fatTarget, unit:'g', color:MACRO_COLORS.fat },
                    ].map(({ label, val, target, unit, color }) => (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                          <span style={{ fontSize: '0.8rem', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.95rem', fontWeight: 700, color }}>
                            {val}<span style={{ fontSize: '0.68rem', color: '#6B7280', marginLeft: 2 }}>{unit}</span>
                            <span style={{ fontSize: '0.72rem', color: '#4B5563', marginLeft: 6 }}>/ {target}{unit}</span>
                          </span>
                        </div>
                        <div style={{ background: '#374151', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, background: color, width: `${pct(val, target)}%`, transition: 'width 400ms ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(dayData.meals ?? []).filter(m => m.foods?.length > 0).map((meal, mi) => {
                    const mt = meal.foods.reduce((a, f) => ({ kcal: a.kcal+f.kcal, prot: a.prot+f.prot, carb: a.carb+f.carb, fat: a.fat+f.fat }), { kcal:0, prot:0, carb:0, fat:0 })
                    return (
                      <div key={mi} className="card" style={{ overflow: 'hidden', animation: `fadeUp ${150 + mi * 50}ms ease` }}>
                        {/* Meal header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #374151', background: 'rgba(255,255,255,.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1rem' }}>{MEAL_ICONS[meal.type] ?? '🍴'}</span>
                            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>{meal.type}</span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Barlow,sans-serif' }}>
                            {mt.kcal} kcal · {mt.prot}g prot
                          </span>
                        </div>

                        {/* Food list */}
                        <div>
                          {meal.foods.map((food, fi) => (
                            <div key={fi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: fi < meal.foods.length - 1 ? '1px solid #1a2232' : 'none' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F8FAFC', marginBottom: 2 }}>{food.name || '—'}</div>
                                {food.qty && <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{food.qty}</div>}
                              </div>
                              <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                                <MacroTag val={food.kcal} unit="kcal" color={MACRO_COLORS.kcal} />
                                <MacroTag val={food.prot} unit="g P" color={MACRO_COLORS.prot} />
                                <MacroTag val={food.carb} unit="g G" color={MACRO_COLORS.carb} />
                                <MacroTag val={food.fat}  unit="g L" color={MACRO_COLORS.fat} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {(dayData.meals ?? []).every(m => !m.foods?.length) && (
                    <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280', fontSize: '0.9rem' }}>
                      Aucun aliment prévu ce jour.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}

function MacroTag({ val, unit, color }: { val: number; unit: string; color: string }) {
  if (!val) return null
  return (
    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.78rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}>
      {val}<span style={{ fontSize: '0.65rem', color: '#6B7280', marginLeft: 1 }}>{unit}</span>
    </span>
  )
}
