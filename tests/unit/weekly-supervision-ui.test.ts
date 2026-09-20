// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({fetch:vi.fn()}))
vi.mock('@/lib/admin/api-client',()=>({adminFetch:mocks.fetch}))
import { WeeklyGenerationMonitor } from '@/app/(application)/admin/logs/_components/WeeklyGenerationMonitor'
afterEach(()=>{cleanup();vi.clearAllMocks()})
const counts={pending:0,running:0,succeeded:0,blocked:0,failed:0,retrying:0}
describe('admin weekly supervision display',()=>{
 it('shows a missing heartbeat and can refresh to a known live state',async()=>{
   mocks.fetch.mockResolvedValueOnce({stale:true,counts,runs:[]}).mockResolvedValueOnce({stale:false,counts,runs:[]})
   render(React.createElement(WeeklyGenerationMonitor))
   expect(await screen.findByText('Alerte : aucun passage récent du planificateur.')).toBeTruthy()
   fireEvent.click(screen.getByRole('button',{name:'Actualiser la supervision'}))
   expect(await screen.findByText('Planificateur actif.')).toBeTruthy()
 })
 it('makes retrying failures visible and never turns a monitoring error into success',async()=>{
   mocks.fetch.mockResolvedValueOnce({stale:false,counts:{...counts,retrying:1},runs:[]}).mockRejectedValueOnce(new Error('unavailable'))
   render(React.createElement(WeeklyGenerationMonitor))
   expect(await screen.findByText('Attention : des générations ont échoué.')).toBeTruthy()
   fireEvent.click(screen.getByRole('button',{name:'Actualiser la supervision'}))
   expect(await screen.findByText('Supervision indisponible : aucun état fiable.')).toBeTruthy()
 })
})
