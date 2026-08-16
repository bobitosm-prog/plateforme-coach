import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const stateMock = vi.hoisted(() => ({
  values: [] as unknown[],
  setters: [] as ReturnType<typeof vi.fn>[],
  index: 0,
  nextId: 1,
  refs: [] as Array<{ current: unknown }>,
}))
const shellMock = vi.hoisted(() => vi.fn(() => null))
const updateProfileMock = vi.hoisted(() => vi.fn())

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useId: () => `:bmr-test-${stateMock.nextId++}:`,
    useRef: <T,>(initialValue: T) => {
      const ref = { current: initialValue }
      stateMock.refs.push(ref)
      return ref
    },
    useState: <T,>(initialValue: T) => {
      const index = stateMock.index++
      const setter = vi.fn()
      stateMock.setters[index] = setter
      return [index < stateMock.values.length ? stateMock.values[index] : initialValue, setter]
    },
  }
})

vi.mock('../../lib/profile-service', () => ({ updateProfile: updateProfileMock }))
vi.mock('../../app/components/modals/DashboardMeasurementDialogShell', () => ({ default: shellMock }))

import DashboardMeasurementDialogShell from '../../app/components/modals/DashboardMeasurementDialogShell'
import BmrModal from '../../app/components/modals/BmrModal'

type ElementProps = Record<string, unknown> & { children?: ReactNode }

const initialValues = {
  weight: '80',
  height: '180',
  age: '30',
  gender: 'male',
  activity: 'moderate',
  body_fat: '20',
}

function resetState(values: unknown[]) {
  stateMock.values = values
  stateMock.setters = []
  stateMock.index = 0
  stateMock.nextId = 1
  stateMock.refs = []
}

function renderBmr(form = initialValues, result: unknown = null) {
  resetState([form, result])
  const onClose = vi.fn()
  const supabase = { marker: 'supabase-client' }
  const tree = BmrModal({ supabase, session: { user: { id: 'client-1' } }, initialValues, onClose }) as ReactElement<ElementProps>
  return { tree, shell: tree.props, onClose, supabase }
}

function findElements(node: ReactNode, type: string): ReactElement<ElementProps>[] {
  if (Array.isArray(node)) return node.flatMap(child => findElements(child, type))
  if (!isValidElement(node)) return []
  const element = node as ReactElement<ElementProps>
  const current = element.type === type ? [element] : []
  return [...current, ...findElements(element.props.children, type)]
}

function textContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textContent).join('')
  if (!isValidElement(node)) return ''
  return textContent((node as ReactElement<ElementProps>).props.children)
}

beforeEach(() => {
  vi.clearAllMocks()
  updateProfileMock.mockReturnValue(new Promise(() => undefined))
})

describe('BmrModal accessibility and business contract', () => {
  it('uses the accessible shell with linked title, description and weight focus', () => {
    const { tree, shell, onClose } = renderBmr()

    expect(tree.type).toBe(DashboardMeasurementDialogShell)
    expect(shell).toMatchObject({
      title: 'CALCULATEUR BMR',
      description: 'Mifflin-St Jeor · Katch-McArdle · Harris-Benedict',
      onClose,
    })
    expect(shell.initialFocusRef).toBe(stateMock.refs[0])
  })

  it('links all numeric labels and exposes selected gender/activity groups', () => {
    const { shell } = renderBmr()
    const inputs = findElements(shell.children, 'input')
    const labels = findElements(shell.children, 'label')
    const groups = findElements(shell.children, 'div').filter(element => element.props.role === 'group')
    const toggleButtons = findElements(shell.children, 'button').filter(button => button.props['aria-pressed'] !== undefined)

    expect(inputs).toHaveLength(4)
    expect(labels).toHaveLength(4)
    labels.forEach((label, index) => expect(label.props.htmlFor).toBe(inputs[index].props.id))
    expect(groups).toHaveLength(2)
    expect(groups[0].props['aria-label']).toBe('Genre')
    expect(groups[1].props['aria-labelledby']).toBeTypeOf('string')
    expect(toggleButtons.filter(button => button.props['aria-pressed'] === true)).toHaveLength(2)
  })

  it('preserves parsing, formulas, payload and the non-awaited persistence call', () => {
    const { shell, supabase } = renderBmr()
    const calculate = findElements(shell.children, 'button').find(button => textContent(button) === 'Calculer mon TDEE')

    const returned = (calculate?.props.onClick as () => unknown)()

    expect(returned).toBeUndefined()
    expect(stateMock.setters[1]).toHaveBeenCalledWith({
      mifflin: 1780,
      harris: 1854,
      katch: 1752,
      tdee: 2716,
      fatLoss: 2173,
      massGain: 2988,
      protein: 176,
      fat: 75,
      carbs: 333,
    })
    expect(updateProfileMock).toHaveBeenCalledWith('client-1', {
      current_weight: 80,
      height: 180,
      gender: 'male',
      activity_level: 'moderate',
      body_fat_pct: 20,
      calorie_goal: 2716,
    }, supabase)
  })

  it('preserves the historical required-field validation', () => {
    const { shell } = renderBmr({ ...initialValues, weight: '' })
    const calculate = findElements(shell.children, 'button').find(button => textContent(button) === 'Calculer mon TDEE')

    ;(calculate?.props.onClick as () => void)()

    expect(stateMock.setters[1]).not.toHaveBeenCalled()
    expect(updateProfileMock).not.toHaveBeenCalled()
  })

  it('announces the calculated result without changing its content', () => {
    const result = { mifflin: 1780, harris: 1854, katch: 1752, tdee: 2716, fatLoss: 2173, massGain: 2988, protein: 176, fat: 75, carbs: 333 }
    const { shell } = renderBmr(initialValues, result)
    const status = findElements(shell.children, 'div').find(element => element.props.role === 'status')

    expect(status?.props).toMatchObject({ 'aria-live': 'polite', 'aria-atomic': 'true' })
    expect(textContent(status)).toContain('2716')
  })

  it('keeps Objective untouched and uses a native BMR trigger', () => {
    const profile = readFileSync('app/components/tabs/ProfileTab.tsx', 'utf8')
    const objective = readFileSync('app/components/modals/ObjectiveModal.tsx', 'utf8')

    expect(profile).toContain('<button type="button" style={{ ...rowStyle, width: \'100%\', background: \'transparent\', border: \'none\', textAlign: \'left\', transform: \'none\' }} onClick={() => setModal(\'bmr\')}>')
    expect(profile).not.toContain('<div style={rowStyle} onClick={() => setModal(\'bmr\')}>')
    expect(objective).not.toContain('DashboardMeasurementDialogShell')
  })
})
