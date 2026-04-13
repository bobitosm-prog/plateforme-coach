'use client'
import {
  BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../lib/design-tokens'

interface ExerciseInfo {
  name: string
  muscle_group?: string
  equipment?: string
  instructions?: string
  tips?: string
  description?: string
  video_url?: string
  gif_url?: string
}

interface ExerciseInfoPopupProps {
  info: ExerciseInfo
  onClose: () => void
}

export default function ExerciseInfoPopup({ info, onClose }: ExerciseInfoPopupProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)', zIndex: 300,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: BG_CARD, border: `1px solid ${GOLD_RULE}`,
        borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 500,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: 2,
              color: TEXT_PRIMARY,
            }}>{info.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {info.muscle_group && (
                <span style={{
                  fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 6,
                  background: GOLD_DIM, color: GOLD,
                  letterSpacing: 1, textTransform: 'uppercase',
                }}>{info.muscle_group}</span>
              )}
              {info.equipment && (
                <span style={{
                  fontFamily: FONT_BODY, fontSize: 10,
                  padding: '2px 8px', borderRadius: 6,
                  background: 'rgba(138,133,128,0.08)', color: TEXT_MUTED,
                }}>{info.equipment}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12,
            background: GOLD_DIM, border: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: TEXT_MUTED, fontSize: 16,
          }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 32px', WebkitOverflowScrolling: 'touch' as any }}>
          {/* Media: video > gif > placeholder */}
          {info.video_url ? (
            <div style={{ marginBottom: 20, borderRadius: 14, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
              <video src={`${info.video_url}?v=2`} autoPlay loop muted playsInline style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          ) : info.gif_url ? (
            <div style={{ marginBottom: 20, borderRadius: 14, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
              <img src={info.gif_url} alt={info.name} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          ) : (
            <div style={{ marginBottom: 20, borderRadius: 14, border: `1px dashed ${BORDER}`, padding: '40px 20px', textAlign: 'center', background: GOLD_DIM }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
              <div style={{ fontFamily: FONT_ALT, fontSize: 12, fontWeight: 700, color: TEXT_DIM, letterSpacing: 1 }}>VIDÉO À VENIR</div>
            </div>
          )}

          {/* Description */}
          {info.description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>DESCRIPTION</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6 }}>{info.description}</div>
            </div>
          )}

          {/* Instructions */}
          {info.instructions && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>EXÉCUTION</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_PRIMARY, lineHeight: 1.6 }}>{info.instructions}</div>
            </div>
          )}

          {/* Tips */}
          {info.tips && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>CONSEILS</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, lineHeight: 1.6, padding: '12px 14px', background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: 12 }}>{info.tips}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
