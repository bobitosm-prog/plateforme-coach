// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import BarcodeScanner from '@/app/components/BarcodeScanner'
import FoodSearch from '@/app/components/FoodSearch'
vi.mock('next-intl',()=>({useTranslations:()=> (key:string)=>key}))
vi.mock('html5-qrcode',()=>({Html5Qrcode:class {start(){return Promise.reject(new Error('NotAllowed'))} stop(){return Promise.resolve()}}}))
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('supports camera denial, manual lookup and draft-only selection with resized macros',async()=>{
 const selected=vi.fn(),close=vi.fn();const write=vi.fn()
 const db={from:()=>{const q:any={select:()=>q,eq:()=>q,limit:()=>q,maybeSingle:async()=>({data:{id:'test',name:'Yaourt test',calories:100,proteins:8,carbs:10,fat:3}}),insert:write,upsert:write};return q}}
 render(React.createElement(BarcodeScanner,{supabase:db,userId:'fixture',onProductAdded:vi.fn(),onClose:close,onSelected:selected}))
 expect(await screen.findByRole('alert')).toBeTruthy()
 fireEvent.change(screen.getByLabelText('Code-barres'),{target:{value:'12345678'}})
 fireEvent.click(screen.getByRole('button',{name:'Rechercher le code-barres'}))
 expect(await screen.findByRole('dialog',{name:'Produit trouvé'})).toBeTruthy()
 fireEvent.change(screen.getByLabelText('Quantité en grammes'),{target:{value:'150'}})
 fireEvent.click(screen.getByRole('button',{name:'Ajouter à la sélection'}))
 expect(selected).toHaveBeenCalledWith(expect.objectContaining({quantity_g:150,calories:150,protein:12}))
 expect(write).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Fermer le scanner'}));expect(close).toHaveBeenCalledOnce()
})
it('searches food and preserves selected meal, date and quantity when adding',async()=>{
 const insert=vi.fn();const added=vi.fn();const row={id:'rice',name:'Riz test',energy_kcal:130,proteins:3,carbohydrates:28,fat:1,source:'fitness'}
 const db={from:(table:string)=>{const result={data:table==='profiles'?{liked_foods:[]}:table==='daily_food_logs'?{id:'log'}:[row],error:null};const q:any={then:(f:any)=>Promise.resolve(result).then(f)};for(const method of ['select','eq','order','limit','single'])q[method]=()=>q;q.insert=(v:any)=>{insert(v);return q};return q}}
 render(React.createElement(FoodSearch,{supabase:db,userId:'fixture',defaultMealType:'diner',dateOverride:'2026-10-10',onAdded:added,onClose:vi.fn()}))
 fireEvent.click(await screen.findByRole('button',{name:/Riz test/}))
 fireEvent.change(screen.getByLabelText('Quantité en grammes'),{target:{value:'200'}})
 fireEvent.click(screen.getByRole('button',{name:'Ajouter au repas'}))
 await waitFor(()=>expect(added).toHaveBeenCalled())
 expect(insert).toHaveBeenCalledWith(expect.objectContaining({date:'2026-10-10',meal_type:'diner',quantity_g:200,calories:260}))
})
