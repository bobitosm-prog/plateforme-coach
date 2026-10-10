// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, expect, it, vi } from 'vitest'
import fr from '../../messages/fr.json'
import WatchReadinessIndicator from '../../app/components/home-v2/WatchReadinessIndicator'
import WatchWorkoutControls from '../../app/components/training-v2/WatchWorkoutControls'
const wrap = (children: React.ReactNode) => React.createElement(NextIntlClientProvider, {locale:'fr',messages:fr,timeZone:'Europe/Zurich',children})
const native = (postMessage: ReturnType<typeof vi.fn>) => { (window as any).webkit = {messageHandlers:{moovxWatchWorkout:{postMessage}}} }
afterEach(() => { cleanup(); delete (window as any).webkit; vi.useRealTimers() })
it('hides the native card on the web', () => {
  render(wrap(React.createElement(WatchReadinessIndicator)))
  expect(screen.queryByLabelText('Apple Watch')).toBeNull()
})
it('checks on Home and on resume without issuing a workout command', async () => {
  const post = vi.fn().mockResolvedValue({enabled:true,status:'ready'}); native(post)
  render(wrap(React.createElement(WatchReadinessIndicator)))
  const indicator = await screen.findByRole('button', {name:'Apple Watch — Watch prête'})
  expect(indicator.style.color).toBe('rgb(101, 207, 139)')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByText('Watch prête')).toBeNull()
  expect(post.mock.calls).toEqual([[{action:'readiness'}]])
  post.mockResolvedValue({enabled:true,status:'unverified'})
  fireEvent(document, new Event('visibilitychange'))
  await screen.findByRole('button', {name:'Apple Watch — Watch : disponibilité non confirmée'})
  expect(indicator.style.color).toBe('rgb(255, 133, 133)')
  expect(screen.queryByText('Watch prête')).toBeNull()
  expect(post.mock.calls.every(([body]) => body.action === 'readiness' && !body.id)).toBe(true)
})
it('enables the preference without starting a workout', async () => {
  const post = vi.fn().mockResolvedValueOnce({enabled:false,status:'off'}).mockResolvedValue({enabled:true,status:'permission'}); native(post)
  render(wrap(React.createElement(WatchReadinessIndicator)))
  fireEvent.click(await screen.findByRole('button', {name:'Apple Watch — Compagnon Watch désactivé'}))
  expect(screen.getByRole('dialog')).toBeTruthy()
  fireEvent.click(await screen.findByRole('button', {name:'Activer le compagnon'}))
  await screen.findByText('Watch : autorisation requise')
  expect(post.mock.calls[1]).toEqual([{action:'configure'}])
  fireEvent.click(screen.getByRole('button', {name:'Fermer'}))
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('retries synchronization after native activation, retaining the same draft ID', async () => {
  vi.useFakeTimers()
  const post = vi.fn().mockResolvedValue({enabled:true,status:'unavailable'}); native(post)
  render(wrap(React.createElement(WatchWorkoutControls,{draftId:'stable-id'})))
  await vi.advanceTimersByTimeAsync(4000)
  expect(post.mock.calls.slice(0,2)).toEqual([[{action:'sync',id:'stable-id'}],[{action:'sync',id:'stable-id'}]])
})

it.each(['ready','unverified'])('does not claim a running workout when reconciliation is busy but readiness is %s', async status => {
 const post = vi.fn().mockImplementation(({action})=>Promise.resolve({enabled:true,status:action==='readiness'?status:'busy'})); native(post)
 render(wrap(React.createElement(WatchWorkoutControls,{draftId:'new-id'})))
 await screen.findByText(fr.watch_workout.unavailable)
 expect(screen.queryByText(fr.watch_workout.busy)).toBeNull()
 expect(post.mock.calls).toEqual([[{action:'sync',id:'new-id'}],[{action:'readiness'}]])
})
it('keeps the warning when the Watch confirms a busy state', async () => {
 const post = vi.fn().mockResolvedValue({enabled:true,status:'busy'}); native(post)
 render(wrap(React.createElement(WatchWorkoutControls,{draftId:'new-id'})))
 await screen.findByText(fr.watch_workout.busy)
 expect(post.mock.calls[1]).toEqual([{action:'readiness'}])
})

it('starts directly without requiring a readiness reply from a sleeping Watch and exposes wake diagnostics', async () => {
 const post = vi.fn().mockResolvedValue({enabled:true,status:'unavailable',diagnostic:'wake_failed:HKErrorDomain:11',phoneBuild:'19',watchBuild:'18'}); native(post)
 render(wrap(React.createElement(WatchWorkoutControls,{draftId:'sleeping-watch'})))
 await screen.findByText('wake_failed:HKErrorDomain:11')
 expect(screen.getByText('Build iPhone : 19 · Watch : 18')).toBeTruthy()
 expect(post.mock.calls).toEqual([[{action:'sync',id:'sleeping-watch'}]])
 fireEvent.click(screen.getByRole('button',{name:fr.watch_workout.retry}))
 await screen.findByText(fr.watch_workout.unavailable)
 expect(post.mock.calls[1]).toEqual([{action:'enable',id:'sleeping-watch'}])
})

it('distinguishes iPhone authorization from Watch authorization', async () => {
 const post = vi.fn().mockResolvedValue({enabled:true,status:'phonePermission'}); native(post)
 render(wrap(React.createElement(WatchWorkoutControls,{draftId:'phone-consent'})))
 await screen.findByText(fr.watch_workout.phonePermission)
 expect(screen.queryByText(fr.watch_workout.permission)).toBeNull()
})
