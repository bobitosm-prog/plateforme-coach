'use client'

import { useEffect, useId, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { X } from 'lucide-react'
import {
  BG_CARD_2, BORDER, FONT_BODY, FONT_DISPLAY, TEXT_MUTED, TEXT_PRIMARY, titleStyle,
} from '@/lib/design-tokens'

type Props = {
  title: ReactNode
  description?: ReactNode
  initialFocusRef: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
  overlayStyle: CSSProperties
  panelStyle: CSSProperties
  headerMarginBottom: number
  headerVariant?: 'dashboard' | 'progress'
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

export default function DashboardMeasurementDialogShell({
  title,
  description,
  initialFocusRef,
  onClose,
  children,
  overlayStyle,
  panelStyle,
  headerMarginBottom,
  headerVariant = 'dashboard',
}: Props) {
  const reactId = useId()
  const titleId = `dashboard-measurement-dialog-title-${reactId}`
  const descriptionId = `dashboard-measurement-dialog-description-${reactId}`
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const progressHeader = headerVariant === 'progress'
  const hasDescription = description !== undefined && description !== null

  useEffect(() => {
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
  }, [initialFocusRef])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={hasDescription ? descriptionId : undefined}
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, ...overlayStyle }}
    >
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...(progressHeader ? {} : { alignItems: 'center' }), marginBottom: headerMarginBottom }}>
          {hasDescription ? (
            <div>
              <h3 id={titleId} style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '2px', margin: '0 0 2px', color: TEXT_PRIMARY }}>{title}</h3>
              <p id={descriptionId} style={{ fontSize: '0.7rem', color: TEXT_MUTED, margin: 0, fontFamily: FONT_BODY, fontWeight: 300 }}>{description}</p>
            </div>
          ) : (
            <h3 id={titleId} style={progressHeader ? { ...titleStyle, fontSize: 18 } : { fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '2px', margin: 0, color: TEXT_PRIMARY }}>{title}</h3>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={progressHeader ? undefined : { width: 32, height: 32, background: BG_CARD_2, borderRadius: 12, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={progressHeader ? 16 : 14} color={progressHeader ? undefined : TEXT_MUTED} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
