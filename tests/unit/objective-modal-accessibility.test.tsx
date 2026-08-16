import { isValidElement, type ReactElement, type ReactNode } from 'react'
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
    useId: () => `:objective-test-${stateMock.nextId++}:`,
    useMemo: <T,>(factory: () => T) => factory(),
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

vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: () => (key: string, values?: { step?: number; total?: number }) => (
    key === 'stepLabel' ? `Étape ${values?.step} sur ${values?.total}` : key
  ),
}))
vi.mock('../../lib/profile-service', () => ({ updateProfile: updateProfileMock }))
vi.mock('../../app/components/modals/DashboardObjectiveWizardDialogShell', () => ({ default: shellMock }))

import DashboardObjectiveWizardDialogShell from '../../app/components/modals/DashboardObjectiveWizardDialogShell'
import ObjectiveModal from '../../app/components/modals/ObjectiveModal'
import GoalsSection from '../../app/components/tabs/profile/GoalsSection'

type ElementProps = Record<string, unknown> & { children?: ReactNode }

const profile = {
  objective: 'maintain',
  current_weight: 80,
  target_weight: 75,
  height: 180,
  gender: 'male',
  activity_level: 'moderate',
}

function resetState(values: unknown[]) {
  stateMock.values = values
  stateMock.setters = []
  stateMock.index = 0
  stateMock.nextId = 1
  stateMock.refs = []
}

function renderObjective(values: unknown[]) {
  resetState(values)
  const events: string[] = []
  const onSaved = vi.fn(() => events.push('saved'))
  const onClose = vi.fn(() => events.push('closed'))
  const supabase = { marker: 'supabase-client' }
  const tree = ObjectiveModal({
    profile,
    currentWeight: 80,
    goalWeight: 75,
    supabase,
    session: { user: { id: 'client-1' } },
    onClose,
    onSaved,
  }) as ReactElement<ElementProps>
  return { tree, shell: tree.props, events, onSaved, onClose, supabase }
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
  updateProfileMock.mockResolvedValue({ error: null })
})

