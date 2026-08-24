import type { ClassRecord } from '../types/classRecord'
import { isCountedStatus } from '../types/classRecord'
import { monthRange, weekRange } from './date'

export interface LessonStats {
  week: number
  month: number
  total: number
}

// 统计口径（Phase 0 §3）：计入 = completed + makeup（lessonCount 求和）
// 纯函数聚合，渲染时实时派生，不落库
export function computeStats(records: ClassRecord[], today: string): LessonStats {
  const [weekStart, weekEnd] = weekRange(today)
  const [monthStart, monthEnd] = monthRange(today)
  let week = 0
  let month = 0
  let total = 0
  for (const r of records) {
    if (!isCountedStatus(r.status)) continue
    total += r.lessonCount
    if (r.date >= monthStart && r.date <= monthEnd) month += r.lessonCount
    if (r.date >= weekStart && r.date <= weekEnd) week += r.lessonCount
  }
  return { week, month, total }
}
