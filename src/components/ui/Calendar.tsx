import { monthGrid, monthLabel, todayStr } from '../../utils/date'

interface CalendarProps {
  year: number
  month: number // 1-12
  selectedDate?: string
  marks: Set<string> // 有上课记录的日期（YYYY-MM-DD）
  onSelectDate: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}

const WEEKDAY_SHORT = ['一', '二', '三', '四', '五', '六', '日'] as const

// 简单月历：有记录的日期显示 ●，点选查看当日课程（周一起始）
export default function Calendar({
  year,
  month,
  selectedDate,
  marks,
  onSelectDate,
  onMonthChange,
}: CalendarProps) {
  const today = todayStr()
  const days = monthGrid(year, month)

  const prevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12)
    else onMonthChange(year, month - 1)
  }
  const nextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1)
    else onMonthChange(year, month + 1)
  }

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="上个月"
          className="flex h-11 w-11 items-center justify-center text-neutral-500 active:text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-[15px] font-semibold">{monthLabel(year, month)}</span>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="下个月"
          className="flex h-11 w-11 items-center justify-center text-neutral-500 active:text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <div className="mt-1 grid grid-cols-7">
        {WEEKDAY_SHORT.map((w) => (
          <div key={w} className="py-1.5 text-center text-xs text-neutral-400">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((date) => {
          const dayNum = Number(date.slice(8, 10))
          const inMonth = Number(date.slice(5, 7)) === month
          const isToday = date === today
          const isSelected = date === selectedDate
          const hasMark = marks.has(date)
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              aria-label={date}
              className={`relative mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-xl text-sm transition tabular-nums ${
                isSelected ? 'bg-primary font-semibold text-white' : inMonth ? 'text-neutral-700 active:bg-primary-soft' : 'text-neutral-300'
              } ${isToday && !isSelected ? 'font-semibold text-primary ring-1 ring-primary' : ''}`}
            >
              {dayNum}
              {hasMark && (
                <span
                  className={`absolute bottom-1.5 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
