import { useState } from 'react'
import { useActiveChild } from '../../hooks/useActiveChild'
import { formatDisplay, todayStr } from '../../utils/date'
import BottomSheet from '../ui/BottomSheet'

// 首页头部：头像 + 孩子名 + 日期；多孩子时点击弹出切换面板
export default function ChildSwitcher() {
  const { childList, activeChild, selectChild } = useActiveChild()
  const [open, setOpen] = useState(false)
  if (!activeChild || !childList) return null

  const multi = childList.length > 1

  return (
    <>
      <button
        type="button"
        onClick={() => multi && setOpen(true)}
        disabled={!multi}
        className="flex items-center gap-3 text-left"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-2xl">
          {activeChild.avatar ?? '👧'}
        </span>
        <span>
          <span className="flex items-center gap-1 text-lg font-bold">
            {activeChild.name}
            {multi && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4 text-neutral-400"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </span>
          <span className="text-xs text-neutral-400">{formatDisplay(todayStr(), false)}</span>
        </span>
      </button>

      <BottomSheet open={open} title="切换孩子" onClose={() => setOpen(false)}>
        <div className="space-y-1">
          {childList.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => {
                void selectChild(child.id)
                setOpen(false)
              }}
              className="flex min-h-12 w-full items-center justify-between rounded-xl px-2 active:bg-neutral-50"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-xl">
                  {child.avatar ?? '👧'}
                </span>
                <span className="text-[15px] font-medium">{child.name}</span>
              </span>
              {child.id === activeChild.id && <span className="text-lg text-primary">✓</span>}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  )
}
