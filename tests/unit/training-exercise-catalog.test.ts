// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import ExerciseCatalogCard from '@/app/components/training/ExerciseCatalogCard'
import messages from '../../messages/fr.json'
vi.mock('@/app/components/ExerciseInfoPopup', () => ({default: ({info}: {info:{name:string}}) => React.createElement('div',{role:'dialog'},info.name)}))
afterEach(cleanup)
it('loads every page and searches accented names without truncation', async () => {
 const first=Array.from({length:200},(_,i)=>({id:String(i),name:`Exercice ${i}`}))
 const range=vi.fn((start:number)=>({abortSignal:()=>Promise.resolve({data:start===0?first:[{id:'last',name:'Élévation latérale',video_url:'https://example.com/video.mp4'}],error:null})}))
 const query:any={order:()=>query,range};const db={from:()=>({select:()=>query})}
 render(React.createElement(NextIntlClientProvider,{locale:'fr',messages,children:React.createElement(ExerciseCatalogCard,{supabase:db})}))
 await screen.findByText('201 exercices')
 expect(range.mock.calls.map(c=>c[0])).toEqual([0,200])
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'elevation'}})
 const row=screen.getByRole('button',{name:/Élévation latérale/})
 expect(row.textContent).toContain('Voir la vidéo')
 fireEvent.click(row)
 expect(screen.getByRole('dialog').textContent).toBe('Élévation latérale')
})
it('shows a retry instead of treating a failed query as an empty catalog',async()=>{
 const q:any={order:()=>q,range:()=>q,abortSignal:()=>Promise.resolve({error:{message:'offline'}})}
 render(React.createElement(NextIntlClientProvider,{locale:'fr',messages,children:React.createElement(ExerciseCatalogCard,{supabase:{from:()=>({select:()=>q})}})}))
 expect(await screen.findByRole('alert')).toBeTruthy()
 expect(screen.getByRole('button',{name:'Réessayer'})).toBeTruthy()
})
