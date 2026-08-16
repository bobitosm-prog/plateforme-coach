import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const stateMock = vi.hoisted(() => ({
  values: [] as unknown[],
  setters: [] as ReturnType<typeof vi.fn>[],
  index: 0,
}))
const typedDialogMock = vi.hoisted(() => vi.fn(() => null))
const signOutMock = vi.hoisted(() => vi.fn())
const supabaseMock = vi.hoisted(() => ({
  auth: { signOut: signOutMock },
  from: vi.fn(),
}))

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState<T>(initialValue: T) {
      const index = stateMock.index++
      const setter = vi.fn()
      stateMock.setters[index] = setter
      return [stateMock.values[index] ?? initialValue, setter]
    },
  }
})

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => supabaseMock,
}))

vi.mock('../../app/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}))

vi.mock('../../app/components/ui/TypedConfirmDialog', () => ({
  default: typedDialogMock,
}))

import CoachProfile from '../../app/coach/components/CoachProfile'

type ElementProps = Record<string, unknown> & { children?: ReactNode }

function findElement(node: ReactNode, type: unknown): ReactElement<ElementProps> | null {
  if (!isValidElement(node)) return null
  const element = node as ReactElement<ElementProps>
  if (element.type === type) return element
  const children = element.props.children
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findElement(child, type)
      if (found) return found
    }
    return null
  }
  return findElement(children, type)
}

function renderProfile(confirmText: string, deleting = false) {
  stateMock.values = [true, confirmText, deleting, '50', false, false]
  stateMock.setters = []
  stateMock.index = 0
  const tree = CoachProfile({
    coachName: 'Coach test',
    coachInitials: 'CT',
    session: { user: { id: 'coach-user-id', email: 'coach@example.test' } },
    coachProfile: null,
    setSection: vi.fn(),
    supabaseSignOut: vi.fn(),
  })
  const dialog = findElement(tree, typedDialogMock)
  if (!dialog) throw new Error('TypedConfirmDialog not rendered')
  return dialog.props
}

const originalWindow = globalThis.window
const originalAlert = globalThis.alert

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { href: '' } },
  })
  Object.defineProperty(globalThis, 'alert', { configurable: true, value: vi.fn() })
})

afterEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
  Object.defineProperty(globalThis, 'alert', { configurable: true, value: originalAlert })
  vi.unstubAllGlobals()
})

describe('CoachProfile account deletion', () => {
  it('uses the accessible typed confirmation with the exact word and busy state', () => {
    const dialog = renderProfile('SUPPRIMER', true)

    expect(dialog).toMatchObject({
      open: true,
      title: 'Supprimer mon compte',
      warning: 'Es-tu sûr de vouloir supprimer ton compte ? Toutes tes données seront supprimées définitivement. Cette action est irréversible.',
      inputLabel: 'Tape SUPPRIMER pour confirmer la suppression du compte',
      placeholder: 'SUPPRIMER',
      value: 'SUPPRIMER',
      expectedValue: 'SUPPRIMER',
      confirmLabel: 'Supprimer',
      busyLabel: 'Suppression...',
      cancelLabel: 'Annuler',
      busy: true,
    })
  })

  it('does not start deletion when the exact confirmation value is absent', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const dialog = renderProfile('supprimer')

    await (dialog.onConfirm as () => Promise<void>)()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(stateMock.setters[2]).not.toHaveBeenCalled()
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('keeps the authoritative request body, sign-out and redirect unchanged', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const dialog = renderProfile('SUPPRIMER')

    await (dialog.onConfirm as () => Promise<void>)()

    expect(stateMock.setters[2]).toHaveBeenCalledWith(true)
    expect(fetchMock).toHaveBeenCalledWith('/api/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'coach-user-id' }),
    })
    expect(signOutMock).toHaveBeenCalledOnce()
    expect(window.location.href).toBe('/login')
  })

  it('preserves server and network errors and re-enables the action', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'refusée' }),
    }))
    const serverDialog = renderProfile('SUPPRIMER')
    await (serverDialog.onConfirm as () => Promise<void>)()

    expect(globalThis.alert).toHaveBeenCalledWith('Erreur : refusée')
    expect(stateMock.setters[2]).toHaveBeenLastCalledWith(false)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    const networkDialog = renderProfile('SUPPRIMER')
    await (networkDialog.onConfirm as () => Promise<void>)()

    expect(globalThis.alert).toHaveBeenLastCalledWith('Erreur réseau')
    expect(stateMock.setters[2]).toHaveBeenLastCalledWith(false)
  })

  it('closes and clears the exact typed value on cancellation', () => {
    const dialog = renderProfile('SUPPRIMER')

    ;(dialog.onCancel as () => void)()

    expect(stateMock.setters[0]).toHaveBeenCalledWith(false)
    expect(stateMock.setters[1]).toHaveBeenCalledWith('')
  })

  it('keeps the active profile flow in both coach layouts', () => {
    const desktop = readFileSync('app/coach/components/sections/CoachDesktopLayout.tsx', 'utf8')
    const mobile = readFileSync('app/coach/components/sections/CoachMobileLayout.tsx', 'utf8')

    expect(desktop).toContain("h.section === 'profil' && <CoachProfile")
    expect(mobile).toContain('<CoachProfile')
    expect(mobile).toContain('coachProfile={h.coachProfile}')
  })
})
