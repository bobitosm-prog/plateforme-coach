'use client'

import { Plus, Search, X, Check, Trash2 } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'

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
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.8rem', fontWeight: 700, letterSpacing: '3px', margin: 0, color: TEXT_PRIMARY, textTransform: 'uppercase' }}>ALIMENTS</h1>
        <button onClick={() => setShowAddFood(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 0, border: 'none', cursor: 'pointer', background: GOLD, color: BG_BASE, fontFamily: FONT_ALT, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const, clipPath: 'polygon(0 0, 100% 0, 94% 100%, 0% 100%)' }}>
          <Plus size={14} strokeWidth={2.5} /> Ajouter
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {([['fitness', 'Fitness'], ['anses', 'ANSES'], ['coach', 'Mes ajouts']] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setFoodFilter(k); setTimeout(loadFoods, 0) }} style={{
            padding: '8px 14px', borderRadius: 0, border: 'none', cursor: 'pointer',
            fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const,
            background: foodFilter === k ? GOLD_DIM : BG_CARD,
            color: foodFilter === k ? GOLD : TEXT_MUTED,
          }}>{l}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={16} color={GOLD} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={foodSearchQ} onChange={e => { setFoodSearchQ(e.target.value); setTimeout(loadFoods, 300) }} placeholder="Rechercher..."
          style={{ width: '100%', padding: '10px 12px 10px 38px', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0, color: TEXT_PRIMARY, fontFamily: FONT_BODY, fontSize: '0.85rem', outline: 'none' }} />
      </div>

      {/* Table */}
      {foodLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: TEXT_MUTED, fontFamily: FONT_BODY }}>Chargement...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: BORDER }}>
          {/* Header */}
          <div className="food-grid-row" style={{ display: 'grid', gridTemplateColumns: '1fr 50px 40px 40px 40px 36px', gap: 1, padding: '6px 10px', background: GOLD_DIM, fontSize: '11px', fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '3px', fontFamily: FONT_ALT }}>
            <span>Nom</span><span>Kcal</span><span className="food-col-hide">P</span><span className="food-col-hide">G</span><span className="food-col-hide">L</span><span></span>
          </div>
          {foodList.map(f => (
            <div key={f.id} className="food-grid-row" style={{ display: 'grid', gridTemplateColumns: '1fr 50px 40px 40px 40px 36px', gap: 1, padding: '10px', background: BG_CARD, alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: '0.82rem', color: TEXT_PRIMARY, fontWeight: 500 }}>{f.name}</div>
                {f.source === 'coach' && <span style={{ fontFamily: FONT_ALT, fontSize: '0.55rem', color: GOLD, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const }}>COACH</span>}
              </div>
              <span style={{ fontSize: '0.78rem', color: RED, fontWeight: 700, fontFamily: FONT_DISPLAY }}>{Math.round(f.energy_kcal || 0)}</span>
              <span className="food-col-hide" style={{ fontSize: '0.78rem', color: '#3B82F6', fontWeight: 700, fontFamily: FONT_DISPLAY }}>{Math.round(f.proteins || 0)}</span>
              <span className="food-col-hide" style={{ fontSize: '0.78rem', color: GOLD, fontWeight: 700, fontFamily: FONT_DISPLAY }}>{Math.round(f.carbohydrates || 0)}</span>
              <span className="food-col-hide" style={{ fontSize: '0.78rem', color: GREEN, fontWeight: 700, fontFamily: FONT_DISPLAY }}>{Math.round(f.fat || 0)}</span>
              {f.source === 'coach' ? (
                <button onClick={() => deleteFood(f.id)} style={{ width: 32, height: 32, borderRadius: 0, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={13} color={RED} />
                </button>
              ) : <div />}
            </div>
          ))}
          {foodList.length === 0 && <div style={{ textAlign: 'center', padding: '30px 0', color: TEXT_MUTED, fontSize: '0.85rem', fontFamily: FONT_BODY, background: BG_CARD }}>Aucun résultat</div>}
        </div>
      )}

      {/* Add food modal */}
      {showAddFood && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: BG_CARD, borderRadius: `${RADIUS_CARD}px ${RADIUS_CARD}px 0 0`, padding: '24px 20px 40px', width: '100%', maxWidth: 'min(480px, calc(100vw - 32px))', margin: '0 auto', border: `1px solid ${BORDER}`, borderBottom: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, margin: 0, color: TEXT_PRIMARY, letterSpacing: '2px', textTransform: 'uppercase' }}>Nouvel aliment</h3>
              <button onClick={() => setShowAddFood(false)} style={{ width: 32, height: 32, background: BG_CARD_2, borderRadius: 0, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={newFood.name} onChange={e => setNewFood((p: any) => ({ ...p, name: e.target.value }))} placeholder="Nom de l'aliment *"
                style={{ width: '100%', padding: '12px 14px', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0, color: TEXT_PRIMARY, fontFamily: FONT_BODY, fontSize: '0.9rem', outline: 'none' }} />
              <div style={{ fontFamily: FONT_ALT, fontSize: '0.7rem', fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Valeurs pour 100g</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {([
                  { k: 'energy_kcal', l: 'Calories (kcal)', c: RED },
                  { k: 'proteins', l: 'Protéines (g)', c: '#3B82F6' },
                  { k: 'carbohydrates', l: 'Glucides (g)', c: GOLD },
                  { k: 'fat', l: 'Lipides (g)', c: GREEN },
                ] as const).map(({ k, l, c }) => (
                  <div key={k}>
                    <label style={{ display: 'block', fontFamily: FONT_ALT, fontSize: '0.68rem', color: TEXT_MUTED, marginBottom: 4, letterSpacing: '1px', textTransform: 'uppercase' as const }}>{l}</label>
                    <input type="number" inputMode="decimal" value={newFood[k]} onChange={e => setNewFood((p: any) => ({ ...p, [k]: e.target.value }))} placeholder="0"
                      style={{ width: '100%', padding: '10px 12px', background: BG_BASE, border: `1px solid ${newFood[k] ? c + '60' : BORDER}`, borderRadius: 0, color: c, fontSize: '1rem', fontFamily: FONT_DISPLAY, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                  </div>
                ))}
              </div>
              {/* Cooked toggle */}
              <button onClick={() => setNewFood((p: any) => ({ ...p, is_cooked: !p.is_cooked }))} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 0, background: newFood.is_cooked ? GOLD_DIM : BG_BASE, border: `1px solid ${newFood.is_cooked ? GOLD_RULE : BORDER}`, cursor: 'pointer' }}>
                <div style={{ width: 20, height: 20, borderRadius: 0, background: newFood.is_cooked ? GOLD : BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {newFood.is_cooked && <Check size={12} color={BG_BASE} strokeWidth={3} />}
                </div>
                <span style={{ fontFamily: FONT_BODY, fontSize: '0.82rem', color: TEXT_PRIMARY }}>Aliment cuit</span>
              </button>
              <button onClick={saveNewFood} disabled={!newFood.name.trim()} style={{ width: '100%', padding: '14px', borderRadius: 0, border: 'none', cursor: newFood.name.trim() ? 'pointer' : 'default', background: newFood.name.trim() ? GOLD : BORDER, color: newFood.name.trim() ? BG_BASE : TEXT_MUTED, fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', clipPath: 'polygon(0 0, 100% 0, 97% 100%, 0% 100%)' }}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
