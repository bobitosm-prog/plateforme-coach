// MoovX Service Worker — caching + push notifications
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open('moovx-v3').then((cache) => {
            cache.put(event.request, clone).catch(() => {})
          })
        }
        return response
      })
      .catch(() => caches.match(event.request).then(c => c || new Response('Offline', { status: 503 })))
  )
})

// Push notification received
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'MoovX', body: 'Nouvelle notification' }
  event.waitUntil(
    self.registration.showNotification(data.title || 'MoovX', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'moovx-notif',
      renotify: true,
      data: { url: data.url || '/' },
    })
  )
})

// Notification clicked — open/focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
