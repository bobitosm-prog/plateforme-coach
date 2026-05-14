import { useEffect, useState } from 'react'

/**
 * Hook leger : recupere uniquement le compteur de reponses non lues.
 * Pour badge dans AccountTab sans charger toutes les donnees.
 */
export function useMyFeedbackBadge() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/feedback/mine', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setUnreadCount(data.unreadCount || 0)
      } catch {
        // Silent fail
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 60_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return unreadCount
}
