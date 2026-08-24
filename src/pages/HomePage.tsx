import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActiveChild } from '../hooks/useActiveChild'
import { useCourses } from '../hooks/useCourses'
import { useClassRecords } from '../hooks/useClassRecords'
import { useToast } from '../hooks/useToast'
import { computeReminders } from '../services/reminderService'
import { remainingLessons } from '../types/course'
import { courseColorValue } from '../constants'
import { getWeekday, todayStr } from '../utils/date'
import ChildSwitcher from '../components/child/ChildSwitcher'
import ChildForm from '../components/child/ChildForm'
import TodayClassCard, { type TodayClassItem } from '../components/course/TodayClassCard'
import Loading from '../components/ui/Loading'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import BottomSheet from '../components/ui/BottomSheet'

export default function HomePage() {
  const { childList, activeChild } = useActiveChild()
  const toast = useToast()
  const navigate = useNavigate()
  const courses = useCourses(activeChild?.id)
  const records = useClassRecords(activeChild?.id)
  const [childSheetOpen, setChildSheetOpen] = useState(false)

  const today = todayStr()

  // —— 今日课程：周课表匹配今天 + 今天无课表的记录 ——
  const todayItems = useMemo<TodayClassItem[]>(() => {
    const courseList = courses ?? []
    const todayRecords = (records ?? []).filter((r) => r.date === today)
    const weekday = getWeekday(today)
    const usedRecordIds = new Set<string>()
    const items: TodayClassItem[] = []

    for (const course of courseList) {
      if (course.status !== 'active') continue
      for (const slot of course.weeklySchedule ?? []) {
        if (slot.weekday !== weekday) continue
        const record = todayRecords.find(
          (r) => r.courseId === course.id && r.startTime === slot.startTime,
        )
        if (record) usedRecordIds.add(record.id)
        items.push({
          key: `${course.id}-${slot.startTime}`,
          course,
          startTime: slot.startTime,
          endTime: slot.endTime,
          record,
        })
      }
    }
    // 今天有记录但无对应课表时段（如补录/补课）
    for (const r of todayRecords) {
      if (usedRecordIds.has(r.id)) continue
      const course = courseList.find((c) => c.id === r.courseId)
      if (!course) continue
      items.push({
        key: r.id,
        course,
        startTime: r.startTime,
        endTime: r.endTime,
        record: r,
      })
    }
    return items.sort((a, b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'))
  }, [courses, records, today])

  const activeCourses = useMemo(() => (courses ?? []).filter((c) => c.status === 'active'), [courses])
  const reminders = useMemo(() => computeReminders(courses ?? [], today), [courses, today])

  // —— 加载态 ——
  if (childList === undefined) return <Loading />
  if (activeChild && (courses === undefined || records === undefined)) return <Loading />

  // —— 空状态：还没有孩子 → 引导添加 ——
  if (!activeChild) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl">📚</div>
        <h1 className="mt-4 text-2xl font-bold">欢迎使用童课</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          记录孩子每一节课，
          <br />
          随时知道课程还剩多少节
        </p>
        <Button className="mt-8 w-full max-w-xs" onClick={() => setChildSheetOpen(true)}>
          添加孩子
        </Button>
        <BottomSheet open={childSheetOpen} title="添加孩子" onClose={() => setChildSheetOpen(false)}>
          <ChildForm
            onSaved={() => {
              setChildSheetOpen(false)
              toast.showToast('已添加', 'success')
            }}
          />
        </BottomSheet>
      </div>
    )
  }

  const courseList = courses!

  // —— 空状态：有孩子但没有课程 ——
  if (courseList.length === 0) {
    return (
      <div className="space-y-3 p-4">
        <ChildSwitcher />
        <EmptyState
          emoji="📖"
          title="还没有添加课程"
          description="添加第一门课程，开始记录上课"
          action={
            <Button onClick={() => navigate('/courses/new')}>添加第一门课程</Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4">
      <ChildSwitcher />

      {/* 今日课程 */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-500">今日课程</h2>
          <Link
            to="/records"
            className="flex min-h-10 items-center gap-0.5 rounded-lg px-2 text-xs font-medium text-primary active:bg-primary-soft"
          >
            补录 ＋
          </Link>
        </div>
        <div className="mt-2 space-y-2">
          {todayItems.length === 0 ? (
            <EmptyState emoji="🎉" title="今天没有安排课程" />
          ) : (
            todayItems.map((item) => <TodayClassCard key={item.key} item={item} />)
          )}
        </div>
      </section>

      {/* 课程余额 */}
      {activeCourses.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500">课程余额</h2>
          <div className="mt-2 divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
            {activeCourses.map((c) => (
              <div key={c.id} className="flex min-h-12 items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-2 text-[15px]">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: courseColorValue(c.color) }}
                  />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="shrink-0 text-[15px]">
                  剩{' '}
                  <span className="text-lg font-bold text-primary">{remainingLessons(c)}</span>{' '}
                  节
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 提醒 */}
      {reminders.length > 0 && (
        <section className="space-y-2">
          {reminders.map((r) => (
            <div
              key={r.courseId}
              className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700"
            >
              <span aria-hidden>⚠️</span>
              <span>{r.message}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
