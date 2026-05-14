interface Props {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
}

export function Card({ children, className = '', title, description }: Props) {
  return (
    <div className={`bg-[#16120D] border border-amber-900/15 rounded-2xl ${className}`}>
      {(title || description) && (
        <div className="px-6 py-5 border-b border-amber-900/10">
          {title && (
            <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          )}
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
