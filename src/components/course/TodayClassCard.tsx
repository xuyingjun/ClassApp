import { useState } from 'react'
import type { Course } from '../../types/course'
import type { ClassRecord } from '../../types/classRecord'
import { isCountedStatus } from '../../types/classRecord'
import { remainingLessons } from '../../types/course'
import { RECORD_STATUS_META } from '../../constants'
import { db } from '../../db/database'
import { useToast } from '../../hooks/useToast'
import { useCourseCategories } from '../../hooks/useCourseCategories'
import { recordLesson, DuplicateRecordError } from '../../services/classRecordService'
import { todayStr } from '../../utils/date'
import Button from '../ui/Button'

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

  return (
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
        <Button variant="primary" className="shrink-0" loading={busy} onClick={() => void handleRecord()}>
          ✓ 上完课
        </Button>
      )}
    </div>
  )
}
