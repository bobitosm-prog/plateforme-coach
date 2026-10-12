// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({native:false,push:vi.fn(),row:{id:'fixture',week_start:'2020-01-06',score_semaine:80,policy_version:2,ajustements:{calorie_goal_new:2000},raisonnement:'Explication de test'}}))
vi.mock('next-intl',()=>({useLocale:()=> 'fr',useTranslations:()=> (key:string)=>key}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:mocks.push})}))
vi.mock('@/lib/apple/native-purchases',()=>({isNativeMoovx:()=>mocks.native}))
vi.mock('@/app/components/ApplePaywall',()=>({default:()=>React.createElement('div',null,'Native Apple')}))
vi.mock('@/lib/profile-service',()=>({invalidateProfileCache:vi.fn()}))
vi.mock('@supabase/ssr',()=>({createBrowserClient:()=>{const query:any={select:()=>query,eq:()=>query,single:async()=>({data:mocks.row})};return {auth:{getSession:async()=>({data:{session:{user:{id:'fixture'}}}})},from:()=>query}}}))
import Paywall from '@/app/components/Paywall'
import Weekly from '@/app/(application)/weekly-diagnostic/[id]/WeeklyDiagnosticDetailContent'
afterEach(()=>{cleanup();vi.unstubAllGlobals();mocks.native=false})
it('preserves monthly/yearly checkout selection and prevents duplicate requests while loading',async()=>{
 const request=vi.fn(()=>new Promise(()=>{}));vi.stubGlobal('fetch',request)
 render(React.createElement(Paywall,{role:'client',userId:'fixture',onSignOut:vi.fn()}))
 expect(await screen.findByText('9.90')).toBeTruthy();expect(screen.getByText('79.90')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'cta.startYearly'}))
 expect(request).toHaveBeenCalledWith('/api/stripe/checkout',expect.objectContaining({body:JSON.stringify({clientId:'fixture',planId:'client_yearly',coachId:'platform'})}))
 expect((screen.getByRole('button',{name:'cta.startMonthly'}) as HTMLButtonElement).disabled).toBe(true)
})
it('keeps native purchases in Apple paywall',async()=>{
 mocks.native=true;render(React.createElement(Paywall,{role:'client',userId:'fixture',onSignOut:vi.fn()}));expect(await screen.findByText('Native Apple')).toBeTruthy();expect(screen.queryByText('9.90')).toBeNull()
})
it('can expand reasoning and go back without applying an expired diagnostic',async()=>{
 const request=vi.fn();vi.stubGlobal('fetch',request);render(React.createElement(Weekly,{id:'fixture'}))
 expect(await screen.findByRole('heading',{name:'title'})).toBeTruthy()
 expect((screen.getByRole('button',{name:'apply_button'}) as HTMLButtonElement).disabled).toBe(true)
 const toggle=screen.getByRole('button',{name:'ai_reasoning'});fireEvent.click(toggle)
 await waitFor(()=>expect(toggle.getAttribute('aria-expanded')).toBe('true'))
 expect(screen.getByText('Explication de test')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'back'}));expect(mocks.push).toHaveBeenCalledWith('/');expect(request).not.toHaveBeenCalled()
})
