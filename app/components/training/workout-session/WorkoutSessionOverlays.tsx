'use client'

import { getExerciseName } from '../../../../lib/i18n-exercise'
import { getMuscleLabel } from '../../../../lib/i18n-muscle'
import { BG_CARD_2, BORDER, FONT_ALT, FONT_BODY, FONT_DISPLAY, GOLD, GOLD_DIM, GOLD_RULE, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY, colors } from '../../../../lib/design-tokens'
import TempoModal from '../TempoModal'
import TempoExecutor from '../TempoExecutor'
import type { WorkoutExerciseInfo, WorkoutExerciseVariant, WorkoutTempoExecutorState, WorkoutTempoModalState, WorkoutTranslate, WorkoutVariantPopupState } from './types'
import DeferredVideo from '../../media/DeferredVideo'
import { resolveExerciseVideoPoster, resolveLocalExerciseVideoPoster } from '../../../../lib/media/exercise-video-posters'

interface WorkoutSessionOverlaysProps {
  exerciseInfo: WorkoutExerciseInfo | null
  variantPopup: WorkoutVariantPopupState | null
  showSavePopup: boolean
  tempoModal: WorkoutTempoModalState | null
  tempoExecutor: WorkoutTempoExecutorState | null
  locale: 'fr' | 'en' | 'de'
  t: WorkoutTranslate
  tMuscle: WorkoutTranslate
  onCloseExerciseInfo(): void
  onCloseVariants(): void
  onSelectVariant(variant: WorkoutExerciseVariant): void
  onSaveChanges(): void
  onUseOnce(): void
  onCancelSave(): void
  onCloseTempo(): void
  onCloseTempoExecutor(): void
}

