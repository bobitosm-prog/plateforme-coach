import { readFileSync } from 'node:fs'
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
      return `:training-timer-alert-test-${hookMock.nextId++}:`
    },
    useRef<T>(initialValue: T) {
      const ref = { current: initialValue }
      hookMock.current?.refs.push(ref)
      return ref
    },
  }
})

vi.mock('../../app/components/ui/RailOverlay', () => ({
  RailOverlay: ({ children }: { children: ReactNode }) => children,
}))

import TrainingTimerAlertModal from '../../app/components/tabs/training/modals/TrainingTimerAlertModal'

class FakeElement {
  focusCount = 0
  isConnected = true

  constructor(readonly name: string, private readonly children: FakeElement[] = []) {}

  focus() {
    this.focusCount += 1
    fakeDocument.activeElement = this
  }

  contains(target: unknown) {
    return target === this || this.children.includes(target as FakeElement)
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

type ModalProps = Parameters<typeof TrainingTimerAlertModal>[0]
type ElementProps = {
  role?: string
  id?: string
  'aria-modal'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-hidden'?: string
  onClick?: () => void
  children?: ReactNode
}

function createProps(overrides: Partial<ModalProps> = {}): ModalProps {
  return {
    message: 'Continue comme ça',
    restDoneLabel: 'Repos terminé',
    onClose: vi.fn(),
    ...overrides,
  }
}

function renderInstance(props = createProps()) {
  const hooks = { refs: [] as Array<{ current: unknown }>, effects: [] as Array<() => void | (() => void)> }
  hookMock.current = hooks
  const tree = TrainingTimerAlertModal(props) as ReactElement<ElementProps>
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
  const action = new FakeElement('action')
  const dialog = new FakeElement('dialog', [action])
  instance.hooks.refs[0].current = dialog
  instance.hooks.refs[1].current = action
  fakeDocument.activeElement = trigger
  const cleanup = instance.hooks.effects[0]() as () => void
  cleanups.push(cleanup)
  return { dialog, action, cleanup }
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

describe('TrainingTimerAlertModal accessibility', () => {
  it('renders an assertive named alertdialog with a linked message and unique ids', () => {
    const first = renderInstance()
    const second = renderInstance()
    const firstDialog = findElement(first.tree, props => props.role === 'alertdialog')!
    const secondDialog = findElement(second.tree, props => props.role === 'alertdialog')!
    const html = renderToStaticMarkup(<Fragment>{first.tree}{second.tree}</Fragment>)

    expect(firstDialog.props).toMatchObject({ role: 'alertdialog', 'aria-modal': 'true' })
    expect(firstDialog.props['aria-labelledby']).not.toBe(secondDialog.props['aria-labelledby'])
    expect(firstDialog.props['aria-describedby']).not.toBe(secondDialog.props['aria-describedby'])
    expect(html).toContain(`id="${firstDialog.props['aria-labelledby']}"`)
    expect(html).toContain(`id="${firstDialog.props['aria-describedby']}"`)
    expect(html).toContain('Repos terminé')
    expect(html).toContain('Continue comme ça')
    expect(html).toContain('aria-hidden="true"')
  })

  it('focuses the action and traps Tab and Shift+Tab on that safe action', () => {
    const mounted = mountInstance(renderInstance(), new FakeElement('trigger'))
    expect(fakeDocument.activeElement).toBe(mounted.action)

    for (const shiftKey of [false, true]) {
      const event = keyboardEvent('Tab', shiftKey)
      fakeDocument.dispatch('keydown', event)
      expect(event.preventDefault).toHaveBeenCalledOnce()
      expect(fakeDocument.activeElement).toBe(mounted.action)
    }
  })

  it('does not add Escape dismissal and preserves the button callback', () => {
    const instance = renderInstance()
    mountInstance(instance, new FakeElement('trigger'))
    const escape = keyboardEvent('Escape')
    fakeDocument.dispatch('keydown', escape)

    expect(instance.props.onClose).not.toHaveBeenCalled()
    expect(escape.preventDefault).not.toHaveBeenCalled()

    const action = findElement(instance.tree, (_props, type) => type === 'button')!
    action.props.onClick?.()
    expect(instance.props.onClose).toHaveBeenCalledOnce()
  })

  it('contains escaped focus and restores focus and exact body overflow on unmount', () => {
    fakeDocument.body.style.overflow = 'clip'
    const trigger = new FakeElement('trigger')
    const mounted = mountInstance(renderInstance(), trigger)
    expect(fakeDocument.body.style.overflow).toBe('hidden')

    fakeDocument.activeElement = trigger
    fakeDocument.dispatch('focusin', { target: trigger })
    expect(fakeDocument.activeElement).toBe(mounted.action)

    mounted.cleanup()
    cleanups.pop()
    expect(fakeDocument.activeElement).toBe(trigger)
    expect(fakeDocument.body.style.overflow).toBe('clip')
  })

  it('keeps the existing Training callback and three-second auto-dismiss contract', () => {
    const view = readFileSync(new URL('../../app/components/tabs/TrainingTabView.tsx', import.meta.url), 'utf8')
    const timer = readFileSync(new URL('../../app/components/tabs/training/useTrainingWorkoutTimer.ts', import.meta.url), 'utf8')

    expect(view).toContain('onClose={() => setShowTimerAlert(false)}')
    expect(timer).toContain('setTimeout(() => setShowTimerAlert(false), 3000)')
  })
})
