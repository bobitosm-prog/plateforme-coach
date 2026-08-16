import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hookMock = vi.hoisted(() => ({
  current: null as null | {
    refs: Array<{ current: unknown }>
    effects: Array<() => void | (() => void)>
  },
  nextId: 1,
}))

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect(effect: () => void | (() => void)) {
      hookMock.current?.effects.push(effect)
    },
    useId() {
      return `:client-profile-edit-test-${hookMock.nextId++}:`
    },
    useRef<T>(initialValue: T) {
      const ref = { current: initialValue }
      hookMock.current?.refs.push(ref)
      return ref
    },
  }
})

import ClientProfileEditDialogShell from '../../app/client/[id]/components/page/ClientProfileEditDialogShell'

class FakeElement {
  readonly attributes = new Map<string, string>()
  readonly focusables: FakeElement[] = []
  focusCount = 0
  isConnected = true

  constructor(readonly name: string) {}

  focus() {
    this.focusCount += 1
    fakeDocument.activeElement = this
  }

  contains(target: unknown) {
    return target === this || this.focusables.includes(target as FakeElement)
  }

  querySelectorAll() {
    return this.focusables
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null
  }

  hasAttribute(name: string) {
    return this.attributes.has(name)
  }
}

type Listener = (event: Record<string, unknown>) => void

const fakeDocument = {
  activeElement: null as FakeElement | null,
  body: { style: { overflow: '' } },
  listeners: new Map<string, Set<Listener>>(),
  addEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? new Set<Listener>()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  },
  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener)
  },
  dispatch(type: string, event: Record<string, unknown>) {
    for (const listener of this.listeners.get(type) ?? []) listener(event)
  },
  getElementById() {
    return null
  },
}

type ShellProps = Parameters<typeof ClientProfileEditDialogShell>[0]
type ElementProps = Record<string, unknown> & { children?: ReactNode }

function renderInstance(open = true) {
  const nameInput = new FakeElement('name-input')
  const props = {
    open,
    title: 'Modifier le profil',
    initialFocusRef: { current: nameInput },
    onClose: vi.fn(),
    children: <button type="button">Enregistrer</button>,
  } as unknown as ShellProps
  const hooks = { refs: [] as Array<{ current: unknown }>, effects: [] as Array<() => void | (() => void)> }
  hookMock.current = hooks
  const tree = ClientProfileEditDialogShell(props) as ReactElement<ElementProps> | null
  hookMock.current = null
  return { hooks, nameInput, props, tree }
}

function findElements(node: ReactNode, type: string): ReactElement<ElementProps>[] {
  if (!isValidElement(node)) return []
  const element = node as ReactElement<ElementProps>
  const current = element.type === type ? [element] : []
  const children = element.props.children
  const nested = Array.isArray(children)
    ? children.flatMap(child => findElements(child, type))
    : findElements(children, type)
  return [...current, ...nested]
}

function mountInstance(instance: ReturnType<typeof renderInstance>, trigger: FakeElement) {
  const dialog = new FakeElement('dialog')
  const close = new FakeElement('close')
  const save = new FakeElement('save')
  dialog.focusables.push(instance.nameInput, close, save)
  instance.hooks.refs[0].current = dialog
  fakeDocument.activeElement = trigger
  const cleanup = instance.hooks.effects[0]() as () => void
  cleanups.push(cleanup)
  return { dialog, close, save, cleanup }
}

function keyboardEvent(key: string, shiftKey = false) {
  return { key, shiftKey, preventDefault: vi.fn() }
}

const cleanups: Array<() => void> = []
const originalDocument = globalThis.document

beforeEach(() => {
  hookMock.nextId = 1
  fakeDocument.activeElement = null
  fakeDocument.body.style.overflow = ''
  fakeDocument.listeners.clear()
  Object.defineProperty(globalThis, 'document', { configurable: true, value: fakeDocument })
})

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.()
  Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument })
})

describe('ClientProfileEditDialogShell accessibility', () => {
  it('renders nothing, including form children, when closed', () => {
    const closed = renderInstance(false)
    expect(closed.tree).toBeNull()
    expect(renderToStaticMarkup(closed.tree)).toBe('')
  })

  it('renders a named modal dialog and an explicitly named close button', () => {
    const instance = renderInstance()
    const dialog = findElements(instance.tree, 'div').find(element => element.props.role === 'dialog')
    const close = findElements(instance.tree, 'button')[0]
    const html = renderToStaticMarkup(instance.tree)

    expect(dialog?.props).toMatchObject({ 'aria-modal': 'true' })
    expect(html).toContain(`id="${dialog?.props['aria-labelledby']}"`)
    expect(html).toContain('Modifier le profil')
    expect(close.props['aria-label']).toBe('Fermer')
  })

  it('focuses the name input, traps Tab both ways and confines background focus', () => {
    const outside = new FakeElement('outside')
    const instance = renderInstance()
    const mounted = mountInstance(instance, new FakeElement('modifier-trigger'))
    expect(fakeDocument.activeElement).toBe(instance.nameInput)

    mounted.save.focus()
    const tab = keyboardEvent('Tab')
    fakeDocument.dispatch('keydown', tab)
    expect(tab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(instance.nameInput)

    const shiftTab = keyboardEvent('Tab', true)
    fakeDocument.dispatch('keydown', shiftTab)
    expect(shiftTab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(mounted.save)

    outside.focus()
    fakeDocument.dispatch('focusin', { target: outside })
    expect(fakeDocument.activeElement).toBe(instance.nameInput)
  })

  it('keeps Escape non-closing while backdrop closes', () => {
    const instance = renderInstance()
    mountInstance(instance, new FakeElement('modifier-trigger'))
    fakeDocument.dispatch('keydown', keyboardEvent('Escape'))
    expect(instance.props.onClose).not.toHaveBeenCalled()

    ;(instance.tree?.props.onClick as () => void)()
    expect(instance.props.onClose).toHaveBeenCalledOnce()
  })

  it('restores body scroll and focus to the exact trigger', () => {
    fakeDocument.body.style.overflow = 'clip'
    const trigger = new FakeElement('modifier-trigger')
    const mounted = mountInstance(renderInstance(), trigger)
    expect(fakeDocument.body.style.overflow).toBe('hidden')

    mounted.cleanup()
    cleanups.pop()
    expect(fakeDocument.body.style.overflow).toBe('clip')
    expect(fakeDocument.activeElement).toBe(trigger)
  })
})
