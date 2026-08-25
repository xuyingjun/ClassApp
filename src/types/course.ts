// 课程
export type CourseStatus = 'active' | 'completed' | 'expired' | 'inactive'

// 轻量周课表时段
export interface WeeklySlot {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=周日
  startTime: string // HH:mm
  endTime?: string // HH:mm
}

export interface Course {
  id: string
  childId: string
  name: string
  categoryId: string // 关联 CourseCategory（修改类型名称时所有课程自动跟随）
  teacher?: string
  institution?: string
  totalLessons: number
  usedLessons: number // 可重建数据：由 ClassRecord 推导（courseService.recalculateCourseUsage）
  price?: number // 元
  startDate?: string // YYYY-MM-DD
  expireDate?: string // YYYY-MM-DD
  defaultDuration?: number // 分钟，默认 60
  color?: string // 预设色板 key，见 constants/courseColors
  weeklySchedule?: WeeklySlot[] // 周课表（可选）
  note?: string
  status: CourseStatus // 'inactive' = 删除保护下的停用
  createdAt: string
  updatedAt: string
}

// 派生字段（不存储）：剩余课时 = 总课时 - 已用课时
export function remainingLessons(course: Course): number {
  return Math.max(0, course.totalLessons - course.usedLessons)
}
// 首页课表可展示的日期范围（状态仍由课程当前状态控制）
export function isCourseAvailableOnDate(course: Course, date: string): boolean {
  return (
    course.status === 'active' &&
    (!course.startDate || date >= course.startDate) &&
    (!course.expireDate || date <= course.expireDate)
  )
}
