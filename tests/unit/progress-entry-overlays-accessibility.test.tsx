import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const hookMock = vi.hoisted(() => ({ nextId: 1, refs: [] as Array<{ current: unknown }> }))
const shellMock = vi.hoisted(() => vi.fn(() => null))

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useId: () => `:progress-overlay-test-${hookMock.nextId++}:`,
    useRef: <T,>(initialValue: T) => {
      const ref = { current: initialValue }
      hookMock.refs.push(ref)
      return ref
    },
  }
})

vi.mock('../../app/components/ui/RailOverlay', () => ({
  RailOverlay: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('../../app/components/modals/DashboardMeasurementDialogShell', () => ({
  default: shellMock,
}))

import DashboardMeasurementDialogShell from '../../app/components/modals/DashboardMeasurementDialogShell'
import { ProgressEntryOverlays } from '../../app/components/tabs/progression/ProgressEntryOverlays'

type ElementProps = Record<string, unknown> & { children?: ReactNode }

const t = (key: string, values?: Record<string, unknown>) => values?.weight === undefined ? key : `${key}:${values.weight}`

function commonProps() {
  return {
    showWeight: false,
    weight: '',
    weightDate: '2026-08-16',
    previousWeight: 0,
    savingWeight: false,
    onWeightChange: vi.fn(),
    onWeightDateChange: vi.fn(),
    onCloseWeight: vi.fn(),
    onSaveWeight: vi.fn(),
    showMeasure: false,
    measureForm: { waist: '', hips: '', chest: '', arms: '', thighs: '' },
    measureDate: '2026-08-16',
    savingMeasure: false,
    onMeasureChange: vi.fn(),
    onMeasureDateChange: vi.fn(),
    onCloseMeasure: vi.fn(),
    onSaveMeasure: vi.fn(),
    t,
  }
}

function renderProps(overrides: Partial<ReturnType<typeof commonProps>>) {
  hookMock.nextId = 1
  hookMock.refs = []
  const props = { ...commonProps(), ...overrides }
  const tree = ProgressEntryOverlays(props) as ReactElement<ElementProps>
  return { props, tree }
}

function findElements(node: ReactNode, type: unknown): ReactElement<ElementProps>[] {
  if (Array.isArray(node)) return node.flatMap(child => findElements(child, type))
  if (!isValidElement(node)) return []
  const element = node as ReactElement<ElementProps>
  const current = element.type === type ? [element] : []
  return [...current, ...findElements(element.props.children, type)]
}

function shellFrom(tree: ReactElement<ElementProps>) {
  const shells = findElements(tree, DashboardMeasurementDialogShell)
  expect(shells).toHaveLength(1)
  return shells[0]
}

function findFunctionElements(node: ReactNode, name: string): ReactElement<ElementProps>[] {
  if (Array.isArray(node)) return node.flatMap(child => findFunctionElements(child, name))
  if (!isValidElement(node)) return []
  const element = node as ReactElement<ElementProps>
  const current = typeof element.type === 'function' && element.type.name === name ? [element] : []
  return [...current, ...findFunctionElements(element.props.children, name)]
}

beforeEach(() => vi.clearAllMocks())

describe('ProgressEntryOverlays accessible measurement dialogs', () => {
  it('keeps the controlled Weight callbacks, fields and async contract', () => {
    const rendered = renderProps({ showWeight: true, weight: '80.5' })
    const shell = shellFrom(rendered.tree)
    const inputs = findElements(shell.props.children, 'input')
    const labels = findElements(shell.props.children, 'label')
    const dateField = findFunctionElements(shell.props.children, 'DateField')[0]
    const buttons = findElements(shell.props.children, 'button')

    expect(shell.props).toMatchObject({
      title: 'ENREGISTRER MON POIDS',
      onClose: rendered.props.onCloseWeight,
      headerVariant: 'progress',
    })
    expect(labels[0].props.htmlFor).toBe(inputs[0].props.id)
    expect(dateField.props.id).toBe('progress-weight-date-:progress-overlay-test-1:')
    expect(shell.props.initialFocusRef).toBe(hookMock.refs[0])
    expect(inputs[0].props).toMatchObject({ inputMode: 'decimal', min: '0', step: '0.1', value: '80.5' })

    ;(inputs[0].props.onChange as (event: { target: { value: string } }) => void)({ target: { value: '81.2' } })
    ;(dateField.props.onChange as (value: string) => void)('2026-08-17')
    ;(buttons[0].props.onClick as () => void)()

    expect(rendered.props.onWeightChange).toHaveBeenCalledWith('81.2')
    expect(rendered.props.onWeightDateChange).toHaveBeenCalledWith('2026-08-17')
    expect(rendered.props.onSaveWeight).toHaveBeenCalledOnce()
    expect(buttons[0].props.disabled).toBe(false)
  })

  it('preserves the Weight saving state and explicit-zero previous value', () => {
    const shell = shellFrom(renderProps({ showWeight: true, weight: '80', savingWeight: true }).tree)
    const button = findElements(shell.props.children, 'button')[0]

    expect(button.props.disabled).toBe(true)
    expect(button.props.children).toBe('Enregistrement...')
    expect(shell.props.children).toContainEqual(expect.objectContaining({ type: 'p' }))
  })

  it('connects every Measure label, focuses waist and preserves controlled callbacks', () => {
    const rendered = renderProps({ showMeasure: true, measureForm: { waist: '81', hips: '', chest: '', arms: '', thighs: '' } })
    const shell = shellFrom(rendered.tree)
    const inputs = findElements(shell.props.children, 'input')
    const labels = findElements(shell.props.children, 'label')
    const dateField = findFunctionElements(shell.props.children, 'DateField')[0]
    const button = findElements(shell.props.children, 'button')[0]

    expect(shell.props).toMatchObject({
      title: 'tab.myMeasurements',
      onClose: rendered.props.onCloseMeasure,
      headerVariant: 'progress',
    })
    expect(inputs).toHaveLength(5)
    expect(labels).toHaveLength(5)
    labels.forEach((label, index) => expect(label.props.htmlFor).toBe(inputs[index].props.id))
    expect(dateField.props.id).toBe('progress-measure-date-:progress-overlay-test-1:')
    expect(shell.props.initialFocusRef).toBe(hookMock.refs[1])

    ;(inputs[0].props.onChange as (event: { target: { value: string } }) => void)({ target: { value: '82' } })
    ;(dateField.props.onChange as (value: string) => void)('2026-08-18')
    ;(button.props.onClick as () => void)()

    expect(rendered.props.onMeasureChange).toHaveBeenCalledWith('waist', '82')
    expect(rendered.props.onMeasureDateChange).toHaveBeenCalledWith('2026-08-18')
    expect(rendered.props.onSaveMeasure).toHaveBeenCalledOnce()
  })

  it('preserves the Measure empty and saving disabled states', () => {
    const empty = shellFrom(renderProps({ showMeasure: true }).tree)
    expect(findElements(empty.props.children, 'button')[0].props.disabled).toBe(true)

    const saving = shellFrom(renderProps({ showMeasure: true, measureForm: { waist: '81', hips: '', chest: '', arms: '', thighs: '' }, savingMeasure: true }).tree)
    const savingButton = findElements(saving.props.children, 'button')[0]
    expect(savingButton.props.disabled).toBe(true)
    expect(savingButton.props.children).toBe('Enregistrement...')
  })

  it('mounts only the historically topmost Measure trap if both flags are true', () => {
    const { tree } = renderProps({ showWeight: true, showMeasure: true })
    const shells = findElements(tree, DashboardMeasurementDialogShell)

    expect(shells).toHaveLength(1)
    expect(shells[0].props.title).toBe('tab.myMeasurements')
  })

  it('keeps RailOverlay and the Progress persistence/parsing contract unchanged', () => {
    const overlays = readFileSync('app/components/tabs/progression/ProgressEntryOverlays.tsx', 'utf8')
    const controller = readFileSync('app/components/tabs/progression/useProgressTabController.ts', 'utf8')
    const saveWeight = controller.slice(controller.indexOf('async function saveWeight'), controller.indexOf('async function saveMeasure'))

    expect(overlays.match(/<RailOverlay>/g)).toHaveLength(2)
    expect(saveWeight).toContain('const poids = Number.parseFloat(weightVal)')
    expect(saveWeight).toContain("from('weight_logs').upsert({ user_id: userId, date: weightDate, poids }, { onConflict: 'user_id,date' })")
    expect(saveWeight).not.toContain('current_weight')
    expect(controller).toContain("for (const key of ['waist', 'hips', 'chest'] as const) if (measureForm[key]) payload[key] = Number(measureForm[key])")
    expect(controller).toContain('payload.left_arm = Number(measureForm.arms); payload.right_arm = Number(measureForm.arms)')
    expect(controller).toContain('payload.left_thigh = Number(measureForm.thighs); payload.right_thigh = Number(measureForm.thighs)')
    expect(controller).toContain("from('body_measurements').insert(payload)")
  })
})
