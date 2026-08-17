interface Props {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: Props) {
  return (
    <header className="mb-8">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-5">
        <div className="min-w-0">
          <h1 className="admin-headline" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)' }}>
            {title}
          </h1>
          {description && (
            <p className="text-sm mt-2 max-w-xl" style={{ color: '#99907e' }}>
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="admin-rule" />
    </header>
  )
}
