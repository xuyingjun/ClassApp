interface ProgressBarProps {
  value: number // 0-1
  color?: string
  className?: string
}

export default function ProgressBar({ value, color = '#EA580C', className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value * 100))
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 ${className}`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}
