import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const stateMock = vi.hoisted(() => ({
  values: [] as unknown[],
  setters: [] as ReturnType<typeof vi.fn>[],
  index: 0,
}))
const confirmDialogMock = vi.hoisted(() => vi.fn(() => null))

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: vi.fn(),
    useState<T>(initialValue: T) {
      const index = stateMock.index++
      const setter = vi.fn()
      stateMock.setters[index] = setter
      return [stateMock.values[index] ?? initialValue, setter]
    },
  }
})

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => ({
    title: 'Mon coach',
    activeStatus: 'Actif',
    active: 'Actif',
    changeCoach: 'Changer de coach',
    noCoach: 'Aucun coach',
    'changeModal.title': 'Changer de coach',
    'changeModal.description': 'Confirmer la déconnexion du coach.',
    'changeModal.leaveButton': 'Quitter mon coach',
    'changeModal.leaving': 'Déconnexion…',
    'changeModal.cancel': 'Annuler',
  })[key] ?? key,
}))

vi.mock('../../app/components/ui/ConfirmDialog', () => ({
  default: confirmDialogMock,
}))

import CoachSection from '../../app/components/tabs/profile/CoachSection'

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

function renderSection(leaving = false) {
  stateMock.values = [null, true, leaving]
  stateMock.setters = []
  stateMock.index = 0
  const tree = CoachSection({
    coachId: 'coach-id',
    session: { user: { id: 'client-id' } },
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null }) }),
        }),
      }),
    },
  } as unknown as Parameters<typeof CoachSection>[0])
  const dialog = findElement(tree, confirmDialogMock)
  if (!dialog) throw new Error('ConfirmDialog not rendered')
  return dialog.props
}

const originalWindow = globalThis.window

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { reload: vi.fn() } },
  })
})

afterEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
  vi.unstubAllGlobals()
})

describe('CoachSection disconnect confirmation', () => {
  it('uses the accessible danger dialog and preserves cancellation', () => {
    const dialog = renderSection()

    expect(dialog).toMatchObject({
      open: true,
      variant: 'danger',
      title: 'Changer de coach',
      message: 'Confirmer la déconnexion du coach.',
      confirmLabel: 'Quitter mon coach',
      cancelLabel: 'Annuler',
      confirmDisabled: false,
    })

    ;(dialog.onCancel as () => void)()
    expect(stateMock.setters[1]).toHaveBeenCalledWith(false)
  })

  it('keeps the loading label and disables confirm while leaving', () => {
    expect(renderSection(true)).toMatchObject({
      confirmLabel: 'Déconnexion…',
      confirmDisabled: true,
    })
  })

  it('keeps the disconnect request and reload behavior unchanged', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const dialog = renderSection()

    await (dialog.onConfirm as () => Promise<void>)()

    expect(stateMock.setters[2]).toHaveBeenNthCalledWith(1, true)
    expect(fetchMock).toHaveBeenCalledWith('/api/coach/disconnect', { method: 'POST' })
    expect(stateMock.setters[2]).toHaveBeenNthCalledWith(2, false)
    expect(window.location.reload).toHaveBeenCalledOnce()
  })

  it('re-enables the action after a rejected network request without reloading', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    const dialog = renderSection()

    await expect((dialog.onConfirm as () => Promise<void>)()).rejects.toThrow('network')

    expect(stateMock.setters[2]).toHaveBeenNthCalledWith(1, true)
    expect(stateMock.setters[2]).toHaveBeenNthCalledWith(2, false)
    expect(window.location.reload).not.toHaveBeenCalled()
  })
})
