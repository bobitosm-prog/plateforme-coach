// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import NutritionQuickCard from '@/app/components/nutrition-v2/NutritionQuickCard'
import TodayMeals from '@/app/components/nutrition-v2/TodayMeals'
import { buildNutritionViewModel } from '@/lib/nutrition/nutrition-dashboard-model'
import { getNutritionDayWindow, getNutritionWeekWindow } from '@/lib/nutrition/nutrition-date'
import messages from '@/messages/fr.json'

const consumed = {calories:378, protein:17, carbs:60, fat:7}
const targets = {calories:1812, protein:198, carbs:97, fat:72}
function wrap(child: React.ReactNode) {
  return React.createElement(NextIntlClientProvider, {locale:'fr', messages, timeZone:'Europe/Zurich', children:child})
}
function card(props: Partial<React.ComponentProps<typeof NutritionQuickCard>> = {}) {
  return wrap(React.createElement(NutritionQuickCard, {state:'ready', consumed, targets, userId:'synthetic-A', ...props}))
}
beforeEach(()=>localStorage.clear())
afterEach(()=>{cleanup();vi.restoreAllMocks()})

it('switches calories and all macros, preserves totals and restores choice after remount',()=>{
  const view=render(card())
  expect(view.getByText('1 434')).toBeTruthy()
  expect(view.getByText('181 g')).toBeTruthy()
  fireEvent.click(view.getByRole('button',{name:'Consommé'}))
  expect(view.getByRole('button',{name:'Consommé'}).getAttribute('aria-pressed')).toBe('true')
  for(const text of ['378','17 g','60 g','7 g']) expect(view.getByText(text)).toBeTruthy()
  expect(view.getByText('kcal consommées')).toBeTruthy()
  view.unmount()
  const next=render(card())
  expect(next.getByText('378')).toBeTruthy()
  fireEvent.click(next.getByRole('button',{name:'Restant'}))
  for(const text of ['1 434','181 g','37 g','65 g']) expect(next.getByText(text)).toBeTruthy()
})

it('isolates the saved choice across A→B→A',()=>{
  const view=render(card())
  fireEvent.click(view.getByRole('button',{name:'Consommé'}))
  view.rerender(card({userId:'synthetic-B'}))
  expect(view.getByText('1 434')).toBeTruthy()
  view.rerender(card())
  expect(view.getByText('378')).toBeTruthy()
})

it('does not require storage availability to switch',()=>{
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('denied')})
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('denied')})
  const view=render(card())
  fireEvent.click(view.getByRole('button',{name:'Consommé'}))
  expect(view.getByText('378')).toBeTruthy()
})

it('shows known consumption without targets and does not invent remaining values',()=>{
  const view=render(card({targets:{calories:null,protein:null,carbs:null,fat:null}}))
  expect(view.getAllByText('—')).toHaveLength(4)
  fireEvent.click(view.getByRole('button',{name:'Consommé'}))
  expect(view.getByText('378')).toBeTruthy()
  expect(view.queryByText('Objectif non défini')).toBeNull()
})

it('keeps excess explicit and refreshes numbers after a journal update',()=>{
  const view=render(card({consumed:{...consumed,calories:1912}}))
  expect(view.getByText('100')).toBeTruthy()
  expect(view.getByText('kcal au-dessus')).toBeTruthy()
  fireEvent.click(view.getByRole('button',{name:'Consommé'}))
  expect(view.getByText('1 912')).toBeTruthy()
  view.rerender(card({consumed:{...consumed,calories:400,protein:20}}))
  expect(view.getByText('400')).toBeTruthy()
  expect(view.getByText('20 g')).toBeTruthy()
})

it.each(['loading','error'] as const)('does not show stale totals in %s state',state=>{
  const view=render(card({state}))
  fireEvent.click(view.getByRole('button',{name:'Consommé'}))
  expect(view.queryByText('378')).toBeNull()
  expect(view.getAllByText(state==='loading'?'…':'—')).toHaveLength(4)
})

it('shows recorded food macros during quantity editing, then uses the refreshed record',()=>{
  const day=getNutritionDayWindow(new Date('2026-09-23T12:00:00Z'))
  const update=vi.fn()
  const props = (protein:number|null, quantity=100) => ({
    model:buildNutritionViewModel({day,week:getNutritionWeekWindow(day.date),selectedDate:day.localDateKey,
      profile:{calorie_goal:1812,protein_goal:198,carbs_goal:97,fat_goal:72},
      capabilities:{ai:true,training:true,nutrition:true,coachManaged:false},coachRelation:{status:'not_found' as const,coachId:null},
      dailyLogs:[{id:'synthetic-food',date:day.localDateKey,meal_type:'breakfast',food_name:'Avoine test',quantity_g:quantity,calories:378*quantity/100,protein,carbs:60*quantity/100,fat:7*quantity/100}],
      tracking:[],personalPlan:null,coachPlan:null,hydration:[]}),
    selectedDate:day.localDateKey,actionError:null,onRetry:vi.fn(),onChooseMeal:vi.fn(),onAddFood:vi.fn(),onImportPlan:vi.fn(),onPhoto:vi.fn(),onSavedMeals:vi.fn(),onSaveMeal:vi.fn(),onCopyMeal:vi.fn(),onClearMeal:vi.fn(),onReplaceFood:vi.fn(),onDeleteFood:vi.fn(),onUpdateFood:update,
  })
  const view=render(wrap(React.createElement(TodayMeals,props(17))))
  expect(view.getByText('Pour 100 g enregistrés : protéines 17 g · glucides 60 g · lipides 7 g')).toBeTruthy()
  fireEvent.click(view.getByRole('button',{name:/Avoine test/}))
  fireEvent.change(view.getByRole('spinbutton'),{target:{value:'50'}})
  expect(view.getByText(/Pour 100 g enregistrés/)).toBeTruthy()
  fireEvent.click(view.getByRole('button',{name:'Valider'}))
  expect(update).toHaveBeenCalledWith('synthetic-food',50)
  view.rerender(wrap(React.createElement(TodayMeals,props(8.5,50))))
  expect(view.getByText('Pour 50 g enregistrés : protéines 8,5 g · glucides 30 g · lipides 3,5 g')).toBeTruthy()
  view.rerender(wrap(React.createElement(TodayMeals,props(null,50))))
  expect(view.getByText(/protéines — g/)).toBeTruthy()
})
