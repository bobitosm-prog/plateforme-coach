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
      return `:objective-wizard-test-${hookMock.nextId++}:`
    },
    useRef<T>(initialValue: T) {
      const ref = { current: initialValue }
      hookMock.current?.refs.push(ref)
      return ref
    },
  }
})

import DashboardObjectiveWizardDialogShell from '../../app/components/modals/DashboardObjectiveWizardDialogShell'

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

type ShellProps = Parameters<typeof DashboardObjectiveWizardDialogShell>[0]
type ElementProps = Record<string, unknown> & { children?: ReactNode }

function renderInstance(overrides: Partial<ShellProps> = {}) {
  const props: ShellProps = {
    step: 1,
    totalSteps: 4,
    stepLabel: 'Étape 1 sur 4',
    title: 'Choisissez votre objectif',
    saving: false,
    onClose: vi.fn(),
    children: <button type="button">Continuer</button>,
    ...overrides,
  }
  const hooks = { refs: [] as Array<{ current: unknown }>, effects: [] as Array<() => void | (() => void)> }
  hookMock.current = hooks
  const tree = DashboardObjectiveWizardDialogShell(props) as ReactElement<ElementProps>
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
  const heading = new FakeElement('heading')
  const close = new FakeElement('close')
  const action = new FakeElement('action')
  dialog.focusables.push(close, action)
  instance.hooks.refs[0].current = dialog
  instance.hooks.refs[1].current = heading
  fakeDocument.activeElement = trigger
  const cleanup = instance.hooks.effects[0]() as () => void
  instance.hooks.effects[1]()
  cleanups.push(cleanup)
  return { dialog, heading, close, action, cleanup }
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

describe('DashboardObjectiveWizardDialogShell accessibility', () => {
  it('renders uniquely named busy dialogs and accessible progress', () => {
    const first = renderInstance({ saving: true })
    const second = renderInstance()
    const firstDialog = findElements(first.tree, 'div').find(element => element.props.role === 'dialog')
    const secondDialog = findElements(second.tree, 'div').find(element => element.props.role === 'dialog')
    const progress = findElements(first.tree, 'div').find(element => element.props.role === 'progressbar')
    const close = findElements(first.tree, 'button')[0]
    const html = renderToStaticMarkup(<Fragment>{first.tree}{second.tree}</Fragment>)

    expect(firstDialog?.props).toMatchObject({ 'aria-modal': 'true', 'aria-busy': true })
    expect(firstDialog?.props['aria-labelledby']).not.toBe(secondDialog?.props['aria-labelledby'])
    expect(html).toContain(`id="${firstDialog?.props['aria-labelledby']}"`)
    expect(progress?.props).toMatchObject({
      'aria-valuemin': 1,
      'aria-valuemax': 4,
      'aria-valuenow': 1,
      'aria-label': 'Étape 1 sur 4',
    })
    expect(close.props['aria-label']).toBe('Fermer')
  })

  it('focuses the step heading on mount and on a step change', () => {
    const first = renderInstance()
    const mounted = mountInstance(first, new FakeElement('trigger'))
    expect(fakeDocument.activeElement).toBe(mounted.heading)

    const nextStep = renderInstance({ step: 2, title: 'Votre poids' })
    const nextHeading = new FakeElement('next-heading')
    nextStep.hooks.refs[1].current = nextHeading
    nextStep.hooks.effects[1]()
    expect(fakeDocument.activeElement).toBe(nextHeading)
  })

  it('traps Tab in both directions and contains background focus', () => {
    const outside = new FakeElement('outside')
    const mounted = mountInstance(renderInstance(), new FakeElement('trigger'))

    mounted.action.focus()
    const tab = keyboardEvent('Tab')
    fakeDocument.dispatch('keydown', tab)
    expect(tab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(mounted.close)

    const shiftTab = keyboardEvent('Tab', true)
    fakeDocument.dispatch('keydown', shiftTab)
    expect(shiftTab.preventDefault).toHaveBeenCalledOnce()
    expect(fakeDocument.activeElement).toBe(mounted.action)

    outside.focus()
    fakeDocument.dispatch('focusin', { target: outside })
    expect(fakeDocument.activeElement).toBe(mounted.heading)
  })

  it('keeps Escape non-closing while backdrop closes', () => {
    const instance = renderInstance()
    mountInstance(instance, new FakeElement('trigger'))
    const escape = keyboardEvent('Escape')
    fakeDocument.dispatch('keydown', escape)
    expect(instance.props.onClose).not.toHaveBeenCalled()

    ;(instance.tree.props.onClick as () => void)()
    expect(instance.props.onClose).toHaveBeenCalledOnce()
  })

  it('restores body scroll and focus exactly on close', () => {
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
