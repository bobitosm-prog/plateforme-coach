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
      return `:measurement-dialog-test-${hookMock.nextId++}:`
    },
    useRef<T>(initialValue: T) {
      const ref = { current: initialValue }
      hookMock.current?.refs.push(ref)
      return ref
    },
  }
})

import DashboardMeasurementDialogShell from '../../app/components/modals/DashboardMeasurementDialogShell'

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
}

type ShellProps = Parameters<typeof DashboardMeasurementDialogShell>[0]
type ElementProps = Record<string, unknown> & { children?: ReactNode }

function createProps(overrides: Partial<ShellProps> = {}) {
  const initialFocus = new FakeElement('initial')
  const props = {
    title: 'Mesure accessible',
    initialFocusRef: { current: initialFocus },
    onClose: vi.fn(),
    children: <button type="button">Action</button>,
    overlayStyle: { display: 'flex' },
    panelStyle: { width: '100%' },
    headerMarginBottom: 20,
    ...overrides,
  } as unknown as ShellProps
  return { props, initialFocus }
}

function renderInstance(overrides: Partial<ShellProps> = {}) {
  const { props, initialFocus } = createProps(overrides)
  const hooks = { refs: [] as Array<{ current: unknown }>, effects: [] as Array<() => void | (() => void)> }
  hookMock.current = hooks
  const tree = DashboardMeasurementDialogShell(props) as ReactElement<ElementProps>
  hookMock.current = null
  return { hooks, props, initialFocus, tree }
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
  const action = new FakeElement('action')
  dialog.focusables.push(instance.initialFocus, close, action)
  instance.hooks.refs[0].current = dialog
  fakeDocument.activeElement = trigger
  const cleanup = instance.hooks.effects[0]() as () => void
  cleanups.push(cleanup)
  return { dialog, close, action, cleanup }
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

describe('DashboardMeasurementDialogShell accessibility', () => {
  it('renders uniquely named modal dialogs and an explicitly named close button', () => {
    const first = renderInstance()
    const second = renderInstance()
    const html = renderToStaticMarkup(<Fragment>{first.tree}{second.tree}</Fragment>)
    const closeButton = findElements(first.tree, 'button')[0]

    expect(first.tree.props).toMatchObject({ role: 'dialog', 'aria-modal': 'true' })
    expect(second.tree.props['aria-labelledby']).not.toBe(first.tree.props['aria-labelledby'])
    expect(html).toContain(`id="${first.tree.props['aria-labelledby']}"`)
    expect(closeButton.props['aria-label']).toBe('Fermer')
  })

  it('focuses the requested field, traps Tab both ways and contains background focus', () => {
    const trigger = new FakeElement('trigger')
    const outside = new FakeElement('outside')
    const instance = renderInstance()
    const mounted = mountInstance(instance, trigger)

    expect(fakeDocument.activeElement).toBe(instance.initialFocus)

    mounted.action.focus()
    const tab = keyboardEvent('Tab')
    fakeDocument.dispatch('keydown', tab)
    expect(tab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(instance.initialFocus)

    const shiftTab = keyboardEvent('Tab', true)
    fakeDocument.dispatch('keydown', shiftTab)
    expect(shiftTab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(mounted.action)

    outside.focus()
    fakeDocument.dispatch('focusin', { target: outside })
    expect(fakeDocument.activeElement).toBe(instance.initialFocus)
  })

  it('preserves the historical non-closing Escape and backdrop policy', () => {
    const instance = renderInstance()
    mountInstance(instance, new FakeElement('trigger'))
    const escape = keyboardEvent('Escape')

    fakeDocument.dispatch('keydown', escape)

    expect(instance.tree.props.onClick).toBeUndefined()
    expect(instance.props.onClose).not.toHaveBeenCalled()
    expect(escape.preventDefault).not.toHaveBeenCalled()
  })

  it('locks and exactly restores body scroll and returns focus to the trigger', () => {
    fakeDocument.body.style.overflow = 'clip'
    const trigger = new FakeElement('trigger')
    const mounted = mountInstance(renderInstance(), trigger)

    expect(fakeDocument.body.style.overflow).toBe('hidden')
    mounted.cleanup()
    cleanups.pop()
    expect(fakeDocument.body.style.overflow).toBe('clip')
    expect(fakeDocument.activeElement).toBe(trigger)
  })
})
