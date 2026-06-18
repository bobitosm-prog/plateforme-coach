'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RailOverlay } from '../../ui/RailOverlay'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GREEN,
  TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../../lib/design-tokens'

/* ═══════════════════════════════════════════════════
   DATA — built from translations, called per-component
   ═══════════════════════════════════════════════════ */

const TECHNIQUE_EMOJIS: Record<string, string> = {
  dropset: '🔻', restpause: '⏸️', superset: '🔗', mechanical: '🔄',
}

type TechniqueRecord = Record<string, { emoji: string; label: string; short: string; full: string; why: string; example: string }>

function buildTechniqueData(t: (key: string) => string): TechniqueRecord {
  return Object.fromEntries(
    ['dropset', 'restpause', 'superset', 'mechanical'].map(key => [
      key,
      {
        emoji: TECHNIQUE_EMOJIS[key],
        label: t(`${key}.label`),
        short: t(`${key}.short`),
        full: t(`${key}.full`),
        why: t(`${key}.why`),
        example: t(`${key}.example`),
      },
    ])
  )
}

/* ═══════════════════════════════════════════════════
   1. TechniqueTooltip — compact explanation bottom sheet
   ═══════════════════════════════════════════════════ */

interface TechniqueTooltipProps {
  technique: string
  onClose: () => void
}

export function TechniqueTooltip({ technique, onClose }: TechniqueTooltipProps) {
  const t = useTranslations('techniques')
  const TECHNIQUE_DATA = buildTechniqueData(t)
  const data = TECHNIQUE_DATA[technique]
  if (!data) return null

  return (<RailOverlay>
    <AnimatePresence>
      <motion.div
        key="tooltip-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <motion.div
          key="tooltip-sheet"
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 420,
            background: BG_CARD,
            border: `1px solid ${BORDER}`,
            borderBottom: 'none',
            borderRadius: `${RADIUS_CARD}px ${RADIUS_CARD}px 0 0`,
            padding: '24px 20px 32px',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: GOLD_RULE,
            }} />
          </div>

          {/* Title */}
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 16,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: GOLD,
            marginBottom: 12,
          }}>
            {data.emoji} {data.label}
          </div>

          {/* Description — max 3 lines */}
          <p style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            lineHeight: 1.6,
            color: TEXT_MUTED,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {data.short}
          </p>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              marginTop: 20,
              width: '100%',
              padding: '12px 0',
              background: GOLD_DIM,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              color: GOLD,
              fontFamily: FONT_DISPLAY,
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            Compris
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  </RailOverlay>)
}

/* ═══════════════════════════════════════════════════
   2. TechniqueActivePopup — live workout popup
   ═══════════════════════════════════════════════════ */

interface TechniqueActivePopupProps {
  technique: string
  technique_details: string
  onDone: () => void
  onCancel: () => void
}

interface DropEntry {
  weight: string
  reps: string
}

