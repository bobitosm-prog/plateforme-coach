'use client'

import { useEffect, useId, useRef } from 'react'
import {
  BG_CARD, BG_CARD_2, BORDER, FONT_ALT, FONT_BODY, GOLD, GOLD_RULE,
  TEXT_MUTED, TEXT_PRIMARY,
} from '@/lib/design-tokens'

type ImpactedClient = {
  id: string
  name: string
}

type CoachTemplatePushDialogProps = {
  open: boolean
  templateName: string
  impactedClients: ImpactedClient[]
  pushing: boolean
  onConfirm: () => void
  onCancel: () => void
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

function getFocusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element => element.getAttribute('aria-hidden') !== 'true' && !element.hasAttribute('hidden'),
  )
}

export default function CoachTemplatePushDialog({
  open,
  templateName,
  impactedClients,
  pushing,
  onConfirm,
  onCancel,
}: CoachTemplatePushDialogProps) {
  const reactId = useId()
  const titleId = `coach-template-push-title-${reactId}`
  const descriptionId = `coach-template-push-description-${reactId}`
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const pushingRef = useRef(pushing)
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    pushingRef.current = pushing
    onCancelRef.current = onCancel
  }, [onCancel, pushing])

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    const activeElement = document.activeElement as HTMLElement | null
    previouslyFocusedRef.current = activeElement && typeof activeElement.focus === 'function'
      ? activeElement
      : null
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (pushingRef.current) return
        event.preventDefault()
        onCancelRef.current()
        return
      }

      if (event.key !== 'Tab') return
      const focusableElements = getFocusableElements(dialog)
      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const firstElement = focusableElements[0] ?? dialog
      const lastElement = focusableElements.at(-1) ?? dialog
      const currentElement = document.activeElement

      if (event.shiftKey && (currentElement === firstElement || !dialog.contains(currentElement))) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && (currentElement === lastElement || !dialog.contains(currentElement))) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (dialog.contains(event.target as Node | null)) return
      ;(getFocusableElements(dialog)[0] ?? dialog).focus()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      document.body.style.overflow = previousBodyOverflow
      const previouslyFocused = previouslyFocusedRef.current
      if (previouslyFocused && previouslyFocused.isConnected !== false) previouslyFocused.focus()
    }
  }, [open])

  if (!open) return null

  const hasImpactedClients = impactedClients.length > 0

  return (
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={pushing ? 'true' : 'false'}
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={() => {
        if (!pushing) onCancel()
      }}
    >
      <div
        style={{ background: BG_CARD, border: `1px solid ${GOLD_RULE}`, borderRadius: 16, padding: 24, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={event => event.stopPropagation()}
      >
        <h2 id={titleId} style={{ fontFamily: FONT_ALT, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.95rem', fontWeight: 800, color: GOLD, margin: '0 0 12px' }}>
          Pusher la mise a jour
        </h2>
        {hasImpactedClients ? (
          <>
            <p id={descriptionId} style={{ fontFamily: FONT_BODY, fontSize: '0.875rem', color: TEXT_MUTED, lineHeight: 1.55, margin: '0 0 16px' }}>
              Les <strong style={{ color: GOLD }}>{impactedClients.length} client(s)</strong> suivants vont recevoir la mise a jour de &quot;{templateName}&quot;. Les modifications personnelles seront ecrasees.
            </p>
            <ul aria-label="Clients concernés" style={{ listStyle: 'none', background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, margin: '0 0 24px', maxHeight: 200, overflowY: 'auto' }}>
              {impactedClients.map(client => (
                <li key={client.id} style={{ fontFamily: FONT_BODY, fontSize: '0.875rem', color: TEXT_PRIMARY, padding: '6px 0' }}>{client.name}</li>
              ))}
            </ul>
          </>
        ) : (
          <p id={descriptionId} style={{ fontFamily: FONT_BODY, fontSize: '0.875rem', color: TEXT_MUTED, lineHeight: 1.55, margin: '0 0 24px' }}>
            Aucun client n&apos;a actuellement le template &quot;{templateName}&quot; assigne.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={pushing}
            style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '9px 18px', color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: pushing ? 'not-allowed' : 'pointer', opacity: pushing ? 0.5 : 1 }}
          >
            {hasImpactedClients ? 'Annuler' : 'Fermer'}
          </button>
          {hasImpactedClients && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={pushing}
              aria-busy={pushing ? 'true' : 'false'}
              style={{ background: GOLD, border: 'none', borderRadius: 12, padding: '9px 18px', color: '#0D0B08', fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: pushing ? 'not-allowed' : 'pointer', opacity: pushing ? 0.5 : 1 }}
            >
              {pushing ? 'Mise à jour…' : 'Confirmer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
