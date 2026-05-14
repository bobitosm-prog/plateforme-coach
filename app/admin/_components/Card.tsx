interface Props {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  action?: React.ReactNode
}

export function Card({ children, className = '', title, description, action }: Props) {
  return (
    <div className={`bg-[#15110B] border border-amber-900/15 rounded-2xl overflow-hidden ${className}`}>
      {(title || description || action) && (
        <div className="px-6 py-5 border-b border-amber-900/10 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">{title}</h3>
            )}
            {description && (
              <p className="text-[11px] text-zinc-500 mt-0.5">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
