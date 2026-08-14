'use client'
import { useEffect, useId, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg'
}

const WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
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

const openModals: HTMLElement[] = []
let bodyScrollLockCount = 0
let previousBodyOverflow = ''
let stackInitialFocus: HTMLElement | null = null

function getTopModal() {
  return openModals.at(-1) ?? null
}

function refreshModalStack() {
  const topModal = getTopModal()
  for (const modal of openModals) {
    if (modal === topModal) {
      modal.removeAttribute('aria-hidden')
      modal.removeAttribute('inert')
    } else {
      modal.setAttribute('aria-hidden', 'true')
      modal.setAttribute('inert', '')
    }
  }
}

function registerModal(modal: HTMLElement, previouslyFocused: HTMLElement | null) {
  if (openModals.length === 0) stackInitialFocus = previouslyFocused
  openModals.push(modal)
  refreshModalStack()
}

function unregisterModal(modal: HTMLElement) {
  const index = openModals.lastIndexOf(modal)
  if (index !== -1) openModals.splice(index, 1)
  modal.removeAttribute('aria-hidden')
  modal.removeAttribute('inert')
  refreshModalStack()
  if (openModals.length !== 0) return null
  const focusToRestore = stackInitialFocus
  stackInitialFocus = null
  return focusToRestore
}

function lockBodyScroll() {
  if (bodyScrollLockCount === 0) previousBodyOverflow = document.body.style.overflow
  bodyScrollLockCount += 1
  document.body.style.overflow = 'hidden'
}

function unlockBodyScroll() {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1)
  if (bodyScrollLockCount === 0) document.body.style.overflow = previousBodyOverflow
}

function getFocusableElements(modal: HTMLElement) {
  return Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element => element.getAttribute('aria-hidden') !== 'true' && !element.hasAttribute('hidden'),
  )
}

export function Modal({ open, onClose, title, description, children, maxWidth = 'md' }: Props) {
  const reactId = useId()
  const titleId = `admin-modal-title-${reactId}`
  const descriptionId = `admin-modal-description-${reactId}`
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const modal = modalRef.current
    if (!modal) return

    const activeElement = document.activeElement as HTMLElement | null
    previouslyFocusedRef.current = activeElement && typeof activeElement.focus === 'function'
      ? activeElement
      : null

    registerModal(modal, previouslyFocusedRef.current)
    lockBodyScroll()
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (getTopModal() !== modal) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return
      const focusableElements = getFocusableElements(modal)
      const firstElement = focusableElements[0] ?? modal
      const lastElement = focusableElements.at(-1) ?? modal
      const currentElement = document.activeElement

      if (event.shiftKey && (currentElement === firstElement || !modal.contains(currentElement))) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && (currentElement === lastElement || !modal.contains(currentElement))) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (getTopModal() !== modal || modal.contains(event.target as Node | null)) return
      (getFocusableElements(modal)[0] ?? modal).focus()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      const stackFocusToRestore = unregisterModal(modal)
      unlockBodyScroll()

      const previouslyFocused = previouslyFocusedRef.current
      const topModal = getTopModal()
      if (topModal) {
        if (previouslyFocused && previouslyFocused.isConnected !== false && topModal.contains(previouslyFocused)) {
          previouslyFocused.focus()
        } else {
          (getFocusableElements(topModal)[0] ?? topModal).focus()
        }
      } else if (stackFocusToRestore && stackFocusToRestore.isConnected !== false) {
        stackFocusToRestore.focus()
      }
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descriptionId : undefined}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`pointer-events-auto w-full ${WIDTHS[maxWidth]} bg-[#15110B] border border-amber-900/30 rounded-2xl shadow-2xl shadow-black/60`}
            >
              <div className="px-6 py-5 border-b border-amber-900/15 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 id={titleId} className="text-base font-semibold text-zinc-100">{title}</h2>
                  {description && (
                    <p id={descriptionId} className="text-xs text-zinc-500 mt-1">{description}</p>
                  )}
                </div>
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  aria-label="Fermer"
                  className="shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
