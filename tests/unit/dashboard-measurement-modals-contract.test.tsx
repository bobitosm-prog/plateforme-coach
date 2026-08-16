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

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useId() {
      return `:measurement-form-test-${stateMock.nextId++}:`
    },
    useRef<T>(initialValue: T) {
      const ref = { current: initialValue }
      stateMock.refs.push(ref)
      return ref
    },
    useState<T>(initialValue: T) {
      const index = stateMock.index++
      const setter = vi.fn()
      stateMock.setters[index] = setter
      return [stateMock.values[index] ?? initialValue, setter]
    },
  }
})

vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: () => (key: string) => ({
    'measureModal.title': 'MES MENSURATIONS',
    'measureModal.date': 'Date',
    'measureModal.cancel': 'Annuler',
    'measureModal.save': 'Sauvegarder',
    'measureModal.history': 'Historique',
    'measureModal.latest': 'Dernière',
    'tab.measureLabels.waist': 'Taille',
    'tab.measureLabels.hips': 'Hanches',
    'tab.measureLabels.chest': 'Poitrine',
    'tab.measureLabels.arms': 'Bras',
    'tab.measureLabels.thighs': 'Cuisses',
    'tab.graphLabels.waist': 'Taille',
    'tab.graphLabels.hips': 'Hanches',
    'tab.graphLabels.chest': 'Poitrine',
    'tab.graphLabels.arms': 'Bras',
    'tab.graphLabels.thighs': 'Cuisses',
  })[key] ?? key,
}))

vi.mock('../../app/components/modals/DashboardMeasurementDialogShell', () => ({
  default: shellMock,
}))

import MeasureModal from '../../app/components/modals/MeasureModal'
import WeightModal from '../../app/components/modals/WeightModal'

type ElementProps = Record<string, unknown> & { children?: ReactNode }

function findElements(node: ReactNode, type: string): ReactElement<ElementProps>[] {
  if (Array.isArray(node)) return node.flatMap(child => findElements(child, type))
  if (!isValidElement(node)) return []
  const element = node as ReactElement<ElementProps>
  const current = element.type === type ? [element] : []
  const children = element.props.children
  const nested = Array.isArray(children)
    ? children.flatMap(child => findElements(child, type))
    : findElements(children, type)
  return [...current, ...nested]
}

function resetHooks(values: unknown[]) {
  stateMock.values = values
  stateMock.setters = []
  stateMock.index = 0
  stateMock.nextId = 1
  stateMock.refs = []
}

function renderWeight(weight: string, date = '2026-08-16') {
  resetHooks([weight, date])
  const onSave = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  const tree = WeightModal({ currentWeight: 80, onSave, onClose }) as ReactElement<ElementProps>
  return { tree, shell: tree.props, onSave, onClose }
}

function renderMeasure(form: Record<string, string>, date = '2026-08-16') {
  resetHooks([form, date])
  const onSave = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  const tree = MeasureModal({ measurements: [], onSave, onClose }) as ReactElement<ElementProps>
  return { tree, shell: tree.props, onSave, onClose }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('dashboard measurement modal contracts', () => {
  it('connects Weight labels and requests initial focus on the weight field', () => {
    const { shell } = renderWeight('')
    const inputs = findElements(shell.children, 'input')
    const labels = findElements(shell.children, 'label')

    expect(shell.title).toBe('ENREGISTRER MON POIDS')
    expect(labels).toHaveLength(2)
    expect(labels[0].props.htmlFor).toBe(inputs[0].props.id)
    expect(labels[1].props.htmlFor).toBe(inputs[1].props.id)
    expect(shell.initialFocusRef).toBe(inputs[0].props.ref)
    expect(shell.onClose).toBeTypeOf('function')
  })

  it('preserves Weight validation, parsing, date and close callbacks', async () => {
    const empty = renderWeight('')
    const emptyButtons = findElements(empty.shell.children, 'button')
    expect(emptyButtons[1].props.disabled).toBe(true)
    await (emptyButtons[1].props.onClick as () => Promise<void>)()
    expect(empty.onSave).not.toHaveBeenCalled()

    const complete = renderWeight('82.5')
    const buttons = findElements(complete.shell.children, 'button')
    expect(buttons[1].props.disabled).toBe(false)
    await (buttons[1].props.onClick as () => Promise<void>)()
    expect(complete.onSave).toHaveBeenCalledWith(82.5, '2026-08-16')
    ;(buttons[0].props.onClick as () => void)()
    expect(complete.onClose).toHaveBeenCalledOnce()
  })

  it('connects every Measure label and focuses the first logical field', () => {
    const { shell } = renderMeasure({ waist: '', hips: '', chest: '', arms: '', thighs: '' })
    const inputs = findElements(shell.children, 'input')
    const labels = findElements(shell.children, 'label')

    expect(shell.title).toBe('MES MENSURATIONS')
    expect(inputs).toHaveLength(6)
    expect(labels).toHaveLength(6)
    labels.forEach((label, index) => expect(label.props.htmlFor).toBe(inputs[index].props.id))
    expect(shell.initialFocusRef).toBe(inputs[0].props.ref)
  })

  it('preserves Measure validation, selective parsing, date and close callbacks', async () => {
    const empty = renderMeasure({ waist: '', hips: '', chest: '', arms: '', thighs: '' })
    const emptyButtons = findElements(empty.shell.children, 'button')
    expect(emptyButtons[1].props.disabled).toBe(true)
    await (emptyButtons[1].props.onClick as () => Promise<void>)()
    expect(empty.onSave).not.toHaveBeenCalled()

    const complete = renderMeasure({ waist: '81.5', hips: '', chest: '99', arms: '', thighs: '' })
    const buttons = findElements(complete.shell.children, 'button')
    expect(buttons[1].props.disabled).toBe(false)
    await (buttons[1].props.onClick as () => Promise<void>)()
    expect(complete.onSave).toHaveBeenCalledWith({ waist: 81.5, chest: 99 }, '2026-08-16')
    ;(buttons[0].props.onClick as () => void)()
    expect(complete.onClose).toHaveBeenCalledOnce()
  })

  it('keeps Dashboard wiring and the excluded modal families unchanged', () => {
    const dashboard = readFileSync('app/components/dashboard/DashboardClientIsland.tsx', 'utf8')
    const bmr = readFileSync('app/components/modals/BmrModal.tsx', 'utf8')
    const objective = readFileSync('app/components/modals/ObjectiveModal.tsx', 'utf8')
    const progress = readFileSync('app/components/tabs/progression/ProgressEntryOverlays.tsx', 'utf8')

    expect(dashboard).toContain('<WeightModal currentWeight={h.currentWeight} onSave={h.saveWeight} onClose={() => h.setModal(null)} />')
    expect(dashboard).toContain('<MeasureModal measurements={h.measurements} onSave={h.saveMeasurements} onClose={() => h.setModal(null)} />')
    for (const source of [bmr, objective]) expect(source).not.toContain('DashboardMeasurementDialogShell')
    expect(progress).toContain('DashboardMeasurementDialogShell')
  })
})
