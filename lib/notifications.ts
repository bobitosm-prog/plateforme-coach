export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export async function showNotification(title: string, body: string) {
  if (!(await requestNotificationPermission())) return
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(title, {
      body, icon: '/icon-192x192.png', badge: '/icon-192x192.png',
      tag: 'moovx-reminder', renotify: true,
      data: { url: '/' },
    } as any)
  } catch {
    try { new Notification(title, { body, icon: '/icon-192x192.png' }) } catch {}
  }
}

export function checkAndShowReminder(userId: string, profile: any): (() => void) | undefined {
  if (!profile?.reminder_enabled) return
  const time = profile.preferred_training_time || '08:00'
  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  const delay = target.getTime() - now.getTime()

  // If reminder time already passed today, check if we should show now
  if (delay < 0 && delay > -3600000) {
    const lastKey = `moovx-reminder-${now.toISOString().split('T')[0]}`
    if (!localStorage.getItem(lastKey)) {
      localStorage.setItem(lastKey, '1')
      showNotification('C\'est l\'heure !', 'Ta seance t\'attend. Ne brise pas ta serie !')
    }
    return
  }

  // Schedule for later today
  if (delay > 0 && delay < 86400000) {
    const timer = setTimeout(() => {
      const lk = `moovx-reminder-${new Date().toISOString().split('T')[0]}`
      if (!localStorage.getItem(lk)) {
        localStorage.setItem(lk, '1')
        showNotification('C\'est l\'heure !', 'Ta seance t\'attend. Allez, on y va !')
      }
    }, delay)
    return () => clearTimeout(timer)
  }
}
