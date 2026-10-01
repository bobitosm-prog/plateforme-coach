// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import PreviousExerciseSession from '@/app/components/training-v2/PreviousExerciseSession'
import messages from '@/messages/fr.json'
const mock = vi.hoisted(() => ({load:vi.fn()}))
vi.mock('@/lib/training/last-exercise-session', () => ({loadLastExerciseSession:mock.load}))
beforeEach(()=>{vi.stubGlobal('React',React);mock.load.mockReset()})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
const db={} as any
const mount=()=>render(React.createElement(NextIntlClientProvider, {locale:'fr',messages,timeZone:'Europe/Zurich',children:React.createElement(PreviousExerciseSession,{db,userId:'owner',exerciseId:null,name:'Mollets'})}))
it('shows all recorded weights and unknown conventions, including technique stages', async()=>{
 mock.load.mockResolvedValue([{id:'1',created_at:'2026-09-29T10:00:00',set_number:1,weight:60,reps:10,load_mode:null},{id:'2',created_at:'2026-09-29T10:00:00',set_number:2,parent_set_number:1,weight:60,reps:4,load_mode:null}])
 mount()
 await screen.findByText('60 kg × 10')
 expect(screen.getByText('60 kg × 4')).toBeTruthy()
 expect(screen.getByText('Ancienne saisie — convention inconnue')).toBeTruthy()
 expect(screen.getByText('Étape 2')).toBeTruthy()
 expect(screen.getByText(/29 sept. 2026/)).toBeTruthy()
})
it('retries a failed request without confusing it with empty history',async()=>{
 mock.load.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce([])
 mount()
 await screen.findByText('Historique indisponible. Réessaie.')
 fireEvent.click(screen.getByRole('button',{name:'Réessayer'}))
 await screen.findByText('Aucune séance enregistrée pour cet exercice.')
 expect(mock.load).toHaveBeenCalledTimes(2)
})
it('aborts on unmount so another account cannot receive a late reply',()=>{
 mock.load.mockReturnValue(new Promise(()=>{}))
 const view=mount();const signal=mock.load.mock.calls[0][4]
 view.unmount();expect(signal.aborted).toBe(true)
})
