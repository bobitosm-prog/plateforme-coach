import {
  BG_BASE,
  FONT_ALT,
  FONT_BODY,
  FONT_DISPLAY,
  GOLD,
  GOLD_RULE,
  RED,
  TEXT_MUTED,
} from '@/lib/design-tokens'

type DomainErrorViewProps = {
  readonly description: string
  readonly navigationLabel: string
  readonly onNavigate: () => void
  readonly onRetry: () => void
  readonly resetFailed: boolean
  readonly retryLabel: string
  readonly retrying: boolean
  readonly title: string
}

export default function DomainErrorView({
  description,
  navigationLabel,
  onNavigate,
  onRetry,
  resetFailed,
  retryLabel,
  retrying,
  title,
}: DomainErrorViewProps) {
  return (
    <main
      aria-live="assertive"
      data-critical-domain-error
      role="alert"
      style={{
        alignItems: 'center',
        background: BG_BASE,
        color: TEXT_MUTED,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT_BODY,
        justifyContent: 'center',
        minHeight: '100dvh',
        padding: '32px 20px',
        textAlign: 'center',
      }}
    >
      <style>{`
        [data-critical-domain-error] button {
          min-height: 44px;
          transition: border-color 120ms ease, color 120ms ease;
        }
        [data-critical-domain-error] button:focus-visible {
          outline: 3px solid #f4ead7;
          outline-offset: 3px;
        }
        [data-critical-domain-error] button:disabled {
          cursor: wait;
          opacity: 0.7;
        }
        @media (prefers-reduced-motion: reduce) {
          [data-critical-domain-error] button {
            transition: none;
          }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          alignItems: 'center',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12,
          color: RED,
          display: 'flex',
          fontSize: '1.8rem',
          height: 64,
          justifyContent: 'center',
          marginBottom: 20,
          width: 64,
        }}
      >
        !
      </div>
      <h1
        style={{
          color: RED,
          fontFamily: FONT_DISPLAY,
          fontSize: 'clamp(1.8rem, 7vw, 2.5rem)',
          letterSpacing: 2,
          margin: '0 0 12px',
        }}
      >
        {title}
      </h1>
      <p style={{ lineHeight: 1.6, margin: '0 0 28px', maxWidth: 440 }}>
        {description}
      </p>
      {resetFailed && (
        <p aria-live="polite" style={{ color: RED, margin: '0 0 20px', maxWidth: 440 }}>
          Le nouvel essai n’a pas abouti. Utilise le bouton de retour.
        </p>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
        }}
      >
        <button
          disabled={retrying}
          onClick={onRetry}
          type="button"
          style={{
            background: GOLD,
            border: 'none',
            borderRadius: 12,
            color: BG_BASE,
            cursor: 'pointer',
            fontFamily: FONT_ALT,
            fontSize: '0.95rem',
            fontWeight: 800,
            letterSpacing: 1,
            padding: '12px 24px',
          }}
        >
          {retrying ? 'NOUVEL ESSAI…' : retryLabel}
        </button>
        <button
          onClick={onNavigate}
          type="button"
          style={{
            background: 'transparent',
            border: `1px solid ${GOLD_RULE}`,
            borderRadius: 12,
            color: TEXT_MUTED,
            cursor: 'pointer',
            fontFamily: FONT_ALT,
            fontSize: '0.95rem',
            fontWeight: 700,
            padding: '12px 24px',
          }}
        >
          {navigationLabel}
        </button>
      </div>
    </main>
  )
}