export function WorkoutSessionOverlays(props: WorkoutSessionOverlaysProps) {
  const { exerciseInfo, variantPopup, showSavePopup, tempoModal, tempoExecutor, locale, t, tMuscle, onCloseExerciseInfo, onCloseVariants, onSelectVariant, onSaveChanges, onUseOnce, onCancelSave, onCloseTempo, onCloseTempoExecutor } = props
  return <>
      {/* Exercise info popup */}
      {exerciseInfo && (
        <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onCloseExerciseInfo}>
          <div onClick={e=>e.stopPropagation()} style={{background:colors.surface2,border:`1px solid ${colors.divider}`,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:500,maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${colors.divider}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:22,letterSpacing:2,color:TEXT_PRIMARY}}>{getExerciseName(exerciseInfo, locale)}</div>
                <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                  {exerciseInfo.muscle_group&&<span style={{fontFamily:FONT_ALT,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:GOLD_DIM,color:GOLD,letterSpacing:1,textTransform:'uppercase' as const}}>{getMuscleLabel(exerciseInfo.muscle_group, locale, tMuscle)}</span>}
                  {exerciseInfo.equipment&&<span style={{fontFamily:FONT_BODY,fontSize:10,padding:'2px 8px',borderRadius:6,background:BG_CARD_2,color:TEXT_MUTED}}>{exerciseInfo.equipment}</span>}
                  {exerciseInfo.difficulty&&<span style={{fontFamily:FONT_ALT,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:exerciseInfo.difficulty==='avance'?'rgba(239,68,68,0.1)':exerciseInfo.difficulty==='intermediaire'?GOLD_DIM:'rgba(74,222,128,0.1)',color:exerciseInfo.difficulty==='avance'?colors.error:exerciseInfo.difficulty==='intermediaire'?GOLD:colors.success,letterSpacing:1,textTransform:'uppercase' as const}}>{exerciseInfo.difficulty==='debutant'?'Débutant':exerciseInfo.difficulty==='intermediaire'?'Intermédiaire':'Avancé'}</span>}
                </div>
              </div>
              <button onClick={onCloseExerciseInfo} style={{width:36,height:36,borderRadius:12,background:GOLD_DIM,border:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:TEXT_MUTED,fontSize:16}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'16px 20px 32px',WebkitOverflowScrolling:'touch'}}>
              {exerciseInfo.video_url?(
                <div style={{marginBottom:20,borderRadius:14,overflow:'hidden',border:`1px solid ${BORDER}`}}>
                  <DeferredVideo activation="mount" ariaLabel={`${getExerciseName(exerciseInfo, locale)} — démonstration`} autoPlay controls={false} loop muted poster={resolveExerciseVideoPoster(exerciseInfo.video_url)} posterFallback={resolveLocalExerciseVideoPoster(exerciseInfo.video_url)} src={`${exerciseInfo.video_url}?v=2`} style={{width:'100%',height:'auto',display:'block'}}/>
                </div>
              ):exerciseInfo.gif_url?(
                <div style={{marginBottom:20,borderRadius:14,overflow:'hidden',border:`1px solid ${BORDER}`}}>
                  <img src={exerciseInfo.gif_url} alt={getExerciseName(exerciseInfo, locale)} style={{width:'100%',height:'auto',display:'block'}}/>
                </div>
              ):(
                <div style={{marginBottom:20,borderRadius:14,border:`1px dashed ${BORDER}`,padding:'40px 20px',textAlign:'center',background:GOLD_DIM}}>
                  <div style={{fontSize:32,marginBottom:8}}>🎬</div>
                  <div style={{fontFamily:FONT_ALT,fontSize:12,fontWeight:700,color:TEXT_DIM,letterSpacing:1}}>{t('exerciseInfo.videoSoon')}</div>
                </div>
              )}
              {exerciseInfo.description&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:FONT_ALT,fontSize:11,fontWeight:700,color:GOLD,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:8}}>{t('exerciseInfo.description')}</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:14,color:TEXT_MUTED,lineHeight:1.6}}>{exerciseInfo.description}</div>
                </div>
              )}
              {exerciseInfo.instructions&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:FONT_ALT,fontSize:11,fontWeight:700,color:GOLD,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:8}}>{t('exerciseInfo.execution')}</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:14,color:TEXT_PRIMARY,lineHeight:1.6}}>{exerciseInfo.instructions}</div>
                </div>
              )}
              {(exerciseInfo.execution_tips||exerciseInfo.tips)&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:FONT_ALT,fontSize:11,fontWeight:700,color:GOLD,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:8}}>{t('exerciseInfo.tips')}</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:13,color:TEXT_MUTED,lineHeight:1.6,padding:'12px 14px',background:GOLD_DIM,border:`1px solid ${GOLD_RULE}`,borderRadius:12}}>{exerciseInfo.execution_tips||exerciseInfo.tips}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Variant popup */}
      {variantPopup && (
        <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end'}} onClick={onCloseVariants}>
          <div onClick={e=>e.stopPropagation()} style={{background:colors.surface2,border:`1px solid ${colors.divider}`,borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'60vh',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${colors.divider}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:20,letterSpacing:2,color:TEXT_PRIMARY}}>{t('menu.replace')}</div>
                <div style={{fontFamily:FONT_BODY,fontSize:12,color:TEXT_MUTED,marginTop:2}}>{variantPopup.originalName}</div>
              </div>
              <button onClick={onCloseVariants} style={{background:'none',border:'none',color:TEXT_MUTED,fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflowY:'auto',padding:'8px 12px 32px'}}>
              {variantPopup.variants.length===0?(
                <div style={{textAlign:'center',padding:32,color:TEXT_MUTED,fontSize:14}}>{t('noVariants')}</div>
              ):variantPopup.variants.map((v, i)=>(
                <button key={i} onClick={()=>onSelectVariant(v)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',marginBottom:4,borderRadius:14,background:colors.surface2,border:`1px solid ${colors.divider}`,cursor:'pointer',textAlign:'left'}}>
                  <div style={{width:40,height:40,borderRadius:10,background:GOLD_DIM,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>
                    {v.equipment==='Barre'?'🏋️':v.equipment==='Haltères'?'💪':v.equipment==='Machine'?'⚙️':v.equipment==='Poulie'?'🔗':'🤸'}
                  </div>
                  <div>
                    <div style={{fontFamily:FONT_BODY,fontSize:14,color:TEXT_PRIMARY,fontWeight:700}}>{getExerciseName(v, locale)}</div>
                    <div style={{fontFamily:FONT_ALT,fontSize:10,color:GOLD,fontWeight:700,letterSpacing:1,marginTop:2}}>{v.equipment||''}{v.muscle_group?` · ${getMuscleLabel(v.muscle_group, locale, tMuscle)}`:''}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save changes popup */}
      {showSavePopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 20, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: 2, color: TEXT_PRIMARY, marginBottom: 8 }}>{t('savePopup.title')}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: 24 }}>
              {t('savePopup.description')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={onSaveChanges} style={{
                width: '100%', padding: 14, borderRadius: 14, background: GOLD, border: 'none', color: colors.onGold,
                fontFamily: FONT_DISPLAY, fontSize: 17, letterSpacing: 2, cursor: 'pointer',
              }}>{t('savePopup.save')}</button>
              <button onClick={onUseOnce} style={{
                width: '100%', padding: 14, borderRadius: 14, background: 'transparent',
                border: `1.5px solid ${GOLD_RULE}`, color: GOLD,
                fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, cursor: 'pointer',
              }}>{t('savePopup.justThisTime')}</button>
              <button onClick={onCancelSave} style={{
                width: '100%', padding: 12, background: 'transparent', border: 'none',
                color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 13, cursor: 'pointer',
              }}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
      {/* Tempo modal */}
      {tempoModal && (
        <TempoModal
          tempo={tempoModal.tempo}
          exerciseName={tempoModal.name}
          onClose={onCloseTempo}
        />
      )}
      {/* Tempo executor — fullscreen guided tempo for the current set */}
      {tempoExecutor && (
        <TempoExecutor
          tempo={tempoExecutor.tempo}
          exerciseName={tempoExecutor.name}
          targetReps={tempoExecutor.targetReps}
          onComplete={onCloseTempoExecutor}
          onClose={onCloseTempoExecutor}
        />
      )}
  </>
}
