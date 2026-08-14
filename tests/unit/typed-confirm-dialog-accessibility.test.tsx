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
      return `:typed-confirm-test-${hookMock.nextId++}:`
    },
    useRef<T>(initialValue: T) {
      const ref = { current: initialValue }
      hookMock.current?.refs.push(ref)
      return ref
    },
  }
})

vi.mock('../../app/components/ui/RailOverlay', () => ({
  RailOverlay: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

import TypedConfirmDialog from '../../app/components/ui/TypedConfirmDialog'

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

type DialogProps = Parameters<typeof TypedConfirmDialog>[0]
type ElementProps = Record<string, unknown> & { children?: ReactNode }

function createProps(overrides: Partial<DialogProps> = {}): DialogProps {
  return {
    open: true,
    title: 'Supprimer le compte',
    warning: 'Cette action est irréversible.',
    instruction: <>Tape SUPPRIMER pour confirmer.</>,
    inputLabel: 'Confirmation de suppression',
    placeholder: 'SUPPRIMER',
    value: '',
    expectedValue: 'SUPPRIMER',
    confirmLabel: 'Supprimer',
    busyLabel: 'Suppression…',
    cancelLabel: 'Annuler',
    busy: false,
    onValueChange: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
}

function renderInstance(props = createProps()) {
  const hooks = { refs: [] as Array<{ current: unknown }>, effects: [] as Array<() => void | (() => void)> }
  hookMock.current = hooks
  const overlay = TypedConfirmDialog(props) as ReactElement<{ children: ReactElement<ElementProps> }>
  hookMock.current = null
  return { hooks, props, overlay, dialog: overlay.props.children }
}

function findElements(node: ReactNode, type: string): ReactElement<ElementProps>[] {
  if (!isValidElement(node)) return []
  const element = node as ReactElement<ElementProps>
  const current = element.type === type ? [element] : []
  const children = element.props.children
  const nested = Array.isArray(children) ? children.flatMap(child => findElements(child, type)) : findElements(children, type)
  return [...current, ...nested]
}

function mountInstance(instance: ReturnType<typeof renderInstance>, trigger: FakeElement) {
  const dialog = new FakeElement('dialog')
  const input = new FakeElement('input')
  const cancel = new FakeElement('cancel')
  const confirm = new FakeElement('confirm')
  dialog.focusables.push(input, cancel, confirm)
  instance.hooks.refs[0].current = dialog
  instance.hooks.refs[1].current = input
  fakeDocument.activeElement = trigger
  const cleanup = instance.hooks.effects[0]() as () => void
  cleanups.push(cleanup)
  return { dialog, input, cancel, confirm, cleanup }
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

describe('TypedConfirmDialog accessibility', () => {
  it('renders an alertdialog with unique labelled title, description and input', () => {
    const first = renderInstance()
    const second = renderInstance()
    const html = renderToStaticMarkup(<Fragment>{first.overlay}{second.overlay}</Fragment>)
    const firstInput = findElements(first.dialog, 'input')[0]
    const firstLabel = findElements(first.dialog, 'label')[0]

    expect(first.dialog.props).toMatchObject({ role: 'alertdialog', 'aria-modal': 'true' })
    expect(first.dialog.props['aria-labelledby']).not.toBe(first.dialog.props['aria-describedby'])
    expect(second.dialog.props['aria-labelledby']).not.toBe(first.dialog.props['aria-labelledby'])
    expect(firstLabel.props.htmlFor).toBe(firstInput.props.id)
    expect(firstInput.props['aria-describedby']).toContain('typed-confirm-dialog-warning')
    expect(html).toContain(`id="${first.dialog.props['aria-labelledby']}"`)
    for (const describedId of String(first.dialog.props['aria-describedby']).split(' ')) {
      expect(html).toContain(`id="${describedId}"`)
    }
  })

  it('requires the exact value and disables confirmation while busy', () => {
    const incorrect = findElements(renderInstance(createProps({ value: 'supprimer' })).dialog, 'button')[1]
    const exact = findElements(renderInstance(createProps({ value: 'SUPPRIMER' })).dialog, 'button')[1]
    const busy = renderInstance(createProps({ value: 'SUPPRIMER', busy: true }))
    const busyConfirm = findElements(busy.dialog, 'button')[1]

    expect(incorrect.props.disabled).toBe(true)
    expect(exact.props.disabled).toBe(false)
    expect(busyConfirm.props.disabled).toBe(true)
    expect(busyConfirm.props['aria-busy']).toBe('true')
    expect(busy.dialog.props['aria-busy']).toBe('true')
  })

  it('focuses the input, traps Tab both ways and preserves Escape/backdrop behavior', () => {
    const instance = renderInstance()
    const mounted = mountInstance(instance, new FakeElement('trigger'))

    expect(fakeDocument.activeElement).toBe(mounted.input)

    mounted.confirm.focus()
    const tab = keyboardEvent('Tab')
    fakeDocument.dispatch('keydown', tab)
    expect(tab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(mounted.input)

    const shiftTab = keyboardEvent('Tab', true)
    fakeDocument.dispatch('keydown', shiftTab)
    expect(shiftTab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(mounted.confirm)

    const escape = keyboardEvent('Escape')
    fakeDocument.dispatch('keydown', escape)
    expect(escape.preventDefault).not.toHaveBeenCalled()
    expect(instance.props.onCancel).not.toHaveBeenCalled()
    expect(instance.dialog.props.onClick).toBeUndefined()
  })

  it('preserves input, cancel and confirm callbacks', () => {
    const instance = renderInstance(createProps({ value: 'SUPPRIMER' }))
    const input = findElements(instance.dialog, 'input')[0]
    const buttons = findElements(instance.dialog, 'button')

    ;(input.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: 'S' } })
    ;(buttons[0].props.onClick as () => void)()
    ;(buttons[1].props.onClick as () => void)()

    expect(instance.props.onValueChange).toHaveBeenCalledWith('S')
    expect(instance.props.onCancel).toHaveBeenCalledOnce()
    expect(instance.props.onConfirm).toHaveBeenCalledOnce()
  })

  it('locks body scroll, restores its exact value and returns focus', () => {
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
