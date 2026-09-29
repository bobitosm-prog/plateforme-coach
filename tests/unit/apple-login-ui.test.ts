// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/fr.json'
import LoginPageContent from '@/app/(application)/login/LoginPageContent'

const m = vi.hoisted(() => ({ apple: vi.fn(), replace: vi.fn(), resolve: vi.fn() }))
vi.mock('@/lib/auth/apple-sign-in', () => ({ signInWithApple: m.apple }))
vi.mock('@/lib/auth/client-post-auth', () => ({ resolveClientPostAuth: m.resolve }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: m.replace }), useSearchParams: () => new URLSearchParams('next=/join') }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@supabase/ssr', () => ({ createBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }) }))
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('React', React) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
async function setup() {
  render(React.createElement(NextIntlClientProvider, { locale: 'fr', messages, timeZone: 'Europe/Zurich', children: React.createElement(LoginPageContent) }))
  return screen.findByRole('button', { name: /Apple/ })
}
it('connects the Apple button to the native-aware flow and preserves invitation routing', async () => {
  const user = { id: 'synthetic-user' }
  m.apple.mockResolvedValue({ kind: 'signed-in', user })
  m.resolve.mockResolvedValue({ decision: { route: '/join' } })
  fireEvent.click(await setup())
  await waitFor(() => expect(m.replace).toHaveBeenCalledWith('/join'))
  expect(m.apple.mock.calls[0][1]).toContain('/auth/callback?next=%2Fjoin')
  expect(m.resolve).toHaveBeenCalledWith(expect.objectContaining({ user, joinIntent: true }))
})
it('allows retry after cancellation without navigating or reading another profile', async () => {
  m.apple.mockResolvedValue({ kind: 'cancelled' })
  const button = await setup()
  fireEvent.click(button)
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false))
  expect(m.replace).not.toHaveBeenCalled()
  expect(m.resolve).not.toHaveBeenCalled()
})
it('renders a translated error without leaking provider details', async () => {
  m.apple.mockRejectedValue(new Error('synthetic-private-detail'))
  fireEvent.click(await setup())
  await screen.findByText(messages.auth.login.callbackErrors.oauth_error)
  expect(screen.queryByText('synthetic-private-detail')).toBeNull()
  expect(m.replace).not.toHaveBeenCalled()
})
