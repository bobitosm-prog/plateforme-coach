// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import CardioSection from '@/app/components/CardioSection'
import messages from '../../messages/fr.json'
vi.mock('sonner',()=>({toast:{error:vi.fn(),success:vi.fn()}}))
afterEach(cleanup)
it('loads account favorites, persists a star, and removes it through the owned key',async()=>{
 const writes:any[]=[]; const deletes:any[]=[]
 const db={from:(table:string)=>({
 select:()=>({eq:(key:string,id:string)=>{expect([table,key,id]).toEqual(['cardio_favorites','user_id','tester']);return Promise.resolve({data:[],error:null})}}),
 insert:(row:any)=>{writes.push(row);return Promise.resolve({error:null})},
 delete:()=>({eq:(key:string,id:string)=>({eq:(key2:string,id2:string)=>{deletes.push([key,id,key2,id2]);return Promise.resolve({error:null})}})})
 })}
 render(React.createElement(NextIntlClientProvider,{locale:'fr',messages,children:React.createElement(CardioSection,{supabase:db,userId:'tester',weight:65,weightIsReal:true,setModal:()=>{}})}))
 const add=await screen.findByRole('button',{name:'Ajouter aux favoris : Tabata Brûle-Graisses'})
 await waitFor(()=>expect(add.hasAttribute('disabled')).toBe(false))
 fireEvent.click(add)
 await waitFor(()=>expect(screen.getAllByRole('button',{name:'Retirer des favoris : Tabata Brûle-Graisses'})).toHaveLength(2))
 expect(writes).toEqual([{user_id:'tester',workout_id:'tabata_brule_graisses'}])
 fireEvent.click(screen.getAllByRole('button',{name:'Retirer des favoris : Tabata Brûle-Graisses'})[0])
 await screen.findByRole('button',{name:'Ajouter aux favoris : Tabata Brûle-Graisses'})
 expect(deletes).toEqual([['user_id','tester','workout_id','tabata_brule_graisses']])
})
