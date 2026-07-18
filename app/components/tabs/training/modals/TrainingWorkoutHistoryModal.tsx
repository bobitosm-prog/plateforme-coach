'use client'

import { colors, fonts } from '@/lib/design-tokens'
import type { LegacyWorkoutSession, WorkoutExerciseDetail } from '@/lib/training/session-history'
import { RailOverlay } from '@/app/components/ui/RailOverlay'
import ModalHeader from '@/app/components/ui/ModalHeader'
import WorkoutDetailList from '@/app/components/training/WorkoutDetailList'

interface TrainingWorkoutHistoryModalProps {
  workout: LegacyWorkoutSession
  detail: WorkoutExerciseDetail[]
  loading: boolean
  locale: 'fr' | 'en' | 'de'
  fallbackTitle: string
  onClose: () => void
}

const DATE_LOCALES = { de: 'de-CH', en: 'en-US', fr: 'fr-CH' } as const

export default function TrainingWorkoutHistoryModal({ workout, detail, loading, locale, fallbackTitle, onClose }: TrainingWorkoutHistoryModalProps) {
  return (
    <RailOverlay>
      <div style={{ position: 'fixed', inset: 0, background: colors.background, zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ModalHeader title={workout.name || fallbackTitle} onClose={onClose} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 32px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>
            {new Date(workout.created_at).toLocaleDateString(DATE_LOCALES[locale], { weekday: 'long', day: 'numeric', month: 'long' })}
            {workout.duration_minutes ? ` · ${workout.duration_minutes} min` : ''}
          </div>
          <WorkoutDetailList detail={detail} loading={loading} />
        </div>
      </div>
    </RailOverlay>
  )
}
