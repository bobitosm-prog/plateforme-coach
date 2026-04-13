'use client'
import {
  BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../lib/design-tokens'
import ExercisePreview from './ExercisePreview'
import { getExerciseImage } from '../../lib/exercise-media'

interface ExerciseInfo {
  name: string
  muscle_group: string
  equipment: string
  instructions: string
  tips: string
  description?: string
  video_url?: string
}

interface ExerciseInfoPopupProps {
  info: ExerciseInfo
  onClose: () => void
}

export default function ExerciseInfoPopup({ info, onClose }: ExerciseInfoPopupProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(10px)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: BG_CARD, border: `1px solid ${GOLD_RULE}`,
        borderRadius: 20, width: '100%', maxWidth: 440,
        maxHeight: '80vh', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${BORDER}`,
          background: GOLD_DIM,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: 2,
                color: TEXT_PRIMARY, lineHeight: 1.1,
              }}>{info.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {info.muscle_group && (
                  <span style={{
                    fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700,
                    letterSpacing: 1.5, color: GOLD,
                    background: GOLD_DIM,
                    border: `1px solid ${GOLD_RULE}`,
                    padding: '3px 10px', borderRadius: 8,
                    textTransform: 'uppercase',
                  }}>{info.muscle_group}</span>
                )}
                {info.equipment && (
                  <span style={{
                    fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700,
                    letterSpacing: 1.5, color: TEXT_MUTED,
                    background: 'rgba(138,133,128,0.08)',
                    border: `1px solid ${BORDER}`,
                    padding: '3px 10px', borderRadius: 8,
                    textTransform: 'uppercase',
                  }}>{info.equipment}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(138,133,128,0.1)', border: 'none',
              width: 32, height: 32, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: TEXT_MUTED, fontSize: 16,
            }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: 'calc(80vh - 140px)' }}>
          {/* Video or animated preview */}
          {info.video_url ? (
            <div style={{ borderRadius: RADIUS_CARD, overflow: 'hidden', marginBottom: 18, background: BG_BASE }}>
              <video autoPlay loop muted playsInline style={{ width: '100%', display: 'block' }} src={`${info.video_url}?v=2`} />
            </div>
          ) : getExerciseImage(info.name) ? (
            <div style={{ borderRadius: RADIUS_CARD, overflow: 'hidden', marginBottom: 18, background: BG_BASE, border: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
              <ExercisePreview name={info.name} size={200} animate={true} />
            </div>
          ) : null}

          {/* Description */}
          {info.description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
                letterSpacing: 2, color: GOLD, marginBottom: 10,
                textTransform: 'uppercase',
              }}>DESCRIPTION</div>
              <p style={{
                fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED,
                lineHeight: 1.7, margin: 0, fontWeight: 300,
              }}>{info.description}</p>
            </div>
          )}

          {info.instructions && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
                letterSpacing: 2, color: GOLD, marginBottom: 10,
                textTransform: 'uppercase',
              }}>EXÉCUTION</div>
              <p style={{
                fontFamily: FONT_BODY, fontSize: 14, color: TEXT_PRIMARY,
                lineHeight: 1.7, margin: 0, fontWeight: 300,
              }}>{info.instructions}</p>
            </div>
          )}

          {info.tips && (
            <div style={{
              background: GOLD_DIM,
              border: `1px solid ${GOLD_RULE}`,
              borderRadius: 14, padding: 16,
            }}>
              <div style={{
                fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700,
                letterSpacing: 2, color: GOLD, marginBottom: 8,
                textTransform: 'uppercase',
              }}>CONSEILS</div>
              <p style={{
                fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED,
                lineHeight: 1.7, margin: 0, fontWeight: 300,
              }}>{info.tips}</p>
            </div>
          )}

          {!info.instructions && !info.tips && !info.description && !info.video_url && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: TEXT_DIM, fontFamily: FONT_BODY }}>
              Instructions non disponibles
            </div>
          )}
        </div>

        <div style={{ padding: '12px 24px 20px' }}>
          <button onClick={onClose} style={{
            width: '100%', padding: 14,
            background: 'transparent',
            border: `1.5px solid ${GOLD_RULE}`,
            borderRadius: 14, color: GOLD,
            fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2,
            cursor: 'pointer',
          }}>FERMER</button>
        </div>
      </div>
    </div>
  )
}
