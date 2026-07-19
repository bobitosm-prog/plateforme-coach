'use client'
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCircle, Dumbbell, Loader2, Moon, Search, Sparkles, X } from 'lucide-react'
import ConfirmDialog from '../../../../components/ui/ConfirmDialog'
import { DAYS } from '../../hooks/useClientDetail'
import { BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY, MUSCLE_COLORS, MUSCLE_GROUPS_FILTER as MUSCLE_FILTERS } from '@/lib/design-tokens'
import type { ClientDetailState, ClientProgramTemplate } from './client-detail-page-types'

const inputStyle: React.CSSProperties = {
  width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0,
  padding: '11px 14px', fontFamily: FONT_BODY, fontSize: '0.9rem', color: TEXT_PRIMARY,
  outline: 'none', transition: 'border-color 200ms ease',
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{display:'block',fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,color:TEXT_MUTED,marginBottom:6,letterSpacing:'2px',textTransform:'uppercase'}}>{label}</label>{children}</div>
}

interface ClientDetailPageOverlaysProps {
  detail: ClientDetailState
  pendingTemplate: ClientProgramTemplate | null
  onClearPendingTemplate: () => void
}

export default function ClientDetailPageOverlays({ detail: h, pendingTemplate, onClearPendingTemplate }: ClientDetailPageOverlaysProps) {
  const profile = h.profile!
  return (
    <>
      {/* EDIT MODAL */}
      <div className={`modal-overlay${h.editOpen?' open':''}`} onClick={()=>h.setEditOpen(false)}>
        <div className="modal" style={{maxWidth:560,padding:0,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:`1px solid ${BORDER}`}}>
            <h2 style={{fontFamily:FONT_DISPLAY,fontSize:'1.6rem',fontWeight:400,margin:0,color:TEXT_PRIMARY,letterSpacing:'1px',textTransform:'uppercase'}}>Modifier le profil</h2>
            <button style={{background:BG_CARD_2,border:'none',borderRadius:0,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onClick={()=>h.setEditOpen(false)}>
              <X size={16} color={TEXT_MUTED} strokeWidth={2}/>
            </button>
          </div>
          <div style={{display:'flex',gap:0,borderBottom:`1px solid ${BORDER}`,background:BG_BASE}}>
            {(['info','metrics','status'] as const).map(tab => {
              const labels = { info:'Informations', metrics:'Métriques', status:'Statut & Objectif' }
              return (
                <button key={tab} onClick={()=>h.setEditTab(tab)} style={{flex:1,padding:'12px 8px',border:'none',cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.82rem',fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',transition:'all 150ms ease',background:'transparent',color:h.editTab===tab?GOLD:TEXT_MUTED,borderBottom:h.editTab===tab?`2px solid ${GOLD}`:'2px solid transparent',marginBottom:-1}}>
                  {labels[tab]}
                </button>
              )
            })}
          </div>
          <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:14,maxHeight:'60vh',overflowY:'auto'}}>
            {h.editTab === 'info' && (<>
              <EditField label="Nom complet"><input value={h.editName} onChange={e=>h.setEditName(e.target.value)} style={inputStyle} onFocus={e=>{e.target.style.borderColor=GOLD;e.target.style.boxShadow=`0 0 0 3px ${GOLD_DIM}`}} onBlur={e=>{e.target.style.borderColor=BORDER;e.target.style.boxShadow='none'}}/></EditField>
              <EditField label="Email"><input type="email" value={h.editEmail} onChange={e=>h.setEditEmail(e.target.value)} style={inputStyle} onFocus={e=>{e.target.style.borderColor=GOLD;e.target.style.boxShadow=`0 0 0 3px ${GOLD_DIM}`}} onBlur={e=>{e.target.style.borderColor=BORDER;e.target.style.boxShadow='none'}}/></EditField>
              <EditField label="Téléphone"><input type="tel" value={h.editPhone} onChange={e=>h.setEditPhone(e.target.value)} placeholder="+33 6 00 00 00 00" style={inputStyle} onFocus={e=>{e.target.style.borderColor=GOLD;e.target.style.boxShadow=`0 0 0 3px ${GOLD_DIM}`}} onBlur={e=>{e.target.style.borderColor=BORDER;e.target.style.boxShadow='none'}}/></EditField>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <EditField label="Date de naissance"><input type="date" value={h.editBirth} onChange={e=>h.setEditBirth(e.target.value)} style={{...inputStyle,colorScheme:'dark'} as React.CSSProperties} onFocus={e=>{e.target.style.borderColor=GOLD}} onBlur={e=>{e.target.style.borderColor=BORDER}}/></EditField>
                <EditField label="Genre">
                  <select value={h.editGender} onChange={e=>h.setEditGender(e.target.value)} style={{...inputStyle,appearance:'none',cursor:'pointer'} as React.CSSProperties} onFocus={e=>{e.target.style.borderColor=GOLD}} onBlur={e=>{e.target.style.borderColor=BORDER}}>
                    <option value="">Non précisé</option><option value="homme">Homme</option><option value="femme">Femme</option><option value="autre">Autre</option>
                  </select>
                </EditField>
              </div>
            </>)}
            {h.editTab === 'metrics' && (<>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <EditField label="Poids actuel (kg)"><input type="number" step="0.1" value={h.editWeight} onChange={e=>h.setEditWeight(e.target.value)} placeholder="70" style={inputStyle} onFocus={e=>{e.target.style.borderColor=GOLD;e.target.style.boxShadow=`0 0 0 3px ${GOLD_DIM}`}} onBlur={e=>{e.target.style.borderColor=BORDER;e.target.style.boxShadow='none'}}/></EditField>
                <EditField label="Taille (cm)"><input type="number" step="1" value={h.editHeight} onChange={e=>h.setEditHeight(e.target.value)} placeholder="175" style={inputStyle} onFocus={e=>{e.target.style.borderColor=GOLD;e.target.style.boxShadow=`0 0 0 3px ${GOLD_DIM}`}} onBlur={e=>{e.target.style.borderColor=BORDER;e.target.style.boxShadow='none'}}/></EditField>
                <EditField label="Poids cible (kg)"><input type="number" step="0.1" value={h.editTargetW} onChange={e=>h.setEditTargetW(e.target.value)} placeholder="65" style={inputStyle} onFocus={e=>{e.target.style.borderColor=GOLD;e.target.style.boxShadow=`0 0 0 3px ${GOLD_DIM}`}} onBlur={e=>{e.target.style.borderColor=BORDER;e.target.style.boxShadow='none'}}/></EditField>
                <EditField label="% Graisse corporelle"><input type="number" step="0.1" value={h.editBodyFat} onChange={e=>h.setEditBodyFat(e.target.value)} placeholder="20" style={inputStyle} onFocus={e=>{e.target.style.borderColor=GOLD;e.target.style.boxShadow=`0 0 0 3px ${GOLD_DIM}`}} onBlur={e=>{e.target.style.borderColor=BORDER;e.target.style.boxShadow='none'}}/></EditField>
              </div>
              {h.editWeight && h.editHeight && (() => {
                const bmi = (parseFloat(h.editWeight) / ((parseFloat(h.editHeight)/100)**2)).toFixed(1)
                const bmiNum = parseFloat(bmi)
                const cat = bmiNum < 18.5 ? {label:'Insuffisance pondérale',color:'#60A5FA'} : bmiNum < 25 ? {label:'Poids normal',color:GOLD} : bmiNum < 30 ? {label:'Surpoids',color:'#E8C97A'} : {label:'Obésité',color:RED}
                return (
                  <div style={{background:BG_BASE,border:`1px solid ${BORDER}`,borderRadius:0,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontFamily:FONT_ALT,fontSize:'11px',fontWeight:700,color:TEXT_MUTED,textTransform:'uppercase',letterSpacing:'2px'}}>IMC calculé</span>
                    <span style={{fontFamily:FONT_DISPLAY,fontSize:'1.3rem',fontWeight:400,color:cat.color}}>{bmi} <span style={{fontFamily:FONT_BODY,fontSize:'0.75rem',color:TEXT_MUTED,fontWeight:500}}>— {cat.label}</span></span>
                  </div>
                )
              })()}
            </>)}
            {h.editTab === 'status' && (<>
              <EditField label="Statut">
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[{val:'active',label:'Actif',color:GOLD},{val:'warning',label:'À relancer',color:GOLD},{val:'inactive',label:'Inactif',color:TEXT_MUTED}].map(({val,label,color})=>(
                    <button key={val} onClick={()=>h.setEditStatus(val)} style={{padding:'10px 8px',borderRadius:0,border:`2px solid ${h.editStatus===val?color:BORDER}`,cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.85rem',fontWeight:700,background:h.editStatus===val?`${color}20`:'transparent',color:h.editStatus===val?color:TEXT_MUTED,transition:'all 150ms ease'}}>{label}</button>
                  ))}
                </div>
              </EditField>
              <EditField label="Objectif">
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {[{val:'perte_poids',label:'Perte de poids',icon:'📉'},{val:'prise_masse',label:'Prise de masse',icon:'💪'},{val:'maintien',label:'Maintien',icon:'⚖️'},{val:'performance',label:'Performance',icon:'🏆'}].map(({val,label,icon})=>(
                    <button key={val} onClick={()=>h.setEditObj(val)} style={{padding:'12px 10px',borderRadius:0,border:`2px solid ${h.editObj===val?GOLD:BORDER}`,cursor:'pointer',fontFamily:FONT_ALT,fontSize:'0.85rem',fontWeight:700,background:h.editObj===val?GOLD_DIM:'transparent',color:h.editObj===val?GOLD:TEXT_MUTED,transition:'all 150ms ease',display:'flex',alignItems:'center',gap:8}}><span>{icon}</span>{label}</button>
                  ))}
                </div>
              </EditField>
            </>)}
          </div>
          <div style={{display:'flex',gap:10,padding:'16px 24px',borderTop:`1px solid ${BORDER}`}}>
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
              onClick={e => e.stopPropagation()} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: `${RADIUS_CARD}px ${RADIUS_CARD}px 0 0`, width: '100%', maxHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '20px 20px 0', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, background: BG_CARD }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 400, color: TEXT_PRIMARY, margin: 0, letterSpacing: '2px', textTransform: 'uppercase' }}>BASE D&apos;EXERCICES</h3>
                    {h.exDbTargetDay && <p style={{ fontSize: '0.72rem', fontFamily: FONT_BODY, color: TEXT_MUTED, margin: '2px 0 0', textTransform: 'capitalize' }}>Ajouter à · {h.exDbTargetDay}</p>}
                  </div>
                  <button onClick={() => { h.setShowExDbModal(false); h.setExDbSearch('') }} style={{ width: 44, height: 44, borderRadius: 12, background: BG_CARD_2, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 10 }}><X size={18} color={TEXT_MUTED} /></button>
                </div>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }} />
                  <input value={h.exDbSearch} onChange={e => h.setExDbSearch(e.target.value)} placeholder="Rechercher un exercice..." autoFocus style={{ ...inputStyle, paddingLeft: 40, borderRadius: 12, fontSize: '0.88rem' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 14 }}>
                  {MUSCLE_FILTERS.map(mg => {
                    const active = h.exDbFilter === mg; const color = MUSCLE_COLORS[mg] ?? GOLD
                    return (<button key={mg} onClick={() => h.setExDbFilter(mg)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 12, border: `1px solid ${active ? color : BORDER}`, background: active ? `${color}22` : BG_CARD_2, color: active ? color : TEXT_MUTED, fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 150ms', letterSpacing: '1px', textTransform: 'uppercase' }}>{mg}</button>)
                  })}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 0' }}>
                {(() => {
                  let list = h.exDbSearch.length >= 2 ? h.exDbResults : h.exDbAll
                  if (h.exDbFilter !== 'Tous') list = list.filter(ex => (ex.muscle_group || '').toLowerCase() === h.exDbFilter.toLowerCase())
                  if (list.length === 0) return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 0', color: TEXT_MUTED }}>
                      <Dumbbell size={32} strokeWidth={1.5} />
                      <p style={{ fontSize: '0.85rem', fontFamily: FONT_BODY, margin: 0 }}>{h.exDbSearch.length >= 2 ? 'Aucun résultat' : h.exDbAll.length === 0 ? 'Chargement...' : 'Aucun exercice pour ce groupe'}</p>
                    </div>
                  )
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {list.map(ex => {
                        const mgColor = MUSCLE_COLORS[ex.muscle_group ?? ''] ?? TEXT_MUTED
                        const difficultyValue = Reflect.get(ex, 'difficulty')
                        const difficulty = typeof difficultyValue === 'string' ? difficultyValue : undefined
                        const diffColor = difficulty === 'Avancé' ? RED : difficulty === 'Intermédiaire' ? GOLD : GREEN
                        return (
                          <motion.button key={ex.id} whileTap={{ scale: 0.96 }} onClick={() => h.selectExercise(ex)}
                            style={{ background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'border-color 150ms' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = mgColor)} onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                            <div style={{ height: 3, background: mgColor, width: '100%', flexShrink: 0 }} />
                            <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <div style={{ fontFamily: FONT_ALT, fontWeight: 700, fontSize: '0.88rem', color: TEXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.2 }}>{ex.name}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {ex.muscle_group && <span style={{ fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: mgColor, background: `${mgColor}20`, borderRadius: 12, padding: '2px 6px', display: 'inline-block', width: 'fit-content' }}>{ex.muscle_group}</span>}
                                {ex.equipment && <span style={{ fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 700, color: TEXT_MUTED, background: BG_CARD, borderRadius: 12, padding: '2px 6px', display: 'inline-block', width: 'fit-content', letterSpacing: '1px', textTransform: 'uppercase' }}>{ex.equipment}</span>}
                                {difficulty && <span style={{ fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 700, color: diffColor, background: `${diffColor}18`, borderRadius: 12, padding: '2px 6px', display: 'inline-block', width: 'fit-content', letterSpacing: '1px', textTransform: 'uppercase' }}>{difficulty}</span>}
                              </div>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  )
                })()}
                <div style={{ height: 32 }} />
              </div>
              <div style={{ padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', borderTop: `1px solid ${BORDER}`, flexShrink: 0, background: BG_CARD }}>
                <button onClick={() => { h.setShowExDbModal(false); h.setExDbSearch('') }} style={{ width: '100%', padding: 14, borderRadius: 12, background: BG_CARD_2, border: `1px solid ${BORDER}`, color: TEXT_MUTED, fontFamily: FONT_DISPLAY, fontSize: 16, cursor: 'pointer', letterSpacing: 2 }}>
                  FERMER
                </button>
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
              style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, background: GOLD_DIM }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={18} color="#0D0B08" strokeWidth={2} /></div>
                  <div>
                    <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 400, color: TEXT_PRIMARY, margin: 0, letterSpacing: '2px', textTransform: 'uppercase' }}>GÉNÉRER AVEC L&apos;IA</h2>
                    <p style={{ fontSize: '0.72rem', fontFamily: FONT_BODY, color: TEXT_MUTED, margin: 0 }}>Claude génère un programme personnalisé</p>
                  </div>
                </div>
                {!h.aiGenerating && <button onClick={() => h.setShowAiModal(false)} style={{ width: 32, height: 32, borderRadius: 12, background: BG_CARD_2, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>}
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {h.aiGenerating && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '56px 24px' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 1s linear infinite' }}><Loader2 size={28} color="#0D0B08" strokeWidth={2} /></div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: FONT_DISPLAY, fontSize: '1.2rem', fontWeight: 400, color: TEXT_PRIMARY, margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>L&apos;IA génère votre programme…</p>
                      <p style={{ fontSize: '0.78rem', fontFamily: FONT_BODY, color: TEXT_MUTED, marginTop: 6 }}>Cela prend quelques secondes</p>
                    </div>
                  </div>
                )}
                {!h.aiGenerating && h.aiPreview && (
                  <div style={{ padding: '20px 24px' }}>
                    <p style={{ fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 700, color: GOLD, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>✓ Programme généré — aperçu</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                      {DAYS.map(d => {
                        const day = h.aiPreview![d]
                        return (
                          <div key={d} style={{ background: BG_BASE, borderRadius: RADIUS_CARD, padding: '10px 14px', border: `1px solid ${day?.repos ? BORDER : GOLD_RULE}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontFamily: FONT_ALT, fontSize: '0.85rem', fontWeight: 700, color: day?.repos ? TEXT_DIM : GOLD, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                              {day?.repos ? <span style={{ fontSize: '0.72rem', fontFamily: FONT_BODY, color: TEXT_DIM, display: 'flex', alignItems: 'center', gap: 4 }}><Moon size={10} /> Repos</span>
                                : <span style={{ fontSize: '0.72rem', fontFamily: FONT_ALT, color: GOLD, fontWeight: 700 }}>{(day?.exercises || []).length} exercice{(day?.exercises || []).length !== 1 ? 's' : ''}</span>}
                            </div>
                            {!day?.repos && (day?.exercises || []).length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {(day.exercises || []).map((ex, i) => <span key={i} style={{ fontFamily: FONT_BODY, fontSize: '0.68rem', background: GOLD_DIM, color: GOLD, borderRadius: 12, padding: '2px 8px' }}>{ex.name}</span>)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={h.generateAiProgram} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: `1px solid ${GOLD_RULE}`, background: 'transparent', color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_ALT, fontSize: '0.9rem', fontWeight: 700 }}><Sparkles size={13} /> Régénérer</button>
                      <button onClick={h.acceptAiPreview} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: 'none', background: GOLD, color: '#0D0B08', cursor: 'pointer', fontFamily: FONT_ALT, fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.04em' }}><Check size={15} strokeWidth={2.5} /> Accepter ce programme</button>
                    </div>
                  </div>
                )}
                {!h.aiGenerating && !h.aiPreview && (
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ background: BG_BASE, borderRadius: RADIUS_CARD, padding: '12px 16px', border: `1px solid ${BORDER}` }}>
                      <p style={{ fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 700, color: TEXT_MUTED, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Contexte client (auto-rempli)</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div><p style={{ fontFamily: FONT_ALT, fontSize: '11px', color: TEXT_MUTED, margin: '0 0 2px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Objectif</p><p style={{ fontSize: '0.82rem', fontFamily: FONT_BODY, color: TEXT_PRIMARY, margin: 0, fontWeight: 500 }}>{profile?.objective || '—'}</p></div>
                        <div><p style={{ fontFamily: FONT_ALT, fontSize: '11px', color: TEXT_MUTED, margin: '0 0 2px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Poids actuel</p><p style={{ fontSize: '0.82rem', fontFamily: FONT_BODY, color: TEXT_PRIMARY, margin: 0, fontWeight: 500 }}>{h.currentWeight ? `${h.currentWeight} kg` : '—'}</p></div>
                        <div><p style={{ fontFamily: FONT_ALT, fontSize: '11px', color: TEXT_MUTED, margin: '0 0 2px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Poids cible</p><p style={{ fontSize: '0.82rem', fontFamily: FONT_BODY, color: TEXT_PRIMARY, margin: 0, fontWeight: 500 }}>{profile?.target_weight ? `${profile.target_weight} kg` : '—'}</p></div>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 700, color: TEXT_MUTED, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Niveau</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {h.AI_LEVELS.map(l => <button key={l} onClick={() => h.setAiLevel(l)} style={{ flex: 1, padding: '8px 4px', borderRadius: 12, border: `1px solid ${h.aiLevel === l ? GOLD : BORDER}`, background: h.aiLevel === l ? GOLD_DIM : 'transparent', color: h.aiLevel === l ? GOLD : TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 700, transition: 'all 150ms' }}>{l}</button>)}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 700, color: TEXT_MUTED, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Équipement disponible</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {h.AI_EQUIPMENT.map(item => {
                          const checked = h.aiEquipment.includes(item)
                          return (<button key={item} onClick={() => h.toggleAiEquipment(item)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 12, border: `1px solid ${checked ? GOLD : BORDER}`, background: checked ? GOLD_DIM : 'transparent', color: checked ? GOLD : TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: '0.82rem', fontWeight: checked ? 700 : 500, transition: 'all 150ms' }}>
                            <div style={{ width: 14, height: 14, borderRadius: 12, border: `2px solid ${checked ? GOLD : TEXT_DIM}`, background: checked ? GOLD : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 150ms' }}>{checked && <Check size={9} color="#0D0B08" strokeWidth={3} />}</div>
                            {item}
                          </button>)
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: FONT_ALT, fontSize: '11px', fontWeight: 700, color: TEXT_MUTED, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Jours d&apos;entraînement — <span style={{ color: GOLD }}>{h.aiTrainingDays} jours/semaine</span> <span style={{ color: TEXT_DIM, fontWeight: 400, fontSize: '0.65rem' }}>({h.aiTrainingDays === 3 ? 'Full Body' : h.aiTrainingDays === 4 ? 'Upper/Lower' : h.aiTrainingDays === 5 ? 'PPL+UL' : 'PPL x2'})</span></label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '0.78rem', fontFamily: FONT_BODY, color: TEXT_MUTED, minWidth: 12 }}>3</span>
                        <input type="range" min={3} max={6} step={1} value={h.aiTrainingDays} onChange={e => h.setAiTrainingDays(parseInt(e.target.value))} style={{ flex: 1, accentColor: GOLD, cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.78rem', fontFamily: FONT_BODY, color: TEXT_MUTED, minWidth: 12 }}>6</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        {[3, 4, 5, 6].map(n => <span key={n} style={{ fontFamily: FONT_BODY, fontSize: '0.68rem', color: n === h.aiTrainingDays ? GOLD : TEXT_DIM, fontWeight: n === h.aiTrainingDays ? 700 : 400 }}>{n}j</span>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!h.aiGenerating && !h.aiPreview && (
                <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}` }}>
                  <button onClick={h.generateAiProgram} disabled={h.aiEquipment.length === 0}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, border: 'none', background: h.aiEquipment.length === 0 ? BG_CARD_2 : GOLD, color: h.aiEquipment.length === 0 ? TEXT_DIM : '#0D0B08', cursor: h.aiEquipment.length === 0 ? 'not-allowed' : 'pointer', fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em' }}>
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
          <CheckCircle size={15} color={GREEN} strokeWidth={2}/>
          <span>{h.toast}</span>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingTemplate}
        variant="danger"
        title="Mettre a jour depuis le template"
        message={`Remplacer le programme actuel par "${pendingTemplate?.name}" ? Les modifications faites pour ce client seront ecrasees.`}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        onConfirm={() => {
          if (pendingTemplate) h.resyncFromTemplate(pendingTemplate)
          onClearPendingTemplate()
        }}
        onCancel={() => onClearPendingTemplate()}
      />
    </>
  )
}
