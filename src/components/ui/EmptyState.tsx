import type { ReactNode } from 'react'

interface EmptyStateProps {
  emoji?: string
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ emoji = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-10 text-center shadow-sm">
      <div className="text-4xl">{emoji}</div>
      <p className="mt-3 text-[15px] font-medium">{title}</p>
      {description && <p className="mt-1 text-sm leading-6 text-neutral-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
