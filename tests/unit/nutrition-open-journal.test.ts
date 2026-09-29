// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import NutritionTab from '@/app/components/tabs/NutritionTab'
import { buildNutritionViewModel } from '@/lib/nutrition/nutrition-dashboard-model'
import { getNutritionDayWindow, getNutritionWeekWindow } from '@/lib/nutrition/nutrition-date'
import messages from '@/messages/fr.json'

vi.mock('next/dynamic', () => ({default:()=>()=>null}))
vi.mock('@/app/components/BarcodeScanner',()=>({default:({onSelected}:any)=>React.createElement('button',{onClick:()=>onSelected({name:'Produit scanné',quantity_g:100,calories:100,protein:10,carbs:10,fat:2})},'Résultat scanner simulé')}))
vi.mock('@/app/hooks/useNutritionDashboardModel',()=>({default:()=>{
 const [selectedDate,setSelectedDate]=React.useState(day.localDateKey)
 const [,refreshView]=React.useState(0)
 return {model:makeModel(selectedDate),selectedDate,setSelectedDate,dailyLogs:logs,daysWithMeals:new Set(),refresh:async()=>refreshView(v=>v+1)}
}}))
const day=getNutritionDayWindow(new Date('2026-09-29T12:00:00Z'))
const breakfast={id:'breakfast',date:day.localDateKey,meal_type:'petit_dejeuner',custom_name:'Flocons test',quantity_g:80,calories:300,protein:10,carbs:50,fat:6}
const lunch={...breakfast,id:'lunch',meal_type:'dejeuner',custom_name:'Poulet test'}
let logs:any[]=[]
let failed=false
function makeModel(selectedDate:string){return buildNutritionViewModel({day,week:getNutritionWeekWindow(day.date),selectedDate,
 profile:{calorie_goal:2100,protein_goal:150,carbs_goal:220,fat_goal:70},capabilities:{ai:true,training:true,nutrition:true,coachManaged:false},coachRelation:{status:'not_found',coachId:null},dailyLogs:logs.filter(l=>l.date===selectedDate),tracking:[],personalPlan:null,coachPlan:null,hydration:[],...(failed?{errors:{dailyLogs:'READ_FAILED'}}:{})})}
