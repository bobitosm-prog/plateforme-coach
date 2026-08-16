'use client'

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { X } from 'lucide-react'
import { BG_CARD_2, BORDER, FONT_DISPLAY, TEXT_MUTED, TEXT_PRIMARY } from '@/lib/design-tokens'

type Props = {
  open: boolean
  title: string
  initialFocusRef: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
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

export default function ClientProfileEditDialogShell({ open, title, initialFocusRef, onClose, children }: Props) {
  const reactId = useId()
  const titleId = `client-profile-edit-dialog-title-${reactId}`
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

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
    initialFocusRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusableElements = getFocusableElements(dialog)
      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1) ?? firstElement
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
  }, [initialFocusRef, open])

  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ maxWidth: 560, padding: 0, overflow: 'hidden' }}
        onClick={event => event.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
          <h2 id={titleId} style={{ fontFamily: FONT_DISPLAY, fontSize: '1.6rem', fontWeight: 400, margin: 0, color: TEXT_PRIMARY, letterSpacing: '1px', textTransform: 'uppercase' }}>{title}</h2>
          <button
            type="button"
            aria-label="Fermer"
            style={{ background: BG_CARD_2, border: 'none', borderRadius: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onClick={onClose}
          >
            <X size={16} color={TEXT_MUTED} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
