import { useState } from 'react'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Loading from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import BottomSheet from '../../components/ui/BottomSheet'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ChildForm from '../../components/child/ChildForm'
import { useActiveChild } from '../../hooks/useActiveChild'
import { useToast } from '../../hooks/useToast'
import { deleteChild, ChildHasCoursesError } from '../../services/childService'
import type { Child } from '../../types/child'

// 孩子管理：列表 + 新增/编辑/删除（删除有关联检查）
export default function ChildrenPage() {
  const { childList } = useActiveChild()
  const toast = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Child | null>(null)
  const [deleting, setDeleting] = useState<Child | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  if (childList === undefined) return <Loading />

  const openAdd = () => {
    setEditing(null)
    setSheetOpen(true)
  }
  const openEdit = (child: Child) => {
    setEditing(child)
    setSheetOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteChild(deleting.id)
      toast.showToast('已删除', 'success')
      setDeleting(null)
    } catch (err) {
      if (err instanceof ChildHasCoursesError) toast.showToast(err.message, 'error')
      else toast.showToast('删除失败，请重试', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <PageHeader title="孩子管理" />
      <div className="p-4">
        {childList.length === 0 ? (
          <EmptyState
            emoji="👧"
            title="还没有添加孩子"
            action={<Button onClick={openAdd}>添加孩子</Button>}
          />
        ) : (
          <div className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
            {childList.map((child) => (
              <div key={child.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl">
                  {child.avatar ?? '👧'}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(child)}
                  className="flex min-h-12 min-w-0 flex-1 flex-col items-start justify-center text-left"
                >
                  <span className="w-full truncate text-[15px] font-medium">{child.name}</span>
                  {(child.birthday || child.gender) && (
                    <span className="mt-0.5 text-xs text-neutral-400">
                      {[child.birthday, child.gender === 'male' ? '男' : child.gender === 'female' ? '女' : undefined]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(child)}
                  aria-label={`删除 ${child.name}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-neutral-400 active:text-danger"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <Button className="mt-4 w-full" variant="secondary" onClick={openAdd}>
          ＋ 添加孩子
        </Button>
      </div>

      <BottomSheet
        open={sheetOpen}
        title={editing ? '编辑孩子' : '添加孩子'}
        onClose={() => setSheetOpen(false)}
      >
        <ChildForm
          key={editing?.id ?? 'new'}
          initial={editing ?? undefined}
          onSaved={() => {
            setSheetOpen(false)
            toast.showToast(editing ? '已保存' : '已添加', 'success')
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        open={deleting !== null}
        title="删除孩子"
        message={`确定删除「${deleting?.name ?? ''}」吗？删除后无法恢复。`}
        confirmLabel="删除"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
