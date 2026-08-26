import type { ClassRecord } from '../types/classRecord'
import { isCountedStatus, isInitialRecord } from '../types/classRecord'
import { monthRange, weekRange } from './date'

export interface LessonStats {
  week: number
  month: number
  year: number
  total: number
}

/** 所在年度范围 [1月1日, 12月31日] */
export function yearRange(dateStr: string): [string, string] {
  const year = Number(dateStr.slice(0, 4))
  return [`${year}-01-01`, `${year}-12-31`]
}

// 统计口径（Phase 0 §3）：计入 = completed + makeup（lessonCount 求和）
// 纯函数聚合，渲染时实时派生，不落库
export function computeStats(records: ClassRecord[], today: string): LessonStats {
  const [weekStart, weekEnd] = weekRange(today)
  const [monthStart, monthEnd] = monthRange(today)
  const [yearStart, yearEnd] = yearRange(today)
  let week = 0
  let month = 0
  let year = 0
  let total = 0
  for (const r of records) {
    if (!isCountedStatus(r.status)) continue
    total += r.lessonCount
    if (isInitialRecord(r)) continue
    if (r.date >= yearStart && r.date <= yearEnd) year += r.lessonCount
    if (r.date >= monthStart && r.date <= monthEnd) month += r.lessonCount
    if (r.date >= weekStart && r.date <= weekEnd) week += r.lessonCount
  }
  return { week, month, year, total }
}

export interface CategoryStats {
  week: number
  month: number
  year: number
  total: number
}

// 按课程类型统计：courseCategoryMap = courseId → categoryId
export function computeStatsByCategory(
  records: ClassRecord[],
  courseCategoryMap: Map<string, string>,
  today: string,
): Map<string, CategoryStats> {
  const [weekStart, weekEnd] = weekRange(today)
  const [monthStart, monthEnd] = monthRange(today)
  const [yearStart, yearEnd] = yearRange(today)
  const map = new Map<string, CategoryStats>()
  for (const r of records) {
    if (!isCountedStatus(r.status)) continue
    const categoryId = courseCategoryMap.get(r.courseId)
    if (!categoryId) continue
    let s = map.get(categoryId)
    if (!s) {
      s = { week: 0, month: 0, year: 0, total: 0 }
      map.set(categoryId, s)
    }
    s.total += r.lessonCount
    if (isInitialRecord(r)) continue
    if (r.date >= yearStart && r.date <= yearEnd) s.year += r.lessonCount
    if (r.date >= monthStart && r.date <= monthEnd) s.month += r.lessonCount
    if (r.date >= weekStart && r.date <= weekEnd) s.week += r.lessonCount
  }
  return map
}
