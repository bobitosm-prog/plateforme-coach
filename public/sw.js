// MoovX Service Worker — PUSH-ONLY (no cache, no fetch interception)
// History: cache-first SW killed in 6183951 (page perimee bug).
// This SW exists solely to receive web push notifications.

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  // Purge all residual caches from old SWs (moovx-v3/v4/v5 on existing devices)
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.map(function (name) {
          return caches.delete(name);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data.json();
  } catch {
    // Fallback if payload is not valid JSON
  }
  var title = data.title || 'MoovX';
  var options = {
    body: data.body || '',
    tag: data.tag || 'moovx-msg',
    icon: '/logo-moovx-192.png',
    badge: '/logo-moovx-192.png',
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

function safeNotificationDestination(value) {
  if (typeof value !== 'string') return '/';
  var layer = value;
  for (var depth = 0; depth < 5; depth++) {
    if (!layer || layer !== layer.trim() || /\s/.test(layer) || /[\u0000-\u001f\u007f-\u009f]/.test(layer)) return '/';
    if (layer.indexOf('\\') !== -1 || layer.charAt(0) !== '/' || layer.indexOf('//') === 0) return '/';
    try {
      var decoded = decodeURIComponent(layer);
      if (decoded === layer) return value;
      layer = decoded;
    } catch {
      return '/';
    }
  }
  return '/';
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = safeNotificationDestination(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          return client.navigate(url).then(function (c) { return c.focus(); });
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
