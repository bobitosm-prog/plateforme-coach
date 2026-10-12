// @vitest-environment jsdom
import React from 'react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/fr.json'
import ShoppingList from '@/app/components/ShoppingList'
import RecipesSection from '@/app/components/RecipesSection'
vi.mock('@/app/components/ui/RailOverlay', () => ({ RailOverlay: ({children}: any) => children }))
function mount(child: React.ReactNode) {return render(React.createElement(NextIntlClientProvider,{locale:'fr',messages,timeZone:'Europe/Zurich',children:child}))}
beforeEach(()=>{vi.stubGlobal('React',React);localStorage.clear()})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('counts current ingredients, aggregates quantities, checks, copies and resets the shopping list, then closes with Escape',async()=>{
 const key=`moovx-shopping-${new Date().toISOString().split('T')[0]}`
 localStorage.setItem(key,JSON.stringify({'Old item':true}))
 const writeText=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}})
 const close=vi.fn();const plan={lundi:{meals:[{type:'Déjeuner',foods:[{name:'Riz',qty:100},{name:'Riz',qty:150},{name:'Poulet',qty:200}]}]}}
 mount(React.createElement(ShoppingList,{planData:plan,onClose:close}))
 expect(screen.getByText('2 articles — 0/2 cochés')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Riz 250g'}))
 expect(screen.getByRole('button',{name:'Riz 250g'}).getAttribute('aria-pressed')).toBe('true')
 expect(screen.getByText('2 articles — 1/2 cochés')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Copier'}));await waitFor(()=>expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Riz -- 250g')))
 fireEvent.click(screen.getByRole('button',{name:'Tout décocher'}));expect(screen.getByText('2 articles — 0/2 cochés')).toBeTruthy()
 fireEvent.keyDown(document,{key:'Escape'});expect(close).toHaveBeenCalledOnce()
})
it('filters recipes, opens the complete detail and returns without writing or generating',async()=>{
 const rows=[{id:'1',title:'Bol de riz et légumes',category:'dejeuner',ingredients:[{name:'Riz',quantity_g:100}],instructions:[{step:1,text:'Cuire le riz.'}],calories_per_serving:400,proteins_per_serving:20,carbs_per_serving:40,fat_per_serving:10},{id:'2',title:'Smoothie banane',category:'smoothie'}]
 const write=vi.fn();const db={from:()=>{const q:any={insert:write,update:write};for(const method of ['select','or','order'])q[method]=()=>q;q.limit=async()=>({data:rows,error:null});return q}}
 mount(React.createElement(RecipesSection,{supabase:db,userId:'fixture',aiAllowed:true}))
 fireEvent.click(await screen.findByRole('button',{name:/Bol de riz et légumes/}));expect(screen.getByText('Cuire le riz.')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'← Retour aux recettes'}));fireEvent.click(screen.getByRole('button',{name:'Smoothie'}))
 expect(screen.queryByRole('button',{name:/Bol de riz et légumes/})).toBeNull()
 expect(screen.getByRole('button',{name:/Smoothie banane/})).toBeTruthy();expect(write).not.toHaveBeenCalled()
})
