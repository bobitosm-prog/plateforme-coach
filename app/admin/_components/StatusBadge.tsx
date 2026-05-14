type Variant = 'gold' | 'emerald' | 'rose' | 'zinc' | 'amber'

const VARIANTS: Record<Variant, string> = {
  gold:    'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  emerald: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
  rose:    'bg-rose-400/10 text-rose-300 ring-rose-400/20',
  amber:   'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  zinc:    'bg-zinc-400/10 text-zinc-300 ring-zinc-400/20',
}

interface Props {
  children: React.ReactNode
  variant?: Variant
  onClick?: () => void
  className?: string
}

export function StatusBadge({ children, variant = 'zinc', onClick, className = '' }: Props) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium
        ring-1 tabular-nums
        ${VARIANTS[variant]}
        ${onClick ? 'cursor-pointer hover:brightness-125 transition' : ''}
        ${className}
      `}
    >
      {children}
    </Tag>
  )
}

/** Mapper helpers pour les valeurs DB */
export function roleVariant(role: string | null): Variant {
  switch (role) {
    case 'admin':         return 'gold'
    case 'coach':         return 'emerald'
    case 'client':        return 'zinc'
    case 'super_admin':   return 'gold'
    default:              return 'zinc'
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
