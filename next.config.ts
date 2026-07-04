import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  // AVIF first (5-10x compression vs PNG), WebP fallback navigateurs anciens.
  // Quality default 75 = sweet spot Vercel/Next, ne pas surcharger.
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'

    const cspDirectives = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://js.stripe.com https://*.stripe.com https://*.vercel-insights.com https://vercel-scripts.com https://*.vercel-scripts.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com https://app.moovx.ch https://moovx.ch https://*.googleusercontent.com`,
      `font-src 'self' data: https://fonts.gstatic.com`,
      `connect-src 'self' https://app.moovx.ch https://moovx.ch https://api.stripe.com https://*.stripe.com https://*.supabase.co wss://*.supabase.co https://*.vercel-insights.com`,
      `media-src 'self' https://*.supabase.co blob:`,
      `frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.stripe.com`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self' https://checkout.stripe.com`,
      ...(!isDev ? [`upgrade-insecure-requests`] : []),
    ].join('; ')

    // Private/auth routes: noindex via X-Robots-Tag (robots.txt blocks crawl but not indexing)
    const noindexPaths = [
      '/login', '/register-client', '/join',
      '/admin/:path*', '/coach/:path*', '/client/:path*',
      '/onboarding/:path*', '/onboarding-v2/:path*', '/onboarding-coach/:path*',
      '/onboarding-fitness/:path*', '/onboarding-photo/:path*',
      '/weekly-diagnostic/:path*',
    ]

    return [
      ...noindexPaths.map(source => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          ...(!isDev ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }] : []),
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()'
          },
        ],
      },
    ]
  },
};

export default withNextIntl(nextConfig);
