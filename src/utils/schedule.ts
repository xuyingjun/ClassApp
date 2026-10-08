// 排课推导工具：把「周课表 + 已有记录」合并成某日的排课项列表
// 抽取自 HomePage 今日课程逻辑，泛化到任意日期，供首页与「按日期补录」复用
import type { Course } from '../types/course'
import type { ClassRecord } from '../types/classRecord'
import { getWeekday } from './date'

export interface ScheduledItem {
  key: string
  course: Course
  startTime?: string
  endTime?: string
  /** 该时段已有的记录（无则表示待补录） */
  record?: ClassRecord
}

export interface BuildScheduledOptions {
  /**
   * 是否仅含 active 课程（默认 true，与首页「今日课程」语义一致）。
   * 补录场景传 false：课程现已结课/停用，但当时确实排过课，仍应展示以便补录。
   */
  onlyActive?: boolean
}

/**
 * 推导某日的排课项：
 * 1) 遍历课程 → 周课表里 weekday 匹配的 slot，关联当日同 courseId+startTime 的记录；
 * 2) 当日有记录但无对应课表时段（如手动补录/补课）作为 orphan 加入；
 * 3) 按 startTime 升序排序。
 *
 * 与 HomePage 旧逻辑等价（onlyActive=true 时）；onlyActive=false 用于补录视图。
 */
export function buildScheduledItems(
  courses: Course[],
  records: ClassRecord[],
  date: string,
  opts: BuildScheduledOptions = {},
): ScheduledItem[] {
  const onlyActive = opts.onlyActive !== false
  const dayRecords = records.filter((r) => r.date === date)
  const weekday = getWeekday(date)
  const usedRecordIds = new Set<string>()
  const items: ScheduledItem[] = []

  for (const course of courses) {
    if (onlyActive && course.status !== 'active') continue
    if (course.startDate && date < course.startDate) continue
    if (course.expireDate && date > course.expireDate) continue
    for (const slot of course.weeklySchedule ?? []) {
      if (slot.weekday !== weekday) continue
      const record = dayRecords.find(
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
  // 当日有记录但无对应课表时段（如补录/补课）
  for (const r of dayRecords) {
    if (usedRecordIds.has(r.id)) continue
    const course = courses.find((c) => c.id === r.courseId)
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
}
