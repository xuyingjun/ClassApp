import type { Course } from '../types/course'
import { remainingLessons } from '../types/course'
import { diffDays } from '../utils/date'
import { EXPIRY_REMINDER_DAYS, LOW_LESSON_THRESHOLD } from '../constants'

export interface Reminder {
  courseId: string
  lowLessons: boolean
  daysLeft: number | null // 距到期天数（已过期为负数；无到期日为 null）
  message: string
}

// 首页提醒（纯派生，不写库）：到期提醒 + 低课时提醒
// 未来推送通知（Phase 10+）将复用此计算作为数据源
export function computeReminders(courses: Course[], today: string): Reminder[] {
  const out: Reminder[] = []
  for (const course of courses) {
    if (course.status !== 'active') continue
    const remaining = remainingLessons(course)
    const low = remaining <= LOW_LESSON_THRESHOLD
    const daysLeft = course.expireDate ? diffDays(today, course.expireDate) : null
    const expiring = daysLeft !== null && daysLeft <= EXPIRY_REMINDER_DAYS
    if (!low && !expiring) continue

    const parts: string[] = []
    if (low) parts.push(`剩余 ${remaining} 节，即将用完`)
    if (expiring) {
      parts.push(daysLeft !== null && daysLeft < 0 ? '已过期' : `还有 ${daysLeft} 天到期`)
    }
    out.push({
      courseId: course.id,
      lowLessons: low,
      daysLeft,
      message: `「${course.name}」${parts.join('，')}`,
    })
  }
  // 排序：已过期/快到期优先，其次低课时
  return out.sort((a, b) => {
    const aDays = a.daysLeft !== null && a.daysLeft <= EXPIRY_REMINDER_DAYS ? a.daysLeft : Number.MAX_SAFE_INTEGER
    const bDays = b.daysLeft !== null && b.daysLeft <= EXPIRY_REMINDER_DAYS ? b.daysLeft : Number.MAX_SAFE_INTEGER
    if (aDays !== bDays) return aDays - bDays
    return Number(b.lowLessons) - Number(a.lowLessons)
  })
}
