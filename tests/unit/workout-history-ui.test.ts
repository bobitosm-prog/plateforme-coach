// @vitest-environment jsdom
import * as React from 'react'
import { cleanup, render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RecentSessionsList from '@/app/components/training/RecentSessionsList'
vi.mock('next-intl', () => ({useLocale: () => 'fr', useTranslations: () => (key: string, values?: {count:number}) => values ? `${key}:${values.count}` : key}))
const rows = Array.from({length:119},(_,i)=>({id:String(i),name:`Séance ${i}`,created_at:'2026-09-18T05:00:00',completed:true,muscles_worked:['Épaules, Biceps']}))
beforeEach(() => { vi.stubGlobal('React',React); HTMLElement.prototype.scrollIntoView = vi.fn() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('history dialog runtime', () => {
  it('filters the complete history, expands beyond 20 and opens details outside the sheet', async () => {
    const detail = vi.fn()
    render(React.createElement(RecentSessionsList,{workoutHistory:rows.slice(0,90),state:'ready',loadHistory:vi.fn().mockResolvedValue(rows),onOpenDetail:detail}))
    fireEvent.click(screen.getByRole('button',{name:'viewAll'}))
    await screen.findByText('historyTotal:119')
    fireEvent.click(screen.getByRole('button',{name:'filters.epaules'}))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getAllByRole('button').filter(b=>b.textContent?.includes('Séance '))).toHaveLength(20)
    fireEvent.click(dialog.getByRole('button',{name:'showMore'}))
    expect(dialog.getAllByRole('button').filter(b=>b.textContent?.includes('Séance '))).toHaveLength(40)
    fireEvent.click(dialog.getByRole('button',{name:/Séance 39 /}))
    expect(detail).toHaveBeenCalledWith(rows[39])
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('shows an error and supports retry instead of claiming zero sessions', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(rows)
    render(React.createElement(RecentSessionsList,{workoutHistory:rows.slice(0,3),state:'ready',loadHistory:load,onOpenDetail:vi.fn()}))
    fireEvent.click(screen.getByRole('button',{name:'viewAll'}))
    await screen.findByRole('alert')
    expect(screen.queryByText('noSessions')).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'retry'}))
    await screen.findByText('historyTotal:119')
  })
  it('cancels a pending read when the dialog closes', async () => {
    let signal: AbortSignal | undefined
    const load = vi.fn((s: AbortSignal) => {signal=s; return new Promise<never>(()=>{})})
    render(React.createElement(RecentSessionsList,{workoutHistory:rows.slice(0,3),state:'ready',loadHistory:load,onOpenDetail:vi.fn()}))
    fireEvent.click(screen.getByRole('button',{name:'viewAll'}))
    await waitFor(()=>expect(load).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button',{name:'closeTools'}))
    expect(signal?.aborted).toBe(true)
  })
})
