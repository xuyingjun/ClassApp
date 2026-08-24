import { useMemo } from 'react'
import { useActiveChild } from '../hooks/useActiveChild'
import { useCourses } from '../hooks/useCourses'
import { useClassRecords } from '../hooks/useClassRecords'
import { computeStats } from '../utils/statistics'
import { remainingLessons } from '../types/course'
import { courseColorValue, COURSE_STATUS_META, categoryEmoji } from '../constants'
import { formatShort, monthRange, todayStr, weekRange } from '../utils/date'
import Loading from '../components/ui/Loading'
import EmptyState from '../components/ui/EmptyState'
import ProgressBar from '../components/ui/ProgressBar'
import type { Course } from '../types/course'

function CourseRemainingRow({ course, muted = false }: { course: Course; muted?: boolean }) {
  const remaining = remainingLessons(course)
  return (
    <div className={`px-4 py-3 ${muted ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="flex min-w-0 items-center gap-2 text-[15px]">
          <span>{categoryEmoji(course.category)}</span>
          <span className="truncate">{course.name}</span>
          {muted && (
            <span className="shrink-0 text-[11px] text-neutral-400">{COURSE_STATUS_META[course.status].label}</span>
          )}
        </span>
        <span className="shrink-0 text-[15px]">
          剩 <span className={`text-lg font-bold tabular-nums ${muted ? 'text-neutral-500' : 'text-primary'}`}>{remaining}</span> 节
        </span>
      </div>
      <ProgressBar
        className="mt-2"
        value={course.totalLessons > 0 ? course.usedLessons / course.totalLessons : 0}
        color={courseColorValue(course.color)}
      />
    </div>
  )
}

// 统计：本周 / 本月 / 累计 + 各课程剩余课时（纯 CSS 进度条）
export default function StatsPage() {
  const { activeChild } = useActiveChild()
  const courses = useCourses(activeChild?.id)
  const records = useClassRecords(activeChild?.id)
  const today = todayStr()

  const stats = useMemo(() => computeStats(records ?? [], today), [records, today])
  const [weekStart, weekEnd] = weekRange(today)
  const [monthStart, monthEnd] = monthRange(today)

  const activeCourses = useMemo(() => (courses ?? []).filter((c) => c.status === 'active'), [courses])
  const archivedCourses = useMemo(() => (courses ?? []).filter((c) => c.status !== 'active' && c.status !== 'inactive'), [courses])

  if (!activeChild || records === undefined || courses === undefined) return <Loading />

  if (courses.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">统计</h1>
        <div className="mt-3">
          <EmptyState emoji="📊" title="还没有添加课程" description="添加课程后这里会显示上课统计" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">统计</h1>

      {/* 本周 / 本月 / 累计 */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-primary p-4 text-center text-white shadow-sm">
          <div className="text-xs opacity-80">本周</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{stats.week}</div>
          <div className="text-[11px] opacity-70">节</div>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <div className="text-xs text-neutral-400">本月</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{stats.month}</div>
          <div className="text-[11px] text-neutral-400">节</div>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <div className="text-xs text-neutral-400">累计</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{stats.total}</div>
          <div className="text-[11px] text-neutral-400">节</div>
        </div>
      </div>
      <p className="mt-1.5 px-1 text-xs text-neutral-400">
        本周 {formatShort(weekStart)} - {formatShort(weekEnd)} · 本月 {formatShort(monthStart)} - {formatShort(monthEnd)}
      </p>

      {/* 各课程剩余 */}
      <h2 className="mt-5 px-1 text-sm font-semibold text-neutral-500">各课程剩余课时</h2>
      <div className="mt-2 divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
        {activeCourses.map((c) => (
          <CourseRemainingRow key={c.id} course={c} />
        ))}
        {archivedCourses.map((c) => (
          <CourseRemainingRow key={c.id} course={c} muted />
        ))}
      </div>
      {activeCourses.length === 0 && archivedCourses.length === 0 && (
        <div className="mt-2">
          <EmptyState emoji="🗂️" title="没有可展示的课程" />
        </div>
      )}

      <p className="mt-4 px-1 text-center text-xs text-neutral-400">
        统计口径：已完成 + 补课（课时求和），取消与缺席不计入
      </p>
    </div>
  )
}
