import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const stateMock = vi.hoisted(() => ({
  values: [] as unknown[],
  setters: [] as ReturnType<typeof vi.fn>[],
  index: 0,
}))
const typedDialogMock = vi.hoisted(() => vi.fn(() => null))
const signOutMock = vi.hoisted(() => vi.fn())

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

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const translations: Record<string, string> = {
      button: 'Supprimer mon compte',
      title: 'Supprimer le compte',
      warning: 'Cette action est irréversible.',
      confirmWord: 'SUPPRIMER',
      confirmPrompt: 'Tape SUPPRIMER pour confirmer :',
      placeholder: 'SUPPRIMER',
      submit: 'Supprimer',
      deleting: 'Suppression…',
      cancel: 'Annuler',
      errorGeneric: 'Erreur générique',
      errorNetwork: 'Erreur réseau',
    }
    const t = (key: string) => translations[key] ?? key
    t.rich = (key: string) => translations[key] ?? key
    return t
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { signOut: signOutMock } },
}))

vi.mock('../../app/components/ui/TypedConfirmDialog', () => ({
  default: typedDialogMock,
}))

import DeleteAccountSection from '../../app/components/tabs/profile/DeleteAccountSection'

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

function renderSection(confirmText: string, deleting = false) {
  stateMock.values = [true, confirmText, deleting]
  stateMock.setters = []
  stateMock.index = 0
  const tree = DeleteAccountSection({ session: { user: { id: 'test-user-id' } } })
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

describe('DeleteAccountSection business parity', () => {
  it('passes the unchanged exact confirmation and async state contract', () => {
    const dialog = renderSection('SUPPRIMER', true)

    expect(dialog).toMatchObject({
      value: 'SUPPRIMER',
      expectedValue: 'SUPPRIMER',
      busy: true,
      confirmLabel: 'Supprimer',
      busyLabel: 'Suppression…',
    })
  })

  it('keeps the authoritative request, sign-out and redirect unchanged', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const dialog = renderSection('SUPPRIMER')

    await (dialog.onConfirm as () => Promise<void>)()

    expect(stateMock.setters[2]).toHaveBeenCalledWith(true)
    expect(fetchMock).toHaveBeenCalledWith('/api/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user-id' }),
    })
    expect(signOutMock).toHaveBeenCalledOnce()
    expect(window.location.href).toBe('/login')
  })

  it('does not start deletion when the exact confirmation value is absent', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const dialog = renderSection('supprimer')

    await (dialog.onConfirm as () => Promise<void>)()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(stateMock.setters[2]).not.toHaveBeenCalled()
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('preserves server and network error handling with action re-enabled', async () => {
    const serverFetch = vi.fn().mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({ error: 'refusée' }) })
    vi.stubGlobal('fetch', serverFetch)
    const serverDialog = renderSection('SUPPRIMER')
    await (serverDialog.onConfirm as () => Promise<void>)()

    expect(globalThis.alert).toHaveBeenCalledWith('Erreur : refusée')
    expect(stateMock.setters[2]).toHaveBeenLastCalledWith(false)

    const networkFetch = vi.fn().mockRejectedValue(new Error('network'))
    vi.stubGlobal('fetch', networkFetch)
    const networkDialog = renderSection('SUPPRIMER')
    await (networkDialog.onConfirm as () => Promise<void>)()

    expect(globalThis.alert).toHaveBeenLastCalledWith('Erreur réseau')
    expect(stateMock.setters[2]).toHaveBeenLastCalledWith(false)
  })

  it('preserves cancellation by closing and clearing the typed value', () => {
    const dialog = renderSection('SUPPRIMER')

    ;(dialog.onCancel as () => void)()

    expect(stateMock.setters[0]).toHaveBeenCalledWith(false)
    expect(stateMock.setters[1]).toHaveBeenCalledWith('')
  })
})
