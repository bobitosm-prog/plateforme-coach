type Variant = 'gold' | 'emerald' | 'rose' | 'zinc' | 'amber'

const VARIANTS: Record<Variant, { bg: string; color: string; border: string }> = {
  gold:    { bg: 'rgba(212, 168, 67, 0.1)',  color: '#d4a843', border: 'rgba(212, 168, 67, 0.25)' },
  emerald: { bg: 'rgba(52, 211, 153, 0.1)',  color: '#5eead4', border: 'rgba(52, 211, 153, 0.25)' },
  rose:    { bg: 'rgba(244, 63, 94, 0.1)',   color: '#fb7185', border: 'rgba(244, 63, 94, 0.25)' },
  amber:   { bg: 'rgba(245, 158, 11, 0.1)',  color: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)' },
  zinc:    { bg: 'rgba(208, 197, 178, 0.08)', color: '#d0c5b2', border: 'rgba(208, 197, 178, 0.18)' },
}

interface Props {
  children: React.ReactNode
  variant?: Variant
  onClick?: () => void
  className?: string
}

export function StatusBadge({ children, variant = 'zinc', onClick, className = '' }: Props) {
  const v = VARIANTS[variant]
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md tabular-nums ${className}`}
      style={{
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        fontSize: '0.65rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-body), Outfit, sans-serif',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'filter 0.15s ease',
      }}
    >
      {children}
    </Tag>
  )
}

export function roleVariant(role: string | null): Variant {
  switch (role) {
    case 'admin':       return 'gold'
    case 'coach':       return 'emerald'
    case 'client':      return 'zinc'
    case 'super_admin': return 'gold'
    default:            return 'zinc'
  }
}

export function subscriptionVariant(type: string | null): Variant {
  switch (type) {
    case 'lifetime':       return 'gold'
    case 'client_monthly': return 'emerald'
    case 'trial':          return 'amber'
    case 'invited':        return 'zinc'
    default:               return 'zinc'
  }
}
