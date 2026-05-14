interface Props {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-zinc-100 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-zinc-400 mt-1.5">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
