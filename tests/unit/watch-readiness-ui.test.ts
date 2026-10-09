// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, expect, it, vi } from 'vitest'
import fr from '../../messages/fr.json'
import WatchReadinessCard from '../../app/components/home-v2/WatchReadinessCard'
import WatchWorkoutControls from '../../app/components/training-v2/WatchWorkoutControls'
const wrap = (children: React.ReactNode) => React.createElement(NextIntlClientProvider, {locale:'fr',messages:fr,timeZone:'Europe/Zurich',children})
const native = (postMessage: ReturnType<typeof vi.fn>) => { (window as any).webkit = {messageHandlers:{moovxWatchWorkout:{postMessage}}} }
afterEach(() => { cleanup(); delete (window as any).webkit; vi.useRealTimers() })
it('hides the native card on the web', () => {
  render(wrap(React.createElement(WatchReadinessCard)))
  expect(screen.queryByLabelText('Apple Watch')).toBeNull()
})
it('checks on Home and on resume without issuing a workout command', async () => {
  const post = vi.fn().mockResolvedValue({enabled:true,status:'ready'}); native(post)
  render(wrap(React.createElement(WatchReadinessCard)))
  await screen.findByText('Watch prête')
  expect(post.mock.calls).toEqual([[{action:'readiness'}]])
  post.mockResolvedValue({enabled:true,status:'unverified'})
  fireEvent(document, new Event('visibilitychange'))
  await screen.findByText('Watch : disponibilité non confirmée')
  expect(screen.queryByText('Watch prête')).toBeNull()
  expect(post.mock.calls.every(([body]) => body.action === 'readiness' && !body.id)).toBe(true)
})
it('enables the preference without starting a workout', async () => {
  const post = vi.fn().mockResolvedValueOnce({enabled:false,status:'off'}).mockResolvedValue({enabled:true,status:'permission'}); native(post)
  render(wrap(React.createElement(WatchReadinessCard)))
  fireEvent.click(await screen.findByRole('button', {name:'Activer le compagnon'}))
  await screen.findByText('Watch : autorisation requise')
  expect(post.mock.calls[1]).toEqual([{action:'configure'}])
})
it('retries synchronization after native activation, retaining the same draft ID', async () => {
  vi.useFakeTimers()
  const post = vi.fn().mockResolvedValue({enabled:true,status:'unavailable'}); native(post)
  render(wrap(React.createElement(WatchWorkoutControls,{draftId:'stable-id'})))
  await vi.advanceTimersByTimeAsync(4000)
  expect(post.mock.calls.slice(0,2)).toEqual([[{action:'sync',id:'stable-id'}],[{action:'sync',id:'stable-id'}]])
})
