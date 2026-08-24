import Button from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// 居中确认对话框（危险操作二次确认）
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确定',
  confirmVariant = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-xs animate-sheet-up rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-center text-base font-semibold">{title}</h2>
        {message && <p className="mt-2 text-center text-sm leading-6 text-neutral-500">{message}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="ghost" className="bg-neutral-100" onClick={onCancel}>
            取消
          </Button>
          <Button variant={confirmVariant} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
