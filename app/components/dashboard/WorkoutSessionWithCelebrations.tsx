'use client'

import { useCallback, type ComponentProps } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import WorkoutSession from '@/app/components/WorkoutSession'
import type { Badge } from '@/lib/check-badges'

type WorkoutFinishResult = {
  newPRs: Array<{ exercise: string; value: number }>
  newBadges: Badge[]
}

type Props = Omit<ComponentProps<typeof WorkoutSession>, 'onFinish'> & {
  onFinish(data: Parameters<ComponentProps<typeof WorkoutSession>['onFinish']>[0]): Promise<WorkoutFinishResult>
  onBadgesEarned(badges: Badge[]): void
}

export default function WorkoutSessionWithCelebrations({ onBadgesEarned, onFinish, ...props }: Props) {
  const t = useTranslations('training_tab')
  const handleFinish = useCallback(async (data: Parameters<Props['onFinish']>[0]) => {
    const result = await onFinish(data)
    if (result.newPRs.length === 1) {
      const record = result.newPRs[0]
      toast.success(t('calendar.toasts.newPR', { exercise: record.exercise, value: record.value }), { duration: 5000 })
    } else if (result.newPRs.length > 1) {
      const list = result.newPRs.map(record => `${record.exercise} ${record.value}kg`).join(' \u00b7 ')
      toast.success(t('calendar.toasts.newPRMultiple', { count: result.newPRs.length, list }), { duration: 6000 })
    }
    if (result.newBadges.length > 0) onBadgesEarned(result.newBadges)
  }, [onBadgesEarned, onFinish, t])

  return <WorkoutSession {...props} onFinish={handleFinish} />
}
