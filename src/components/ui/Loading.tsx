export default function Loading() {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-soft border-t-primary" />
      <span className="text-sm text-neutral-400">加载中...</span>
    </div>
  )
}
