import { useMemo, useState } from 'react'
import { useActiveChild } from '../../hooks/useActiveChild'
import { useCourses } from '../../hooks/useCourses'
import { useClassRecords } from '../../hooks/useClassRecords'
import { useToast } from '../../hooks/useToast'
import RecordItem from '../../components/record/RecordItem'
import RecordForm from '../../components/record/RecordForm'
import Calendar from '../../components/ui/Calendar'
import SegmentedControl from '../../components/ui/SegmentedControl'
import Button from '../../components/ui/Button'
import Loading from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import BottomSheet from '../../components/ui/BottomSheet'
import type { ClassRecord } from '../../types/classRecord'
import { RECORD_STATUS_META } from '../../constants'
import { formatDisplay, monthRange, todayStr, weekRange } from '../../utils/date'

type RangeFilter = 'all' | 'today' | 'week' | 'month'
type View = 'list' | 'calendar'

const selectCls =
  'h-11 w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-primary'

// 上课记录：列表（筛选 + 分组）/ 日历（● 标记 + 日详情）+ 补录/编辑/删除
export default function RecordListPage() {
  const { activeChild } = useActiveChild()
  const courses = useCourses(activeChild?.id)
  const records = useClassRecords(activeChild?.id)
  const toast = useToast()
  const [view, setView] = useState<View>('list')
  const [courseFilter, setCourseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ClassRecord | null>(null)
  const [presetDate, setPresetDate] = useState<string | undefined>(undefined)

  const today = todayStr()
  const [calYear, setCalYear] = useState(() => Number(today.slice(0, 4)))
  const [calMonth, setCalMonth] = useState(() => Number(today.slice(5, 7)))
  const [selectedDate, setSelectedDate] = useState(today)

  const courseMap = useMemo(() => new Map((courses ?? []).map((c) => [c.id, c])), [courses])
  const markDates = useMemo(() => new Set((records ?? []).map((r) => r.date)), [records])

  const filtered = useMemo(() => {
    const [weekStart, weekEnd] = weekRange(today)
    const [monthStart, monthEnd] = monthRange(today)
    return (records ?? [])
      .filter((r) => {
        if (courseFilter !== 'all' && r.courseId !== courseFilter) return false
        if (statusFilter !== 'all' && r.status !== statusFilter) return false
        if (rangeFilter === 'today' && r.date !== today) return false
        if (rangeFilter === 'week' && (r.date < weekStart || r.date > weekEnd)) return false
        if (rangeFilter === 'month' && (r.date < monthStart || r.date > monthEnd)) return false
        return true
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || (b.startTime ?? '').localeCompare(a.startTime ?? ''),
      )
  }, [records, courseFilter, statusFilter, rangeFilter, today])

  // 列表：按日期分组（日期倒序）
  const groups = useMemo(() => {
    const map = new Map<string, ClassRecord[]>()
    for (const r of filtered) {
      const list = map.get(r.date)
      if (list) list.push(r)
      else map.set(r.date, [r])
    }
    return [...map.entries()]
  }, [filtered])

  // 日历：所选日期的记录（时间升序）
  const dayRecords = useMemo(
    () =>
      (records ?? [])
        .filter((r) => r.date === selectedDate)
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    [records, selectedDate],
  )

  if (!activeChild || records === undefined || courses === undefined) return <Loading />

  const openNew = () => {
    setEditing(null)
    setSheetOpen(true)
  }
  const openNewForDate = (date: string) => {
    setPresetDate(date)
    setEditing(null)
    setSheetOpen(true)
  }
  const openEdit = (r: ClassRecord) => {
    setEditing(r)
    setSheetOpen(true)
  }

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    // 点选相邻月补位日期时，切换到对应月份
    const y = Number(date.slice(0, 4))
    const m = Number(date.slice(5, 7))
    if (m !== calMonth || y !== calYear) {
      setCalYear(y)
      setCalMonth(m)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">记录</h1>
        <Button className="min-h-11 px-4 text-sm" onClick={openNew}>
          ＋ 补录
        </Button>
      </div>

      <SegmentedControl
        className="mt-3"
        options={[
          { value: 'list', label: '列表' },
          { value: 'calendar', label: '日历' },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'list' ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={selectCls}>
              <option value="all">全部课程</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="all">全部状态</option>
              {Object.entries(RECORD_STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <select
              value={rangeFilter}
              onChange={(e) => setRangeFilter(e.target.value as RangeFilter)}
              className={selectCls}
            >
              <option value="all">全部日期</option>
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                emoji="📝"
                title={records.length === 0 ? '还没有上课记录' : '没有符合条件的记录'}
                description={records.length === 0 ? '点击「＋ 补录」添加第一节课' : '试试调整筛选条件'}
              />
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {groups.map(([date, list]) => (
                <section key={date}>
                  <h2 className="px-1 text-xs font-medium text-neutral-400">{formatDisplay(date)}</h2>
                  <div className="mt-1 divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
                    {list.map((r) => (
                      <RecordItem
                        key={r.id}
                        record={r}
                        course={courseMap.get(r.courseId)}
                        onClick={() => openEdit(r)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <Calendar
            year={calYear}
            month={calMonth}
            selectedDate={selectedDate}
            marks={markDates}
            onSelectDate={handleSelectDate}
            onMonthChange={(y, m) => {
              setCalYear(y)
              setCalMonth(m)
            }}
          />
          <section>
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-medium text-neutral-400">{formatDisplay(selectedDate)}</h2>
              <button
                type="button"
                onClick={() => openNewForDate(selectedDate)}
                className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary active:bg-primary-soft"
              >
                ＋ 补录这一天
              </button>
            </div>
            {dayRecords.length === 0 ? (
              <div className="mt-1">
                <EmptyState emoji="🍃" title="这一天没有上课记录" />
              </div>
            ) : (
              <div className="mt-1 divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
                {dayRecords.map((r) => (
                  <RecordItem
                    key={r.id}
                    record={r}
                    course={courseMap.get(r.courseId)}
                    onClick={() => openEdit(r)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <BottomSheet
        open={sheetOpen}
        title={editing ? '编辑记录' : '手动补录'}
        onClose={() => setSheetOpen(false)}
      >
        <RecordForm
          key={editing?.id ?? 'new'}
          childId={activeChild.id}
          courses={courses}
          initial={editing ?? undefined}
          defaultDate={presetDate}
          onSaved={() => {
            setSheetOpen(false)
            toast.showToast(editing ? '已保存' : '已记录', 'success')
          }}
        />
      </BottomSheet>
    </div>
  )
}
