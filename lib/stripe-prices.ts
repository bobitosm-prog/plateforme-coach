export const PRICES = {
  CLIENT_MONTHLY: process.env.NEXT_PUBLIC_PRICE_CLIENT_MONTHLY || 'price_client_monthly',
  CLIENT_YEARLY: process.env.NEXT_PUBLIC_PRICE_CLIENT_YEARLY || 'price_client_yearly',
  CLIENT_LIFETIME: process.env.NEXT_PUBLIC_PRICE_CLIENT_LIFETIME || 'price_client_lifetime',
  COACH_MONTHLY: process.env.NEXT_PUBLIC_PRICE_COACH_MONTHLY || 'price_coach_monthly',
} as const

export const PLAN_DETAILS = {
  client_monthly: { name: 'Mensuel', price: 10, currency: 'CHF', interval: 'mois', priceId: PRICES.CLIENT_MONTHLY, mode: 'subscription' as const },
  client_yearly: { name: 'Annuel', price: 80, currency: 'CHF', interval: 'an', priceId: PRICES.CLIENT_YEARLY, mode: 'subscription' as const, badge: 'Populaire', savings: 'Économise 33%' },
  client_lifetime: { name: 'À vie', price: 150, currency: 'CHF', interval: null, priceId: PRICES.CLIENT_LIFETIME, mode: 'payment' as const, badge: 'Meilleure offre' },
  coach_monthly: { name: 'Coach Pro', price: 50, currency: 'CHF', interval: 'mois', priceId: PRICES.COACH_MONTHLY, mode: 'subscription' as const },
} as const
