'use client'
import { useTranslations, useLocale } from 'next-intl'
import {
  BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY, Z_MODAL,
} from '../../lib/design-tokens'
import { getExerciseName, getExerciseDescription, getExerciseTips } from '../../lib/i18n-exercise'
import { RailOverlay } from './ui/RailOverlay'
import { getMuscleLabel } from '../../lib/i18n-muscle'
import { resolveLocalExerciseVideoPoster } from '../../lib/media/exercise-video-posters'
import DeferredVideo from './media/DeferredVideo'

interface ExerciseInfo {
  name: string
  muscle_group?: string
  equipment?: string
  instructions?: string
  tips?: string
  description?: string
  video_url?: string
  gif_url?: string
  name_en?: string | null
  name_de?: string | null
  description_en?: string | null
  description_de?: string | null
  tips_en?: string | null
  tips_de?: string | null
}

interface ExerciseInfoPopupProps {
  info: ExerciseInfo
  onClose: () => void
}

export default function ExerciseInfoPopup({ info, onClose }: ExerciseInfoPopupProps) {
  const t = useTranslations('exerciseInfo')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const tMuscle = useTranslations('muscles')
  const displayName = getExerciseName(info, locale)
  const displayDesc = getExerciseDescription(info, locale)
  const displayTips = getExerciseTips(info, locale)

  return (<RailOverlay>
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)', zIndex: Z_MODAL,
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
            }}>{displayName}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {info.muscle_group && (
                <span style={{
                  fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 6,
                  background: GOLD_DIM, color: GOLD,
                  letterSpacing: 1, textTransform: 'uppercase',
                }}>{getMuscleLabel(info.muscle_group, locale, tMuscle)}</span>
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
            <div style={{ aspectRatio: '9/16', maxHeight: '55vh', margin: '0 auto 20px', borderRadius: 14, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
              <DeferredVideo
                activation="mount"
                ariaLabel={`${displayName} — démonstration`}
                autoPlay
                controls={false}
                loop
                muted
                poster={resolveLocalExerciseVideoPoster(info.video_url)}
                src={`${info.video_url}?v=2`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ) : info.gif_url ? (
            <div style={{ aspectRatio: '9/16', maxHeight: '55vh', margin: '0 auto 20px', borderRadius: 14, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
              <img src={info.gif_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ) : (
            <div style={{ marginBottom: 20, borderRadius: 14, border: `1px dashed ${BORDER}`, padding: '40px 20px', textAlign: 'center', background: GOLD_DIM }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
              <div style={{ fontFamily: FONT_ALT, fontSize: 12, fontWeight: 700, color: TEXT_DIM, letterSpacing: 1 }}>{t('comingSoon')}</div>
            </div>
          )}

          {/* Description */}
          {displayDesc && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>{t('description')}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6 }}>{displayDesc}</div>
            </div>
          )}

          {/* Instructions */}
          {info.instructions && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>{t('execution')}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_PRIMARY, lineHeight: 1.6 }}>{info.instructions}</div>
            </div>
          )}

          {/* Tips */}
          {displayTips && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>{t('tips')}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, lineHeight: 1.6, padding: '12px 14px', background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: 12 }}>{displayTips}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  </RailOverlay>)
}
