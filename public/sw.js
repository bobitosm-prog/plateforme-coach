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

self.addEventListener('fetch', event => {
  // Skip non-GET requests entirely
  if (event.request.method !== 'GET') {
    return
  }
  // Skip Supabase API calls - always fetch fresh
  if (event.request.url.includes('supabase.co')) {
    return
  }
  // Cache-first for static assets only
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open('fitpro-v1').then(cache => cache.put(event.request, clone))
        }
        return response
      })
    })
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
