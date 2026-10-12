// @vitest-environment jsdom
import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('next-intl', () => ({ useLocale: () => 'fr', useTranslations: () => Object.assign((key: string, params?: any) => params?.domain ? `${key} ${params.domain}` : key, { rich: (key: string) => key }) }))
vi.mock('@/lib/supabase/client', () => ({ supabase: { auth: { signOut: vi.fn() } } }))
import PaymentHistory from '@/app/components/tabs/profile/PaymentHistory'
import DeleteAccountSection from '@/app/components/tabs/profile/DeleteAccountSection'
import InitialGenerationStatus from '@/components/initial-generation/InitialGenerationStatus'
import PostAuthFatalState from '@/components/auth/PostAuthFatalState'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('renders empty payment history and all existing payment states', async () => {
 const payments = [{id:'p1',amount:9.9,status:'paid',paid_at:'2026-10-12T08:00:00Z'},{id:'p2',amount:79.9,status:'refunded'},{id:'p3',amount:9.9,status:'failed'}]
 const client = (data:any[]) => { const query:any = { select:()=>query,eq:()=>query,order:()=>query,limit:()=>Promise.resolve({data}) }; return {from:()=>query} }
 const { unmount } = render(React.createElement(PaymentHistory,{supabase:client([]),userId:'fixture'}))
 expect(await screen.findByText('empty')).toBeDefined();unmount()
 render(React.createElement(PaymentHistory,{supabase:client(payments),userId:'fixture'}))
 expect(await screen.findByText('statusPaid')).toBeDefined()
 expect(screen.getByText('statusRefunded')).toBeDefined();expect(screen.getByText('statusFailed')).toBeDefined()
})
it('deletion requires the exact word and cancellation resets it without any request', () => {
 const request=vi.fn();vi.stubGlobal('fetch',request)
 render(React.createElement(DeleteAccountSection,{session:{user:{id:'fixture'}}}))
 fireEvent.click(screen.getByRole('button',{name:'button'}))
 expect(screen.getByRole('dialog',{name:'title'})).toBeDefined()
 const submit=screen.getByRole('button',{name:'submit'}) as HTMLButtonElement
 expect(submit.disabled).toBe(true)
 fireEvent.change(screen.getByRole('textbox',{name:'placeholder'}),{target:{value:'confirmWord'}})
 expect(submit.disabled).toBe(false)
 fireEvent.click(screen.getByRole('button',{name:'cancel'}))
 expect(screen.queryByRole('dialog')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'button'}))
 expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('')
 expect(request).not.toHaveBeenCalled()
})
it('generation preserves domain retries, finalization retry, and deferred consent hiding', () => {
 const generation:any={visible:true,generating:false,globalState:'error',training:{phase:'ready'},nutrition:{phase:'error',reason:'generation'},finalization:'error',retryTraining:vi.fn(),retryNutrition:vi.fn(),retryAll:vi.fn()}
 const {rerender}=render(React.createElement(InitialGenerationStatus,{generation}))
 fireEvent.click(screen.getByRole('button',{name:'retryDomain nutrition'}));expect(generation.retryNutrition).toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'retry'}));expect(generation.retryAll).toHaveBeenCalled()
 rerender(React.createElement(InitialGenerationStatus,{generation:{...generation,nutrition:{phase:'missing',reason:'consent_declined'}}}))
 expect(screen.queryByRole('complementary')).toBeNull()
})
it.each(['missing','error'] as const)('profile %s error retains its retry',state=>{
 const retry=vi.fn();render(React.createElement(PostAuthFatalState,{state,onRetry:retry}))
 expect(screen.getByRole('alert')).toBeDefined();fireEvent.click(screen.getByRole('button',{name:'retry'}));expect(retry).toHaveBeenCalledTimes(1)
})
