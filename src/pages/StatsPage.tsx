import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useActiveChild } from '../hooks/useActiveChild'
import { useCourses } from '../hooks/useCourses'
import { useClassRecords } from '../hooks/useClassRecords'
import { useCourseCategories } from '../hooks/useCourseCategories'
import { computeStats, computeStatsByCategory, yearRange, type CategoryStats } from '../utils/statistics'
import { courseColorValue, COURSE_STATUS_META } from '../constants'
import { formatShort, monthRange, todayStr, weekRange } from '../utils/date'
import Loading from '../components/ui/Loading'
import EmptyState from '../components/ui/EmptyState'
import ProgressBar from '../components/ui/ProgressBar'
import Button from '../components/ui/Button'
import type { Course } from '../types/course'
import { isCountedStatus } from '../types/classRecord'

// 近 6 个月月份列表辅助计算
function getLast6Months(todayStr: string) {
  const [y, m] = todayStr.split('-').map(Number)
  const list = []
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(y, m - 1 - i, 1)
    const year = dt.getFullYear()
    const month = dt.getMonth() + 1
    const monthStr = String(month).padStart(2, '0')
    list.push({
      year,
      month,
      key: `${year}-${monthStr}`,
      label: `${month}月`,
      isCurrent: i === 0,
    })
  }
  return list
}

