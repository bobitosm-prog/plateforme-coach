import { BG_BASE, BG_CARD, BORDER, FONT_ALT, GOLD, TEXT_MUTED } from '@/lib/design-tokens'

type DeferredContentFallbackProps = {
  readonly label?: string
  readonly overlay?: boolean
}

export default function DeferredContentFallback({
  label = 'Chargement…',
  overlay = false,
}: DeferredContentFallbackProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-deferred-content-fallback
      style={{
        alignItems: 'center',
        background: overlay ? 'rgba(13,11,8,0.88)' : BG_BASE,
        display: 'flex',
        inset: overlay ? 0 : undefined,
        justifyContent: 'center',
        minHeight: overlay ? '100dvh' : 180,
        padding: 24,
        position: overlay ? 'fixed' : 'relative',
        width: '100%',
        zIndex: overlay ? 999 : undefined,
      }}
    >
      <div
        style={{
          alignItems: 'center',
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          display: 'flex',
          gap: 10,
          minHeight: 48,
          padding: '12px 16px',
        }}
      >
        <span
          aria-hidden="true"
          style={{ background: GOLD, height: 8, width: 8 }}
        />
        <span
          style={{
            color: TEXT_MUTED,
            fontFamily: FONT_ALT,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
