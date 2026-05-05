'use client'

import { useState, useEffect } from 'react'

const cache = new Map<string, { url: string; expires: number }>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSignedUrl(supabase: any, path: string | null, expiresIn = 3600) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!path) return
    const cached = cache.get(path)
    if (cached && cached.expires > Date.now()) { Promise.resolve().then(() => { setUrl(cached.url); setLoading(false) }); return }
    let cancelled = false
    supabase.storage.from('message-media').createSignedUrl(path, expiresIn)
      .then(({ data, error }: { data: { signedUrl: string } | null; error: unknown }) => {
        if (cancelled) return
        if (error || !data) { console.error('[useSignedUrl] createSignedUrl failed:', (error as any)?.message || 'no data', 'path:', path); setUrl(null) }
        else {
          cache.set(path, { url: data.signedUrl, expires: Date.now() + (expiresIn - 60) * 1000 })
          setUrl(data.signedUrl)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [supabase, path, expiresIn])

  return { url, loading }
}
