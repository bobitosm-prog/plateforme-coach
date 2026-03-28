'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Zap, BarChart2, Dumbbell, UtensilsCrossed, TrendingUp,
  User, MessageCircle, Plus, ChevronRight, Search, X,
} from 'lucide-react'

import useClientDashboard from './hooks/useClientDashboard'
import Paywall from './components/Paywall'
import BugReport from './components/BugReport'
import { cache } from '../lib/cache'

import WorkoutSession from './components/WorkoutSession'
import WeightModal from './components/modals/WeightModal'
import MeasureModal from './components/modals/MeasureModal'
import BmrModal from './components/modals/BmrModal'
import HomeTab from './components/tabs/HomeTab'
import TrainingTab from './components/tabs/TrainingTab'
import NutritionTab from './components/tabs/NutritionTab'
import ProgressTab from './components/tabs/ProgressTab'
import ProfileTab from './components/tabs/ProfileTab'
import MessagesTab from './components/tabs/MessagesTab'

import {
  BG_BASE, BG_CARD, BORDER, ORANGE, GREEN, TEXT_PRIMARY, TEXT_MUTED,
  MEAL_TYPES,
} from '../lib/design-tokens'

const CoachDashboard = dynamic(() => import('./coach/page'), { ssr: false })

export default function CoachApp() {
  const h = useClientDashboard()

  /* ── Loading splash ── */
  if (!h.mounted || h.loading || (h.session && !h.roleChecked)) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#0A0A0A', gap: 24 }}>
      <div style={{ width: 80, height: 80, background: '#C9A84C', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Zap size={40} color="#000" strokeWidth={2.5} fill="#000" />
      </div>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: '0.1em' }}>MOOVX</span>
      <div style={{ width: 32, height: 32, border: '3px solid #222', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  /* ── Not authenticated → landing ── */
  if (!h.session && !h.loading) {
    h.supabase.from('app_logs').insert({ level: 'warning', message: 'PAGE_REDIRECT_LANDING', details: { loading: h.loading, hasSession: !!h.session, url: typeof window !== 'undefined' ? window.location.href : '' }, page_url: '/' })
    h.router.push('/landing')
    return null
  }

  /* ── Coach role → render coach dashboard directly (no redirect) ── */
  if (h.userRole === 'coach') return <CoachDashboard initialSession={h.session} />

  /* ── Trial expired OR no subscription → paywall ── */
  if (h.profile && !h.isSubActive) return (
    <div style={{ minHeight: '100dvh', background: '#0A0A0A', display: 'flex', flexDirection: 'column' }}>
      {h.trialExpired && (
        <div style={{ textAlign: 'center', padding: '40px 24px 0' }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#C9A84C,#F0D060)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Zap size={28} color="#000" strokeWidth={2.5} fill="#000" />
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.6rem,4vw,2.2rem)', letterSpacing: 3, color: '#F8FAFC', margin: '0 0 8px' }}>TA PÉRIODE D&apos;ESSAI EST TERMINÉE</h1>
          <p style={{ color: '#555', fontSize: '0.88rem', margin: '0 0 4px', fontFamily: "'DM Sans', sans-serif", fontWeight: 300, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Ton essai gratuit de 10 jours est arrivé à son terme. Abonne-toi pour continuer à utiliser MoovX.
          </p>
        </div>
      )}
      <Paywall role="client" userId={h.session.user.id} coachId={h.coachId} onSignOut={() => { cache.clearAll(); h.supabase.auth.signOut().then(() => { window.location.href = '/landing' }) }} />
    </div>
  )

  /* ══════════════════════════════════════════════════════════════
     MAIN APP SHELL
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="app-shell" style={{ display: 'flex', width: '100%', background: BG_BASE, color: TEXT_PRIMARY, fontFamily: "'Barlow', sans-serif" }}>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="desktop-sidebar" style={{ display: 'none', width: 240, flexShrink: 0, flexDirection: 'column', height: '100dvh', position: 'fixed', top: 0, left: 0, background: '#111111', borderRight: '1px solid #222222', zIndex: 50, padding: '24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, background: '#C9A84C', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} color="#000" strokeWidth={2.5} fill="#000" />
          </div>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: '0.1em' }}>MOOVX</span>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
          {([
            { id: 'home', icon: BarChart2, label: 'Home' },
            { id: 'training', icon: Dumbbell, label: 'Training' },
            { id: 'nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
            { id: 'progress', icon: TrendingUp, label: 'Progress' },
            { id: 'messages', icon: MessageCircle, label: 'Messages' },
            { id: 'profil', icon: User, label: 'Profil' },
          ] as const).map(({ id, icon: Icon, label }) => {
            const active = h.activeTab === id
            const badge = id === 'messages' && h.unreadCount > 0
            return (
              <button key={id} onClick={() => h.setActiveTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: active ? 'rgba(201,168,76,0.15)' : 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 150ms' }}>
                <div style={{ position: 'relative' }}>
                  <Icon size={20} color={active ? '#C9A84C' : '#6B7280'} strokeWidth={2} />
                  {badge && <span style={{ position: 'absolute', top: -4, right: -6, minWidth: 14, height: 14, background: '#EF4444', borderRadius: 7, fontSize: '0.5rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{h.unreadCount > 9 ? '9+' : h.unreadCount}</span>}
                </div>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, color: active ? '#C9A84C' : '#9CA3AF', letterSpacing: '0.04em' }}>{label}</span>
              </button>
            )
          })}
        </nav>
        {h.profile && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #222222', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#000' }}>
              {(h.profile.full_name || '?')[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: '0.82rem', color: '#9CA3AF', fontWeight: 500 }}>{h.profile.full_name || 'Utilisateur'}</span>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="main-content-area" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100dvh', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .photo-cell:hover .photo-delete-btn { opacity: 1 !important; }
        .client-main-scroll { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
        @media (min-width: 768px) { .client-main-scroll { padding-bottom: 16px; } }
      `}</style>

      {/* ── WorkoutSession fullscreen ── */}
      {h.workoutSession && (
        <WorkoutSession sessionName={h.workoutSession.name} exercises={h.workoutSession.exercises} onFinish={h.onFinishWorkout} onClose={() => { h.setWorkoutSession(null); h.fetchAll() }} />
      )}

      {/* ── WEIGHT MODAL ── */}
      {h.modal === 'weight' && <WeightModal currentWeight={h.currentWeight} onSave={h.saveWeight} onClose={() => h.setModal(null)} />}

      {/* ── MEASURE MODAL ── */}
      {h.modal === 'measure' && <MeasureModal measurements={h.measurements} onSave={h.saveMeasurements} onClose={() => h.setModal(null)} />}

      {/* ── BMR MODAL ── */}
      {h.modal === 'bmr' && <BmrModal supabase={h.supabase} session={h.session} initialValues={h.bmrForm} onClose={() => h.setModal(null)} />}

      {/* ── FOOD MODAL ── */}
      {h.modal === 'food' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ background: BG_CARD, borderRadius: '24px 24px 0 0', padding: '20px 16px 40px', marginTop: 40, minHeight: 'min(90vh, calc(100dvh - 40px))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>AJOUTER ALIMENT</h3>
              <button onClick={() => { h.setModal(null); h.setSelectedFood(null); h.setFoodSearch('') }} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {MEAL_TYPES.map(m => (
                <button key={m.id} onClick={() => h.setMealType(m.id)} style={{ border: `1px solid ${h.mealType === m.id ? ORANGE : BORDER}`, background: h.mealType === m.id ? `${ORANGE}15` : BG_BASE, borderRadius: 12, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 200ms' }}>
                  <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: h.mealType === m.id ? ORANGE : TEXT_MUTED }}>{m.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['anses', 'Base ANSES'], ['custom', 'Mes aliments']].map(([id, label]) => (
                <button key={id} onClick={() => { h.setSearchTab(id as any); h.setFoodSearch(''); h.setSelectedFood(null) }} style={{ flex: 1, border: `1px solid ${h.searchTab === id ? ORANGE : BORDER}`, background: h.searchTab === id ? `${ORANGE}15` : BG_BASE, borderRadius: 12, padding: '10px', fontSize: '0.75rem', fontWeight: 700, color: h.searchTab === id ? ORANGE : TEXT_MUTED, cursor: 'pointer', transition: 'all 200ms' }}>{label}</button>
              ))}
            </div>
            {!h.selectedFood ? (
              <>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED }} />
                  <input value={h.foodSearch} onChange={e => h.setFoodSearch(e.target.value)} placeholder={h.searchTab === 'anses' ? 'Rechercher dans la base ANSES...' : 'Rechercher mes aliments...'} style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }} />
                </div>
                {h.searchTab === 'custom' && (
                  <button onClick={() => h.setModal('custom_food')} style={{ width: '100%', border: `2px dashed ${BORDER}`, borderRadius: 12, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: TEXT_MUTED, fontSize: '0.8rem', fontWeight: 700, background: 'transparent', cursor: 'pointer', marginBottom: 12 }}><Plus size={14} /> Créer un aliment personnalisé</button>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {h.foodResults.map((food: any) => {
                    const cals = h.searchTab === 'anses' ? (food.energy_kcal || food.calories || 0) : food.calories_per_100g
                    const prot = h.searchTab === 'anses' ? (food.proteins || 0) : food.proteins_per_100g
                    return (
                      <button key={food.id} onClick={() => h.setSelectedFood(food)} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', transition: 'border-color 200ms' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: TEXT_PRIMARY }}>{food.name}</div>
                          {food.brand && <div style={{ fontSize: '0.7rem', color: TEXT_MUTED, marginTop: 2 }}>{food.brand}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: ORANGE }}>{Math.round(cals)} kcal</div>
                          <div style={{ fontSize: '0.65rem', color: TEXT_MUTED }}>P:{Math.round(prot)}g/100g</div>
                        </div>
                        <ChevronRight size={14} color={TEXT_MUTED} />
                      </button>
                    )
                  })}
                  {h.foodSearch.length >= 2 && h.foodResults.length === 0 && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.85rem', padding: '20px 0' }}>Aucun résultat</p>}
                  {h.foodSearch.length < 2 && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: '0.75rem', padding: '16px 0' }}>Saisir au moins 2 caractères</p>}
                </div>
              </>
            ) : (
              <div>
                <button onClick={() => h.setSelectedFood(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEXT_MUTED, fontSize: '0.8rem', fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 16 }}>← Retour</button>
                <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: TEXT_PRIMARY, fontSize: '1rem', marginBottom: 12 }}>{h.selectedFood.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      ['Calories', h.searchTab === 'anses' ? (h.selectedFood.energy_kcal || 0) : h.selectedFood.calories_per_100g, 'kcal', ORANGE],
                      ['Protéines', h.searchTab === 'anses' ? (h.selectedFood.proteins || 0) : h.selectedFood.proteins_per_100g, 'g', '#3b82f6'],
                      ['Glucides', h.searchTab === 'anses' ? (h.selectedFood.carbohydrates || h.selectedFood.carbs || 0) : h.selectedFood.carbs_per_100g, 'g', '#f59e0b'],
                      ['Lipides', h.searchTab === 'anses' ? (h.selectedFood.fat || h.selectedFood.fats || 0) : h.selectedFood.fats_per_100g, 'g', '#10b981'],
                    ].map(([n, v, u, c]) => (
                      <div key={n as string} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: c as string }}>{Math.round(v as number)}</div>
                        <div style={{ fontSize: '0.6rem', color: TEXT_MUTED }}>{u}/100g</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ color: TEXT_MUTED, fontSize: '0.9rem', flex: 1 }}>Quantité</span>
                  <input type="number" value={h.foodQty} onChange={e => h.setFoodQty(e.target.value)} style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '1.4rem', fontWeight: 700, textAlign: 'right', width: 80, outline: 'none', border: 'none' }} />
                  <span style={{ color: ORANGE, fontWeight: 700 }}>g</span>
                </div>
                <div style={{ background: `${ORANGE}10`, border: `1px solid ${ORANGE}20`, borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Pour {h.foodQty}g :</div>
                  <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    {[
                      ['Kcal', Math.round((h.searchTab === 'anses' ? (h.selectedFood.energy_kcal || 0) : h.selectedFood.calories_per_100g) * parseFloat(h.foodQty) / 100)],
                      ['Prot', Math.round((h.searchTab === 'anses' ? (h.selectedFood.proteins || 0) : h.selectedFood.proteins_per_100g) * parseFloat(h.foodQty) / 100 * 10) / 10],
                      ['Gluc', Math.round((h.searchTab === 'anses' ? (h.selectedFood.carbohydrates || h.selectedFood.carbs || 0) : h.selectedFood.carbs_per_100g) * parseFloat(h.foodQty) / 100 * 10) / 10],
                      ['Lip', Math.round((h.searchTab === 'anses' ? (h.selectedFood.fat || h.selectedFood.fats || 0) : h.selectedFood.fats_per_100g) * parseFloat(h.foodQty) / 100 * 10) / 10],
                    ].map(([n, v]) => (
                      <div key={n as string} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.6rem', fontWeight: 700, color: ORANGE }}>{v}</div>
                        <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase' }}>{n}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={h.addFoodToMeal} style={{ width: '100%', background: GREEN, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ajouter au repas</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CUSTOM FOOD MODAL ── */}
      {h.modal === 'custom_food' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>NOUVEL ALIMENT</h3>
              <button onClick={() => h.setModal('food')} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={h.customFoodForm.name} onChange={e => h.setCustomFoodForm(p => ({ ...p, name: e.target.value }))} placeholder="Nom de l'aliment *" style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }} />
              <input value={h.customFoodForm.brand} onChange={e => h.setCustomFoodForm(p => ({ ...p, brand: e.target.value }))} placeholder="Marque (optionnel)" style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['calories_per_100g', 'Calories *', 'kcal'], ['proteins_per_100g', 'Protéines', 'g'], ['carbs_per_100g', 'Glucides', 'g'], ['fats_per_100g', 'Lipides', 'g']].map(([k, l, u]) => (
                  <div key={k} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 4 }}>{l} /100g</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input type="number" value={(h.customFoodForm as any)[k]} onChange={e => h.setCustomFoodForm(p => ({ ...p, [k]: e.target.value }))} placeholder="0" style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '0.9rem', fontWeight: 700, flex: 1, outline: 'none', border: 'none', width: '100%' }} />
                      <span style={{ color: TEXT_MUTED, fontSize: '0.75rem' }}>{u}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={h.addCustomFood} style={{ width: '100%', background: ORANGE, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 16 }}>Créer l&apos;aliment</button>
          </div>
        </div>
      )}

      {/* ── TRIAL BANNER ── */}
      {h.isInTrial && (
        <div style={{ flexShrink: 0, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: h.trialDaysLeft <= 3 ? 'rgba(239,68,68,0.08)' : 'rgba(201,168,76,0.08)', border: `1px solid ${h.trialDaysLeft <= 3 ? 'rgba(239,68,68,0.2)' : 'rgba(201,168,76,0.2)'}`, borderLeft: 'none', borderRight: 'none' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: h.trialDaysLeft <= 3 ? '#EF4444' : '#C9A84C' }}>
            {h.trialDaysLeft <= 3 ? `Plus que ${h.trialDaysLeft} jour${h.trialDaysLeft !== 1 ? 's' : ''} !` : `Période d'essai — ${h.trialDaysLeft} jours restants`}
          </span>
          <button onClick={() => h.handleSubscribe('client_monthly')} style={{ padding: '6px 14px', background: h.trialDaysLeft <= 3 ? '#EF4444' : 'linear-gradient(135deg,#C9A84C,#D4AF37)', border: 'none', borderRadius: 8, color: h.trialDaysLeft <= 3 ? '#fff' : '#000', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', flexShrink: 0 }}>
            S&apos;abonner
          </button>
        </div>
      )}

      {/* ── TAB CONTENT ── */}
      <main ref={h.mainRef} className="client-main-scroll" data-scroll-container style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
      <AnimatePresence mode="wait">
        <motion.div key={h.activeTab} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}>
          {h.activeTab === 'home' && <HomeTab supabase={h.supabase} session={h.session} profile={h.profile} displayAvatar={h.displayAvatar} firstName={h.firstName} avatarRef={h.avatarRef} photoRef={h.photoRef} uploadAvatar={h.uploadAvatar} uploadProgressPhoto={h.uploadProgressPhoto} currentWeight={h.currentWeight} goalWeight={h.goalWeight} calorieGoal={h.calorieGoal} completedSessions={h.completedSessions} streak={h.streak} coachProgram={h.coachProgram} coachMealPlan={h.coachMealPlan} todayKey={h.todayKey} todayCoachDay={h.todayCoachDay} todaySessionDone={h.todaySessionDone} setActiveTab={h.setActiveTab} setModal={h.setModal} startProgramWorkout={h.startProgramWorkout} />}
          {h.activeTab === 'training' && <TrainingTab supabase={h.supabase} session={h.session} coachProgram={h.coachProgram} todayKey={h.todayKey} todaySessionDone={h.todaySessionDone} startProgramWorkout={h.startProgramWorkout} fetchAll={h.fetchAll} />}
          {h.activeTab === 'nutrition' && <NutritionTab coachMealPlan={h.coachMealPlan} todayKey={h.todayKey} setModal={h.setModal} profile={h.profile} supabase={h.supabase} userId={h.session?.user?.id || ''} fetchAll={h.fetchAll} />}
          {h.activeTab === 'progress' && <ProgressTab supabase={h.supabase} session={h.session} weightHistory30={h.weightHistory30} measurements={h.measurements} progressPhotos={h.progressPhotos} photoRef={h.photoRef} photoUploading={h.photoUploading} uploadProgressPhoto={h.uploadProgressPhoto} deletePhoto={h.deletePhoto} setModal={h.setModal} chartMin={h.chartMin} chartMax={h.chartMax} onRefresh={h.fetchAll} />}
          {h.activeTab === 'profil' && <ProfileTab supabase={h.supabase} session={h.session} profile={h.profile} displayAvatar={h.displayAvatar} fullName={h.fullName} firstName={h.firstName} avatarRef={h.avatarRef} uploadAvatar={h.uploadAvatar} currentWeight={h.currentWeight} goalWeight={h.goalWeight} calorieGoal={h.calorieGoal} coachProgram={h.coachProgram} coachId={h.coachId} setModal={h.setModal} fetchAll={h.fetchAll} />}
          {h.activeTab === 'messages' && <MessagesTab session={h.session} coachId={h.coachId} messages={h.messages} msgInput={h.msgInput} setMsgInput={h.setMsgInput} sendMessage={h.sendMessage} msgEndRef={h.msgEndRef} />}
        </motion.div>
      </AnimatePresence>
      </main>

      </div>{/* end main-content-area */}

      <BugReport session={h.session} profile={h.profile} />

      {/* ── BOTTOM NAV (fixed on mobile, hidden on desktop via CSS) ── */}
      <nav className="mobile-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 'calc(64px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: '#111111', borderTop: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 999 }}>
        {([
          { id: 'home', icon: BarChart2, label: 'Home' },
          { id: 'training', icon: Dumbbell, label: 'Training' },
          { id: 'nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
          { id: 'progress', icon: TrendingUp, label: 'Progress' },
          { id: 'messages', icon: MessageCircle, label: 'Messages' },
          { id: 'profil', icon: User, label: 'Profil' },
        ] as const).map(({ id, icon: Icon, label }) => {
          const active = h.activeTab === id
          const badge = id === 'messages' && h.unreadCount > 0
          return (
            <button key={id} onClick={() => h.setActiveTab(id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 6px', background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative' }}>
              {active && <motion.div layoutId="navIndicator" style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 3, background: ORANGE, borderRadius: '0 0 4px 4px' }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} />}
              <div style={{ position: 'relative' }}>
                <Icon size={20} color={active ? ORANGE : '#4B5563'} />
                {badge && <span style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, background: '#EF4444', borderRadius: 8, fontSize: '0.55rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{h.unreadCount > 9 ? '9+' : h.unreadCount}</span>}
              </div>
              <span style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: active ? ORANGE : '#4B5563', fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
