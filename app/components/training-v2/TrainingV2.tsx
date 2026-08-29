import type { ReactNode } from 'react'
import styles from './TrainingV2.module.css'

export function TrainingV2({ children, session = false }: { children: ReactNode; session?: boolean }) {
  return <div className={`${styles.shell} ${session ? styles.sessionShell : ''}`}>{children}</div>
}
