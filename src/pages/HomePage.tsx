import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActiveChild } from '../hooks/useActiveChild'
import { useCourses } from '../hooks/useCourses'
import { useClassRecords } from '../hooks/useClassRecords'
import { useToast } from '../hooks/useToast'
import { useCourseCategories } from '../hooks/useCourseCategories'
import { computeReminders } from '../services/reminderService'
import { isCourseAvailableOnDate, remainingLessons, type Course } from '../types/course'
import { WEEKDAY_LABELS } from '../constants'
import { addDays, formatShort, formatTimeRange, getWeekday, todayStr } from '../utils/date'
import { db } from '../db/database'
import { SETTING_KEYS } from '../types/setting'
import { useLiveQuery } from 'dexie-react-hooks'
import ChildSwitcher from '../components/child/ChildSwitcher'
import ChildForm from '../components/child/ChildForm'
import TodayClassCard, { type TodayClassItem } from '../components/course/TodayClassCard'
import Loading from '../components/ui/Loading'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import BottomSheet from '../components/ui/BottomSheet'

interface UpcomingClassItem {
  key: string
  date: string
  dayLabel: string
  course: Course
  startTime?: string
  endTime?: string
}

export default function HomePage() {
  const { childList, activeChild } = useActiveChild()
  const toast = useToast()
  const navigate = useNavigate()
  const courses = useCourses(activeChild?.id)
  const records = useClassRecords(activeChild?.id)
  const { categoryIcon } = useCourseCategories()
  const lastBackupAt = useLiveQuery(() => db.settings.get(SETTING_KEYS.lastBackupAt), [])
  const backupSnoozedUntil = useLiveQuery(
    () => db.settings.get(SETTING_KEYS.backupReminderSnoozedUntil),
    [],
  )
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
      if (!isCourseAvailableOnDate(course, today)) continue
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

  // —— 未来 3 天课程预告 ——
  const upcomingItems = useMemo<UpcomingClassItem[]>(() => {
    const courseList = courses ?? []
    const items: UpcomingClassItem[] = []

    for (let i = 1; i <= 3; i++) {
      const targetDate = addDays(today, i)
      const weekday = getWeekday(targetDate)
      const dayLabel =
        i === 1
          ? `明天 (${WEEKDAY_LABELS[weekday]})`
          : i === 2
            ? `后天 (${WEEKDAY_LABELS[weekday]})`
            : `${formatShort(targetDate)} (${WEEKDAY_LABELS[weekday]})`

      for (const course of courseList) {
        if (!isCourseAvailableOnDate(course, targetDate)) continue
        for (const slot of course.weeklySchedule ?? []) {
          if (slot.weekday !== weekday) continue
          items.push({
            key: `${targetDate}-${course.id}-${slot.startTime}`,
            date: targetDate,
            dayLabel,
            course,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })
        }
      }
    }

    return items.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'),
    )
  }, [courses, today])

  const reminders = useMemo(() => computeReminders(courses ?? [], today), [courses, today])
  const backupReminder = useMemo(() => {
    const snoozedUntil = String(backupSnoozedUntil?.value ?? '')
    if (snoozedUntil >= today) return null
    if (!lastBackupAt?.value) {
      const firstCreatedAt = [...(courses ?? []), ...(records ?? [])]
        .map((item) => item.createdAt)
        .sort()[0]
      if (!firstCreatedAt) return null
      const usedDays = Math.floor((Date.now() - new Date(firstCreatedAt).getTime()) / 86400000)
      return usedDays >= 7 ? '使用已满 7 天，建议备份一次数据' : null
    }
    const days = Math.floor((Date.now() - new Date(String(lastBackupAt.value)).getTime()) / 86400000)
    return days >= 30 ? `已有 ${days} 天未备份数据，建议导出备份` : null
  }, [backupSnoozedUntil, courses, lastBackupAt, records, today])

  const snoozeBackupReminder = async () => {
    await db.settings.put({
      key: SETTING_KEYS.backupReminderSnoozedUntil,
      value: addDays(today, 7),
    })
    toast.showToast('将在 7 天后再次提醒', 'success')
  }

  // —— 加载态 ——
  if (childList === undefined) return <Loading />
  if (activeChild && (courses === undefined || records === undefined)) return <Loading />

  // —— 空状态：首次使用 → 引导添加孩子 ——
  if (!activeChild) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl">📚</div>
        <h1 className="mt-4 text-2xl font-bold">欢迎使用童课</h1>
        <p className="mt-2 text-[15px] font-medium">还没有添加孩子</p>
        <p className="mt-1 text-sm leading-6 text-neutral-400">
          添加孩子后即可开始记录课程
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

      {/* 未来 3 天课程预告 */}
      {upcomingItems.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500">未来 3 天预告</h2>
          <div className="mt-2 divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
            {upcomingItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0">{categoryIcon(item.course.categoryId)}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-medium truncate">{item.course.name}</span>
                      {item.course.teacher && (
                        <span className="text-xs text-neutral-400 truncate">({item.course.teacher})</span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {item.dayLabel} · {formatTimeRange(item.startTime, item.endTime) || '时间未设置'}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded-lg tabular-nums">
                  剩 {remainingLessons(item.course)} 节
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
      {backupReminder && (
        <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sky-700">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-6">{backupReminder}</p>
            <button
              type="button"
              aria-label="稍后提醒备份"
              title="7 天后提醒"
              onClick={() => void snoozeBackupReminder()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-sky-500 active:bg-sky-100"
            >
              ×
            </button>
          </div>
          <Link
            to="/settings/backup"
            className="mt-1 inline-flex min-h-9 items-center text-sm font-semibold active:opacity-70"
          >
            前往备份 →
          </Link>
        </div>
      )}
    </div>
  )
}
