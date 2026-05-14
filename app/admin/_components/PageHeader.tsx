interface Props {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: Props) {
  return (
    <header className="mb-10 pb-6 border-b border-amber-900/10">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-semibold text-zinc-100 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-zinc-500 mt-2 max-w-xl">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
