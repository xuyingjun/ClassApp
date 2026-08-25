import type { ClassRecordStatus } from '../types/classRecord'
import type { CourseStatus } from '../types/course'

// 默认课程类型（首次启动时的程序建议；用户可自由增删改）
// id 为确定性值，供 v1→v2 迁移与旧备份导入映射使用
export const DEFAULT_CATEGORY_DEFS = [
  { id: 'cat-english', name: '英语', icon: '🔤' },
  { id: 'cat-piano', name: '钢琴', icon: '🎹' },
  { id: 'cat-dance', name: '舞蹈', icon: '💃' },
  { id: 'cat-art', name: '美术', icon: '🎨' },
  { id: 'cat-wushu', name: '武术', icon: '🥋' },
  { id: 'cat-writing', name: '写字', icon: '✍️' },
  { id: 'cat-other', name: '其他', icon: '📖' },
] as const

// 旧版本 course.category 枚举 key → 新默认类型 id（数据库 v1→v2 与旧备份导入用）
export const OLD_CATEGORY_KEY_TO_ID: Record<string, string> = {
  english: 'cat-english',
  piano: 'cat-piano',
  dance: 'cat-dance',
  art: 'cat-art',
  coding: 'cat-other',
  sports: 'cat-other',
  math: 'cat-other',
  other: 'cat-other',
}

// 自定义课程类型的图标候选（emoji）
export const CATEGORY_ICON_OPTIONS = [
  '📖', '🔤', '🎹', '💃', '🎨', '🥋',
  '✍️', '⚽', '🏀', '♟️', '🧩', '🤖',
  '🔬', '🎻', '🧮', '🗣️', '🎤', '🏊',
  '🧘', '🛼', '📐', '🌍', '🎬', '🍳',
] as const

// 课程/类型色板（克制配色，仅作点缀）
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
