import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useActiveChild } from '../hooks/useActiveChild'
import { useCourses } from '../hooks/useCourses'
import { useClassRecords } from '../hooks/useClassRecords'
import { useCourseCategories } from '../hooks/useCourseCategories'
import { computeStats, computeStatsByCategory, yearRange, type CategoryStats } from '../utils/statistics'
import { remainingLessons } from '../types/course'
import { courseColorValue, COURSE_STATUS_META } from '../constants'
import { formatShort, monthRange, todayStr, weekRange } from '../utils/date'
import Loading from '../components/ui/Loading'
import EmptyState from '../components/ui/EmptyState'
import ProgressBar from '../components/ui/ProgressBar'
import Button from '../components/ui/Button'
import type { Course } from '../types/course'

function CourseRemainingRow({ course, muted = false }: { course: Course; muted?: boolean }) {
  const { categoryIcon } = useCourseCategories()
  const remaining = remainingLessons(course)
  return (
    <Link to={`/courses/${course.id}`} className={`block px-4 py-3 active:bg-neutral-50 ${muted ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="flex min-w-0 items-center gap-2 text-[15px]">
          <span>{categoryIcon(course.categoryId)}</span>
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
    </Link>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-neutral-50 py-1.5 text-center">
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-neutral-400">{label}</div>
    </div>
  )
}

function CategoryStatRow({ categoryId, stats }: { categoryId: string; stats: CategoryStats }) {
  const { categoryMap } = useCourseCategories()
  const cat = categoryMap.get(categoryId)
  const color = courseColorValue(cat?.color)
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
          style={{ backgroundColor: `${color}1A` }}
        >
          {cat?.icon ?? '📖'}
        </span>
        <span className="min-w-0 truncate text-[15px] font-medium">{cat?.name ?? '未分类'}</span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <MiniStat label="本周" value={stats.week} />
        <MiniStat label="本月" value={stats.month} />
        <MiniStat label="年度" value={stats.year} />
        <MiniStat label="累计" value={stats.total} />
      </div>
    </div>
  )
}

// 统计：本周 / 本月 / 年度 / 累计 + 各课程剩余 + 按课程类型统计（纯 CSS）
export default function StatsPage() {
  const { childList, activeChild } = useActiveChild()
  const courses = useCourses(activeChild?.id)
  const records = useClassRecords(activeChild?.id)
  const today = todayStr()
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'total'>('week')

  const stats = useMemo(() => computeStats(records ?? [], today), [records, today])
  const [weekStart, weekEnd] = weekRange(today)
  const [monthStart, monthEnd] = monthRange(today)
  const [yearStart, yearEnd] = yearRange(today)

  const activeCourses = useMemo(() => (courses ?? []).filter((c) => c.status === 'active'), [courses])
  const archivedCourses = useMemo(() => (courses ?? []).filter((c) => c.status !== 'active' && c.status !== 'inactive'), [courses])

  // 按类型统计：courseId → categoryId
  const courseCategoryMap = useMemo(
    () => new Map((courses ?? []).map((c) => [c.id, c.categoryId])),
    [courses],
  )
  const categoryStats = useMemo(
    () => computeStatsByCategory(records ?? [], courseCategoryMap, today),
    [records, courseCategoryMap, today],
  )
  // 按累计课时降序展示
  const categoryEntries = useMemo(
    () => [...categoryStats.entries()].sort((a, b) => b[1].total - a[1].total),
    [categoryStats],
  )
  const periodRecords = useMemo(() => {
    const [start, end] =
      period === 'week'
        ? weekRange(today)
        : period === 'month'
          ? monthRange(today)
          : period === 'year'
            ? yearRange(today)
            : ['', '']
    return (records ?? [])
      .filter((record) => {
        if (record.status !== 'completed' && record.status !== 'makeup') return false
        return period === 'total' || (record.date >= start && record.date <= end)
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || (b.startTime ?? '').localeCompare(a.startTime ?? ''),
      )
      .slice(0, 10)
  }, [records, period, today])

  if (childList === undefined) return <Loading />
  if (!activeChild) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">统计</h1>
        <div className="mt-3">
          <EmptyState
            emoji="👧"
            title="还没有添加孩子"
            description="请先在首页添加孩子"
            action={
              <Link to="/">
                <Button>去首页添加</Button>
              </Link>
            }
          />
        </div>
      </div>
    )
  }
  if (records === undefined || courses === undefined) return <Loading />

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

      {/* 本周 / 本月 / 年度 / 累计 */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <button type="button" onClick={() => setPeriod('week')} className={`rounded-2xl p-3 text-center shadow-sm ${period === 'week' ? 'bg-primary text-white' : 'bg-white'}`}>
          <div className="text-xs opacity-80">本周</div>
          <div className="mt-0.5 text-xl font-bold tabular-nums">{stats.week}</div>
        </button>
        <button type="button" onClick={() => setPeriod('month')} className={`rounded-2xl p-3 text-center shadow-sm ${period === 'month' ? 'bg-primary text-white' : 'bg-white'}`}>
          <div className="text-xs text-neutral-400">本月</div>
          <div className="mt-0.5 text-xl font-bold tabular-nums">{stats.month}</div>
        </button>
        <button type="button" onClick={() => setPeriod('year')} className={`rounded-2xl p-3 text-center shadow-sm ${period === 'year' ? 'bg-primary text-white' : 'bg-white'}`}>
          <div className="text-xs text-neutral-400">年度</div>
          <div className="mt-0.5 text-xl font-bold tabular-nums">{stats.year}</div>
        </button>
        <button type="button" onClick={() => setPeriod('total')} className={`rounded-2xl p-3 text-center shadow-sm ${period === 'total' ? 'bg-primary text-white' : 'bg-white'}`}>
          <div className="text-xs text-neutral-400">累计</div>
          <div className="mt-0.5 text-xl font-bold tabular-nums">{stats.total}</div>
        </button>
      </div>
      <p className="mt-1.5 px-1 text-xs text-neutral-400">
        本周 {formatShort(weekStart)} - {formatShort(weekEnd)} · 本月 {formatShort(monthStart)} - {formatShort(monthEnd)} · 年度 {formatShort(yearStart)} - {formatShort(yearEnd)}
      </p>

      <section className="mt-5">
        <h2 className="px-1 text-sm font-semibold text-neutral-500">
          {period === 'week' ? '本周上课情况' : period === 'month' ? '本月上课情况' : period === 'year' ? '年度上课情况' : '累计上课情况'}
        </h2>
        <div className="mt-2 divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
          {periodRecords.length > 0 ? (
            periodRecords.map((record) => {
              const course = courses.find((item) => item.id === record.courseId)
              return (
                <Link key={record.id} to={`/courses/${record.courseId}`} className="flex items-center justify-between px-4 py-3 active:bg-neutral-50">
                  <span className="min-w-0 truncate text-sm">{record.date} · {course?.name ?? '未知课程'}</span>
                  <span className="ml-3 shrink-0 text-sm text-neutral-400">{record.lessonCount} 节</span>
                </Link>
              )
            })
          ) : (
            <p className="px-4 py-5 text-center text-sm text-neutral-400">该周期暂无上课记录</p>
          )}
        </div>
      </section>

      {/* 按课程类型统计 */}
      {categoryEntries.length > 0 && (
        <>
          <h2 className="mt-5 px-1 text-sm font-semibold text-neutral-500">按课程类型统计</h2>
          <div className="mt-2 divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
            {categoryEntries.map(([categoryId, s]) => (
              <CategoryStatRow key={categoryId} categoryId={categoryId} stats={s} />
            ))}
          </div>
        </>
      )}

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
