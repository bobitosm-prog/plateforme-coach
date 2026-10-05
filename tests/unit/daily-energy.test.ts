// @vitest-environment jsdom
import * as React from 'react'
import {cleanup, render, screen, waitFor, fireEvent, act} from '@testing-library/react'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {dailyEnergy, energyTotal} from '@/lib/health/daily-energy'
import DailyEnergyCard from '@/app/components/nutrition-v2/DailyEnergyCard'
vi.mock('next-intl',()=>({useLocale:()=> 'fr',useTranslations:()=> (key:string, args?:Record<string,unknown>)=> key+(args?JSON.stringify(args):'')}))
beforeEach(()=>vi.stubGlobal('React',React))
afterEach(()=>{cleanup();delete (window as any).webkit;vi.useRealTimers();vi.unstubAllGlobals()})
const date='2026-10-05'
const ready={status:'ready',date,through:1791212400000,active:450,resting:1300} as const
function bridge(postMessage:ReturnType<typeof vi.fn>) { (window as any).webkit={messageHandlers:{moovxDailyEnergy:{postMessage}}} }
it('does not expose a nonfunctional Health card in a PWA or older build',async()=>{
 expect(await dailyEnergy('read','A',date)).toEqual({status:'unsupported'})
 const view=render(React.createElement(DailyEnergyCard, {account:"A",date:date,consumed:1800}));expect(view.container.textContent).toBe('')
})
it('adds active and resting only; missing data is not zero',()=>{
 expect(energyTotal(ready)).toBe(1750)
 expect(energyTotal({...ready,resting:null})).toBeNull()
 expect(energyTotal({...ready,active:NaN})).toBeNull()
 expect(energyTotal({...ready,active:0,resting:0})).toBe(0)
})
it('requests explicit opt-in and displays the comparison without changing consumed calories',async()=>{
 const post=vi.fn().mockResolvedValueOnce({status:'off'}).mockResolvedValueOnce(ready).mockResolvedValueOnce({status:'off'});bridge(post)
 render(React.createElement(DailyEnergyCard, {account:"A",date:date,consumed:1800}));
 fireEvent.click(await screen.findByText('connect'))
 await screen.findByText('difference{"value":"+50"}')
 expect(post.mock.calls[1][0]).toEqual({action:'connect',account:'A',date})
 fireEvent.click(screen.getByText('disconnect'))
 await screen.findByText('connect');expect(screen.queryByText(/difference/)).toBeNull()
})
it('does not show a comparison from partial Health data',async()=>{
 bridge(vi.fn().mockResolvedValue({...ready,resting:null}))
 render(React.createElement(DailyEnergyCard, {account:"A",date:date,consumed:1800}));
 await screen.findByText('missing');expect(screen.queryByText(/difference/)).toBeNull()
})
it('discards late responses after a date/account change',async()=>{
 let resolve!:(v:unknown)=>void
 const post=vi.fn().mockImplementationOnce(()=>new Promise(r=>{resolve=r})).mockResolvedValue({status:'off'});bridge(post)
 const view=render(React.createElement(DailyEnergyCard, {key:"A",account:"A",date:date,consumed:1800}));
 view.rerender(React.createElement(DailyEnergyCard, {key:"B",account:"B",date:"2026-10-04",consumed:1200}));
 await screen.findByText('connect');await act(async()=>resolve(ready))
 expect(screen.queryByText(/difference/)).toBeNull()
 expect(post.mock.calls[1][0]).toEqual({action:'read',account:'B',date:'2026-10-04'})
})
it('refreshes on foreground and clears unavailable values',async()=>{
 const post=vi.fn().mockResolvedValueOnce(ready).mockResolvedValue({status:'error'});bridge(post)
 render(React.createElement(DailyEnergyCard, {account:"A",date:date,consumed:1800}));
 await screen.findByText(/difference/)
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'})
 fireEvent(document,new Event('visibilitychange'))
 await screen.findByText('error');expect(screen.queryByText(/difference/)).toBeNull()
})
it('rejects mismatched days and stalled queries',async()=>{
 bridge(vi.fn().mockResolvedValue({...ready,date:'2026-10-04'}));expect((await dailyEnergy('read','A',date)).status).toBe('error')
 vi.useFakeTimers();bridge(vi.fn().mockImplementation(()=>new Promise(()=>{})))
 const pending=dailyEnergy('read','A',date);await vi.advanceTimersByTimeAsync(15000);expect((await pending).status).toBe('error')
})
