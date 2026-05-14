interface Props {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  action?: React.ReactNode
}

export function Card({ children, className = '', title, description, action }: Props) {
  return (
    <div className={`admin-card overflow-hidden ${className}`}>
      {(title || description || action) && (
        <div
          className="flex items-center justify-between gap-4"
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(201, 168, 76, 0.08)',
          }}
        >
          <div className="min-w-0">
            {title && (
              <h3 className="admin-headline" style={{ fontSize: '1.1rem', letterSpacing: '0.04em' }}>
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs mt-1" style={{ color: '#99907e' }}>{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
