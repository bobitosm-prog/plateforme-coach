// lib/push-resync.ts
// Re-synchronise la push subscription au boot, SILENCIEUSEMENT.
// Problème résolu : une sub Apple/navigateur peut périmer (MAJ SW, expiration
// Apple) sans que l'user le sache → il ne reçoit plus de notif et rien ne la
// régénère (le serveur ne fait que nettoyer les subs mortes, jamais recréer).
// Cas réel : f.marco, sub d'avril morte après recréation SW de juin.
//
// GARDES ABSOLUES :
//   - JAMAIS de popup de permission : on ne touche à rien si permission !== 'granted'
//   - JAMAIS de création pour un user qui n'avait pas activé : on exige une row DB existante
//   - JAMAIS de blocage du boot : best-effort, serviceWorker.ready borné par un timeout

import type { SupabaseClient } from '@supabase/supabase-js'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

// navigator.serviceWorker.ready peut pendre indéfiniment (incident 13/06).
// On le borne pour ne jamais bloquer.
function readyWithTimeout(ms: number): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

export async function resyncPushSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    // Garde 1 — support navigateur
    if (typeof window === 'undefined') return
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      return
    }

    // Garde 2 — permission déjà accordée. Sinon RIEN (zéro popup, jamais).
    if (Notification.permission !== 'granted') return

    // Garde 3 — l'user avait activé les notifs (une row existe). Sinon on ne crée rien.
    const { data: rows } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .limit(1)
    if (!rows || rows.length === 0) return

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    const reg = await readyWithTimeout(4000)
    if (!reg) return // SW pas prêt à temps → abandon silencieux, sans blocage

    const current = await reg.pushManager.getSubscription()

    // endpoint stocké en DB (subscription = JSON renvoyé par sub.toJSON())
    const dbEndpoint = (rows[0] as any)?.subscription?.endpoint as string | undefined
    const browserEndpoint = current?.endpoint

    // Cohérent : le navigateur a une sub ET son endpoint == DB → rien à faire.
    if (current && browserEndpoint && browserEndpoint === dbEndpoint) return

    // Sinon : sub navigateur absente OU endpoint divergent (cas f.marco) → réparer.
    const sub =
      current ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }))

    await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, subscription: sub.toJSON() },
        { onConflict: 'user_id' }
      )

    console.log('[push-resync] subscription re-synced for', userId.slice(0, 8))
  } catch (e) {
    // Best-effort : un échec de re-sync ne doit jamais perturber l'app.
    console.warn('[push-resync] skipped:', e)
  }
}
