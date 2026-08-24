import type { ClassRecordStatus } from '../types/classRecord'
import type { CourseStatus } from '../types/course'

// 课程类别（预设枚举）
export const COURSE_CATEGORIES = [
  { key: 'english', label: '英语', emoji: '🔤' },
  { key: 'piano', label: '钢琴', emoji: '🎹' },
  { key: 'dance', label: '舞蹈', emoji: '💃' },
  { key: 'art', label: '绘画', emoji: '🎨' },
  { key: 'coding', label: '编程', emoji: '💻' },
  { key: 'sports', label: '体育', emoji: '⚽' },
  { key: 'math', label: '数学', emoji: '🧮' },
  { key: 'other', label: '其他', emoji: '📖' },
] as const

export function categoryLabel(key: string): string {
  return COURSE_CATEGORIES.find((c) => c.key === key)?.label ?? '其他'
}

export function categoryEmoji(key: string): string {
  return COURSE_CATEGORIES.find((c) => c.key === key)?.emoji ?? '📖'
}

// 课程卡片色板（克制配色，仅作卡片点缀）
export const COURSE_COLORS = [
  { key: 'orange', value: '#EA580C' },
  { key: 'blue', value: '#2563EB' },
  { key: 'green', value: '#16A34A' },
  { key: 'purple', value: '#7C3AED' },
  { key: 'pink', value: '#DB2777' },
  { key: 'teal', value: '#0D9488' },
] as const

export function courseColorValue(key?: string): string {
  return COURSE_COLORS.find((c) => c.key === key)?.value ?? COURSE_COLORS[0].value
}

// 孩子预设头像（emoji）
export const CHILD_AVATARS = ['👧', '👦', '🧒', '👶', '🐰', '🐻', '🦊', '🐼'] as const

// 提醒阈值（阶段一为常量，未来可在设置中修改）
export const LOW_LESSON_THRESHOLD = 5 // remainingLessons <= 5 触发低课时提醒
export const EXPIRY_REMINDER_DAYS = 15 // 距到期 <= 15 天触发到期提醒

// 默认每节课时长（分钟）
export const DEFAULT_DURATION_MINUTES = 60

// 星期标签（0=周日）
export const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

// 记录状态展示
export const RECORD_STATUS_META: Record<ClassRecordStatus, { label: string; color: string }> = {
  completed: { label: '已完成', color: '#16A34A' },
  makeup: { label: '补课', color: '#2563EB' },
  cancelled: { label: '已取消', color: '#9CA3AF' },
  absent: { label: '缺席', color: '#D97706' },
}

// 课程状态展示
export const COURSE_STATUS_META: Record<CourseStatus, { label: string }> = {
  active: { label: '进行中' },
  completed: { label: '已结课' },
  expired: { label: '已过期' },
  inactive: { label: '已停用' },
}
