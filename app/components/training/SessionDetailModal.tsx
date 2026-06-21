'use client'

import { RailOverlay } from '../ui/RailOverlay'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { colors, fonts } from '../../../lib/design-tokens'
import { getHeroImage } from '../../../lib/session-types'
import { shortenSessionTitle } from '../home/HeroSessionCard'

export interface SessionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sessionTitle: string
  dayStatus: 'today' | 'future' | 'done' | 'missed'
  dayBadge?: { text: string; color: string } | null
  children?: React.ReactNode
}

export default function SessionDetailModal({
  isOpen, onClose, sessionTitle, dayStatus, dayBadge, children,
}: SessionDetailModalProps) {
  const t = useTranslations('training_tab.sessionDetail')
  const heroImage = getHeroImage(sessionTitle)
  const isPast = dayStatus === 'done' || dayStatus === 'missed'
  const isDone = dayStatus === 'done'

  // Portal to document.body to escape rail transform containing block
  return (<RailOverlay active={isOpen}>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: colors.background,
            display: 'flex', flexDirection: 'column',
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          {/* HEADER with hero image */}
          <div style={{ position: 'relative', height: 240, flexShrink: 0, overflow: 'hidden' }}>
            {/* Hero image background */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${heroImage})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: isPast ? 'grayscale(0.7)' : 'none',
            }} />

            {/* Gradient overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(19,19,19,0.95) 0%, rgba(19,19,19,0.6) 50%, rgba(19,19,19,0.3) 100%)',
            }} />

            {/* Green tint if done */}
            {isDone && (
              <div style={{ position: 'absolute', inset: 0, background: `${colors.success}20` }} />
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label={t('close')}
              style={{
                position: 'absolute', top: 16, right: 16,
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={20} color="white" />
            </button>

            {/* Title + badge */}
            <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              <div style={{ width: 4, height: 46, background: colors.gold, borderRadius: 2, flexShrink: 0 }} />
              <div>
                {dayBadge && (
                  <span style={{
                    fontFamily: fonts.alt, fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.18em', color: colors.gold,
                    textTransform: 'uppercase', display: 'block', marginBottom: 8,
                  }}>
                    {dayBadge.text}
                  </span>
                )}
                <h1 style={{
                  fontFamily: fonts.headline, fontSize: 36, fontWeight: 400,
                  color: 'white', textTransform: 'uppercase',
                  letterSpacing: '0.02em', margin: 0, lineHeight: 1,
                  textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}>
                  {shortenSessionTitle(sessionTitle)}
                </h1>
              </div>
            </div>
          </div>

          {/* BODY scrollable */}
          <div style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            padding: 20,
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          }}>
            {children || (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textDim, fontFamily: fonts.body }}>
                <p style={{ margin: 0, fontSize: 14 }}>{t('placeholder')}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </RailOverlay>)
}
