'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { colors, fonts, modalContainer, modalOverlay, radii, titleStyle } from '../../../lib/design-tokens'

type Props = {
  step: number
  totalSteps: number
  stepLabel: string
  title: ReactNode
  description?: ReactNode
  saving: boolean
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

export default function DashboardObjectiveWizardDialogShell({
  step,
  totalSteps,
  stepLabel,
  title,
  description,
  saving,
  onClose,
  children,
}: Props) {
  const reactId = useId()
  const titleId = `dashboard-objective-wizard-title-${reactId}`
  const descriptionId = `dashboard-objective-wizard-description-${reactId}`
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusableElements = getFocusableElements(dialog)
      if (focusableElements.length === 0) {
        event.preventDefault()
        headingRef.current?.focus()
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
      headingRef.current?.focus()
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
  }, [])

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  return (
    <div
      style={{ ...modalOverlay, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1100 }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hasDescription ? descriptionId : undefined}
        aria-busy={saving}
        style={{
          ...modalContainer,
          width: '100%', maxWidth: 480,
          borderRadius: `${radii.card}px ${radii.card}px 0 0`,
          padding: '20px 20px 40px',
          maxHeight: '90dvh', overflowY: 'auto',
        }}
        onClick={event => event.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textDim, letterSpacing: '0.15em' }}>{stepLabel}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: colors.divider, border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={14} color={colors.textMuted} aria-hidden="true" />
          </button>
        </div>

        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={step}
          aria-label={stepLabel}
          style={{ display: 'flex', gap: 4, marginBottom: 24 }}
        >
          {Array.from({ length: totalSteps }, (_, index) => index + 1).map(progressStep => (
            <div key={progressStep} aria-hidden="true" style={{
              flex: 1, height: 3, borderRadius: 2,
              background: progressStep <= step ? colors.gold : colors.goldBorder,
              transition: 'background 300ms',
            }} />
          ))}
        </div>

        <h2
          ref={headingRef}
          id={titleId}
          tabIndex={-1}
          style={{ ...titleStyle, fontSize: 13, marginBottom: 20, textAlign: 'center', outline: 'none' }}
        >
          {title}
        </h2>
        {hasDescription && <div id={descriptionId}>{description}</div>}
        {children}
      </div>
    </div>
  )
}
