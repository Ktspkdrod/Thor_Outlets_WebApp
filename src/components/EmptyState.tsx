import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  hint: string
}

export function EmptyState({ icon: Icon, title, hint }: EmptyStateProps) {
  return (
    <div className="empty">
      <span>
        <Icon size={24} />
      </span>
      <b>{title}</b>
      <small>{hint}</small>
    </div>
  )
}
