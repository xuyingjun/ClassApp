import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'dangerGhost'
  loading?: boolean
  children: ReactNode
}

const VARIANTS = {
  primary: 'bg-primary text-white active:bg-primary-dark',
  secondary: 'bg-primary-soft text-primary active:bg-orange-100',
  danger: 'bg-danger text-white active:bg-red-700',
  ghost: 'text-neutral-600 active:bg-neutral-100',
  dangerGhost: 'text-danger active:bg-red-50',
}

export default function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`flex min-h-12 items-center justify-center rounded-xl px-4 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  )
}
