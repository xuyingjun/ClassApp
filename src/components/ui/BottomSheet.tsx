import type { ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
}

// 移动端底部弹层：遮罩 + 底部滑入面板（含 iPhone 底部安全区）
export default function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg">
        <div className="max-h-[80dvh] animate-sheet-up overflow-y-auto rounded-t-2xl bg-white p-4 pb-safe">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-200" />
          <div className="flex items-center">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="ml-auto flex h-11 w-11 items-center justify-center text-neutral-400 active:text-neutral-600"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>
  )
}
