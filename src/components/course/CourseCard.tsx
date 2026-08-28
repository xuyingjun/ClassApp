import { Link } from 'react-router-dom'
import type { Course } from '../../types/course'
import { remainingLessons } from '../../types/course'
import { COURSE_STATUS_META, WEEKDAY_LABELS, courseColorValue } from '../../constants'
import { useCourseCategories } from '../../hooks/useCourseCategories'
import { formatTimeRange } from '../../utils/date'
import ProgressBar from '../ui/ProgressBar'

// 课程卡片：名称/老师 + 剩余课时 + 进度 + 每周上课时间/状态
export default function CourseCard({ course }: { course: Course }) {
  const { categoryIcon } = useCourseCategories()
  const remaining = remainingLessons(course)
  const usedPct = course.totalLessons > 0 ? course.usedLessons / course.totalLessons : 0
  const color = courseColorValue(course.color)
  const weeklySchedule = [...(course.weeklySchedule ?? [])].sort(
    (a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.startTime.localeCompare(b.startTime),
  )

  return (
    <Link
      to={`/courses/${course.id}`}
      className={`block rounded-2xl bg-white p-4 shadow-sm active:bg-neutral-50 ${course.status === 'inactive' ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: `${color}1A` }}
        >
          {categoryIcon(course.categoryId)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-medium">{course.name}</span>
            {course.status !== 'active' && (
              <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                {COURSE_STATUS_META[course.status].label}
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-neutral-400">
            {[course.teacher, course.institution].filter(Boolean).join(' · ') || ' '}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-xl font-bold text-primary tabular-nums">{remaining}</span>
          <span className="text-xs text-neutral-400"> / </span>
          <span className="text-xl font-bold text-blue-600 tabular-nums">{course.totalLessons}</span>
          <span className="text-xs text-neutral-400"> 节</span>
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar value={usedPct} color={color} />
        <div className="mt-2 flex items-start justify-between gap-3 text-xs text-neutral-400">
          <div className="flex min-w-0 flex-1 flex-wrap gap-x-2 gap-y-1">
            {weeklySchedule.length > 0 ? (
              weeklySchedule.map((slot, index) => (
                <span key={`${slot.weekday}-${slot.startTime}-${slot.endTime ?? ''}-${index}`} className="whitespace-nowrap">
                  {WEEKDAY_LABELS[slot.weekday]} {formatTimeRange(slot.startTime, slot.endTime)}
                </span>
              ))
            ) : (
              <span>未设置上课时间</span>
            )}
          </div>
          <span className="shrink-0 tabular-nums">
            已用 <span className="font-semibold text-primary">{course.usedLessons}</span>
            {' / '}
            总计 <span className="font-semibold text-blue-600">{course.totalLessons}</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
