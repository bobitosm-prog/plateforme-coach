'use client'

import type { ReactNode } from 'react'
import type { HomeViewModel, HomeTrainingSession } from '../../../lib/home/home-dashboard-model'
import HomeV2Header from './HomeV2Header'
import TodayHero from './TodayHero'
import styles from './HomeV2.module.css'

export interface HomeV2Actions {
  onStartSession?: (session: HomeTrainingSession) => void
  onOpenSession?: (session: HomeTrainingSession) => void
  onOpenProgram?: () => void
  onStartFreeSession?: () => void
}

export default function HomeV2({ model, actions, children }: { model: HomeViewModel; actions: HomeV2Actions; children?: ReactNode }) {
  return <div className={styles.shell} data-home-v2>
    <HomeV2Header identity={model.identity} today={model.today} />
    <TodayHero training={model.training} {...actions} />
    {children && <div className={styles.legacy}>{children}</div>}
  </div>
}
