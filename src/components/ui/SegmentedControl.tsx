interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

// 分段切换（胶囊样式，≥40px 触控）
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`grid gap-1 rounded-full bg-neutral-100 p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-10 rounded-full px-2 text-sm font-medium transition ${
            value === o.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
