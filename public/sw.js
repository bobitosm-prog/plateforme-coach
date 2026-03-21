const CACHE_NAME = 'fitpro-v1'
const SUPABASE_CACHE_NAME = 'fitpro-supabase-v1'
const SUPABASE_CACHE_TTL_MS = 30_000 // 30 seconds
const APP_SHELL = ['/', '/coach', '/admin']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== SUPABASE_CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Only cache GET requests — POST/PATCH/PUT/DELETE cannot be cached
  if (event.request.method !== 'GET') return

  const { request } = event
  const url = new URL(request.url)

  // Network first for internal API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: 'Offline' }), {
        headers: { 'Content-Type': 'application/json' },
      }))
    )
    return
  }

  // Stale-while-revalidate with 30s TTL for Supabase GET requests
  if (url.hostname.includes('supabase') && request.method === 'GET') {
    event.respondWith(
      caches.open(SUPABASE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) {
          const age = Date.now() - Number(cached.headers.get('sw-cached-at') || 0)
          if (age < SUPABASE_CACHE_TTL_MS) return cached
        }
        const fresh = await fetch(request)
        if (fresh.ok) {
          const headers = new Headers(fresh.headers)
          headers.set('sw-cached-at', String(Date.now()))
          const toCache = new Response(await fresh.clone().arrayBuffer(), { status: fresh.status, headers })
          cache.put(request, toCache)
        }
        return fresh
      })
    )
    return
  }

  // Cache first for static assets
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return res
      }))
    )
    return
  }

  // Network first with cache fallback for pages
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return res
      })
      .catch(() => caches.match(request))
  )
})

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'FITPRO', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
