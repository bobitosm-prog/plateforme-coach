'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import * as Dialog from '@radix-ui/react-dialog'
import styles from './LegalDocumentDialog.module.css'

export default function LegalDocumentDialog({ document, children }: {
  document: 'cgu' | 'privacy'; children: React.ReactNode
}) {
  const locale = useLocale()
  const t = useTranslations('common')
  const legal = useTranslations('legalReader')
  const [open, setOpen] = useState(false)
  const [html, setHtml] = useState('')
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    fetch(`/api/legal/${locale}/${document}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('LEGAL_UNAVAILABLE')
        const data = await response.json()
        if (typeof data.html !== 'string' || !data.html.trim()) throw new Error('LEGAL_INVALID')
        if (!controller.signal.aborted) setHtml(data.html)
      }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [open, locale, document, attempt])
  return <Dialog.Root open={open} onOpenChange={next => { setHtml(''); setError(false); setOpen(next) }}>
    <Dialog.Trigger className={styles.trigger}>{children}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.overlay} />
      <Dialog.Content className={styles.dialog} aria-describedby={undefined}>
        <header className={styles.header}>
          <Dialog.Title className={styles.title}>{children}</Dialog.Title>
          <Dialog.Close className={styles.close}>{t('close')}</Dialog.Close>
        </header>
        <div className={styles.body}>
          {!html && !error && <p role="status">{t('loading')}</p>}
          {error && <div role="alert"><p>{legal('error')}</p><button className={styles.close} onClick={() => { setError(false); setAttempt(n => n + 1) }}>{legal('retry')}</button></div>}
          {/* Only trusted, checked-in legal Markdown is served by this endpoint. */}
          {html && <div className={styles.prose} dangerouslySetInnerHTML={{ __html: html.replace(
            /<a href="([^"]+)">([\s\S]*?)<\/a>/g,
            '<span>$2 ($1)</span>',
          ) }} />}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
