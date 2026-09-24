import { useState } from 'react'
import type { Course } from '../../types/course'
import type { ClassRecord, ClassRecordStatus } from '../../types/classRecord'
import { isCountedStatus } from '../../types/classRecord'
import { remainingLessons } from '../../types/course'
import { RECORD_STATUS_META } from '../../constants'
import { db } from '../../db/database'
import { useToast } from '../../hooks/useToast'
import { useCourseCategories } from '../../hooks/useCourseCategories'
import { recordLesson, addClassRecord, DuplicateRecordError } from '../../services/classRecordService'
import { todayStr } from '../../utils/date'
import Button from '../ui/Button'
import BottomSheet from '../ui/BottomSheet'

export interface TodayClassItem {
  key: string
  course: Course
  startTime?: string
  endTime?: string
  record?: ClassRecord // 今天该时段已有的记录
}

// 今日课程卡片：时间 + 课程 + 老师 + 状态 / 「✓ 上完课」按钮
// 一键记课：UI 立即禁用（防连点）+ DB 事务查重（双层防线，Phase 0 §5.1）
export default function TodayClassCard({ item }: { item: TodayClassItem }) {
  const toast = useToast()
  const { categoryIcon } = useCourseCategories()
  const [busy, setBusy] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const { course, startTime, endTime, record } = item
  const statusMeta = record ? RECORD_STATUS_META[record.status] : null

  const handleRecord = async () => {
    if (busy) return
    setBusy(true)
    try {
      await recordLesson({
        childId: course.childId,
        courseId: course.id,
        date: todayStr(),
        startTime,
        endTime,
      })
      const updated = await db.courses.get(course.id)
      const left = updated ? remainingLessons(updated) : null
      toast.showToast(left !== null ? `已记录，剩 ${left} 节` : '已记录 ✓', 'success')
    } catch (err) {
      if (err instanceof DuplicateRecordError) toast.showToast(err.message, 'error')
      else toast.showToast('保存失败，请重试', 'error')
    } finally {
      setBusy(false)
    }
  }

  // 选择器：记一节非「完成」状态的课（完成走主按钮 recordLesson 快路径）
  const submit = async (status: ClassRecordStatus) => {
    if (busy) return
    setBusy(true)
    try {
      await addClassRecord({
        childId: course.childId,
        courseId: course.id,
        date: todayStr(),
        startTime,
        endTime,
        status,
        lessonCount: 1,
      })
      const updated = await db.courses.get(course.id)
      const left = updated ? remainingLessons(updated) : null
      const counted = isCountedStatus(status)
      toast.showToast(left !== null && counted ? `已记录，剩 ${left} 节` : '已记录 ✓', 'success')
      setSheetOpen(false)
    } catch (err) {
      if (err instanceof DuplicateRecordError) toast.showToast(err.message, 'error')
      else toast.showToast('保存失败，请重试', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="w-16 shrink-0 text-center">
        <div className="text-base font-bold tabular-nums">{startTime ?? '--:--'}</div>
        {endTime && <div className="mt-0.5 text-xs text-neutral-400 tabular-nums">{endTime}</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[15px] font-medium">
          <span>{categoryIcon(course.categoryId)}</span>
          <span className="truncate">{course.name}</span>
        </div>
        {course.teacher && <div className="mt-0.5 truncate text-xs text-neutral-400">{course.teacher}</div>}
      </div>
      {record ? (
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ backgroundColor: `${statusMeta!.color}1A`, color: statusMeta!.color }}
        >
          {isCountedStatus(record.status) ? '✓ ' : ''}
          {statusMeta!.label}
        </span>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="primary"
            className="shrink-0"
            loading={busy}
            onClick={() => void handleRecord()}
          >
            ✓ 上完课
          </Button>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="shrink-0 rounded-xl px-2.5 min-h-9 text-xs font-medium text-neutral-500 active:bg-neutral-100"
          >
            其他状态
          </button>
        </div>
      )}
    </div>
    <BottomSheet open={sheetOpen} title="记一节课" onClose={() => setSheetOpen(false)}>
      <div className="mb-3 text-sm text-neutral-500">
        {startTime ?? '--:--'}
        {endTime ? `-${endTime}` : ''} · {course.name}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(['completed', 'makeup', 'cancelled', 'absent'] as const).map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => void submit(s)}
            className="h-12 rounded-xl text-sm font-medium bg-neutral-100 text-neutral-600 disabled:opacity-50 active:bg-neutral-200"
          >
            {RECORD_STATUS_META[s].label}
          </button>
        ))}
      </div>
    </BottomSheet>
    </>
  )
}
