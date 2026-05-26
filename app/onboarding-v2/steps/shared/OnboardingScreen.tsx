'use client'
import { motion } from 'framer-motion'
import { colors, fonts } from '@/lib/design-tokens'
import type { ReactNode } from 'react'

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}
const transition = {
  type: 'tween' as const,
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
}

interface OnboardingScreenProps {
  title: string
  subtitle?: string
  direction: number
  stepKey: string
  children: ReactNode
}

export default function OnboardingScreen({
  title,
  subtitle,
  direction,
  stepKey,
  children,
}: OnboardingScreenProps) {
  return (
    <motion.div
      key={stepKey}
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Title area */}
      <div style={{ padding: '24px 20px 0' }}>
        <h1
          style={{
            fontFamily: fonts.headline,
            fontSize: 28,
            fontWeight: 800,
            color: colors.text,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.textMuted,
              marginTop: 8,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px' }}>
        {children}
      </div>
    </motion.div>
  )
}
