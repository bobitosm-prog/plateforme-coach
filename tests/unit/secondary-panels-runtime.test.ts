// @vitest-environment jsdom
import React from 'react'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({send:vi.fn(),update:vi.fn().mockResolvedValue({}),clear:vi.fn()}))
vi.mock('next-intl',()=>({useLocale:()=> 'fr',useTranslations:()=> (key:string)=>key}))
vi.mock('@/app/hooks/useChatAI',()=>({useChatAI:()=>({messages:[],loading:false,sending:false,error:null,sendMessage:mocks.send,clearHistory:mocks.clear})}))
vi.mock('@/lib/profile-service',()=>({updateProfile:mocks.update}))
import ChatAI from '@/app/components/ChatAI'
import BmrModal from '@/app/components/modals/BmrModal'
import SessionDetailModal from '@/app/components/training/SessionDetailModal'
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('opens and closes without a hook-order error when AI access is denied',async()=>{
 const close=vi.fn();render(React.createElement(ChatAI,{session:{},profile:{},capabilities:{ai:false} as any,externalOpen:true,onExternalClose:close}))
 expect(await screen.findByRole('dialog',{name:'coachManaged.title'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'coachManaged.close'}));expect(close).toHaveBeenCalledOnce();expect(mocks.send).not.toHaveBeenCalled()
})
it('sends an entered message and closes the Athena panel',async()=>{
 const close=vi.fn();render(React.createElement(ChatAI,{session:{},profile:{},capabilities:{ai:true} as any,externalOpen:true,onExternalClose:close}))
 const field=await screen.findByRole('textbox',{name:'input.placeholder'});fireEvent.change(field,{target:{value:'Question de test'}});fireEvent.click(screen.getByRole('button',{name:'input.send'}));expect(mocks.send).toHaveBeenCalledWith('Question de test');fireEvent.click(screen.getByRole('button',{name:'close'}));expect(close).toHaveBeenCalledOnce()
})
it('calculates and preserves the profile payload with a simulated save',async()=>{
 render(React.createElement(BmrModal,{supabase:{},session:{user:{id:'fixture'}},profile:{objective:'maintain'},initialValues:{weight:'70',height:'175',age:'30',gender:'male',activity:'moderate',body_fat:''},onClose:vi.fn()}))
 fireEvent.change(screen.getByRole('spinbutton',{name:'Poids'}),{target:{value:'72'}});fireEvent.click(screen.getByRole('button',{name:'Calculer mon TDEE'}));await waitFor(()=>expect(mocks.update).toHaveBeenCalledWith('fixture',expect.objectContaining({current_weight:72,height:175}),{}));expect(screen.getByText('TDEE (Dépense Totale)')).toBeTruthy()
})
it('session detail displays its content and closes',async()=>{
 const close=vi.fn();render(React.createElement(SessionDetailModal,{isOpen:true,onClose:close,sessionTitle:'PUSH A',dayStatus:'done'},React.createElement('p',null,'Historique de test')));expect(await screen.findByRole('dialog')).toBeTruthy();expect(screen.getByText('Historique de test')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'close'}));expect(close).toHaveBeenCalledOnce()
})
