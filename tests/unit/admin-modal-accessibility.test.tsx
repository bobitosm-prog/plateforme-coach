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
      return `:admin-modal-test-${hookMock.nextId++}:`
    },
    useRef<T>(initialValue: T) {
      const ref = { current: initialValue }
      hookMock.current?.refs.push(ref)
      return ref
    },
  }
})

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: { div: 'div' },
}))

vi.mock('lucide-react', () => ({ X: () => <span aria-hidden="true">x</span> }))

import { Modal } from '../../app/admin/_components/Modal'

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

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  removeAttribute(name: string) {
    this.attributes.delete(name)
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
}

type ModalProps = Parameters<typeof Modal>[0]
type ElementProps = {
  role?: string
  id?: string
  className?: string
  'aria-modal'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-label'?: string
  onClick?: () => void
  children?: ReactNode
}

function createProps(overrides: Partial<ModalProps> = {}): ModalProps {
  return {
    open: true,
    title: 'Titre admin',
    description: 'Description admin',
    onClose: vi.fn(),
    children: <><input aria-label="Champ" /><button>Annuler</button><button>Enregistrer</button></>,
    ...overrides,
  }
}

function renderInstance(props = createProps()) {
  const hooks = { refs: [] as Array<{ current: unknown }>, effects: [] as Array<() => void | (() => void)> }
  hookMock.current = hooks
  const tree = Modal(props) as ReactElement<ElementProps>
  hookMock.current = null
  return { hooks, props, tree }
}

function findElement(node: ReactNode, predicate: (props: ElementProps, type: unknown) => boolean): ReactElement<ElementProps> | null {
  if (!isValidElement(node)) return null
  const element = node as ReactElement<ElementProps>
  if (predicate(element.props, element.type)) return element
  const children = element.props.children
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findElement(child, predicate)
      if (found) return found
    }
    return null
  }
  return findElement(children, predicate)
}

function mountInstance(instance: ReturnType<typeof renderInstance>, trigger: FakeElement) {
  const modal = new FakeElement('modal')
  const close = new FakeElement('close')
  const input = new FakeElement('input')
  const cancel = new FakeElement('cancel')
  const submit = new FakeElement('submit')
  modal.focusables.push(close, input, cancel, submit)
  instance.hooks.refs[0].current = modal
  instance.hooks.refs[1].current = close
  fakeDocument.activeElement = trigger
  instance.hooks.effects[0]()
  const cleanup = instance.hooks.effects[1]() as () => void
  cleanups.push(cleanup)
  return { modal, close, input, cancel, submit, cleanup }
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

describe('admin Modal accessibility', () => {
  it('renders a named modal dialog with an optional description and unique ids', () => {
    const first = renderInstance()
    const second = renderInstance()
    const firstDialog = findElement(first.tree, props => props.role === 'dialog')!
    const secondDialog = findElement(second.tree, props => props.role === 'dialog')!
    const html = renderToStaticMarkup(first.tree)

    expect(firstDialog.props).toMatchObject({ role: 'dialog', 'aria-modal': 'true' })
    expect(firstDialog.props['aria-labelledby']).not.toBe(secondDialog.props['aria-labelledby'])
    expect(firstDialog.props['aria-describedby']).not.toBe(secondDialog.props['aria-describedby'])
    expect(html).toContain(`id="${firstDialog.props['aria-labelledby']}"`)
    expect(html).toContain(`id="${firstDialog.props['aria-describedby']}"`)

    const withoutDescription = renderInstance(createProps({ description: undefined }))
    expect(findElement(withoutDescription.tree, props => props.role === 'dialog')?.props['aria-describedby']).toBeUndefined()
  })

  it('focuses close, traps Tab in both directions, handles Escape and restores focus', () => {
    const trigger = new FakeElement('trigger')
    const instance = renderInstance()
    const mounted = mountInstance(instance, trigger)

    expect(fakeDocument.activeElement).toBe(mounted.close)

    mounted.submit.focus()
    const tab = keyboardEvent('Tab')
    fakeDocument.dispatch('keydown', tab)
    expect(tab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(mounted.close)

    const shiftTab = keyboardEvent('Tab', true)
    fakeDocument.dispatch('keydown', shiftTab)
    expect(shiftTab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(mounted.submit)

    const escape = keyboardEvent('Escape')
    fakeDocument.dispatch('keydown', escape)
    expect(instance.props.onClose).toHaveBeenCalledOnce()
    expect(escape.preventDefault).toHaveBeenCalledOnce()

    mounted.cleanup()
    cleanups.pop()
    expect(fakeDocument.activeElement).toBe(trigger)
  })

  it('keeps backdrop and accessible close button behavior unchanged', () => {
    const instance = renderInstance()
    const backdrop = findElement(instance.tree, props => props.className?.includes('bg-black/70') === true)!
    const close = findElement(instance.tree, props => props['aria-label'] === 'Fermer')!

    backdrop.props.onClick?.()
    close.props.onClick?.()

    expect(instance.props.onClose).toHaveBeenCalledTimes(2)
    expect(close.props['aria-label']).toBe('Fermer')
  })

  it('locks body scroll and restores its exact prior value', () => {
    fakeDocument.body.style.overflow = 'clip'
    const mounted = mountInstance(renderInstance(), new FakeElement('trigger'))
    expect(fakeDocument.body.style.overflow).toBe('hidden')

    mounted.cleanup()
    cleanups.pop()
    expect(fakeDocument.body.style.overflow).toBe('clip')
  })

  it('makes only the top nested modal keyboard-accessible', () => {
    fakeDocument.body.style.overflow = 'scroll'
    const trigger = new FakeElement('trigger')
    const parentInstance = renderInstance()
    const parent = mountInstance(parentInstance, trigger)
    const childInstance = renderInstance()
    const child = mountInstance(childInstance, parent.close)

    expect(parent.modal.getAttribute('aria-hidden')).toBe('true')
    expect(parent.modal.hasAttribute('inert')).toBe(true)
    fakeDocument.dispatch('keydown', keyboardEvent('Escape'))
    expect(childInstance.props.onClose).toHaveBeenCalledOnce()
    expect(parentInstance.props.onClose).not.toHaveBeenCalled()

    fakeDocument.activeElement = parent.submit
    fakeDocument.dispatch('focusin', { target: parent.submit })
    expect(fakeDocument.activeElement).toBe(child.close)

    child.cleanup()
    cleanups.pop()
    expect(parent.modal.hasAttribute('inert')).toBe(false)
    expect(fakeDocument.activeElement).toBe(parent.close)
    expect(fakeDocument.body.style.overflow).toBe('hidden')

    parent.cleanup()
    cleanups.pop()
    expect(fakeDocument.activeElement).toBe(trigger)
    expect(fakeDocument.body.style.overflow).toBe('scroll')
  })
})
