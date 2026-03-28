'use client'

import { Plus, Search, X, Check, Trash2 } from 'lucide-react'

interface CoachAlimentsProps {
  foodList: any[]
  foodFilter: 'fitness' | 'anses' | 'coach'
  setFoodFilter: (v: 'fitness' | 'anses' | 'coach') => void
  foodSearchQ: string
  setFoodSearchQ: (v: string) => void
  foodLoading: boolean
  loadFoods: () => void
  showAddFood: boolean
  setShowAddFood: (v: boolean) => void
  newFood: { name: string; energy_kcal: string; proteins: string; carbohydrates: string; fat: string; fiber: string; is_cooked: boolean }
  setNewFood: (v: any) => void
  saveNewFood: () => void
  deleteFood: (id: string) => void
}

export default function CoachAliments({
  foodList, foodFilter, setFoodFilter, foodSearchQ, setFoodSearchQ,
  foodLoading, loadFoods, showAddFood, setShowAddFood,
  newFood, setNewFood, saveNewFood, deleteFood,
}: CoachAlimentsProps) {
  // Auto-load on first render
  if (foodList.length === 0 && !foodLoading) loadFoods()

  return (
    <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>
      <style>{`
        @media(max-width:768px){.food-col-hide{display:none!important}.food-grid-row{grid-template-columns:1fr 50px 36px!important}}
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0, color: '#F8FAFC' }}>ALIMENTS</h1>
        <button onClick={() => setShowAddFood(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #C9A84C, #D4AF37)', color: '#000', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', fontWeight: 700 }}>
          <Plus size={14} strokeWidth={2.5} /> Ajouter
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {([['fitness', 'Fitness'], ['anses', 'ANSES'], ['coach', 'Mes ajouts']] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setFoodFilter(k); setTimeout(loadFoods, 0) }} style={{
            padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700,
            background: foodFilter === k ? 'rgba(201,168,76,0.15)' : '#1A1A1A',
            color: foodFilter === k ? '#C9A84C' : '#6B7280',
          }}>{l}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={16} color="#C9A84C" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={foodSearchQ} onChange={e => { setFoodSearchQ(e.target.value); setTimeout(loadFoods, 300) }} placeholder="Rechercher..."
          style={{ width: '100%', padding: '10px 12px 10px 38px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#F8FAFC', fontSize: '0.85rem', outline: 'none' }} />
      </div>

      {/* Table */}
      {foodLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>Chargement...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Header */}
          <div className="food-grid-row" style={{ display: 'grid', gridTemplateColumns: '1fr 50px 40px 40px 40px 36px', gap: 4, padding: '6px 10px', fontSize: '0.6rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Barlow Condensed', sans-serif" }}>
            <span>Nom</span><span>Kcal</span><span className="food-col-hide">P</span><span className="food-col-hide">G</span><span className="food-col-hide">L</span><span></span>
          </div>
          {foodList.map(f => (
            <div key={f.id} className="food-grid-row" style={{ display: 'grid', gridTemplateColumns: '1fr 50px 40px 40px 40px 36px', gap: 4, padding: '10px', background: '#141414', borderRadius: 10, alignItems: 'center', border: '1px solid #1E1E1E' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#F8FAFC', fontWeight: 500 }}>{f.name}</div>
                {f.source === 'coach' && <span style={{ fontSize: '0.55rem', color: '#C9A84C', fontWeight: 700 }}>COACH</span>}
              </div>
              <span style={{ fontSize: '0.78rem', color: '#EF4444', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" }}>{Math.round(f.energy_kcal || 0)}</span>
              <span className="food-col-hide" style={{ fontSize: '0.78rem', color: '#3B82F6', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" }}>{Math.round(f.proteins || 0)}</span>
              <span className="food-col-hide" style={{ fontSize: '0.78rem', color: '#F59E0B', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" }}>{Math.round(f.carbohydrates || 0)}</span>
              <span className="food-col-hide" style={{ fontSize: '0.78rem', color: '#22C55E', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" }}>{Math.round(f.fat || 0)}</span>
              {f.source === 'coach' ? (
                <button onClick={() => deleteFood(f.id)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={13} color="#EF4444" />
                </button>
              ) : <div />}
            </div>
          ))}
          {foodList.length === 0 && <div style={{ textAlign: 'center', padding: '30px 0', color: '#6B7280', fontSize: '0.85rem' }}>Aucun résultat</div>}
        </div>
      )}

      {/* Add food modal */}
      {showAddFood && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#1A1A1A', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 'min(480px, calc(100vw - 32px))', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#F8FAFC' }}>Nouvel aliment</h3>
              <button onClick={() => setShowAddFood(false)} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color="#6B7280" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={newFood.name} onChange={e => setNewFood((p: any) => ({ ...p, name: e.target.value }))} placeholder="Nom de l'aliment *"
                style={{ width: '100%', padding: '12px 14px', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#F8FAFC', fontSize: '0.9rem', outline: 'none' }} />
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valeurs pour 100g</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {([
                  { k: 'energy_kcal', l: 'Calories (kcal)', c: '#EF4444' },
                  { k: 'proteins', l: 'Protéines (g)', c: '#3B82F6' },
                  { k: 'carbohydrates', l: 'Glucides (g)', c: '#F59E0B' },
                  { k: 'fat', l: 'Lipides (g)', c: '#22C55E' },
                ] as const).map(({ k, l, c }) => (
                  <div key={k}>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: '#6B7280', marginBottom: 4 }}>{l}</label>
                    <input type="number" inputMode="decimal" value={newFood[k]} onChange={e => setNewFood((p: any) => ({ ...p, [k]: e.target.value }))} placeholder="0"
                      style={{ width: '100%', padding: '10px 12px', background: '#0A0A0A', border: `1px solid ${newFood[k] ? c + '60' : '#2A2A2A'}`, borderRadius: 8, color: c, fontSize: '1rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                  </div>
                ))}
              </div>
              {/* Cooked toggle */}
              <button onClick={() => setNewFood((p: any) => ({ ...p, is_cooked: !p.is_cooked }))} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: newFood.is_cooked ? 'rgba(201,168,76,0.1)' : '#0A0A0A', border: `1px solid ${newFood.is_cooked ? '#C9A84C40' : '#2A2A2A'}`, cursor: 'pointer' }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: newFood.is_cooked ? '#C9A84C' : '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {newFood.is_cooked && <Check size={12} color="#000" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: '0.82rem', color: '#F8FAFC' }}>Aliment cuit</span>
              </button>
              <button onClick={saveNewFood} disabled={!newFood.name.trim()} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: newFood.name.trim() ? 'pointer' : 'default', background: newFood.name.trim() ? 'linear-gradient(135deg, #C9A84C, #D4AF37)' : '#2A2A2A', color: newFood.name.trim() ? '#000' : '#6B7280', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
