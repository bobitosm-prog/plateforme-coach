// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/fr.json'
import LoginPageContent from '@/app/(application)/login/LoginPageContent'
const m = vi.hoisted(() => ({ query: '', session: null as null | { user: { id: string } }, replace: vi.fn(), resolve: vi.fn() }))
vi.mock('@/lib/auth/apple-sign-in', () => ({ signInWithApple: vi.fn() }))
vi.mock('@/lib/auth/client-post-auth', () => ({ resolveClientPostAuth: m.resolve }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: m.replace }), useSearchParams: () => new URLSearchParams(m.query) }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@supabase/ssr', () => ({ createBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: m.session } }) } }) }))
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal('React', React); m.query = ''; m.session = null
  Object.assign(window, { __moovxNativeWelcome: true })
})
afterEach(() => { cleanup(); delete (window as any).__moovxNativeWelcome; vi.unstubAllGlobals() })
function setup() {
  render(React.createElement(NextIntlClientProvider, { locale: 'fr', messages, timeZone: 'Europe/Zurich', children: React.createElement(LoginPageContent) }))
}
it('presents registration and login immediately without a login form', async () => {
  setup()
  await screen.findByRole('button', { name: 'Créer mon compte' })
  expect(screen.getByRole('button', { name: 'Me connecter' })).toBeTruthy()
  expect(screen.queryByPlaceholderText(messages.auth.login.emailPlaceholder)).toBeNull()
})
it('returns from login to the internal welcome screen without following the marketing link', async () => {
  setup(); fireEvent.click(await screen.findByRole('button', { name: 'Me connecter' }))
  await screen.findByPlaceholderText(messages.auth.login.emailPlaceholder)
  const prevented = !fireEvent.click(screen.getByText(messages.auth.login.backToHome))
  expect(prevented).toBe(true)
  await screen.findByRole('button', { name: 'Créer mon compte' })
})
it('opens login directly after email confirmation', async () => {
  m.query = 'confirmed=1'; setup()
  await screen.findByPlaceholderText(messages.auth.login.emailPlaceholder)
  expect(screen.queryByRole('button', { name: 'Créer mon compte' })).toBeNull()
})
it('preserves authenticated routing instead of showing the welcome screen', async () => {
  m.session = { user: { id: 'synthetic-user' } }; m.resolve.mockResolvedValue({ decision: { route: '/?tab=home' } }); setup()
  await waitFor(() => expect(m.replace).toHaveBeenCalledWith('/?tab=home'))
  expect(screen.queryByRole('button', { name: 'Créer mon compte' })).toBeNull()
})
