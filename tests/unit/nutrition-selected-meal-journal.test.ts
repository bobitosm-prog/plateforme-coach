// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import TodayMeals from '@/app/components/nutrition-v2/TodayMeals'
import { buildNutritionViewModel, type NutritionMealType } from '@/lib/nutrition/nutrition-dashboard-model'
import { getNutritionDayWindow, getNutritionWeekWindow } from '@/lib/nutrition/nutrition-date'

vi.mock('next-intl', () => ({useLocale:()=> 'fr',useTranslations:()=> (key:string)=>key}))
beforeEach(()=>vi.stubGlobal('React',React))
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
const day=getNutritionDayWindow(new Date('2026-09-29T12:00:00Z'))
const breakfast={id:'breakfast-log',date:day.localDateKey,meal_type:'petit_dejeuner',custom_name:'Flocons test',quantity_g:80,calories:300,protein:10,carbs:50,fat:6}
const lunch={...breakfast,id:'lunch-log',meal_type:'dejeuner',custom_name:'Poulet test'}
function model(logs=[breakfast,lunch], failed=false){
 return buildNutritionViewModel({day,week:getNutritionWeekWindow(day.date),selectedDate:day.localDateKey,
  profile:{calorie_goal:2100,protein_goal:150,carbs_goal:220,fat_goal:70},
  capabilities:{ai:true,training:true,nutrition:true,coachManaged:false},
  coachRelation:{status:'not_found',coachId:null},dailyLogs:logs,tracking:[],personalPlan:null,coachPlan:null,hydration:[],
  ...(failed?{errors:{dailyLogs:'READ_FAILED'}}:{})})
}
const actions={onRetry:vi.fn(),onChooseMeal:vi.fn(),onAddFood:vi.fn(),onImportPlan:vi.fn(),onPhoto:vi.fn(),onSavedMeals:vi.fn(),onSaveMeal:vi.fn(),onCopyMeal:vi.fn(),onClearMeal:vi.fn(),onReplaceFood:vi.fn(),onDeleteFood:vi.fn(),onUpdateFood:vi.fn()}
function journal(meal:NutritionMealType,data=model()){
 return React.createElement(TodayMeals,{key:`journal:${day.localDateKey}:${meal}`,model:data,selectedDate:day.localDateKey,selectedMeal:meal,actionError:null,...actions})
}
it('immediately shows recorded breakfast foods and switches to the selected lunch',()=>{
 const view=render(journal('breakfast'))
 expect(screen.getByText('Flocons test')).toBeTruthy()
 expect(screen.queryByText('Poulet test')).toBeNull()
 view.rerender(journal('lunch'))
 expect(screen.getByText('Poulet test')).toBeTruthy()
 expect(screen.queryByText('Flocons test')).toBeNull()
})
it('shows an explicit empty journal and updates when saved foods are refreshed',()=>{
 const view=render(journal('breakfast',model([])))
 expect(screen.getByText('noLoggedFoods')).toBeTruthy()
 view.rerender(journal('breakfast',model([breakfast])))
 expect(screen.getByText('Flocons test')).toBeTruthy()
 expect(screen.queryByText('noLoggedFoods')).toBeNull()
})
it('preserves editing for the visible recorded food',()=>{
 render(journal('breakfast'))
 fireEvent.click(screen.getByRole('button',{name:/Flocons test/}))
 fireEvent.change(screen.getByRole('spinbutton',{name:'quantity'}),{target:{value:'90'}})
 fireEvent.click(screen.getByRole('button',{name:/^save$/}))
 expect(actions.onUpdateFood).toHaveBeenCalledWith('breakfast-log',90)
})
it('reports a journal read failure instead of claiming the meal is empty',()=>{
 render(journal('breakfast',model([],true)))
 expect(screen.getByRole('status').textContent).toContain('error')
 expect(screen.queryByText('noLoggedFoods')).toBeNull()
})
