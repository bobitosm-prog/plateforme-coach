'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { format, type Locale } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale/fr'
import { enUS } from 'date-fns/locale/en-US'
import { de as deLocale } from 'date-fns/locale/de'
import { useTranslations, useLocale } from 'next-intl'
import { Timer, Check } from 'lucide-react'
import {
  BG_CARD, BORDER, GOLD, GREEN, TEXT_PRIMARY, TEXT_MUTED,
  FONT_ALT, FONT_DISPLAY, colors,
} from '../../../../lib/design-tokens'

const DATE_LOCALES: Record<string, Locale> = { fr: frLocale, en: enUS, de: deLocale }

interface TrainingActiveBarProps {
  workoutStarted: number | null
  elapsedSecs: number
  trainingDoneSets: number
  trainingTotalSets: number
  onFinish: () => void
  fmtElapsed: (s: number) => string
}

export default function TrainingActiveBar({
  workoutStarted, elapsedSecs, trainingDoneSets, trainingTotalSets, onFinish, fmtElapsed,
}: TrainingActiveBarProps) {
  const t = useTranslations('training_tab.activeBar')
  const locale = useLocale()
  const dateLocale = DATE_LOCALES[locale] || frLocale
  return (
    <AnimatePresence>
      {workoutStarted && (
        <motion.div
          key="session-bar"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{ position: 'sticky', top: 0, zIndex: 30, background: BG_CARD, borderBottom: `1px solid ${BORDER}`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          {/* Progress bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: BORDER }}>
            <div style={{ height: 2, background: GOLD, width: trainingTotalSets > 0 ? `${(trainingDoneSets / trainingTotalSets) * 100}%` : '0%', transition: 'width 300ms ease' }} />
          </div>
          {/* Timer left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Timer size={14} color={GOLD} />
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: '1.45rem', fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.08em', lineHeight: 1 }}>{fmtElapsed(elapsedSecs)}</span>
            </div>
            <span style={{ fontFamily: FONT_ALT, fontSize: '0.62rem', color: TEXT_MUTED, paddingLeft: 21 }}>
              {format(new Date(), 'EEE d MMM', { locale: dateLocale })} · {t('series', { done: trainingDoneSets, total: trainingTotalSets })}
            </span>
          </div>
          {/* Terminer right */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onFinish}
            style={{ background: GREEN, color: colors.onGold, border: 'none', borderRadius: 12, padding: '10px 20px', fontFamily: FONT_ALT, fontSize: '0.95rem', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Check size={15} strokeWidth={3} /> Terminer
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
