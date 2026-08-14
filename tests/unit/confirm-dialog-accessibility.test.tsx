import { Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'
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
      return `:confirm-test-${hookMock.nextId++}:`
    },
    useRef<T>(initialValue: T) {
      const ref = { current: initialValue }
      hookMock.current?.refs.push(ref)
      return ref
    },
  }
})

import ConfirmDialog from '../../app/components/ui/ConfirmDialog'

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

type DialogProps = Parameters<typeof ConfirmDialog>[0]
type DialogTreeProps = {
  role: 'dialog' | 'alertdialog'
  'aria-modal': 'true'
  'aria-labelledby': string
  'aria-describedby': string
  onClick: () => void
  children?: ReactNode
}
type ButtonTreeProps = { onClick: () => void; children?: ReactNode }

function createProps(overrides: Partial<DialogProps> = {}): DialogProps {
  return {
    open: true,
    title: 'Titre accessible',
    message: 'Description accessible',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
}

function renderInstance(props = createProps()) {
  const hooks = { refs: [] as Array<{ current: unknown }>, effects: [] as Array<() => void | (() => void)> }
  hookMock.current = hooks
  const tree = ConfirmDialog(props) as ReactElement<DialogTreeProps>
  hookMock.current = null
  return { hooks, props, tree }
}

function mountInstance(instance: ReturnType<typeof renderInstance>, trigger: FakeElement) {
  const dialog = new FakeElement('dialog')
  const cancel = new FakeElement('cancel')
  const confirm = new FakeElement('confirm')
  dialog.focusables.push(cancel, confirm)
  instance.hooks.refs[0].current = dialog
  instance.hooks.refs[1].current = cancel
  fakeDocument.activeElement = trigger
  instance.hooks.effects[0]()
  const cleanup = instance.hooks.effects[1]() as () => void
  cleanups.push(cleanup)
  return { dialog, cancel, confirm, cleanup }
}

function findButtons(node: ReactNode): ReactElement<ButtonTreeProps>[] {
  if (!isValidElement(node)) return []
  const element = node as ReactElement<{ children?: ReactNode }>
  const current = element.type === 'button' ? [element as ReactElement<ButtonTreeProps>] : []
  const children = element.props.children
  const nested = Array.isArray(children)
    ? children.flatMap(findButtons)
    : findButtons(children)
  return [...current, ...nested]
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

describe('ConfirmDialog accessibility', () => {
  it('renders the normal ARIA contract with unique title and description ids', () => {
    const first = renderInstance()
    const second = renderInstance()
    const html = renderToStaticMarkup(<Fragment>{first.tree}{second.tree}</Fragment>)

    expect(first.tree.props).toMatchObject({ role: 'dialog', 'aria-modal': 'true' })
    expect(first.tree.props['aria-labelledby']).not.toBe(first.tree.props['aria-describedby'])
    expect(second.tree.props['aria-labelledby']).not.toBe(first.tree.props['aria-labelledby'])
    expect(second.tree.props['aria-describedby']).not.toBe(first.tree.props['aria-describedby'])
    expect(html).toContain(`id="${first.tree.props['aria-labelledby']}"`)
    expect(html).toContain(`id="${first.tree.props['aria-describedby']}"`)
  })

  it('uses alertdialog for a danger confirmation', () => {
    expect(renderInstance(createProps({ variant: 'danger' })).tree.props.role).toBe('alertdialog')
  })

  it('focuses cancel, traps Tab in both directions, closes on Escape and restores focus', () => {
    const trigger = new FakeElement('trigger')
    const instance = renderInstance()
    const mounted = mountInstance(instance, trigger)

    expect(fakeDocument.activeElement).toBe(mounted.cancel)

    mounted.confirm.focus()
    const tab = keyboardEvent('Tab')
    fakeDocument.dispatch('keydown', tab)
    expect(tab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(mounted.cancel)

    const shiftTab = keyboardEvent('Tab', true)
    fakeDocument.dispatch('keydown', shiftTab)
    expect(shiftTab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(mounted.confirm)

    const escape = keyboardEvent('Escape')
    fakeDocument.dispatch('keydown', escape)
    expect(instance.props.onCancel).toHaveBeenCalledOnce()
    expect(escape.preventDefault).toHaveBeenCalledOnce()

    mounted.cleanup()
    cleanups.pop()
    expect(fakeDocument.activeElement).toBe(trigger)
  })

  it('preserves backdrop, cancel and confirm callbacks', () => {
    const instance = renderInstance()
    const buttons = findButtons(instance.tree)

    instance.tree.props.onClick()
    buttons[0].props.onClick()
    buttons[1].props.onClick()

    expect(instance.props.onCancel).toHaveBeenCalledTimes(2)
    expect(instance.props.onConfirm).toHaveBeenCalledOnce()
  })

  it('locks body scroll and restores its exact previous value', () => {
    fakeDocument.body.style.overflow = 'clip'
    const mounted = mountInstance(renderInstance(), new FakeElement('trigger'))

    expect(fakeDocument.body.style.overflow).toBe('hidden')
    mounted.cleanup()
    cleanups.pop()
    expect(fakeDocument.body.style.overflow).toBe('clip')
  })

  it('keeps only the top nested dialog keyboard-accessible', () => {
    fakeDocument.body.style.overflow = 'scroll'
    const trigger = new FakeElement('trigger')
    const parentInstance = renderInstance()
    const parent = mountInstance(parentInstance, trigger)
    const childInstance = renderInstance()
    const child = mountInstance(childInstance, parent.cancel)

    expect(parent.dialog.getAttribute('aria-hidden')).toBe('true')
    expect(parent.dialog.hasAttribute('inert')).toBe(true)
    expect(child.dialog.getAttribute('aria-hidden')).toBeNull()

    child.confirm.focus()
    fakeDocument.dispatch('keydown', keyboardEvent('Tab'))
    expect(fakeDocument.activeElement).toBe(child.cancel)

    fakeDocument.dispatch('keydown', keyboardEvent('Escape'))
    expect(childInstance.props.onCancel).toHaveBeenCalledOnce()
    expect(parentInstance.props.onCancel).not.toHaveBeenCalled()

    fakeDocument.activeElement = parent.confirm
    fakeDocument.dispatch('focusin', { target: parent.confirm })
    expect(fakeDocument.activeElement).toBe(child.cancel)

    child.cleanup()
    cleanups.pop()
    expect(parent.dialog.hasAttribute('inert')).toBe(false)
    expect(fakeDocument.activeElement).toBe(parent.cancel)
    expect(fakeDocument.body.style.overflow).toBe('hidden')

    parent.cleanup()
    cleanups.pop()
    expect(fakeDocument.activeElement).toBe(trigger)
    expect(fakeDocument.body.style.overflow).toBe('scroll')
  })

  it('restores the root trigger when a nested parent unmounts before its child', () => {
    const trigger = new FakeElement('trigger')
    const parent = mountInstance(renderInstance(), trigger)
    const child = mountInstance(renderInstance(), parent.cancel)

    parent.cleanup()
    cleanups.splice(cleanups.indexOf(parent.cleanup), 1)
    expect(fakeDocument.activeElement).toBe(child.cancel)
    expect(fakeDocument.body.style.overflow).toBe('hidden')

    child.cleanup()
    cleanups.splice(cleanups.indexOf(child.cleanup), 1)
    expect(fakeDocument.activeElement).toBe(trigger)
    expect(fakeDocument.body.style.overflow).toBe('')
  })
})
