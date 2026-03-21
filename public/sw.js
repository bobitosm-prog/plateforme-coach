const CACHE_NAME = 'fitpro-v2'
const STATIC_ASSETS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  // Only handle GET requests
  if (request.method !== 'GET') return
  // Skip Supabase and API calls
  if (request.url.includes('supabase.co') || request.url.includes('/api/')) return
  // Cache first for static, network first for pages
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
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
