// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/fr.json'
import RegisterClientContent from '@/app/(application)/register-client/RegisterClientContent'

const m = vi.hoisted(() => ({ apple: vi.fn(), rpc: vi.fn(), replace: vi.fn(), resolve: vi.fn(), oauth: vi.fn() }))
vi.mock('@/lib/auth/apple-sign-in', () => ({ signInWithApple: m.apple }))
vi.mock('@/lib/auth/client-post-auth', () => ({ resolveClientPostAuth: m.resolve }))
vi.mock('@/app/components/LegalDocumentDialog', () => ({ default: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: m.replace, push: vi.fn() }), useSearchParams: () => new URLSearchParams('role=client') }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@supabase/ssr', () => ({ createBrowserClient: () => ({
  auth: { getSession: async () => ({ data: { session: null } }), signInWithOAuth: m.oauth },
  rpc: m.rpc,
}) }))

beforeEach(() => {
  vi.resetAllMocks()
  Object.defineProperty(window, '__moovxNativeApp', { configurable: true, value: true })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  m.apple.mockResolvedValue({ kind: 'signed-in', user: { id: 'synthetic-user' } })
  m.rpc.mockResolvedValue({ data: { set: true }, error: null })
  m.resolve.mockResolvedValue({ decision: { route: '/onboarding-v2' } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Reflect.deleteProperty(window, '__moovxNativeApp') })

it('registers natively with Apple, initializes the guarded role, then opens onboarding', async () => {
  render(React.createElement(NextIntlClientProvider, { locale: 'fr', messages, timeZone: 'Europe/Zurich', children: React.createElement(RegisterClientContent) }))
  fireEvent.click((await screen.findAllByRole('radio'))[0])
  const apple = await screen.findByRole('button', { name: /Apple/ })
  await waitFor(() => expect(screen.queryByRole('button', { name: /Google/ })).toBeNull())
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(apple)
  await waitFor(() => expect(m.replace).toHaveBeenCalledWith('/onboarding-v2'))
  expect(m.apple).toHaveBeenCalledOnce()
  expect(m.rpc).toHaveBeenCalledWith('set_role', { p_role: 'client' })
  expect(m.resolve).toHaveBeenCalledWith(expect.objectContaining({ user: { id: 'synthetic-user' } }))
  expect(m.oauth).not.toHaveBeenCalled()
})

it('does not enter the app when the guarded role assignment fails', async () => {
  m.rpc.mockResolvedValue({ data: { set: false, reason: 'not_eligible' }, error: null })
  render(React.createElement(NextIntlClientProvider, { locale: 'fr', messages, timeZone: 'Europe/Zurich', children: React.createElement(RegisterClientContent) }))
  fireEvent.click((await screen.findAllByRole('radio'))[0])
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: /Apple/ }))
  await screen.findByRole('alert')
  expect(m.replace).not.toHaveBeenCalled()
  expect(m.resolve).not.toHaveBeenCalled()
})
