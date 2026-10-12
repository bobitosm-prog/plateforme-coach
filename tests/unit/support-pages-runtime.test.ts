// @vitest-environment jsdom
import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/app/hooks/useMessageImageUpload', () => ({ useMessageImageUpload: () => ({ uploadImage: vi.fn(), uploading: false }) }))
vi.mock('@/app/components/MessageImage', () => ({ default: () => React.createElement('img', { alt: 'Image jointe' }) }))
vi.mock('@/app/hooks/useMyFeedbackBadge', () => ({ useMyFeedbackBadge: () => 1 }))
const feedback = vi.hoisted(() => ({ reports: [] as any[], loading: false, error: null as string | null, refetch: vi.fn() }))
vi.mock('@/app/hooks/useMyFeedback', () => ({ useMyFeedback: () => feedback }))
import MessagesTab from '@/app/components/tabs/MessagesTab'
import FeedbackTab from '@/app/components/client/FeedbackTab'
import BugReport from '@/app/components/BugReport'
beforeEach(() => { feedback.reports = []; feedback.loading = false; feedback.error = null; Element.prototype.scrollIntoView = vi.fn() })
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })
const session = { user: { id: 'fixture-user' } } as any
const base = { session, supabase: {}, coachId: 'fixture-coach', messages: [], msgInput: '', setMsgInput: vi.fn(), sendMessage: vi.fn().mockResolvedValue(undefined), msgEndRef: React.createRef<HTMLDivElement>(), onBack: vi.fn() }
it('messages preserves editing, send, and account return without claiming live presence', async () => {
 const { rerender } = render(React.createElement(MessagesTab, base))
 expect(screen.queryByText('En ligne')).toBeNull()
 expect((screen.getByRole('button', { name: 'Envoyer le message' }) as HTMLButtonElement).disabled).toBe(true)
 fireEvent.change(screen.getByRole('textbox', { name: 'Écrire un message' }), { target: { value: 'Bonjour' } })
 expect(base.setMsgInput).toHaveBeenCalledWith('Bonjour')
 rerender(React.createElement(MessagesTab, { ...base, msgInput: 'Bonjour' }))
 await React.act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Envoyer le message' })) })
 expect(base.sendMessage).toHaveBeenCalledWith(null)
 fireEvent.click(screen.getByRole('button', { name: 'backToAccount' }))
 expect(base.onBack).toHaveBeenCalled()
})
it('messages keeps the no-coach state and renders both message directions', () => {
 const { rerender } = render(React.createElement(MessagesTab, { ...base, coachId: null }))
 expect(screen.getByText(/Aucun coach/)).toBeDefined()
 expect(screen.queryByRole('textbox')).toBeNull()
 rerender(React.createElement(MessagesTab, { ...base, messages: [{ id: '1', sender_id: 'fixture-user', content: 'Message envoyé', created_at: '2026-10-12T08:00:00Z', read: true }, { id: '2', sender_id: 'fixture-coach', content: 'Réponse reçue', created_at: '2026-10-12T08:01:00Z' }] }))
 expect(screen.getByText('Message envoyé')).toBeDefined()
 expect(screen.getByText('Réponse reçue')).toBeDefined()
})
it('reports exposes loading, error retry, empty instructions, and replies', () => {
 feedback.loading = true
 const { rerender } = render(React.createElement(FeedbackTab, { onBack: vi.fn() }))
 expect(screen.getByRole('status')).toBeDefined()
 feedback.loading = false; feedback.error = 'Indisponible'
 rerender(React.createElement(FeedbackTab, { onBack: vi.fn() }))
 expect(screen.getByRole('alert').textContent).toContain('Indisponible')
 fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
 expect(feedback.refetch).toHaveBeenCalled()
 feedback.error = null
 rerender(React.createElement(FeedbackTab, { onBack: vi.fn() }))
 expect(screen.getByText(/Depuis Compte/)).toBeDefined()
 feedback.reports = [{ id: 'r1', type: 'bug', title: 'Rapport test', description: 'Description test', created_at: '2026-10-12T08:00:00Z', admin_reply: 'Correction disponible', status: 'resolu', read_by_user: false }]
 rerender(React.createElement(FeedbackTab, { onBack: vi.fn() }))
 expect(screen.getByText('Correction disponible')).toBeDefined()
 expect(screen.getByText('Résolu')).toBeDefined()
})
it('report modal keeps history, validated submission payload, and close', async () => {
 const request = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', request)
 const close = vi.fn()
 render(React.createElement(BugReport, { session, open: true, onOpenChange: close }))
 fireEvent.click(screen.getByRole('button', { name: /Mes rapports/ }))
 expect(screen.getByText(/Aucun rapport/)).toBeDefined()
 fireEvent.click(screen.getByRole('button', { name: 'Nouveau rapport' }))
 expect((screen.getByRole('button', { name: 'Envoyer le rapport' }) as HTMLButtonElement).disabled).toBe(true)
 fireEvent.click(screen.getByRole('button', { name: 'Suggestion' }))
 fireEvent.change(screen.getByRole('textbox', { name: 'Titre du rapport' }), { target: { value: 'Test visuel' } })
 fireEvent.change(screen.getByRole('textbox', { name: 'Description du rapport' }), { target: { value: 'Données fictives' } })
 await React.act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Envoyer le rapport' })) })
 expect(request).toHaveBeenCalledTimes(1)
 expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ type: 'amelioration', title: 'Test visuel', description: 'Données fictives' })
 fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
 expect(close).toHaveBeenCalledWith(false)
})