beforeEach(()=>{logs=[breakfast,lunch];failed=false;localStorage.clear();vi.stubGlobal('React',React)})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
function setup(ai=true){
 const upsert=vi.fn(async(rows:any[])=>{for(const row of rows)if(!logs.some(l=>l.id===row.id))logs.push(row);return {error:null}})
 const supabase={from:vi.fn((table:string)=>{
  const chain:any={upsert}
  for(const method of ['select','eq','order','limit','single','ilike'])chain[method]=()=>chain
  chain.abortSignal=()=>Promise.resolve({error:null,data:table==='profiles'?{liked_foods:[]}:table==='saved_meals'?[{id:'saved',name:'Mon bol habituel',foods:[{name:'Riz test',quantity_g:200,calories:260,protein:5,carbs:50,fat:1}]}]:table==='daily_food_logs'?logs:[]})
  return chain
 })}
 const props={profile:{water_goal:3000},capabilities:{ai,training:true,nutrition:true,coachManaged:false},coachRelationStatus:'not_found' as const,coachRelationIsAuthoritative:true,coachId:null,supabase,userId:'owner',fetchAll:async()=>{},onOpenProgramSettings:vi.fn(),onOpenBarcode:vi.fn()}
 const view=render(React.createElement(NextIntlClientProvider,{locale:'fr',messages,timeZone:'Europe/Zurich',children:React.createElement(NutritionTab,props)}))
 return {upsert,view}
}
function plus(meal:string){fireEvent.click(screen.getByRole('button',{name:`Ajouter — ${meal}`}))}
it('opens on all four meals and existing foods without a permanent composer or disclosure',()=>{
 setup()
 for(const name of ['Petit-déjeuner','Déjeuner','Collation','Dîner'])expect(screen.getByRole('heading',{name})).toBeTruthy()
 expect(screen.getByText('Flocons test')).toBeTruthy();expect(screen.getByText('Poulet test')).toBeTruthy()
 expect(screen.queryByPlaceholderText('Rechercher un aliment…')).toBeNull()
 expect(screen.queryByText('Repas enregistrés et détails')).toBeNull()
 expect(screen.queryByText(/Pour 80 g enregistrés/)).toBeNull()
})
it('opens all four addition methods for the chosen meal and returns focus after Escape',()=>{
 setup();const trigger=screen.getByRole('button',{name:'Ajouter — Déjeuner'});trigger.focus();fireEvent.click(trigger)
 const sheet=screen.getByRole('dialog',{name:'Déjeuner'})
 for(const name of ['Un aliment','Un repas enregistré','Une photo','Un code-barres'])expect(within(sheet).getByRole('button',{name})).toBeTruthy()
 fireEvent.keyDown(document,{key:'Escape'})
 expect(screen.queryByRole('dialog')).toBeNull();expect(document.activeElement).toBe(trigger)
})
it('adds a saved meal only on confirmation and shows it immediately in the chosen journal',async()=>{
 const {upsert}=setup();plus('Dîner');fireEvent.click(screen.getByRole('button',{name:'Un repas enregistré'}))
 fireEvent.click(await screen.findByRole('button',{name:/Mon bol habituel/}))
 fireEvent.change(screen.getByLabelText('Quantité — Riz test'),{target:{value:'100'}})
 expect(upsert).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'Confirmer mon repas'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(upsert).toHaveBeenCalledTimes(1)
 expect(upsert.mock.calls[0][0][0]).toMatchObject({meal_type:'diner',date:day.localDateKey,quantity_g:100,calories:130})
 expect(screen.getByText('Riz test')).toBeTruthy()
})
it('keeps the selected past date when adding one recent food',async()=>{
 const {upsert}=setup()
 fireEvent.change(screen.getByLabelText('Date du journal'),{target:{value:'2026-09-28'}})
 expect(screen.queryByText('Flocons test')).toBeNull()
 plus('Petit-déjeuner');fireEvent.click(screen.getByRole('button',{name:'Un aliment'}))
 fireEvent.click(await screen.findByRole('button',{name:/Flocons test/}))
 fireEvent.click(screen.getByRole('button',{name:'Confirmer mon repas'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(upsert.mock.calls[0][0][0]).toMatchObject({date:'2026-09-28',meal_type:'petit_dejeuner'})
 expect(screen.getByText('Flocons test')).toBeTruthy()
})
it('opens photo analysis, retains the estimate in draft and saves in the selected meal',async()=>{
 const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({foods:[{name:'Photo test',quantity_g:100,calories:100,proteins:10,carbs:10,fats:2}]})});vi.stubGlobal('fetch',fetchMock)
 const {upsert}=setup();plus('Collation');fireEvent.click(screen.getByRole('button',{name:'Une photo'}))
 expect(screen.getByRole('button',{name:'Analyser une photo'})).toBeTruthy()
 fireEvent.change(document.querySelector('input[type="file"]')!,{target:{files:[new File(['synthetic'],'test.png',{type:'image/png'})]}})
 await screen.findByLabelText('Quantité — Photo test');expect(upsert).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'Confirmer mon repas'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(upsert.mock.calls[0][0][0].meal_type).toBe('collation');expect(screen.getByText('Photo test')).toBeTruthy()
})
it('opens the barcode source and confirms the scanned food through the same draft',async()=>{
 const {upsert}=setup();plus('Déjeuner');fireEvent.click(screen.getByRole('button',{name:'Un code-barres'}))
 fireEvent.click(screen.getByRole('button',{name:'Résultat scanner simulé'}))
 expect(screen.getByLabelText('Quantité — Produit scanné')).toBeTruthy();expect(upsert).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'Confirmer mon repas'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(upsert.mock.calls[0][0][0].meal_type).toBe('dejeuner')
})
it('respects photo entitlement and keeps failed reads distinct from empty meals',()=>{
 const {view}=setup(false);plus('Dîner');expect(screen.queryByRole('button',{name:'Une photo'})).toBeNull();view.unmount()
 failed=true;setup();expect(screen.getByText(/Le journal des repas est indisponible/)).toBeTruthy();expect(screen.queryByText('Aucun aliment enregistré pour ce repas.')).toBeNull()
})
it('reopens an uncertain saved meal through another source and retries identical IDs without duplicates',async()=>{
 const {upsert}=setup()
 upsert.mockImplementationOnce(async(rows:any[])=>{
  // The simulated server commits, but its response never reaches the client.
  logs.push(...rows)
  throw new TypeError('Response lost after commit')
 })
 plus('Dîner');fireEvent.click(screen.getByRole('button',{name:'Un repas enregistré'}))
 fireEvent.click(await screen.findByRole('button',{name:/Mon bol habituel/}))
 fireEvent.click(screen.getByRole('button',{name:'Confirmer mon repas'}))
 await screen.findByText(/Enregistrement non confirmé/)
 expect(logs.filter(row=>row.custom_name==='Riz test')).toHaveLength(1)
 fireEvent.click(screen.getByRole('button',{name:'Fermer'}))
 fireEvent.click(within(screen.getByRole('alert')).getByRole('button',{name:'Fermer'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(screen.getByText('Riz test')).toBeTruthy()
 plus('Dîner');fireEvent.click(screen.getByRole('button',{name:'Un code-barres'}))
 expect(screen.queryByRole('button',{name:'Résultat scanner simulé'})).toBeNull()
 expect((screen.getByLabelText('Quantité — Riz test') as HTMLInputElement).disabled).toBe(true)
 expect(screen.getByText(/Enregistrement à confirmer récupéré/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Réessayer'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(upsert).toHaveBeenCalledTimes(2)
 expect(upsert.mock.calls[1][0]).toEqual(upsert.mock.calls[0][0])
 expect(logs.filter(row=>row.custom_name==='Riz test')).toHaveLength(1)
 expect(localStorage.length).toBe(0)
})
