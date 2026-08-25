import type { ClassRecord } from '../../types/classRecord'
import type { Course } from '../../types/course'
import { RECORD_STATUS_META } from '../../constants'
import { useCourseCategories } from '../../hooks/useCourseCategories'
import { formatTimeRange } from '../../utils/date'

interface RecordItemProps {
  record: ClassRecord
  course?: Course
  onClick: () => void
}

// 记录行：时间 + 课程 + 状态 + 课时（列表与日历日视图共用）
export default function RecordItem({ record, course, onClick }: RecordItemProps) {
  const { categoryIcon } = useCourseCategories()
  const meta = RECORD_STATUS_META[record.status]
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-neutral-50"
    >
      <span className="w-16 shrink-0 text-sm text-neutral-500 tabular-nums">
        {formatTimeRange(record.startTime, record.endTime) || '--:--'}
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px]">
        {categoryIcon(course?.categoryId)} {course?.name ?? '未知课程'}
      </span>
      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
        style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
      >
        {meta.label}
      </span>
      <span className="w-11 shrink-0 text-right text-sm text-neutral-400 tabular-nums">
        {record.lessonCount}节
      </span>
    </button>
  )
}
