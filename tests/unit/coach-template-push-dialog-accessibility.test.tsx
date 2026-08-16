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
      return `:coach-template-push-test-${hookMock.nextId++}:`
    },
    useRef<T>(initialValue: T) {
      const ref = { current: initialValue }
      hookMock.current?.refs.push(ref)
      return ref
    },
  }
})

import CoachTemplatePushDialog from '../../app/coach/components/CoachTemplatePushDialog'

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

type DialogProps = Parameters<typeof CoachTemplatePushDialog>[0]
type ElementProps = Record<string, unknown> & { children?: ReactNode }

function createProps(overrides: Partial<DialogProps> = {}): DialogProps {
  return {
    open: true,
    templateName: 'Force 4 jours',
    impactedClients: [
      { id: 'client-1', name: 'Client un' },
      { id: 'client-2', name: 'Client deux' },
    ],
    pushing: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
}

function renderInstance(props = createProps()) {
  const hooks = { refs: [] as Array<{ current: unknown }>, effects: [] as Array<() => void | (() => void)> }
  hookMock.current = hooks
  const tree = CoachTemplatePushDialog(props) as ReactElement<ElementProps>
  hookMock.current = null
  return { hooks, props, tree }
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

describe('CoachTemplatePushDialog accessibility', () => {
  it('renders a uniquely named and described alertdialog with a semantic client list', () => {
    const first = renderInstance()
    const second = renderInstance()
    const html = renderToStaticMarkup(<Fragment>{first.tree}{second.tree}</Fragment>)

    expect(first.tree.props).toMatchObject({
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-busy': 'false',
    })
    expect(first.tree.props['aria-labelledby']).not.toBe(first.tree.props['aria-describedby'])
    expect(second.tree.props['aria-labelledby']).not.toBe(first.tree.props['aria-labelledby'])
    expect(second.tree.props['aria-describedby']).not.toBe(first.tree.props['aria-describedby'])
    expect(html).toContain(`id="${first.tree.props['aria-labelledby']}"`)
    expect(html).toContain(`id="${first.tree.props['aria-describedby']}"`)
    expect(findElements(first.tree, 'ul')).toHaveLength(1)
    expect(findElements(first.tree, 'li')).toHaveLength(2)
    expect(html).toContain('Les modifications personnelles seront ecrasees.')
  })

  it('renders the empty state with only a close action', () => {
    const instance = renderInstance(createProps({ impactedClients: [] }))
    const html = renderToStaticMarkup(instance.tree)
    const buttons = findElements(instance.tree, 'button')

    expect(buttons).toHaveLength(1)
    expect(buttons[0].props.children).toBe('Fermer')
    expect(findElements(instance.tree, 'ul')).toHaveLength(0)
    expect(html).toContain("Aucun client n&#x27;a actuellement le template")
  })

  it('focuses cancel, traps Tab both ways, contains background focus and restores the trigger', () => {
    const trigger = new FakeElement('trigger')
    const outside = new FakeElement('outside')
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

    outside.focus()
    fakeDocument.dispatch('focusin', { target: outside })
    expect(fakeDocument.activeElement).toBe(mounted.cancel)

    mounted.cleanup()
    cleanups.pop()
    expect(fakeDocument.activeElement).toBe(trigger)
  })

  it('allows Escape and backdrop cancellation without confirming when idle', () => {
    const instance = renderInstance()
    mountInstance(instance, new FakeElement('trigger'))

    const escape = keyboardEvent('Escape')
    fakeDocument.dispatch('keydown', escape)
    ;(instance.tree.props.onClick as () => void)()

    expect(escape.preventDefault).toHaveBeenCalledOnce()
    expect(instance.props.onCancel).toHaveBeenCalledTimes(2)
    expect(instance.props.onConfirm).not.toHaveBeenCalled()
  })

  it('blocks Escape and backdrop and exposes accessible progress while pushing', () => {
    const instance = renderInstance(createProps({ pushing: true }))
    const mounted = mountInstance(instance, new FakeElement('trigger'))
    const buttons = findElements(instance.tree, 'button')

    const escape = keyboardEvent('Escape')
    fakeDocument.dispatch('keydown', escape)
    ;(instance.tree.props.onClick as () => void)()
    mounted.dialog.focusables.length = 0
    const tab = keyboardEvent('Tab')
    fakeDocument.dispatch('keydown', tab)

    expect(instance.tree.props['aria-busy']).toBe('true')
    expect(buttons).toHaveLength(2)
    expect(buttons.every(button => button.props.disabled === true)).toBe(true)
    expect(buttons[1].props['aria-busy']).toBe('true')
    expect(buttons[1].props.children).toBe('Mise à jour…')
    expect(escape.preventDefault).not.toHaveBeenCalled()
    expect(tab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(mounted.dialog)
    expect(instance.props.onCancel).not.toHaveBeenCalled()
    expect(instance.props.onConfirm).not.toHaveBeenCalled()
  })

  it('preserves cancel and confirm callbacks and exact body scroll restoration', () => {
    fakeDocument.body.style.overflow = 'clip'
    const instance = renderInstance()
    const mounted = mountInstance(instance, new FakeElement('trigger'))
    const buttons = findElements(instance.tree, 'button')

    expect(fakeDocument.body.style.overflow).toBe('hidden')
    ;(buttons[0].props.onClick as () => void)()
    ;(buttons[1].props.onClick as () => void)()
    expect(instance.props.onCancel).toHaveBeenCalledOnce()
    expect(instance.props.onConfirm).toHaveBeenCalledOnce()

    mounted.cleanup()
    cleanups.pop()
    expect(fakeDocument.body.style.overflow).toBe('clip')
  })
})