function CourseProgressStatRow({ course }: { course: Course }) {
  const { categoryIcon } = useCourseCategories()
  const pct = course.totalLessons > 0 ? Math.round((course.usedLessons / course.totalLessons) * 100) : 0
  const color = courseColorValue(course.color)
  return (
    <Link to={`/courses/${course.id}`} className="block px-4 py-3 active:bg-neutral-50">
      <div className="flex items-center justify-between">
        <span className="flex min-w-0 items-center gap-2 text-[15px]">
          <span>{categoryIcon(course.categoryId)}</span>
          <span className="truncate font-medium">{course.name}</span>
          {course.status !== 'active' && (
            <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
              {COURSE_STATUS_META[course.status].label}
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs tabular-nums">
          <span className="text-neutral-400">已消耗 </span>
          <span className="font-bold text-primary">{course.usedLessons}</span>
          <span className="text-neutral-300"> / </span>
          <span className="text-neutral-400">总课时 </span>
          <span className="font-bold text-blue-600">{course.totalLessons}</span>
          <span className="ml-1 text-neutral-400">({pct}%)</span>
        </span>
      </div>
      <ProgressBar
        className="mt-2 h-1.5"
        value={course.totalLessons > 0 ? course.usedLessons / course.totalLessons : 0}
        color={color}
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
        if (!isCountedStatus(record.status)) return false
        return period === 'total' || (record.date >= start && record.date <= end)
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || (b.startTime ?? '').localeCompare(a.startTime ?? ''),
      )
      .slice(0, 10)
  }, [records, period, today])

  // 出勤率与上课健康度统计
  const attendanceStats = useMemo(() => {
    const list = records ?? []
    let completed = 0
    let makeup = 0
    let cancelled = 0
    let absent = 0

    for (const r of list) {
      if (r.status === 'completed') completed += r.lessonCount
      else if (r.status === 'makeup') makeup += r.lessonCount
      else if (r.status === 'cancelled') cancelled += 1
      else if (r.status === 'absent') absent += 1
    }

    const totalCount = list.length
    const normalCount = list.filter((r) => isCountedStatus(r.status)).length
    const rate = totalCount > 0 ? Math.round((normalCount / totalCount) * 100) : 100

    return {
      rate,
      completed,
      makeup,
      cancelled,
      absent,
      totalCount,
    }
  }, [records])

  // 近 6 个月消课趋势柱状图数据
  const monthlyTrend = useMemo(() => {
    const months = getLast6Months(today)
    const list = records ?? []

    const map = new Map<string, number>()
    for (const m of months) {
      map.set(m.key, 0)
    }

    for (const r of list) {
      if (!isCountedStatus(r.status)) continue
      const prefix = r.date.slice(0, 7) // YYYY-MM
      if (map.has(prefix)) {
        map.set(prefix, (map.get(prefix) ?? 0) + r.lessonCount)
      }
    }

    const trendData = months.map((m) => ({
      ...m,
      count: map.get(m.key) ?? 0,
    }))

    const maxCount = Math.max(...trendData.map((d) => d.count), 1)

    return {
      trendData,
      maxCount,
    }
  }, [records, today])

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
    <div className="space-y-5 p-4">
      <h1 className="text-xl font-bold">统计</h1>

      {/* 本周 / 本月 / 年度 / 累计 */}
      <section>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setPeriod('week')}
            className={`rounded-2xl p-3 text-center transition shadow-sm ${
              period === 'week' ? 'bg-primary text-white' : 'bg-white'
            }`}
          >
            <div className="text-xs opacity-80">本周</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums">{stats.week}</div>
          </button>
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={`rounded-2xl p-3 text-center transition shadow-sm ${
              period === 'month' ? 'bg-primary text-white' : 'bg-white'
            }`}
          >
            <div className="text-xs text-neutral-400">本月</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums">{stats.month}</div>
          </button>
          <button
            type="button"
            onClick={() => setPeriod('year')}
            className={`rounded-2xl p-3 text-center transition shadow-sm ${
              period === 'year' ? 'bg-primary text-white' : 'bg-white'
            }`}
          >
            <div className="text-xs text-neutral-400">年度</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums">{stats.year}</div>
          </button>
          <button
            type="button"
            onClick={() => setPeriod('total')}
            className={`rounded-2xl p-3 text-center transition shadow-sm ${
              period === 'total' ? 'bg-primary text-white' : 'bg-white'
            }`}
          >
            <div className="text-xs text-neutral-400">累计</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums">{stats.total}</div>
          </button>
        </div>
        <p className="mt-1.5 px-1 text-xs text-neutral-400">
          本周 {formatShort(weekStart)} - {formatShort(weekEnd)} · 本月 {formatShort(monthStart)} -{' '}
          {formatShort(monthEnd)} · 年度 {formatShort(yearStart)} - {formatShort(yearEnd)}
        </p>

        {/* 动态显示的明细记录 */}
        <div className="mt-2 divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
          {periodRecords.length > 0 ? (
            periodRecords.map((record) => {
              const course = courses.find((item) => item.id === record.courseId)
              return (
                <Link
                  key={record.id}
                  to={`/courses/${record.courseId}`}
                  className="flex items-center justify-between px-4 py-3 active:bg-neutral-50"
                >
                  <span className="min-w-0 truncate text-sm">
                    {record.date} · {course?.name ?? '未知课程'}
                  </span>
                  <span className="ml-3 shrink-0 text-sm text-neutral-400 tabular-nums">
                    {record.lessonCount} 节
                  </span>
                </Link>
              )
            })
          ) : (
            <p className="px-4 py-4 text-center text-sm text-neutral-400">该周期暂无上课记录</p>
          )}
        </div>
      </section>

      {/* 近 6 个月消课趋势柱状图 */}
      <section>
        <h2 className="px-1 text-sm font-semibold text-neutral-500">近 6 个月消课趋势</h2>
        <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex h-36 items-end justify-between gap-2 pt-4">
            {monthlyTrend.trendData.map((item) => {
              const heightPct =
                monthlyTrend.maxCount > 0
                  ? Math.max(Math.round((item.count / monthlyTrend.maxCount) * 100), item.count > 0 ? 8 : 2)
                  : 0
              return (
                <div key={item.key} className="flex flex-1 flex-col items-center h-full justify-end">
                  <span className="text-[11px] font-medium text-neutral-500 tabular-nums mb-1">
                    {item.count > 0 ? `${item.count}节` : '-'}
                  </span>
                  <div className="w-full max-w-[28px] bg-neutral-100 rounded-t-lg flex items-end overflow-hidden h-24">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        item.isCurrent ? 'bg-primary' : 'bg-primary/40'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span
                    className={`mt-2 text-xs tabular-nums ${
                      item.isCurrent ? 'font-bold text-primary' : 'text-neutral-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 出勤率与请假健康度 */}
      <section>
        <h2 className="px-1 text-sm font-semibold text-neutral-500">消课健康度与出勤率</h2>
        <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <div className="text-xs text-neutral-400">总体出勤率</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {attendanceStats.rate}%
                </span>
                <span className="text-xs text-neutral-400">
                  ({attendanceStats.totalCount} 次记录)
                </span>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                attendanceStats.rate >= 90
                  ? 'bg-emerald-50 text-emerald-600'
                  : attendanceStats.rate >= 75
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-rose-50 text-rose-600'
              }`}
            >
              {attendanceStats.rate >= 90
                ? '出勤优秀'
                : attendanceStats.rate >= 75
                  ? '出勤良好'
                  : '请假较频繁'}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-neutral-50 py-2">
              <div className="text-sm font-bold text-neutral-800 tabular-nums">
                {attendanceStats.completed}
              </div>
              <div className="mt-0.5 text-[10px] text-neutral-400">已完成(节)</div>
            </div>
            <div className="rounded-xl bg-neutral-50 py-2">
              <div className="text-sm font-bold text-blue-600 tabular-nums">
                {attendanceStats.makeup}
              </div>
              <div className="mt-0.5 text-[10px] text-neutral-400">补课(节)</div>
            </div>
            <div className="rounded-xl bg-neutral-50 py-2">
              <div className="text-sm font-bold text-neutral-500 tabular-nums">
                {attendanceStats.cancelled}
              </div>
              <div className="mt-0.5 text-[10px] text-neutral-400">已取消(次)</div>
            </div>
            <div className="rounded-xl bg-neutral-50 py-2">
              <div className="text-sm font-bold text-amber-600 tabular-nums">
                {attendanceStats.absent}
              </div>
              <div className="mt-0.5 text-[10px] text-neutral-400">缺席(次)</div>
            </div>
          </div>
        </div>
      </section>

      {/* 按课程类型统计 */}
      {categoryEntries.length > 0 && (
        <section>
          <h2 className="px-1 text-sm font-semibold text-neutral-500">按课程类型统计</h2>
          <div className="mt-2 divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
            {categoryEntries.map(([categoryId, s]) => (
              <CategoryStatRow key={categoryId} categoryId={categoryId} stats={s} />
            ))}
          </div>
        </section>
      )}

      {/* 课程消课进度分析 */}
      {courses.length > 0 && (
        <section>
          <h2 className="px-1 text-sm font-semibold text-neutral-500">课程消课进度分析</h2>
          <div className="mt-2 divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
            {courses.map((c) => (
              <CourseProgressStatRow key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}

      <p className="px-1 text-center text-xs text-neutral-400">
        统计口径：已完成 + 补课（课时求和），取消与缺席不计入课时消课
      </p>
    </div>
  )
}
