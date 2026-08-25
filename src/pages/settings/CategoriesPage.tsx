import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Loading from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import BottomSheet from '../../components/ui/BottomSheet'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import CategoryForm from '../../components/course/CategoryForm'
import { db } from '../../db/database'
import { useCourseCategories } from '../../hooks/useCourseCategories'
import { useToast } from '../../hooks/useToast'
import { courseColorValue } from '../../constants'
import {
  deleteCategory,
  moveCategory,
  setCategoryStatus,
  CategoryInUseError,
} from '../../services/courseCategoryService'
import type { CourseCategory } from '../../types/courseCategory'

// 课程类型管理：增删改 + 排序 + 停用保护（被使用时不可删除）
export default function CategoriesPage() {
  const { categories } = useCourseCategories()
  const toast = useToast()
  const allCourses = useLiveQuery(() => db.courses.toArray(), [])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<CourseCategory | null>(null)
  const [dialogCat, setDialogCat] = useState<CourseCategory | null>(null)
  const [dialogInUse, setDialogInUse] = useState(false)
  const [busy, setBusy] = useState(false)

  // 每个类型的使用中课程数
  const usageMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of allCourses ?? []) {
      map.set(c.categoryId, (map.get(c.categoryId) ?? 0) + 1)
    }
    return map
  }, [allCourses])

  if (categories === undefined) return <Loading />

  const openAdd = () => {
    setEditing(null)
    setSheetOpen(true)
  }
  const openEdit = (c: CourseCategory) => {
    setEditing(c)
    setSheetOpen(true)
  }

  const handleTrash = (c: CourseCategory) => {
    setDialogCat(c)
    setDialogInUse((usageMap.get(c.id) ?? 0) > 0)
  }

  const handleDialogConfirm = async () => {
    if (!dialogCat) return
    setBusy(true)
    try {
      if (dialogInUse) {
        // 使用中：不删除，提供停用/重新启用
        const target = dialogCat.status === 'active' ? 'inactive' : 'active'
        await setCategoryStatus(dialogCat.id, target)
        toast.showToast(target === 'inactive' ? '已停用该类型' : '已重新启用', 'success')
      } else {
        await deleteCategory(dialogCat.id)
        toast.showToast('已删除', 'success')
      }
      setDialogCat(null)
    } catch (err) {
      if (err instanceof CategoryInUseError) toast.showToast(err.message, 'error')
      else toast.showToast('操作失败，请重试', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleMove = (id: string, dir: 'up' | 'down') => {
    void moveCategory(id, dir).catch(() => toast.showToast('操作失败，请重试', 'error'))
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <PageHeader title="课程类型" />
      <div className="p-4">
        {categories.length === 0 ? (
          <EmptyState
            emoji="🏷️"
            title="还没有课程类型"
            action={<Button onClick={openAdd}>添加课程类型</Button>}
          />
        ) : (
          <div className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
            {categories.map((c, idx) => {
              const used = usageMap.get(c.id) ?? 0
              return (
                <div key={c.id} className="flex items-center gap-1 px-2 py-2">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${courseColorValue(c.color)}1A` }}
                  >
                    {c.icon}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="flex min-h-12 min-w-0 flex-1 flex-col items-start justify-center px-1 text-left"
                  >
                    <span className="flex w-full items-center gap-1.5 truncate text-[15px] font-medium">
                      <span className="truncate">{c.name}</span>
                      {c.isDefault && (
                        <span className="shrink-0 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] text-primary">
                          默认
                        </span>
                      )}
                      {c.status === 'inactive' && (
                        <span className="shrink-0 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                          已停用
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 text-xs text-neutral-400">
                      {used > 0 ? `使用中 · ${used} 门课` : '未使用'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(c.id, 'up')}
                    disabled={idx === 0}
                    aria-label="上移"
                    className="flex h-11 w-10 items-center justify-center text-neutral-400 active:text-primary disabled:opacity-25"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(c.id, 'down')}
                    disabled={idx === categories.length - 1}
                    aria-label="下移"
                    className="flex h-11 w-10 items-center justify-center text-neutral-400 active:text-primary disabled:opacity-25"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTrash(c)}
                    aria-label={`删除 ${c.name}`}
                    className="flex h-11 w-10 items-center justify-center text-neutral-400 active:text-danger"
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
              )
            })}
          </div>
        )}
        <Button className="mt-4 w-full" variant="secondary" onClick={openAdd}>
          ＋ 添加课程类型
        </Button>
        <p className="mt-3 px-1 text-center text-xs leading-5 text-neutral-400">
          课程通过类型 ID 关联：修改类型名称后，所有相关课程自动更新
        </p>
      </div>

      <BottomSheet
        open={sheetOpen}
        title={editing ? '编辑课程类型' : '添加课程类型'}
        onClose={() => setSheetOpen(false)}
      >
        <CategoryForm
          key={editing?.id ?? 'new'}
          initial={editing ?? undefined}
          onSaved={() => {
            setSheetOpen(false)
            toast.showToast(editing ? '已保存' : '已添加', 'success')
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        open={dialogCat !== null}
        title={dialogInUse ? '该课程类型正在被使用' : '删除课程类型'}
        message={
          dialogInUse
            ? '该课程类型正在被使用，无法删除。可停用该类型：旧课程保留原类型，新增课程不再显示。'
            : `确定删除「${dialogCat?.name ?? ''}」吗？删除后无法恢复。`
        }
        confirmLabel={dialogInUse ? (dialogCat?.status === 'active' ? '停用' : '重新启用') : '删除'}
        confirmVariant="primary"
        busy={busy}
        onCancel={() => setDialogCat(null)}
        onConfirm={() => void handleDialogConfirm()}
      />
    </div>
  )
}
