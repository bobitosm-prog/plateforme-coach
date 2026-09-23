// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import MealComposer from '@/app/components/nutrition-v2/MealComposer'

vi.mock('next-intl',()=>{ const translate=(key:string)=>key; return {useTranslations:()=>translate} })
vi.mock('@/app/components/BarcodeScanner',()=>({default:({onSelected}:any)=>React.createElement('button',{onClick:()=>onSelected({name:'Scanned',quantity_g:100,calories:100,protein:10,carbs:10,fat:2})},'scan result')}))
beforeEach(()=>{localStorage.clear();vi.stubGlobal('React',React)})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
const food={name:'Rice',qty:200,kcal:260,prot:5.4,carb:56,fat:0.6}
function setup(initialFoods:any[]=[],photoEnabled=false) {
  const upsert=vi.fn().mockResolvedValue({error:null})
  const supabase={from:vi.fn((table:string)=>{
    const chain:any={upsert}
    for(const method of ['select','eq','order','limit','single']) chain[method]=()=>chain
    chain.abortSignal=()=>Promise.resolve({data:table==='profiles'?{liked_foods:[]}:[],error:null})
    return chain
  })}
  const onSaved=vi.fn().mockResolvedValue(undefined),onClose=vi.fn()
  const view=render(React.createElement(React.StrictMode,null,React.createElement(MealComposer,{supabase,userId:'owner',date:'2026-09-20',mealType:'diner',mealLabel:'Dinner',plannedFoods:[food],initialFoods,photoEnabled,onSaved,onClose})))
  return {upsert,onSaved,onClose,view}
}
describe('meal composer runtime',()=>{
  it('sends the complete data URL required by the photo API and keeps its result in draft',async()=>{
    const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({foods:[{name:'Photo food',quantity_g:100,calories:100,proteins:10,carbs:10,fats:2}]})})
    vi.stubGlobal('fetch',fetchMock)
    const {upsert}=setup([],true)
    const input=document.querySelector('input[type="file"]')!
    fireEvent.change(input,{target:{files:[new File(['synthetic'],'test.png',{type:'image/png'})]}})
    await screen.findByLabelText('quantity — Photo food')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).image).toMatch(/^data:image\/png;base64,/)
    expect(upsert).not.toHaveBeenCalled()
  })
  it('keeps plan additions as drafts, scales quantities, then confirms in one write',async()=>{
    const {upsert,onSaved}=setup()
    fireEvent.click(screen.getByRole('button',{name:'plan'}))
    fireEvent.click(screen.getByRole('button',{name:/usePlan/}))
    fireEvent.change(screen.getByLabelText('quantity — Rice'),{target:{value:'100'}})
    expect(upsert).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'confirm'}))
    await waitFor(()=>expect(onSaved).toHaveBeenCalledTimes(1))
    expect(upsert.mock.calls[0][0]).toEqual([expect.objectContaining({custom_name:'Rice',date:'2026-09-20',meal_type:'diner',quantity_g:100,calories:130,protein:2.7})])
  })
  it('initializes once in StrictMode and never writes on cancellation',async()=>{
    const {upsert,onClose}=setup([food])
    expect(screen.getAllByLabelText('quantity — Rice')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button',{name:'closeTools'}))
    expect(screen.getByRole('alert').textContent).toContain('discard')
    fireEvent.click(screen.getByRole('button',{name:/^close$/}))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(upsert).not.toHaveBeenCalled()
  })
  it('freezes uncertain submissions and retries identical rows without duplicate clicks',async()=>{
    const {upsert,onSaved}=setup([food])
    upsert.mockResolvedValueOnce({error:{message:'network'}})
    fireEvent.click(screen.getByRole('button',{name:'confirm'}))
    await screen.findByText('saveError')
    expect((screen.getByLabelText('quantity — Rice') as HTMLInputElement).disabled).toBe(true)
    const retry=screen.getByRole('button',{name:'retry'})
    fireEvent.click(retry);fireEvent.click(retry)
    await waitFor(()=>expect(onSaved).toHaveBeenCalledTimes(1))
    expect(upsert).toHaveBeenCalledTimes(2)
    expect(upsert.mock.calls[0]).toEqual(upsert.mock.calls[1])
  })
  it('adds scanned food to the selection without an immediate journal write',async()=>{
    const {upsert}=setup()
    fireEvent.click(screen.getByRole('button',{name:'barcode'}))
    fireEvent.click(screen.getByRole('button',{name:'scan result'}))
    expect(screen.getByLabelText('quantity — Scanned')).toBeTruthy()
    expect(upsert).not.toHaveBeenCalled()
    expect(screen.queryByRole('button',{name:'photo'})).toBeNull()
  })
  it('does not retry the confirmed write if refresh fails',async()=>{
    const {upsert,onSaved,onClose}=setup([food])
    onSaved.mockRejectedValueOnce(new Error('refresh unavailable'))
    fireEvent.click(screen.getByRole('button',{name:'confirm'}))
    await waitFor(()=>expect(onClose).toHaveBeenCalledTimes(1))
    expect(upsert).toHaveBeenCalledTimes(1)
  })
  it('retains the selection after an offline rejection and retries the exact payload',async()=>{
    const {upsert,onSaved,onClose}=setup([food])
    upsert.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fireEvent.click(screen.getByRole('button',{name:'confirm'}))
    await screen.findByText('saveError')
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect((screen.getByLabelText('quantity — Rice') as HTMLInputElement).value).toBe('200')
    fireEvent.click(screen.getByRole('button',{name:'retry'}))
    await waitFor(()=>expect(onSaved).toHaveBeenCalledTimes(1))
    expect(upsert.mock.calls[1]).toEqual(upsert.mock.calls[0])
  })
  it('retries a committed write after lost response and remount without duplicates in a simulated unique-ID store',async()=>{
    const first=setup([food])
    const {upsert}=first
    const stored=new Map<string,unknown>()
    let attempts=0
    const server=async(rows:any[],options:any)=>{
      expect(options).toEqual({onConflict:'id',ignoreDuplicates:true})
      for(const row of rows) if(!stored.has(row.id)) stored.set(row.id,structuredClone(row))
      if(++attempts===1) throw new TypeError('Response lost after commit')
      return {error:null}
    }
    upsert.mockImplementation(server)
    fireEvent.click(screen.getByRole('button',{name:'confirm'}))
    await screen.findByText('saveError')
    expect(stored.size).toBe(1)
    first.view.unmount()
    const reopened=setup()
    reopened.upsert.mockImplementation(server)
    fireEvent.click(screen.getByRole('button',{name:'retry'}))
    await waitFor(()=>expect(reopened.onSaved).toHaveBeenCalledTimes(1))
    expect(stored.size).toBe(1)
    expect(reopened.upsert.mock.calls[0][0]).toEqual(upsert.mock.calls[0][0])
  })
  it('restores an uncertain submission with identical IDs after closing and reopening',async()=>{
    const first=setup([food])
    first.upsert.mockRejectedValueOnce(new TypeError('Offline'))
    fireEvent.click(screen.getByRole('button',{name:'confirm'}))
    await screen.findByText('saveError')
    fireEvent.click(screen.getByRole('button',{name:'closeTools'}))
    expect(screen.getByRole('alert').textContent).toContain('uncertainRetained')
    fireEvent.click(screen.getByRole('button',{name:/^close$/}))
    first.view.unmount()
    const reopened=setup()
    expect((screen.getByLabelText('quantity — Rice') as HTMLInputElement).disabled).toBe(true)
    expect(reopened.upsert).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'retry'}))
    await waitFor(()=>expect(reopened.onSaved).toHaveBeenCalledTimes(1))
    expect(reopened.upsert.mock.calls[0]).toEqual(first.upsert.mock.calls[0])
    reopened.view.unmount()
    setup()
    expect(screen.queryByLabelText('quantity — Rice')).toBeNull()
  })
  it('restores an unsent edited quantity without automatically sending',()=>{
    const first=setup([food])
    fireEvent.change(screen.getByLabelText('quantity — Rice'),{target:{value:'50'}})
    first.view.unmount()
    const next=setup([food])
    expect(screen.getAllByLabelText('quantity — Rice')).toHaveLength(1)
    expect((screen.getByLabelText('quantity — Rice') as HTMLInputElement).value).toBe('50')
    expect(next.upsert).not.toHaveBeenCalled()
  })
  it('blocks a network write if durable storage becomes unavailable',()=>{
    const current=setup([food])
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Quota')})
    fireEvent.click(screen.getByRole('button',{name:'confirm'}))
    expect(screen.getByText('storageError')).toBeTruthy()
    expect(current.upsert).not.toHaveBeenCalled()
  })
})
