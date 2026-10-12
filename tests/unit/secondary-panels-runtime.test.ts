// @vitest-environment jsdom
import React from 'react'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({send:vi.fn(),update:vi.fn().mockResolvedValue({}),clear:vi.fn(),messages:[] as any[]}))
vi.mock('next-intl',()=>({useLocale:()=> 'fr',useTranslations:()=> (key:string)=>key}))
vi.mock('@/app/hooks/useChatAI',()=>({useChatAI:()=>({messages:mocks.messages,loading:false,sending:false,error:null,sendMessage:mocks.send,clearHistory:mocks.clear})}))
vi.mock('@/lib/profile-service',()=>({updateProfile:mocks.update}))
import ChatAI from '@/app/components/ChatAI'
import BmrModal from '@/app/components/modals/BmrModal'
import SessionDetailModal from '@/app/components/training/SessionDetailModal'
afterEach(()=>{cleanup();vi.clearAllMocks();mocks.messages=[]})
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

it('renders a long conversation with the new Athena heading and readable message content',async()=>{
 mocks.messages=[{id:'one',role:'assistant',content:'## Conseils\nUne réponse détaillée avec **du texte important**.',created_at:'2026-10-12T10:00:00Z'}]
 render(React.createElement(ChatAI,{session:{},profile:{},capabilities:{ai:true} as any,externalOpen:true}))
 expect(await screen.findByRole('heading',{name:'Athena.'})).toBeTruthy();expect(screen.getByText('du texte important')).toBeTruthy();expect(screen.queryByText('header.online')).toBeNull()
})

it('saves weight and date through the existing callback from the accessible dialog',async()=>{
 const {default:WeightModal}=await import('@/app/components/modals/WeightModal');const save=vi.fn().mockResolvedValue(undefined)
 render(React.createElement(WeightModal,{currentWeight:70,onSave:save,onClose:vi.fn()}))
 expect(screen.getByRole('dialog',{name:'Enregistrer mon poids'})).toBeTruthy()
 fireEvent.change(screen.getByRole('spinbutton',{name:'Poids en kilogrammes'}),{target:{value:'72.5'}})
 fireEvent.change(screen.getByLabelText('Date'),{target:{value:'2026-10-11'}})
 fireEvent.click(screen.getByRole('button',{name:'Sauvegarder'}));await waitFor(()=>expect(save).toHaveBeenCalledWith(72.5,'2026-10-11'))
})
it('saves only entered measurements and closes on Escape without another save',async()=>{
 const {default:MeasureModal}=await import('@/app/components/modals/MeasureModal');const save=vi.fn().mockResolvedValue(undefined);const close=vi.fn()
 render(React.createElement(MeasureModal,{measurements:[],onSave:save,onClose:close}))
 fireEvent.change(screen.getByLabelText('tab.measureLabels.waist'),{target:{value:'81.5'}})
 fireEvent.click(screen.getByRole('button',{name:'measureModal.save'}));await waitFor(()=>expect(save).toHaveBeenCalledWith({waist:81.5},expect.any(String)))
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape',code:'Escape'});expect(close).toHaveBeenCalledOnce();expect(save).toHaveBeenCalledOnce()
})
