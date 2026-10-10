// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import LegalDocumentDialog from '@/app/components/LegalDocumentDialog'
import fr from '@/messages/fr.json'
// React.createElement types require children in props for these components.
// eslint-disable-next-line react/no-children-prop
const wrap = () => React.createElement(NextIntlClientProvider,{locale:'fr',messages:fr,timeZone:'Europe/Zurich',children:React.createElement(LegalDocumentDialog,{document:'privacy',children:'Confidentialité'})})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('loads on the app origin and closes without navigation, restoring focus',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({html:'<h1>Confidentialité MoovX</h1><p>Document complet.</p><a href="https://example.com">Référence</a>'})});vi.stubGlobal('fetch',fetcher)
 render(wrap());const trigger=screen.getByRole('button',{name:'Confidentialité'});fireEvent.click(trigger)
 await screen.findByRole('heading',{name:'Confidentialité MoovX'})
 expect(fetcher.mock.calls[0][0]).toBe('/api/legal/fr/privacy')
 expect(screen.queryByRole('link')).toBeNull()
 expect(screen.getByText('Référence (https://example.com)')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Fermer'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 await waitFor(()=>expect(document.activeElement).toBe(trigger))
})
it('shows a retry after failure and successfully reloads',async()=>{
 const fetcher=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ok:true,json:async()=>({html:'<h1>Texte retrouvé</h1>'})});vi.stubGlobal('fetch',fetcher)
 render(wrap());fireEvent.click(screen.getByRole('button',{name:'Confidentialité'}))
 await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Réessayer'}))
 await screen.findByRole('heading',{name:'Texte retrouvé'})
 expect(fetcher).toHaveBeenCalledTimes(2)
})

it('reading terms does not accept the surrounding registration checkbox',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({html:'<h1>Conditions</h1>'})}))
 render(React.createElement('label',null,React.createElement('input',{type:'checkbox'}),wrap()))
 const checkbox=screen.getByRole('checkbox') as HTMLInputElement
 fireEvent.click(screen.getByRole('button',{name:'Confidentialité'}))
 await screen.findByRole('heading',{name:'Conditions'})
 expect(checkbox.checked).toBe(false)
 fireEvent.click(screen.getByRole('button',{name:'Fermer'}))
 expect(checkbox.checked).toBe(false)
})
