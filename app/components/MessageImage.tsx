'use client'

import { useState } from 'react'
import { useSignedUrl } from '../hooks/useSignedUrl'
import { BG_CARD, BORDER, TEXT_PRIMARY } from '../../lib/design-tokens'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function MessageImage({ supabase, path, caption }: { supabase: any; path: string; caption?: string }) {
  const { url, loading } = useSignedUrl(supabase, path)
  const [zoomed, setZoomed] = useState(false)

  if (loading) {
    return <div style={{ width: 240, height: 180, background: BG_CARD, borderRadius: 8, border: `1px solid ${BORDER}`, animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
  }
  if (!url) return null

  return (
    <>
      <img
        src={url}
        alt="Image jointe"
        onClick={() => setZoomed(true)}
        style={{ maxWidth: 240, maxHeight: 320, borderRadius: 8, cursor: 'zoom-in', display: 'block', marginBottom: caption ? 4 : 0 }}
      />
      {caption && <div style={{ fontSize: '0.82rem', color: TEXT_PRIMARY, marginTop: 2 }}>{caption}</div>}
      {zoomed && (
        <div onClick={() => setZoomed(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}>
          <img src={url} alt="Image jointe" style={{ maxWidth: '95vw', maxHeight: '95vh', borderRadius: 4 }} />
        </div>
      )}
    </>
  )
}