export function TechniqueActivePopup({
  technique,
  technique_details,
  onDone,
  onCancel,
}: TechniqueActivePopupProps) {
  const t = useTranslations('techniques')
  const TECHNIQUE_DATA = buildTechniqueData(t)
  const data = TECHNIQUE_DATA[technique]

  // Timer state
  const restDuration = technique === 'restpause'
    ? (technique_details?.includes('15') ? 15 : 10)
    : 5
  const [countdown, setCountdown] = useState(restDuration)
  const [timerDone, setTimerDone] = useState(false)

  // Drop/pause entries for logging
  const [entries, setEntries] = useState<DropEntry[]>([{ weight: '', reps: '' }])

  useEffect(() => {
    if (countdown <= 0) {
      setTimerDone(true)
      return
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  const updateEntry = useCallback((idx: number, field: keyof DropEntry, value: string) => {
    setEntries((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }, [])

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, { weight: '', reps: '' }])
  }, [])

  if (!data) return null

  const isDropset = technique === 'dropset'
  const isRestpause = technique === 'restpause'

  const prompt = isDropset
    ? t('ui.dropsetPrompt')
    : t('ui.restpausePrompt')

  const goMessage = isRestpause ? t('ui.restpauseGo') : t('ui.go')

  return (<RailOverlay>
    <AnimatePresence>
      <motion.div
        key="active-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <motion.div
          key="active-card"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          style={{
            width: '100%',
            maxWidth: 380,
            background: BG_BASE,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS_CARD,
            padding: 24,
            boxShadow: `0 0 40px rgba(0,0,0,0.6), 0 0 80px ${GOLD_DIM}`,
          }}
        >
          {/* Header */}
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 14,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: GOLD,
            marginBottom: 8,
          }}>
            {data.emoji} {data.label}
          </div>

          {/* Prompt */}
          <p style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            color: TEXT_MUTED,
            margin: '0 0 20px',
            lineHeight: 1.5,
          }}>
            {prompt}
          </p>

          {/* Timer / GO */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            {timerDone ? (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 32,
                  fontWeight: 800,
                  color: GREEN,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  textShadow: `0 0 20px ${GREEN}`,
                }}
              >
                {goMessage}
              </motion.div>
            ) : (
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                border: `3px solid ${GOLD}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: GOLD_DIM,
              }}>
                <span style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 32,
                  fontWeight: 800,
                  color: GOLD,
                }}>
                  {countdown}
                </span>
              </div>
            )}
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: GOLD_RULE, marginBottom: 16 }} />

          {/* Entry fields */}
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: TEXT_DIM,
            marginBottom: 10,
          }}>
            {isDropset ? t('ui.noteDrops') : t('ui.notePauses')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {entries.map((entry, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 11,
                  fontWeight: 700,
                  color: GOLD,
                  minWidth: 18,
                }}>
                  {idx + 1}.
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="kg"
                  value={entry.weight}
                  onChange={(e) => updateEntry(idx, 'weight', e.target.value)}
                  style={{
                    flex: 1,
                    background: BG_CARD_2,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: '8px 10px',
                    color: TEXT_PRIMARY,
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    outline: 'none',
                    textAlign: 'center',
                  }}
                />
                <span style={{ color: TEXT_DIM, fontSize: 12 }}>×</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="reps"
                  value={entry.reps}
                  onChange={(e) => updateEntry(idx, 'reps', e.target.value)}
                  style={{
                    flex: 1,
                    background: BG_CARD_2,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: '8px 10px',
                    color: TEXT_PRIMARY,
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    outline: 'none',
                    textAlign: 'center',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Add entry */}
          <button
            onClick={addEntry}
            style={{
              width: '100%',
              padding: '8px 0',
              background: 'transparent',
              border: `1px dashed ${GOLD_RULE}`,
              borderRadius: 8,
              color: TEXT_DIM,
              fontFamily: FONT_BODY,
              fontSize: 12,
              cursor: 'pointer',
              marginBottom: 20,
            }}
          >
            {t('ui.addEntry')}
          </button>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px 0',
                background: BG_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                color: TEXT_DIM,
                fontFamily: FONT_DISPLAY,
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              {t('ui.cancel')}
            </button>
            <button
              onClick={onDone}
              style={{
                flex: 2,
                padding: '12px 0',
                background: `linear-gradient(135deg, ${GOLD}, #c9a84c)`,
                border: 'none',
                borderRadius: 12,
                color: '#0D0B08',
                fontFamily: FONT_DISPLAY,
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              {t('ui.done')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  </RailOverlay>)
}

/* ═══════════════════════════════════════════════════
   3. TechniqueExplanationCards — for ProgramBuilder
   ═══════════════════════════════════════════════════ */

interface TechniqueExplanationCardsProps {
  techniques: string[]
}

export function TechniqueExplanationCards({ techniques }: TechniqueExplanationCardsProps) {
  const tt = useTranslations('techniques')
  const TECHNIQUE_DATA = buildTechniqueData(tt)
  const filtered = techniques.filter((t) => TECHNIQUE_DATA[t])
  if (filtered.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {filtered.map((tech) => {
        const d = TECHNIQUE_DATA[tech]
        return (
          <motion.div
            key={tech}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: BG_CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: RADIUS_CARD,
              padding: 20,
              boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
            }}
          >
            {/* Title */}
            <div style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 14,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: GOLD,
              marginBottom: 12,
            }}>
              {d.emoji} {d.label}
            </div>

            {/* Full description */}
            <p style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              lineHeight: 1.6,
              color: TEXT_MUTED,
              margin: '0 0 10px',
            }}>
              {d.full}
            </p>

            {/* Pourquoi */}
            <p style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              lineHeight: 1.6,
              color: TEXT_DIM,
              margin: '0 0 14px',
              fontStyle: 'italic',
            }}>
              {tt('ui.whyPrefix')}{d.why}
            </p>

            {/* Example */}
            <div style={{
              background: 'rgba(230,195,100,0.04)',
              borderRadius: 12,
              padding: 10,
            }}>
              <span style={{
                fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: 11,
                color: TEXT_MUTED,
                lineHeight: 1.5,
              }}>
                {d.example}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
