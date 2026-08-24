import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  right?: ReactNode
}

export default function PageHeader({ title, right }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/95 pt-safe backdrop-blur">
      <div className="grid h-14 grid-cols-[44px_1fr_44px] items-center px-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="返回"
          className="flex h-11 w-11 items-center justify-center text-neutral-600 active:text-primary"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-6 w-6"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="truncate text-center text-base font-semibold">{title}</h1>
        <div className="flex items-center justify-end">{right}</div>
      </div>
    </header>
  )
}
