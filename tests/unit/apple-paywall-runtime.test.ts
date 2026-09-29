// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/fr.json'
import Paywall from '@/app/components/Paywall'
const native = vi.hoisted(() => ({ detect: vi.fn(), products: vi.fn(), purchase: vi.fn() }))
vi.mock('@/lib/apple/native-purchases', () => ({ isNativeMoovx: native.detect, applePurchaseBridge: () => ({}), loadNativeAppleProducts: native.products, nativeApplePurchase: native.purchase }))
beforeEach(() => {
  vi.stubGlobal('React', React)
  native.detect.mockReturnValue(true)
  native.products.mockResolvedValue(['monthly', 'yearly', 'lifetime'].map((plan, i) => ({ id: `ch.moovx.app.athena.${plan}`, displayPrice: ['CHF 10.00', 'CHF 80.00', 'CHF 150.00'][i] })))
  native.purchase.mockResolvedValue({ status: 'pending', count: 0, sandbox: false })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })
const mount = () => render(React.createElement(NextIntlClientProvider, { locale: 'fr', messages, timeZone: 'Europe/Zurich', children: React.createElement(Paywall, { role: 'client', userId: 'user-a', onSignOut: vi.fn() }) }))
describe('iPhone purchase screen runtime', () => {
  it('renders localized Apple prices and purchases only after an explicit click', async () => {
    mount()
    await screen.findByText('CHF 80.00 / an')
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
  it('offers an explicit restore action and keeps recovery available after failure', async () => {
    native.purchase.mockRejectedValue(new Error('offline'))
    mount()
    const restore = await screen.findByRole('button', { name: 'Restaurer mes achats' })
    fireEvent.click(restore)
    await screen.findByText(/Impossible de confirmer ton achat/)
    await waitFor(() => expect((restore as HTMLButtonElement).disabled).toBe(false))
    expect(native.purchase).toHaveBeenCalledWith('user-a', 'restore', undefined)
  })
})
