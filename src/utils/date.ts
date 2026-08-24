// 日期时间工具 —— 全部基于字符串运算（YYYY-MM-DD / HH:mm）
// 禁止 new Date(string) 解析：iPhone Safari 对日期字符串解析比 Chrome 严格（Phase 0 §11）
import { WEEKDAY_LABELS } from '../constants'

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 今天的本地日期 YYYY-MM-DD（以用户本地时钟为准，不存 UTC） */
export function todayStr(): string {
  const now = new Date()
  return toDateStr(now)
}

/** 当前本地时间 HH:mm */
export function nowTimeStr(): string {
  const now = new Date()
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`
}

/** Date → YYYY-MM-DD（本地时区） */
export function toDateStr(dt: Date): string {
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

/** 安全解析 YYYY-MM-DD 为本地 Date（手动拆分，兼容 Safari） */
export function parseDateSafe(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 校验 YYYY-MM-DD 格式且为真实存在的日期 */
export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/** dateStr + days 天 → YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const dt = parseDateSafe(dateStr)
  dt.setDate(dt.getDate() + days)
  return toDateStr(dt)
}

/** 两个 YYYY-MM-DD 相差天数（b - a） */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDateSafe(b).getTime() - parseDateSafe(a).getTime()) / 86400000)
}

/** 星期几：0=周日 … 6=周六 */
export function getWeekday(dateStr: string): number {
  return parseDateSafe(dateStr).getDay()
}

/** 所在周范围（周一起始），返回 [start, end] */
export function weekRange(dateStr: string): [string, string] {
  const offset = (getWeekday(dateStr) + 6) % 7 // 周一=0
  const start = addDays(dateStr, -offset)
  return [start, addDays(start, 6)]
}

/** 所在月范围 [1号, 月末] */
export function monthRange(dateStr: string): [string, string] {
  const [y, m] = dateStr.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return [`${dateStr.slice(0, 7)}-01`, `${dateStr.slice(0, 7)}-${pad2(lastDay)}`]
}

/** 某月的日历网格：42 天（6 周），周一起始，含前后月补位 */
export function monthGrid(year: number, month: number): string[] {
  const firstOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => {
    return toDateStr(new Date(year, month - 1, 1 - firstOffset + i))
  })
}

/** 展示：2026-08-24 → 2026年8月24日 周一 */
export function formatDisplay(dateStr: string, withWeekday = true): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const base = `${y}年${m}月${d}日`
  return withWeekday ? `${base} ${WEEKDAY_LABELS[getWeekday(dateStr)]}` : base
}

/** 简短展示：2026-08-24 → 8月24日 */
export function formatShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${m}月${d}日`
}

/** 时间段展示：18:30-19:30 */
export function formatTimeRange(start?: string, end?: string): string {
  if (start && end) return `${start}-${end}`
  return start ?? ''
}

/** HH:mm + minutes 分钟 → HH:mm（支持跨天回绕） */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`
}

/** 月份标题：2026年8月 */
export function monthLabel(year: number, month: number): string {
  return `${year}年${month}月`
}
