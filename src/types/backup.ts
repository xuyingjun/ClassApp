import type { Child } from './child'
import type { Course } from './course'
import type { ClassRecord } from './classRecord'
import type { Setting } from './setting'

// 备份 JSON 结构（Phase 9 实现导入导出，此处先定契约）
export const BACKUP_APP_NAME = 'tongke'
export const BACKUP_VERSION = 1

export interface BackupData {
  app: typeof BACKUP_APP_NAME
  version: number
  exportedAt: string
  children: Child[]
  courses: Course[]
  classRecords: ClassRecord[]
  settings: Setting[]
}
