'use client'

import { Download, FileSpreadsheet } from 'lucide-react'
import { useTranslations } from 'next-intl'

import styles from './ProgressionV2.module.css'

export default function ProgressionExports({ onCsv, onXlsx, xlsxAvailable }: { onCsv: () => void; onXlsx: () => void; xlsxAvailable: boolean }) {
  const t = useTranslations('progress.v2')
  return <section className={styles.secondaryCard} aria-labelledby="progression-exports-title">
    <div className={styles.secondaryHeading}>
      <p className={styles.eyebrow}>{t('history.exports.eyebrow')}</p>
      <h2 id="progression-exports-title">{t('history.exports.title')}</h2>
      <p>{t('history.exports.subtitle')}</p>
    </div>
    <div className={styles.exportActions}>
      <button type="button" className={styles.secondaryButton} onClick={onCsv}><Download size={16} aria-hidden="true" />{t('history.exports.csv')}</button>
      <button type="button" className={styles.secondaryButton} onClick={onXlsx} disabled={!xlsxAvailable}><FileSpreadsheet size={16} aria-hidden="true" />{t('history.exports.xlsx')}</button>
    </div>
  </section>
}