describe('ObjectiveModal accessibility and business contract', () => {
  it('uses the dedicated shell and exposes objective choices as one exclusive group', () => {
    const { tree, shell } = renderObjective([1, 'maintain', '80', '75', 'moderate', false, '', null])
    const groups = findElements(shell.children, 'div').filter(element => element.props.role === 'group')
    const choices = findElements(shell.children, 'button').filter(element => element.props['aria-pressed'] !== undefined)

    expect(tree.type).toBe(DashboardObjectiveWizardDialogShell)
    expect(shell).toMatchObject({ step: 1, totalSteps: 4, title: 'step1Title', saving: false })
    expect(groups).toHaveLength(1)
    expect(choices).toHaveLength(3)
    expect(choices.filter(choice => choice.props['aria-pressed'] === true)).toHaveLength(1)
    expect(findElements(shell.children, 'span').some(span => span.props['aria-hidden'] === 'true')).toBe(true)
  })

  it('links weight labels and announces/focuses the first invalid field', () => {
    const { shell } = renderObjective([2, 'maintain', '', '75', 'moderate', false, '', null])
    const inputs = findElements(shell.children, 'input')
    const labels = findElements(shell.children, 'label')
    const next = findElements(shell.children, 'button').find(button => textContent(button) === 'next')
    const currentWeight = { focus: vi.fn() }
    stateMock.refs[0].current = currentWeight

    ;(next?.props.onClick as () => void)()

    expect(labels[0].props.htmlFor).toBe(inputs[0].props.id)
    expect(labels[1].props.htmlFor).toBe(inputs[1].props.id)
    expect(stateMock.setters[6]).toHaveBeenCalledWith('validation.fillBoth')
    expect(stateMock.setters[7]).toHaveBeenCalledWith('weight')
    expect(currentWeight.focus).toHaveBeenCalledOnce()

    const invalid = renderObjective([2, 'maintain', '', '75', 'moderate', false, 'validation.fillBoth', 'weight'])
    const invalidInputs = findElements(invalid.shell.children, 'input')
    const alert = findElements(invalid.shell.children, 'div').find(element => element.props.role === 'alert')
    expect(invalidInputs[0].props['aria-invalid']).toBe(true)
    expect(invalidInputs[0].props['aria-describedby']).toBe(alert?.props.id)
  })

  it('exposes activity choices as one exclusive group', () => {
    const { shell } = renderObjective([3, 'maintain', '80', '75', 'moderate', false, '', null])
    const group = findElements(shell.children, 'div').find(element => element.props.role === 'group')
    const choices = findElements(shell.children, 'button').filter(element => element.props['aria-pressed'] !== undefined)

    expect(group?.props['aria-label']).toBe('step3Title')
    expect(choices).toHaveLength(5)
    expect(choices.filter(choice => choice.props['aria-pressed'] === true)).toHaveLength(1)
  })

  it('preserves the exact persistence payload and success callback order', async () => {
    const { shell, events, onSaved, onClose, supabase } = renderObjective([4, 'cut', '80', '70', 'moderate', false, '', null])
    const confirm = findElements(shell.children, 'button').find(button => textContent(button) === 'confirm')

    await (confirm?.props.onClick as () => Promise<void>)()

    expect(updateProfileMock).toHaveBeenCalledWith('client-1', {
      objective: 'cut',
      target_weight: 70,
      activity_level: 'moderate',
      calorie_goal: 2298,
      protein_goal: 176,
      carbs_goal: 255,
      fat_goal: 64,
    }, supabase)
    expect(events).toEqual(['saved', 'closed'])
    expect(onSaved).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
    expect(stateMock.setters[5]).toHaveBeenNthCalledWith(1, true)
    expect(stateMock.setters[5]).toHaveBeenNthCalledWith(2, false)
  })

  it('keeps the wizard open on persistence error and preserves closing controls while saving', async () => {
    updateProfileMock.mockResolvedValueOnce({ error: { message: 'failed' } })
    const failed = renderObjective([4, 'maintain', '80', '75', 'moderate', false, '', null])
    const confirm = findElements(failed.shell.children, 'button').find(button => textContent(button) === 'confirm')
    await (confirm?.props.onClick as () => Promise<void>)()
    expect(failed.onSaved).not.toHaveBeenCalled()
    expect(failed.onClose).not.toHaveBeenCalled()

    const saving = renderObjective([4, 'maintain', '80', '75', 'moderate', true, '', null])
    const cancel = findElements(saving.shell.children, 'button').find(button => textContent(button) === 'cancel')
    expect(saving.shell.saving).toBe(true)
    expect(cancel?.props.disabled).toBeUndefined()
    expect(saving.shell.onClose).toBe(saving.onClose)
  })
})

describe('GoalsSection objective triggers', () => {
  it('uses three native buttons that preserve the objective callback', () => {
    resetState([])
    const setModal = vi.fn()
    const tree = GoalsSection({
      supabase: {},
      session: { user: { id: 'client-1' } },
      profile,
      goalWeight: 75,
      setModal,
      fetchAll: vi.fn(),
      onBack: vi.fn(),
    }) as ReactElement<ElementProps>
    const objectiveTriggers = findElements(tree, 'button').filter(button => {
      const text = textContent(button)
      return text.includes('fields.objective') || text.includes('fields.goalWeight') || text.includes('fields.activityLevel')
    })

    expect(objectiveTriggers).toHaveLength(3)
    objectiveTriggers.forEach(trigger => {
      expect(trigger.props.type).toBe('button')
      ;(trigger.props.onClick as () => void)()
    })
    expect(setModal).toHaveBeenCalledTimes(3)
    expect(setModal).toHaveBeenNthCalledWith(1, 'objective')
    expect(setModal).toHaveBeenNthCalledWith(2, 'objective')
    expect(setModal).toHaveBeenNthCalledWith(3, 'objective')
  })
})
