import { describe, expect, it, vi } from 'vitest'
import { setupBillingProducts, type BillingProductPort } from '@/lib/billing/products'

function port(): BillingProductPort {
  let product = 0
  let price = 0
  return {
    createProduct: vi.fn(async () => ({ id: `prod_${++product}` })),
    createPrice: vi.fn(async () => ({ id: `price_${++price}` })),
  }
}

describe('Billing product setup service', () => {
  it('preserves the historical products, prices and public result', async () => {
    const stripe = port()
    const result = await setupBillingProducts(stripe)

    expect(stripe.createProduct).toHaveBeenNthCalledWith(1, {
      name: 'MoovX Athena',
      description: 'Coaching fitness IA - Nutrition + Training + Suivi',
    })
    expect(stripe.createProduct).toHaveBeenNthCalledWith(2, {
      name: 'MoovX Coach Pro',
      description: 'Dashboard coach - Clients illimités + IA',
    })
    expect(stripe.createPrice).toHaveBeenCalledTimes(4)
    expect(stripe.createPrice).toHaveBeenNthCalledWith(1, { product: 'prod_1', unitAmount: 1000, currency: 'chf', interval: 'month' })
    expect(stripe.createPrice).toHaveBeenNthCalledWith(2, { product: 'prod_1', unitAmount: 8000, currency: 'chf', interval: 'year' })
    expect(stripe.createPrice).toHaveBeenNthCalledWith(3, { product: 'prod_1', unitAmount: 15000, currency: 'chf' })
    expect(stripe.createPrice).toHaveBeenNthCalledWith(4, { product: 'prod_2', unitAmount: 5000, currency: 'chf', interval: 'month' })
    expect(result).toEqual({
      message: 'Products and prices created successfully',
      prices: {
        PRICE_CLIENT_MONTHLY: 'price_1',
        PRICE_CLIENT_YEARLY: 'price_2',
        PRICE_CLIENT_LIFETIME: 'price_3',
        PRICE_COACH_MONTHLY: 'price_4',
      },
      note: 'Add these price IDs to your .env.local and Vercel environment variables',
    })
  })

  it('stops immediately when the provider fails', async () => {
    const stripe = port()
    vi.mocked(stripe.createPrice).mockRejectedValueOnce(new Error('synthetic provider failure'))
    await expect(setupBillingProducts(stripe)).rejects.toThrow('synthetic provider failure')
    expect(stripe.createProduct).toHaveBeenCalledOnce()
  })
})
