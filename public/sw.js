// MoovX Service Worker — minimal caching + push notifications
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open('moovx-v1').then((cache) => {
            cache.put(event.request, clone).catch(() => {})
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response('Offline', { status: 503 })
        })
      })
  )
})

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'MoovX', body: 'Nouvelle notification' }
  event.waitUntil(
    self.registration.showNotification(data.title || 'MoovX', {
      body: data.body || '',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      tag: 'moovx',
      renotify: true,
      data: { url: data.url || '/' },
    })
  )
})

// Handle notification click — open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data?.url || '/')
    })
  )
})
