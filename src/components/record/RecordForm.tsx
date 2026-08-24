import { useState, type FormEvent } from 'react'
import type { ClassRecord, ClassRecordStatus } from '../../types/classRecord'
import type { Course } from '../../types/course'
import { RECORD_STATUS_META } from '../../constants'
import { useToast } from '../../hooks/useToast'
import { isValidDateStr, todayStr } from '../../utils/date'
import {
  addClassRecord,
  deleteClassRecord,
  updateClassRecord,
  DuplicateRecordError,
} from '../../services/classRecordService'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'

interface RecordFormProps {
  childId: string
  courses: Course[]
  initial?: ClassRecord
  defaultDate?: string
  onSaved: () => void
}

const STATUSES = ['completed', 'makeup', 'cancelled', 'absent'] as const

// 补录/编辑记录表单（BottomSheet 内使用）
export default function RecordForm({ childId, courses, initial, defaultDate, onSaved }: RecordFormProps) {
  const toast = useToast()
  const [courseId, setCourseId] = useState(initial?.courseId ?? courses[0]?.id ?? '')
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayStr())
  const [startTime, setStartTime] = useState(initial?.startTime ?? '')
  const [endTime, setEndTime] = useState(initial?.endTime ?? '')
  const [lessonCount, setLessonCount] = useState(String(initial?.lessonCount ?? 1))
  const [status, setStatus] = useState<ClassRecordStatus>(initial?.status ?? 'completed')
  const [note, setNote] = useState(initial?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const inputCls =
    'mt-1.5 h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-base outline-none focus:border-primary'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!courseId) {
      toast.showToast('请选择课程', 'error')
      return
    }
    if (!isValidDateStr(date)) {
      toast.showToast('请选择日期', 'error')
      return
    }
    const n = Number(lessonCount)
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      toast.showToast('课时需为 1-20 的整数', 'error')
      return
    }
    const input = {
      childId,
      courseId,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      lessonCount: n,
      status,
      note: note.trim() || undefined,
    }
    setBusy(true)
    try {
      if (initial) await updateClassRecord(initial.id, input)
      else await addClassRecord(input)
      onSaved()
    } catch (err) {
      if (err instanceof DuplicateRecordError) toast.showToast(err.message, 'error')
      else toast.showToast('保存失败，请重试', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!initial) return
    setDeleteBusy(true)
    try {
      await deleteClassRecord(initial.id)
      toast.showToast('已删除记录', 'success')
      setDeleteOpen(false)
      onSaved()
    } catch {
      toast.showToast('删除失败，请重试', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">
          课程 <span className="text-danger">*</span>
        </span>
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
          {courses.length === 0 && <option value="">请先添加课程</option>}
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">
          日期 <span className="text-danger">*</span>
        </span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">开始时间</span>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">结束时间</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">
          课时 <span className="text-danger">*</span>
        </span>
        <input
          value={lessonCount}
          onChange={(e) => setLessonCount(e.target.value)}
          inputMode="numeric"
          className={inputCls}
        />
      </label>

      <div>
        <span className="text-sm font-medium">状态</span>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {STATUSES.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setStatus(s)}
              className={`h-11 rounded-xl text-sm font-medium transition ${
                status === s
                  ? 'bg-primary-soft text-primary ring-1 ring-primary'
                  : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {RECORD_STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium">备注</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="选填"
          className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-base outline-none focus:border-primary"
        />
      </label>

      <div className="space-y-3">
        <Button type="submit" className="w-full" loading={busy}>
          {initial ? '保存修改' : '保存记录'}
        </Button>
        {initial && (
          <Button type="button" variant="dangerGhost" className="w-full" onClick={() => setDeleteOpen(true)}>
            删除这条记录
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="删除记录"
        message="删除后课程已用课时会自动恢复，确定删除吗？"
        confirmLabel="删除"
        busy={deleteBusy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </form>
  )
}
