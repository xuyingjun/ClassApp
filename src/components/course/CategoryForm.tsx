import { useState, type FormEvent } from 'react'
import { CATEGORY_ICON_OPTIONS, COURSE_COLORS } from '../../constants'
import { useToast } from '../../hooks/useToast'
import {
  addCategory,
  updateCategory,
  setCategoryStatus,
  DuplicateCategoryNameError,
} from '../../services/courseCategoryService'
import type { CourseCategory } from '../../types/courseCategory'
import Button from '../ui/Button'

interface CategoryFormProps {
  initial?: CourseCategory
  onSaved: () => void
}

// 课程类型表单（新增/编辑共用，BottomSheet 内使用）
export default function CategoryForm({ initial, onSaved }: CategoryFormProps) {
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? CATEGORY_ICON_OPTIONS[0])
  const [color, setColor] = useState(initial?.color ?? COURSE_COLORS[0].key)
  const [busy, setBusy] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.showToast('请输入类型名称', 'error')
      return
    }
    setBusy(true)
    try {
      if (initial) await updateCategory(initial.id, { name: trimmed, icon, color })
      else await addCategory({ name: trimmed, icon, color })
      onSaved()
    } catch (err) {
      if (err instanceof DuplicateCategoryNameError) toast.showToast(err.message, 'error')
      else toast.showToast('保存失败，请重试', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!initial) return
    setStatusBusy(true)
    try {
      const target = initial.status === 'active' ? 'inactive' : 'active'
      await setCategoryStatus(initial.id, target)
      toast.showToast(target === 'inactive' ? '已停用该类型' : '已重新启用', 'success')
    } catch {
      toast.showToast('操作失败，请重试', 'error')
    } finally {
      setStatusBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">
          类型名称 <span className="text-danger">*</span>
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="如：围棋、书法、篮球"
          maxLength={10}
          className="mt-1.5 h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-base outline-none focus:border-primary"
        />
      </label>

      <div>
        <span className="text-sm font-medium">图标</span>
        <div className="mt-1.5 grid grid-cols-6 gap-2">
          {CATEGORY_ICON_OPTIONS.map((i) => (
            <button
              type="button"
              key={i}
              onClick={() => setIcon(i)}
              aria-label={`图标 ${i}`}
              className={`flex h-11 items-center justify-center rounded-xl text-xl transition ${
                icon === i ? 'bg-primary-soft ring-2 ring-primary' : 'bg-neutral-100'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium">颜色</span>
        <div className="mt-1.5 flex gap-3">
          {COURSE_COLORS.map((c) => (
            <button
              type="button"
              key={c.key}
              onClick={() => setColor(c.key)}
              aria-label={`颜色 ${c.key}`}
              className={`h-10 w-10 rounded-full transition ${color === c.key ? 'ring-2 ring-neutral-400 ring-offset-2' : ''}`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Button type="submit" className="w-full" loading={busy}>
          {initial ? '保存修改' : '添加类型'}
        </Button>
        {initial && (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            loading={statusBusy}
            onClick={() => void handleToggleStatus()}
          >
            {initial.status === 'active' ? '停用该类型' : '重新启用'}
          </Button>
        )}
        {initial?.status === 'inactive' && (
          <p className="text-center text-xs text-neutral-400">
            停用后旧课程保留原类型，新增课程不再显示
          </p>
        )}
      </div>
    </form>
  )
}
