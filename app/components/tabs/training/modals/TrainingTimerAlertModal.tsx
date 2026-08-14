'use client'

import { useEffect, useId, useRef } from 'react'
import { colors, fonts, statStyle, subtitleStyle } from '@/lib/design-tokens'
import { RailOverlay } from '@/app/components/ui/RailOverlay'

interface TrainingTimerAlertModalProps {
  message: string
  restDoneLabel: string
  onClose: () => void
}

export default function TrainingTimerAlertModal({ message, restDoneLabel, onClose }: TrainingTimerAlertModalProps) {
  const reactId = useId()
  const titleId = `training-timer-alert-title-${reactId}`
  const messageId = `training-timer-alert-message-${reactId}`
  const dialogRef = useRef<HTMLDivElement>(null)
  const actionRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const activeElement = document.activeElement as HTMLElement | null
    previouslyFocusedRef.current = activeElement && typeof activeElement.focus === 'function'
      ? activeElement
      : null
    const previousBodyOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    actionRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      event.preventDefault()
      actionRef.current?.focus()
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (dialog.contains(event.target as Node | null)) return
      actionRef.current?.focus()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      document.body.style.overflow = previousBodyOverflow
      if (previouslyFocusedRef.current?.isConnected !== false) previouslyFocusedRef.current?.focus()
    }
  }, [])

  return (
    <RailOverlay>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 24,
      }}>
        <div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={messageId}
          tabIndex={-1}
          style={{
            background: colors.surface2, border: `2px solid ${colors.gold}`,
            borderRadius: 16, padding: '40px 32px', textAlign: 'center', maxWidth: 340, width: '100%',
            animation: 'ttPopIn 0.3s ease-out', boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{
            width: 64, height: 64, border: `2px solid ${colors.gold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill={colors.gold}>
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
            </svg>
          </div>
          <h2 id={titleId} style={{ ...statStyle, fontSize: 36, color: colors.gold, letterSpacing: 3, margin: '0 0 8px' }}>
            {restDoneLabel}
          </h2>
          <p id={messageId} style={{ ...subtitleStyle, fontWeight: 800, fontSize: 20, color: colors.text, letterSpacing: 2, margin: '0 0 24px' }}>
            {message}
          </p>
          <button ref={actionRef} onClick={onClose} style={{
            background: colors.gold, color: colors.onGold, border: 'none',
            fontFamily: fonts.body, fontWeight: 800, fontSize: 16, letterSpacing: 2,
            padding: '14px 48px', textTransform: 'uppercase', cursor: 'pointer',
          }}>
            C&apos;EST PARTI !
          </button>
        </div>
      </div>
    </RailOverlay>
  )
}
