import type { Child } from './child'
import type { Course } from './course'
import type { ClassRecord } from './classRecord'
import type { CourseCategory } from './courseCategory'
import type { Setting } from './setting'

// 备份 JSON 结构
// v1：courses 使用 category（枚举 key），无 courseCategories 表（旧版导出，导入时自动迁移）
// v2：courses 使用 categoryId，包含 courseCategories 表
export const BACKUP_APP_NAME = 'tongke'
export const BACKUP_VERSION = 2

export interface BackupData {
  app: typeof BACKUP_APP_NAME
  version: number
  exportedAt: string
  children: Child[]
  courses: Course[]
  classRecords: ClassRecord[]
  courseCategories: CourseCategory[]
  settings: Setting[]
}
