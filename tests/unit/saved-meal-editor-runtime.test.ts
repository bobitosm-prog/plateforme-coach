// @vitest-environment jsdom
import React from 'react'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/fr.json'
import NutritionTab from '@/app/components/tabs/NutritionTab'
const state = vi.hoisted(() => ({ meals: [] as any[], writes: [] as any[], fail: false, composer: null as any }))
vi.mock('@/app/hooks/useNutritionDashboardModel', () => ({default: () => ({model:{day:{localDateKey:'2026-10-04',dayKey:'dimanche'},hydration:{data:null},activePlan:{plan:null,state:'empty'},coachRelation:{status:'none'}}, selectedDate:'2026-10-04',setSelectedDate:vi.fn(),dailyLogs:[],refresh:vi.fn()})}))
vi.mock('@/app/components/nutrition-v2/NutritionOverview', () => ({default: ({children,onTabChange}:any) => React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>onTabChange('meals')},'Mes repas'),children)}))
vi.mock('@/app/components/nutrition-v2/TodayMeals', () => ({default: () => null}))
vi.mock('@/app/components/nutrition-v2/MealComposer', () => ({default: (props:any) => {state.composer=props;return React.createElement('div',null,'Composer ouvert')}}))
vi.mock('@/app/components/ui/RailOverlay', () => ({RailOverlay: ({children}:any) => children}))
const oats = {id:1,name:"Flocons d'avoine",energy_kcal:379,proteins:13,carbohydrates:67,fat:7,source:'fitness'}
const supabase = {from(table:string) {
 let operation='read', payload:any, id:any, source:any
 const chain:any={select:()=>chain,eq:(key:string,value:any)=>{if(key==='id')id=value;if(key==='source')source=value;return chain},order:()=>chain,ilike:()=>chain,limit:()=>chain,
 insert:(value:any)=>{operation='insert';payload=value;return chain},update:(value:any)=>{operation='update';payload=value;return chain},
 single:async()=>{
  if(operation==='read')return {data:null,error:null}
  state.writes.push({operation,payload})
  if(state.fail)return {data:null,error:{message:'offline'}}
  const row={...payload,id:id??'meal-1',created_at:'2026-10-04'}
  state.meals=[row,...state.meals.filter(x=>x.id!==row.id)]
  return {data:row,error:null}
 },then:(resolve:any)=>Promise.resolve({data:table==='saved_meals'?state.meals:source==='fitness'?[oats]:[],error:null}).then(resolve)}
 return chain
}}
function mount() {return render(React.createElement(NextIntlClientProvider,{locale:'fr',messages,timeZone:'Europe/Zurich',children:React.createElement(NutritionTab,{profile:{},capabilities:{nutrition:true,ai:false} as any,coachRelationStatus:'none' as any,coachRelationIsAuthoritative:true,coachId:null,supabase,userId:'user-1',fetchAll:vi.fn(),onOpenProgramSettings:vi.fn(),onOpenBarcode:vi.fn()})}))}
beforeEach(()=>{vi.stubGlobal('React',React);state.meals=[];state.writes=[];state.fail=false;state.composer=null})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('saved meal screen runtime',()=>{
 it('creates locally, preserves macros while typing, saves name/type, reopens, and sends the meal to the journal composer',async()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:'Mes repas'}))
  fireEvent.click(await screen.findByRole('button',{name:/CRÉER UN REPAS/}))
  expect(state.writes).toHaveLength(0)
  fireEvent.change(screen.getByLabelText('Nom du repas'),{target:{value:'Petit déjeuner maison'}})
  fireEvent.change(screen.getByLabelText('Type de repas'),{target:{value:'petit_dejeuner'}})
  fireEvent.change(screen.getByPlaceholderText('+ Ajouter un aliment...'),{target:{value:'avoine'}})
  fireEvent.click((await screen.findAllByRole('button',{name:/Flocons d'avoine/}))[0])
  for(const value of ['', '5','55'])fireEvent.change(screen.getByLabelText(/Flocons.*Quantité/),{target:{value}})
  expect(screen.getByText('208 kcal · 7.2g P')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:/Sauvegarder/i}))
  await waitFor(()=>expect(state.meals).toHaveLength(1))
  expect(state.meals[0]).toMatchObject({name:'Petit déjeuner maison',meal_type:'petit_dejeuner',total_proteins:7.15,total_fats:3.85})
  expect(state.writes[0].payload.total_protein).toBeUndefined()
  cleanup();mount();fireEvent.click(screen.getByRole('button',{name:'Mes repas'}))
  fireEvent.click(await screen.findByRole('button',{name:'Modifier le repas'}))
  expect((screen.getByLabelText('Nom du repas') as HTMLInputElement).value).toBe('Petit déjeuner maison')
  expect((screen.getByLabelText(/Flocons.*Quantité/) as HTMLInputElement).value).toBe('55')
  cleanup();mount();fireEvent.click(screen.getByRole('button',{name:'Mes repas'}))
  fireEvent.click(await screen.findByRole('button',{name:'Ajouter au journal'}))
  fireEvent.click(screen.getByRole('button',{name:'Collation'}))
  await screen.findByText('Composer ouvert')
  expect(state.composer).toMatchObject({mealType:'collation',date:'2026-10-04',initialFoods:[{quantity_g:55,protein:7.15}]})
  expect(state.writes).toHaveLength(1)
 })
 it('keeps the edited draft after a failed save and retries the same meal',async()=>{
  state.meals=[{id:'existing',name:'Repas',meal_type:'dejeuner',foods:[{name:'Œuf',quantity:100,calories:155,protein:13,carbs:1,fat:11}]}]
  mount();fireEvent.click(screen.getByRole('button',{name:'Mes repas'}));fireEvent.click(await screen.findByRole('button',{name:'Modifier le repas'}))
  fireEvent.change(screen.getByLabelText('Nom du repas'),{target:{value:'Mon repas'}})
  state.fail=true;fireEvent.click(screen.getByRole('button',{name:/Sauvegarder/i}))
  await screen.findByRole('alert')
  expect((screen.getByLabelText('Nom du repas') as HTMLInputElement).value).toBe('Mon repas')
  expect(state.meals[0].name).toBe('Repas')
  state.fail=false;fireEvent.click(screen.getByRole('button',{name:/Sauvegarder/i}))
  await waitFor(()=>expect(state.meals[0].name).toBe('Mon repas'))
  expect(state.meals).toHaveLength(1)
 })
})
