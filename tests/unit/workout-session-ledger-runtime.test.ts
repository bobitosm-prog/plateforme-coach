// @vitest-environment jsdom
import * as React from 'react'
import { render, screen, within, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/fr.json'
const m = vi.hoisted(() => ({ history: vi.fn(), db: {} as any }))
vi.mock('@supabase/ssr', () => ({ createBrowserClient: () => m.db }))
vi.mock('@/lib/training/last-exercise-session', () => ({ loadLastExerciseSession: m.history }))
vi.mock('@/app/hooks/useTrainingFollowup', () => ({ useTrainingFollowup: () => ({ preferences: { enabled: false } }) }))
vi.mock('@/lib/timer-audio', () => ({
 initAudio: vi.fn(), finishRestPeriodSounds: vi.fn(), playWarningTick: vi.fn(), vibrateDevice: vi.fn(),
 scheduleRestPeriodSounds: () => [], cancelScheduledSounds: vi.fn(),
 scheduleNativeRestNotification: vi.fn(), cancelNativeRestNotification: vi.fn(),
}))
import WorkoutSession from '@/app/components/WorkoutSession'
import { createActiveWorkoutDraft, type ActiveWorkoutDraft } from '@/lib/training/active-workout-draft'
const draft = (source: ActiveWorkoutDraft['programSource'] = 'personal') => createActiveWorkoutDraft({
 userId: 'synthetic-owner', programId: 'synthetic-program', programSource: source,
 sessionKey: 'synthetic-session', sessionName: 'Ma séance',
 exercises: [{ name: 'Curl', sets: 2, reps: 10 }, { name: 'Squat Barre', sets: 2, reps: 10 }],
})
function mount(value = draft(), finish = vi.fn(async () => ({}))) {
 const changed = vi.fn()
 const close = vi.fn()
 const view = render(React.createElement(NextIntlClientProvider, { locale: 'fr', messages, timeZone: 'Europe/Zurich',
  children: React.createElement(WorkoutSession, {
   draft: value, onDraftChange: changed, onFinish: finish, onClose: close,
   onNavigateHome: vi.fn(), onNavigateProgress: vi.fn(),
  }),
 }))
 return { ...view, changed, finish, close }
}
beforeEach(() => {
 vi.stubGlobal('React', React)
 localStorage.clear()
 m.history.mockReset().mockResolvedValue([])
 const query: any = { select: () => query, is: () => query, eq: () => query, order: () => query, limit: async () => ({ data: [], error: null }) }
 m.db = { auth: { getUser: async () => ({ data: { user: { id: 'synthetic-owner' } } }) }, from: () => query }
 vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
 vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })
it.each(['coach', 'personal', 'none'] as const)('shows the actual %s source and both exercises immediately', async source => {
 mount(draft(source))
 expect(screen.getByRole('heading', { name: 'Ma séance' })).toBeTruthy()
 expect(screen.getByText(source === 'coach' ? messages.training_tab.v2.coachPlan : source === 'personal' ? messages.training_tab.v2.personalProgram : messages.training_tab.ws.freeSession)).toBeTruthy()
 expect(screen.getByRole('group', { name: 'Curl' })).toBeTruthy()
 expect(screen.getByRole('group', { name: 'Squat Barre' })).toBeTruthy()
 await waitFor(() => expect(m.history).toHaveBeenCalledTimes(2))
})
it('validates an exercise out of order then returns to the skipped exercise without losing its entries', async () => {
 const { changed } = mount()
 await waitFor(() => expect(m.history).toHaveBeenCalledTimes(2))
 const curl = within(screen.getByRole('group', { name: 'Curl' }))
 const squat = within(screen.getByRole('group', { name: 'Squat Barre' }))
 const enter = (group: ReturnType<typeof within>, weight: string) => {
  const [load, reps] = group.getAllByRole('textbox')
  fireEvent.focus(load); fireEvent.change(load, { target: { value: weight } }); fireEvent.blur(load)
  fireEvent.focus(reps); fireEvent.change(reps, { target: { value: '10' } })
 }
 enter(curl, '12')
 enter(squat, '35')
 const validate = (group: ReturnType<typeof within>) => {
  const button = group.getAllByRole('button')[0] as HTMLButtonElement
  expect(button.disabled).toBe(false); fireEvent.click(button)
 }
 validate(squat)
 expect(squat.getAllByRole('button')[0].getAttribute('aria-pressed')).toBe('true')
 expect((curl.getAllByRole('textbox')[0] as HTMLInputElement).value).toBe('12')
 validate(curl)
 expect(curl.getAllByRole('button')[0].getAttribute('aria-pressed')).toBe('true')
 const saved = changed.mock.calls.at(-1)?.[0] as ActiveWorkoutDraft
 expect(saved.exercises.map(e => e.sets[0].done)).toEqual([true, true])
 expect(saved.exercises.map(e => e.sets[0].weight)).toEqual([12, 35])
})
it('keeps a history failure separate from no previous session and permits retry', async () => {
 m.history.mockImplementation(async (_db, _user, _id, name) => { if (name === 'Curl') throw new Error('offline'); return [] })
 mount()
 const curl = within(screen.getByRole('group', { name: 'Curl' }))
 const squat = within(screen.getByRole('group', { name: 'Squat Barre' }))
 expect(await curl.findByText(messages.previousWorkout.error)).toBeTruthy()
 expect(squat.getByText(messages.previousWorkout.empty)).toBeTruthy()
 expect(curl.queryByText(messages.previousWorkout.empty)).toBeNull()
 m.history.mockResolvedValue([{ set_number: 1, weight: 12, reps: 10, load_mode: 'legacy' }])
 fireEvent.click(curl.getByRole('button', { name: messages.previousWorkout.retry }))
 expect(await curl.findByText('12 × 10')).toBeTruthy()
 expect(curl.queryByText(messages.previousWorkout.error)).toBeNull()
})
it('restores an elapsed rest timer inline and dismisses it without hiding the exercises', async () => {
 const value = draft(); value.restTimerEndAt = new Date(Date.now() - 1000).toISOString()
 mount(value)
 expect(await screen.findByText(messages.training_tab.v2.restFinished)).toBeTruthy()
 expect(screen.queryByRole('dialog')).toBeNull()
 fireEvent.click(screen.getByRole('button', { name: messages.training_tab.v2.dismissRestFinished }))
 expect(screen.queryByText(messages.training_tab.v2.restFinished)).toBeNull()
 expect(screen.getByRole('group', { name: 'Curl' })).toBeTruthy()
})
it('retries a failed save with the same completed sets', async () => {
 const value = draft(); value.status = 'save_error'
 Object.assign(value.exercises[0].sets[0], { weight: 12, weightRaw: '12', reps: 10, done: true })
 const finish = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({})
 mount(value, finish)
 fireEvent.click(screen.getByRole('button', { name: messages.training_tab.ws.done.retry }))
 await waitFor(() => expect(finish).toHaveBeenCalledTimes(1))
 fireEvent.click(await screen.findByRole('button', { name: messages.training_tab.ws.done.retry }))
 await waitFor(() => expect(finish).toHaveBeenCalledTimes(2))
 expect(finish.mock.calls[0][0].exercises).toEqual(finish.mock.calls[1][0].exercises)
 expect(finish.mock.calls[0][1].draftId).toBe(finish.mock.calls[1][1].draftId)
 expect(finish.mock.calls[1][0].exercises[0].sets[0].weight).toBe(12)
})
it('keeps both biset members visible and validates A1, A2 then A1 again', async () => {
 const value = createActiveWorkoutDraft({
  userId: 'synthetic-owner', programId: 'synthetic-program', programSource: 'coach',
  sessionKey: 'biset-session', sessionName: 'Biset',
  exercises: [
   { name: 'Curl', sets: 2, reps: 10, technique: 'superset', technique_details: 'Squat Barre' },
   { name: 'Squat Barre', sets: 2, reps: 10 },
  ],
 })
 const { changed } = mount(value)
 await waitFor(() => expect(m.history).toHaveBeenCalledTimes(2))
 const a = within(screen.getByRole('group', { name: 'Curl' }))
 const b = within(screen.getByRole('group', { name: 'Squat Barre' }))
 const complete = (group: ReturnType<typeof within>, index: number, load: string) => {
  const inputs = group.getAllByRole('textbox')
  fireEvent.focus(inputs[index * 2])
  fireEvent.change(inputs[index * 2], { target: { value: load } })
  fireEvent.blur(inputs[index * 2])
  fireEvent.focus(inputs[index * 2 + 1])
  fireEvent.change(inputs[index * 2 + 1], { target: { value: '10' } })
  const button = group.getAllByRole('button')[index] as HTMLButtonElement
  expect(button.disabled).toBe(false)
  fireEvent.click(button)
  expect(button.getAttribute('aria-pressed')).toBe('true')
 }
 complete(a, 0, '12')
 complete(b, 0, '35')
 complete(a, 1, '12')
 const saved = changed.mock.calls.at(-1)?.[0] as ActiveWorkoutDraft
 expect(saved.exercises.map(e => e.sets.map(s => s.done))).toEqual([[true, true], [true, false]])
})
it('places rest after the validated set, keeps it there on navigation, and restores its anchor', async () => {
 const value=draft();const {changed,unmount}=mount(value)
 const group=screen.getByRole('group',{name:'Squat Barre'})
 const inputs=within(group).getAllByRole('textbox')
 fireEvent.change(inputs[0],{target:{value:'35'}})
 fireEvent.change(inputs[1],{target:{value:'10'}})
 fireEvent.click(within(group).getAllByRole('button')[0])
 const timer=within(group).getByRole('region',{name:messages.training_tab.v2.restTimer})
 expect(timer.parentElement?.previousElementSibling?.getAttribute('data-done')).toBe('true')
 expect(screen.getAllByRole('region',{name:messages.training_tab.v2.restTimer})).toHaveLength(1)
 fireEvent.focus(within(screen.getByRole('group',{name:'Curl'})).getAllByRole('textbox')[0])
 expect(group.contains(timer)).toBe(true)
 const latest=changed.mock.calls.at(-1)![0] as ActiveWorkoutDraft
 expect(latest.restTimerSetId).toBe(value.exercises[1].sets[0].id)
 unmount();mount(latest)
 expect(within(screen.getByRole('group',{name:'Squat Barre'})).getByRole('region',{name:messages.training_tab.v2.restTimer})).toBeTruthy()
})
it('places finish after the last exercise and preserves the confirmation step', () => {
 mount()
 const finish=screen.getByRole('button',{name:messages.training_tab.ws.finish})
 expect(finish.closest('header')).toBeNull()
 const last=screen.getByRole('group',{name:'Squat Barre'})
 expect(last.compareDocumentPosition(finish) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 fireEvent.click(finish)
 expect(screen.getByText(messages.training_tab.ws.endModal.question)).toBeTruthy()
})

it('asks before leaving via back and preserves entered sets when continuing', async () => {
 const {close,finish}=mount()
 const group=within(screen.getByRole('group',{name:'Curl'}))
 const [load,reps]=group.getAllByRole('textbox')
 fireEvent.change(load,{target:{value:'12'}})
 fireEvent.change(reps,{target:{value:'10'}})
 fireEvent.click(group.getAllByRole('button')[0])
 fireEvent.click(screen.getByRole('button',{name:messages.training_tab.ws.back}))
 expect(close).not.toHaveBeenCalled()
 expect(finish).not.toHaveBeenCalled()
 expect(screen.getByText(messages.training_tab.ws.endModal.question)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:messages.training_tab.ws.endModal.continue}))
 expect((group.getAllByRole('textbox')[0] as HTMLInputElement).value).toBe('12')
 expect(group.getAllByRole('button')[0].getAttribute('aria-pressed')).toBe('true')
 fireEvent.click(screen.getByRole('button',{name:messages.training_tab.ws.back}))
 fireEvent.click(screen.getByRole('button',{name:messages.training_tab.ws.endModal.save}))
 await waitFor(()=>expect(finish).toHaveBeenCalledTimes(1))
})
