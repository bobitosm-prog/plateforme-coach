// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/fr.json'
import Paywall from '@/app/components/Paywall'
const native = vi.hoisted(() => ({ detect: vi.fn(), products: vi.fn(), purchase: vi.fn() }))
vi.mock('@/lib/apple/native-purchases', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/apple/native-purchases')>(), isNativeMoovx: native.detect, applePurchaseBridge: () => ({}), loadNativeAppleProducts: native.products, nativeApplePurchase: native.purchase }))
beforeEach(() => {
  vi.stubGlobal('React', React)
  native.detect.mockReturnValue(true)
  native.products.mockResolvedValue(['monthly', 'yearly'].map((plan, i) => ({ id: `ch.moovx.app.athena.${plan}`, displayPrice: ['CHF 9.90', 'CHF 79.90'][i] })))
  native.purchase.mockResolvedValue({ status: 'pending', count: 0, sandbox: false })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })
const mount = () => render(React.createElement(NextIntlClientProvider, { locale: 'fr', messages, timeZone: 'Europe/Zurich', children: React.createElement(Paywall, { role: 'client', userId: 'user-a', onSignOut: vi.fn() }) }))
describe('iPhone purchase screen runtime', () => {
  it('renders localized Apple prices and purchases only after an explicit click', async () => {
    mount()
    await screen.findByText((_, element) => element?.tagName === 'P' && element.textContent === 'CHF 79.90 / an')
    expect(screen.getAllByRole('button', { name: 'Continuer avec Apple' })).toHaveLength(2)
    expect(screen.queryByText('À vie')).toBeNull()
    expect(native.purchase).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: 'Continuer avec Apple' })[0])
    await screen.findByText('Achat en attente de validation Apple.')
    expect(native.purchase).toHaveBeenCalledWith('user-a', 'purchase', 'ch.moovx.app.athena.monthly')
  })
  it('does not sell the client catalogue as the Coach offer', async () => {
    render(React.createElement(NextIntlClientProvider, { locale: 'fr', messages, timeZone: 'Europe/Zurich', children: React.createElement(Paywall, { role: 'coach', userId: 'coach', onSignOut: vi.fn() }) }))
    await screen.findByText(/Les achats Apple ne sont pas encore disponibles/)
    expect(native.products).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Continuer avec Apple' })).toBeNull()
  })
  it('explains pre-purchase unavailability without claiming a purchase needs restoring', async () => {
    native.purchase.mockRejectedValue(new Error('APPLE_UNAVAILABLE'))
    mount()
    const buttons = await screen.findAllByRole('button', { name: 'Continuer avec Apple' })
    fireEvent.click(buttons[0])
    const chosenOffer = buttons[0].closest('article')!
    await within(chosenOffer).findByText(/Les achats Apple ne sont pas encore disponibles/)
    expect(within(chosenOffer).getByRole('status').textContent).toContain('Les achats Apple')
    expect(screen.queryByText(/Impossible de confirmer ton achat/)).toBeNull()
    await waitFor(() => expect((buttons[0] as HTMLButtonElement).disabled).toBe(false))
  })
  it('offers an explicit restore action and keeps recovery available after failure', async () => {
    native.purchase.mockRejectedValue(new Error('offline'))
    mount()
    const restore = await screen.findByRole('button', { name: 'Restaurer mes achats' })
    fireEvent.click(restore)
    await screen.findByText(/L’achat Apple n’a pas abouti/)
    await waitFor(() => expect((restore as HTMLButtonElement).disabled).toBe(false))
    expect(native.purchase).toHaveBeenCalledWith('user-a', 'restore', undefined)
  })
})
