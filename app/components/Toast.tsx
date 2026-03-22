'use client'
import type { ToastItem } from '../../lib/hooks/useToast'

const COLORS: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', text: '#22C55E' },
  error:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' },
  info:    { bg: 'rgba(201,168,76,0.12)', border: 'rgba(201,168,76,0.3)', text: '#C9A84C' },
}

export default function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null
  return (
    <div style={{ position: 'fixed', bottom: 80, left: 0, right: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
      {toasts.map((t, i) => {
        const c = COLORS[t.type] || COLORS.info
        return (
          <div
            key={t.id}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              background: c.bg,
              border: `1px solid ${c.border}`,
              backdropFilter: 'blur(12px)',
              color: c.text,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              animation: t.exiting ? 'toastOut 300ms ease forwards' : 'toastIn 300ms ease forwards',
              pointerEvents: 'auto',
            }}
          >
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
